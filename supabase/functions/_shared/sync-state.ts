// Estado de retomada das sincronizações (spec 03). Funções puras, sem rede nem
// banco: o executor (sync-runner.ts) carrega o estado, pede o próximo passo,
// grava página a página e salva o estado depois de cada página.

/** Cursor do Guru (string), offset do Asaas (número) ou nada. */
export type Cursor = string | number | null

export interface Step {
  /** Tipo do passo; o provedor decide o que buscar (ex.: 'tx', 'payments', 'status'). */
  kind: string
  /** Campo de data do filtro (Guru: confirmed_at...; Asaas: dateCreated...; Meta: insights). */
  field?: string
  since?: string
  until?: string
  status?: string
}

export interface Plan {
  reason: 'regular' | 'backfill'
  created_at: string
  steps: Step[]
  /** Passo atual (steps.length = terminado). */
  index: number
  cursor: Cursor
  pages: number
  records: number
  invocations: number
  /** Inclui a passada diária (status, assinaturas, links). */
  daily: boolean
  /** Meta: inclui a janela longa (35 dias). */
  long?: boolean
}

export interface SyncState {
  plan?: Plan | null
  /** Último dia (YYYY-MM-DD, Brasília) sincronizado sem lacunas, por campo. */
  done?: Record<string, string>
  last_completed_at?: string | null
  /** Dia da última passada diária concluída. */
  daily_on?: string | null
  /** Meta: dia da última janela longa concluída. */
  long_on?: string | null
  /** 401/403 do provedor: o cron não tenta de novo antes disso. */
  blocked_until?: string | null
  /** 429 com espera longa: ninguém tenta antes disso. */
  rate_limited_until?: string | null
}

// ---------------------------------------------------------------------------
// Datas de negócio (Brasília, UTC−3 fixo desde 2019)
// ---------------------------------------------------------------------------

const SP_OFFSET_MS = -3 * 3_600_000

export function spToday(now: Date = new Date()): string {
  return new Date(now.getTime() + SP_OFFSET_MS).toISOString().slice(0, 10)
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function diffDays(a: string, b: string): number {
  return Math.round((Date.parse(a + 'T00:00:00Z') - Date.parse(b + 'T00:00:00Z')) / 86_400_000)
}

export function isIsoDate(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v + 'T00:00:00Z'))
}

const minDate = (a: string, b: string) => (a < b ? a : b)
const maxDate = (a: string, b: string) => (a > b ? a : b)

// ---------------------------------------------------------------------------
// Janelas por campo de data
// ---------------------------------------------------------------------------

export interface FieldWindow {
  kind: string
  field: string
  /** Tamanho de cada passo em dias (1 = um dia por passo). */
  chunkDays: number
  /** Dias antes do último sincronizado que são repuxados (conversões tardias). */
  overlapDays: number
}

/**
 * Passos de um campo: do último dia sincronizado − overlap até hoje, em blocos
 * de `chunkDays`. Sem marca, começa em `fallbackStart`.
 */
export function fieldSteps(w: FieldWindow, done: string | undefined, today: string, fallbackStart: string): Step[] {
  const start = done ? addDays(minDate(done, today), -w.overlapDays) : minDate(fallbackStart, today)
  return chunkRange(w, start, today)
}

/** Passos de um campo num intervalo fixo (backfill). */
export function chunkRange(w: FieldWindow, since: string, until: string): Step[] {
  const steps: Step[] = []
  for (let d = since; d <= until; d = addDays(d, w.chunkDays)) {
    steps.push({ kind: w.kind, field: w.field, since: d, until: minDate(addDays(d, w.chunkDays - 1), until) })
  }
  return steps
}

/** Do mais antigo para o mais novo; no mesmo dia, na ordem dos campos. */
export function interleave(groups: Step[][]): Step[] {
  const tagged = groups.flatMap((g, gi) => g.map((s, si) => ({ s, gi, si })))
  tagged.sort((a, b) => (a.s.since ?? '').localeCompare(b.s.since ?? '') || a.gi - b.gi || a.si - b.si)
  return tagged.map((t) => t.s)
}

/**
 * Avança a marca do campo quando o passo termina, só se não deixar lacuna:
 * um backfill que começa depois da marca + 1 não a move.
 */
export function markDone(done: Record<string, string>, step: Step): Record<string, string> {
  if (!step.field || !step.since || !step.until) return done
  const cur = done[step.field]
  if (cur && step.since > addDays(cur, 1)) return done
  return { ...done, [step.field]: cur ? maxDate(cur, step.until) : step.until }
}

// ---------------------------------------------------------------------------
// Ciclo de vida do plano
// ---------------------------------------------------------------------------

export type Decision = 'continue' | 'start' | 'idle'
export type RequestMode = 'auto' | 'force' | 'backfill'

