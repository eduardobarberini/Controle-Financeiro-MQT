// Executor das sincronizações incrementais (spec 03). Cada provedor define o
// plano de passos e como buscar/gravar uma página; aqui ficam autenticação,
// trava, orçamento de tempo, estado de retomada e o registro em sync_runs.
//
// Corpo aceito (POST):
//   {}                                   cron: continua o plano ou, passado o intervalo, começa outro
//   { "continue": true }                 botão: continua ou começa agora
//   { "days": 30 }                       botão: reprocessa os últimos N dias (inclui hoje)
//   { "backfill": { "since": "2026-10-01", "until": "2026-10-19" } }
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.118.0'
import { adminClient } from './admin.ts'
import { json, ProviderAuthError, RateLimitError, readJson } from './http.ts'
import { authenticateCaller, finishRun, resolveOwner, startRun, type Owner, type Provider, type Trigger } from './sync.ts'
import {
  addDays,
  afterPage,
  completePlan,
  decide,
  diffDays,
  hasPending,
  isIsoDate,
  progress,
  spToday,
  type Cursor,
  type Plan,
  type PlanArgs,
  type RequestMode,
  type Step,
  type SyncState,
} from './sync-state.ts'

export interface PageResult {
  /** Cursor/offset da próxima página do mesmo passo, ou null quando acabou. */
  next: Cursor
  records: number
}

export interface SyncProvider<Ctx> {
  provider: Provider
  /** Minutos entre rodadas regulares (o cron chama a cada 15 min). */
  intervalMinutes: number
  maxBackfillDays: number
  /** Credenciais e parâmetros. Devolver Response = erro de configuração (sem sync_run). */
  prepare(owner: Owner): Ctx | Response
  /** Últimos dias já presentes no banco (ex.: depois do importador), por campo. */
  initialDone(sb: SupabaseClient, userId: string): Promise<Record<string, string>>
  buildPlan(args: PlanArgs): Plan
  runPage(sb: SupabaseClient, ctx: Ctx, userId: string, step: Step, cursor: Cursor): Promise<PageResult>
}

/** Folga mínima antes do fim do orçamento para não começar uma página que não termina. */
const SAFETY_MS = 10_000
/** 401/403: o cron espera isso antes de tentar de novo. */
const AUTH_BACKOFF_MS = 3_600_000

function budgetMs(): number {
  const v = Number(Deno.env.get('SYNC_TIME_BUDGET_MS') ?? '')
  return Number.isFinite(v) && v >= 20_000 ? v : 90_000
}

interface ParsedRequest {
  mode: RequestMode
  backfill: { since: string; until: string } | null
}

function parseRequest(
  body: Record<string, unknown>,
  isService: boolean,
  now: Date,
  maxDays: number,
): ParsedRequest | string {
  const today = spToday(now)
  const bf = body.backfill as Record<string, unknown> | undefined
  if (bf && typeof bf === 'object') {
    if (!isIsoDate(bf.since) || !isIsoDate(bf.until)) return 'backfill: informe since e until (AAAA-MM-DD)'
    const until = bf.until > today ? today : bf.until
    if (bf.since > until) return 'backfill: since depois de until'
    if (diffDays(until, bf.since) + 1 > maxDays) return `backfill: no máximo ${maxDays} dias por vez`
    return { mode: 'backfill', backfill: { since: bf.since, until } }
  }
  if (body.days !== undefined && body.days !== null && body.days !== '') {
    const days = Math.trunc(Number(body.days))
    if (!Number.isFinite(days) || days < 1) return 'days inválido'
    const n = Math.min(days, maxDays)
    return { mode: 'backfill', backfill: { since: addDays(today, -(n - 1)), until: today } }
  }
  if (body.continue === true || !isService) return { mode: 'force', backfill: null }
  return { mode: 'auto', backfill: null }
}

async function loadState(sb: SupabaseClient, userId: string, provider: Provider): Promise<SyncState> {
  const { data, error } = await sb
    .from('integration_settings')
    .select('sync_state')
    .eq('user_id', userId)
    .eq('provider', provider)
    .maybeSingle()
  if (error) throw new Error(`integration_settings: ${error.message}`)
  return ((data?.sync_state as SyncState | null) ?? {}) as SyncState
}