export function hasPending(state: SyncState): boolean {
  return !!state.plan && state.plan.index < state.plan.steps.length
}

/**
 * O que fazer nesta invocação. `auto` (cron): continua o plano pendente ou,
 * se a última rodada terminou há mais de `intervalMinutes`, começa outra.
 * `force` (botão): continua ou começa. `backfill`: sempre um plano novo.
 */
export function decide(state: SyncState, now: Date, intervalMinutes: number, mode: RequestMode): Decision {
  if (mode === 'backfill') return 'start'
  if (hasPending(state)) return 'continue'
  if (mode === 'force') return 'start'
  const last = state.last_completed_at ? Date.parse(state.last_completed_at) : NaN
  if (Number.isNaN(last)) return 'start'
  return now.getTime() - last >= intervalMinutes * 60_000 ? 'start' : 'idle'
}

export function newPlan(
  reason: Plan['reason'],
  steps: Step[],
  now: Date,
  opts: { daily?: boolean; long?: boolean } = {},
): Plan {
  return {
    reason,
    created_at: now.toISOString(),
    steps,
    index: 0,
    cursor: null,
    pages: 0,
    records: 0,
    invocations: 0,
    daily: !!opts.daily,
    ...(opts.long ? { long: true } : {}),
  }
}

/**
 * Registra uma página gravada. `next` = cursor da próxima página do mesmo
 * passo, ou null quando o passo acabou. Devolve o estado novo e o passo
 * concluído (se houver).
 */
export function afterPage(
  state: SyncState,
  next: Cursor,
  records: number,
): { state: SyncState; finished: Step | null } {
  const plan = state.plan
  if (!plan || plan.index >= plan.steps.length) return { state, finished: null }
  const base = { ...plan, pages: plan.pages + 1, records: plan.records + records }
  if (next !== null && next !== undefined && next !== '') {
    return { state: { ...state, plan: { ...base, cursor: next } }, finished: null }
  }
  const finished = plan.steps[plan.index]
  return {
    state: {
      ...state,
      plan: { ...base, index: plan.index + 1, cursor: null },
      done: markDone(state.done ?? {}, finished),
    },
    finished,
  }
}

/** Fecha o plano terminado: limpa e registra as marcas de conclusão. */
export function completePlan(state: SyncState, now: Date): SyncState {
  const plan = state.plan
  if (!plan || plan.index < plan.steps.length) return state
  const today = spToday(now)
  return {
    ...state,
    plan: null,
    last_completed_at: now.toISOString(),
    daily_on: plan.daily ? today : (state.daily_on ?? null),
    long_on: plan.long ? today : (state.long_on ?? null),
  }
}

/** Precisa da passada diária? (ainda não feita hoje, no horário de Brasília) */
export function needsDaily(state: SyncState, now: Date): boolean {
  return state.daily_on !== spToday(now)
}

/** Em dia: todos os campos chegaram a hoje. */
export function caughtUp(state: SyncState, fields: string[], now: Date): boolean {
  const today = spToday(now)
  return fields.every((f) => state.done?.[f] === today)
}

export interface Progress {
  reason: Plan['reason'] | null
  steps_done: number
  steps_total: number
  days_done: number
  days_total: number
  pages: number
  records: number
  current: string | null
}

/** Progresso para a tela ("Guru: 12/19 dias · 3.410 transações"). */
export function progress(plan: Plan | null | undefined): Progress {
  if (!plan) {
    return { reason: null, steps_done: 0, steps_total: 0, days_done: 0, days_total: 0, pages: 0, records: 0, current: null }
  }
  const days = new Set<string>()
  const pendingDays = new Set<string>()
  plan.steps.forEach((s, i) => {
    if (!s.since) return
    for (let d = s.since; d <= (s.until ?? s.since); d = addDays(d, 1)) {
      days.add(d)
      if (i >= plan.index) pendingDays.add(d)
    }
  })
  const cur = plan.steps[plan.index]
  return {
    reason: plan.reason,
    steps_done: plan.index,
    steps_total: plan.steps.length,
    days_done: days.size - pendingDays.size,
    days_total: days.size,
    pages: plan.pages,
    records: plan.records,
    current: cur ? describeStep(cur) : null,
  }
}

export function describeStep(s: Step): string {
  const fmt = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`
  const range = s.since ? (s.until && s.until !== s.since ? `${fmt(s.since)}–${fmt(s.until)}` : fmt(s.since)) : ''
  return [s.kind, s.field, s.status, range].filter(Boolean).join(' ')
}

// ---------------------------------------------------------------------------
// Planos de cada provedor
// ---------------------------------------------------------------------------

export interface PlanArgs {
  state: SyncState
  now: Date
  /** Intervalo pedido (backfill) ou nada (rodada regular). */
  backfill?: { since: string; until: string } | null
}

/** Dias de histórico quando o banco está vazio e não há marca. */
export const DEFAULT_START_DAYS = 7

export const GURU_WINDOWS: FieldWindow[] = [
  { kind: 'tx', field: 'confirmed_at', chunkDays: 1, overlapDays: 1 },
  { kind: 'tx', field: 'ordered_at', chunkDays: 1, overlapDays: 1 },
  // Cancelamentos são poucos e a consulta de 7 dias custa o mesmo que a de 1.
  { kind: 'tx', field: 'cancelled_at', chunkDays: 7, overlapDays: 1 },
]
export const GURU_FIELDS = GURU_WINDOWS.map((w) => w.field)

/**
 * Guru: um dia por passo em confirmed_at e ordered_at, cancelamentos em blocos
 * de 7 dias. Uma vez por dia: cancelamentos dos últimos 7 dias e assinaturas.
 */
export function buildGuruPlan({ state, now, backfill }: PlanArgs): Plan {
  const today = spToday(now)
  if (backfill) {
    const steps = interleave(GURU_WINDOWS.map((w) => chunkRange(w, backfill.since, backfill.until)))
    return newPlan('backfill', steps, now)
  }
  const daily = needsDaily(state, now)
  const fallback = addDays(today, -DEFAULT_START_DAYS)
  const groups = GURU_WINDOWS.map((w) => {
    const overlap = daily && w.field === 'cancelled_at' ? 7 : w.overlapDays
    return fieldSteps({ ...w, overlapDays: overlap }, state.done?.[w.field], today, fallback)
  })
  const steps = interleave(groups)
  if (daily) {
    steps.push({ kind: 'subs_active' })
    steps.push({ kind: 'subs_cancelled', since: addDays(today, -7), until: today })
  }
  return newPlan('regular', steps, now, { daily })
}

export const ASAAS_WINDOWS: FieldWindow[] = [
  { kind: 'payments', field: 'dateCreated', chunkDays: 1, overlapDays: 1 },
  { kind: 'payments', field: 'paymentDate', chunkDays: 1, overlapDays: 1 },
]
export const ASAAS_FIELDS = ASAAS_WINDOWS.map((w) => w.field)

/** Status varridos uma vez por dia (cobranças antigas que mudam de estado). */
export const ASAAS_DAILY_STATUSES = [
  'PENDING',
  'OVERDUE',
  'REFUNDED',
  'REFUND_REQUESTED',
  'REFUND_IN_PROGRESS',
  'CHARGEBACK_REQUESTED',
  'CHARGEBACK_DISPUTE',
  'AWAITING_CHARGEBACK_REVERSAL',
]

/**
 * Asaas: um dia por passo em dateCreated e paymentDate. Uma vez por dia: lista
 * de links (antes, para classificar) e varredura por status.
 */
export function buildAsaasPlan({ state, now, backfill }: PlanArgs): Plan {
  const today = spToday(now)
  if (backfill) {
    const steps = interleave(ASAAS_WINDOWS.map((w) => chunkRange(w, backfill.since, backfill.until)))
    return newPlan('backfill', steps, now)
  }
  const daily = needsDaily(state, now)
  const fallback = addDays(today, -DEFAULT_START_DAYS)
  const steps: Step[] = []
  if (daily) steps.push({ kind: 'links' })
  steps.push(...interleave(ASAAS_WINDOWS.map((w) => fieldSteps(w, state.done?.[w.field], today, fallback))))
  if (daily) for (const status of ASAAS_DAILY_STATUSES) steps.push({ kind: 'status', status })
  return newPlan('regular', steps, now, { daily })
}

export const META_SHORT: FieldWindow = { kind: 'insights', field: 'insights', chunkDays: 7, overlapDays: 6 }
export const META_LONG_DAYS = 35

/**
 * Meta: campanhas e insights em blocos de 7 dias. Rodada normal repuxa os
 * últimos 7 dias; uma vez por semana, os últimos 35 (conversões revisadas).
 */
export function buildMetaPlan({ state, now, backfill }: PlanArgs): Plan {
  const today = spToday(now)
  if (backfill) {
    return newPlan('backfill', [{ kind: 'campaigns' }, ...chunkRange(META_SHORT, backfill.since, backfill.until)], now)
  }
  const long = !state.long_on || diffDays(today, state.long_on) >= 7
  const w = long ? { ...META_SHORT, overlapDays: META_LONG_DAYS - 1 } : META_SHORT
  const fallback = addDays(today, -(long ? META_LONG_DAYS - 1 : META_SHORT.overlapDays))
  const steps = [{ kind: 'campaigns' }, ...fieldSteps(w, state.done?.insights, today, fallback)]
  return newPlan('regular', steps, now, { long })
}