async function saveState(sb: SupabaseClient, userId: string, provider: Provider, state: SyncState): Promise<void> {
  const { error } = await sb
    .from('integration_settings')
    .update({ sync_state: state })
    .eq('user_id', userId)
    .eq('provider', provider)
  if (error) throw new Error(`integration_settings(sync_state): ${error.message}`)
}

async function unlock(sb: SupabaseClient, userId: string, provider: Provider): Promise<void> {
  const { error } = await sb
    .from('integration_settings')
    .update({ sync_locked_until: null })
    .eq('user_id', userId)
    .eq('provider', provider)
  if (error) console.error('unlock:', error.message)
}

const future = (iso: string | null | undefined, now: Date) => !!iso && Date.parse(iso) > now.getTime()
const hhmm = (iso: string) =>
  new Date(Date.parse(iso) - 3 * 3_600_000).toISOString().slice(11, 16)

export function serveSync<Ctx>(def: SyncProvider<Ctx>): void {
  Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return json({ ok: true })

    const sb = adminClient()
    const caller = await authenticateCaller(req, sb)
    if (!caller.isService && !caller.userId) return json({ error: 'Não autorizado' }, 401)

    const body = req.method === 'POST' ? await readJson(req).catch(() => ({})) : {}
    const now = new Date()
    const parsed = parseRequest(body, caller.isService, now, def.maxBackfillDays)
    if (typeof parsed === 'string') return json({ ok: false, error: parsed }, 400)
    const trigger: Trigger = caller.isService
      ? body.trigger === 'backfill' || parsed.mode === 'backfill'
        ? 'backfill'
        : 'cron'
      : parsed.mode === 'backfill'
        ? 'backfill'
        : 'manual'

    const owner = await resolveOwner(sb, def.provider)
    if (!owner) return json({ error: `Integração ${def.provider} não configurada` }, 422)
    if (caller.userId && caller.userId !== owner.userId) return json({ error: 'Não autorizado' }, 403)
    if (caller.isService && !owner.enabled) return json({ ok: true, skipped: 'disabled' })

    let ctx: Ctx | Response
    try {
      ctx = def.prepare(owner)
    } catch (e) {
      return json({ ok: false, error: (e as Error).message }, 500)
    }
    if (ctx instanceof Response) return ctx

    let state = await loadState(sb, owner.userId, def.provider)
    if (future(state.rate_limited_until, now)) {
      const msg = `O provedor pediu para aguardar até ${hhmm(state.rate_limited_until!)}`
      return caller.isService ? json({ ok: true, skipped: 'rate_limited' }) : json({ ok: false, error: msg }, 429)
    }
    if (caller.isService && future(state.blocked_until, now)) return json({ ok: true, skipped: 'blocked' })
    if (decide(state, now, def.intervalMinutes, parsed.mode) === 'idle') {
      return json({ ok: true, idle: true, progress: progress(state.plan) })
    }

    const budget = budgetMs()
    const { data: locked, error: lockErr } = await sb.rpc('sync_try_lock', {
      p_user_id: owner.userId,
      p_provider: def.provider,
      p_seconds: Math.ceil(budget / 1000) + 60,
    })
    if (lockErr) return json({ ok: false, error: `Trava: ${lockErr.message}` }, 500)
    if (!locked) {
      return caller.isService
        ? json({ ok: true, skipped: 'locked' })
        : json({ ok: false, error: 'Já existe uma sincronização em andamento' }, 409)
    }

    let runId: string | null = null
    const started = Date.now()
    let pages = 0
    let records = 0
    try {
      // Relê depois da trava: outra invocação pode ter acabado de gravar.
      state = await loadState(sb, owner.userId, def.provider)
      const decision = decide(state, now, def.intervalMinutes, parsed.mode)
      if (decision === 'idle') return json({ ok: true, idle: true, progress: progress(state.plan) })

      const resumedFrom = decision === 'continue' ? progress(state.plan) : null
      if (decision === 'start') {
        if (!state.done || Object.keys(state.done).length === 0) {
          state = { ...state, done: await def.initialDone(sb, owner.userId) }
        }
        state = { ...state, plan: def.buildPlan({ state, now, backfill: parsed.backfill }) }
      }
      state = { ...state, plan: { ...state.plan!, invocations: state.plan!.invocations + 1 } }
      const reason = state.plan!.reason
      await saveState(sb, owner.userId, def.provider, state)

      runId = await startRun(sb, {
        userId: owner.userId,
        provider: def.provider,
        trigger,
        details: { mode: parsed.mode, reason, resumed_from: resumedFrom, progress: progress(state.plan) },
      })

      let slowest = 0
      let rateLimited: RateLimitError | null = null
      try {
        while (hasPending(state)) {
          if (Date.now() - started + Math.max(SAFETY_MS, slowest * 2) > budget) break
          const plan = state.plan!
          const t0 = Date.now()
          const page = await def.runPage(sb, ctx, owner.userId, plan.steps[plan.index], plan.cursor)
          slowest = Math.max(slowest, Date.now() - t0)
          state = afterPage(state, page.next, page.records).state
          pages++
          records += page.records
          await saveState(sb, owner.userId, def.provider, state)
        }
      } catch (e) {
        if (!(e instanceof RateLimitError)) throw e
        rateLimited = e
        state = { ...state, rate_limited_until: new Date(Date.now() + e.retryAfterSec * 1000).toISOString() }
      }

      const completed = !hasPending(state)
      const finalProgress = progress(state.plan)
      if (completed) state = completePlan(state, new Date())
      if (!caller.isService) state = { ...state, blocked_until: null }
      await saveState(sb, owner.userId, def.provider, state)

      const details = {
        mode: parsed.mode,
        reason,
        pages,
        records,
        completed,
        resumed_from: resumedFrom,
        progress: finalProgress,
        elapsed_ms: Date.now() - started,
        budget_ms: budget,
        ...(rateLimited ? { rate_limited: rateLimited.message } : {}),
      }
      await finishRun(sb, runId, {
        userId: owner.userId,
        provider: def.provider,
        status: 'success',
        records,
        details,
      })
      return json({ ok: true, partial: !completed, ...details, resume: completed ? null : finalProgress })
    } catch (e) {
      const msg = (e as Error).message
      if (e instanceof ProviderAuthError) {
        state = { ...state, blocked_until: new Date(Date.now() + AUTH_BACKOFF_MS).toISOString() }
        await saveState(sb, owner.userId, def.provider, state).catch(() => {})
      }
      const details = { mode: parsed.mode, pages, records, completed: false, progress: progress(state.plan) }
      if (runId) {
        await finishRun(sb, runId, { userId: owner.userId, provider: def.provider, status: 'error', records, details, error: msg })
      } else {
        await sb
          .from('integration_settings')
          .update({ last_sync_status: 'error', last_error: msg })
          .eq('user_id', owner.userId)
          .eq('provider', def.provider)
      }
      return json({ ok: false, error: msg, ...details }, e instanceof ProviderAuthError ? 502 : 500)
    } finally {
      await unlock(sb, owner.userId, def.provider)
    }
  })
}

/** Dia (Brasília) do maior valor de uma coluna de data/hora, ou null. */
export async function lastLocalDay(
  sb: SupabaseClient,
  table: string,
  column: string,
  userId: string,
  kind: 'timestamp' | 'date',
): Promise<string | null> {
  const { data, error } = await sb
    .from(table)
    .select(column)
    .eq('user_id', userId)
    .not(column, 'is', null)
    .order(column, { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(`${table}.${column}: ${error.message}`)
  const v = (data as Record<string, unknown> | null)?.[column]
  if (!v) return null
  return kind === 'date' ? String(v).slice(0, 10) : spToday(new Date(String(v)))
}

/** Remove duplicados de uma página (o upsert não aceita a mesma chave duas vezes). */
export function uniqueBy<T extends Record<string, unknown>>(rows: T[], key: string): T[] {
  const map = new Map<unknown, T>()
  for (const r of rows) map.set(r[key], r)
  return [...map.values()]
}
