import { describe, expect, it } from 'vitest'
import {
  addDays,
  afterPage,
  buildAsaasPlan,
  buildGuruPlan,
  buildMetaPlan,
  caughtUp,
  completePlan,
  decide,
  fieldSteps,
  GURU_FIELDS,
  markDone,
  progress,
  spToday,
  type SyncState,
} from './sync-state.ts'

// 20/10/2026 10:00 em Brasília.
const NOW = new Date('2026-10-20T13:00:00Z')
const TODAY = '2026-10-20'

/** Simula as invocações: cada página devolve o próximo cursor da lista. */
function runPages(state: SyncState, pagesPerStep: number, maxPages: number): SyncState {
  let s = state
  for (let n = 0; n < maxPages && s.plan && s.plan.index < s.plan.steps.length; n++) {
    const page = typeof s.plan.cursor === 'number' ? s.plan.cursor : 0
    const next = page + 1 < pagesPerStep ? page + 1 : null
    s = afterPage(s, next, 50).state
  }
  return s
}

describe('datas (Brasília)', () => {
  it('dia de hoje no fuso de Brasília', () => {
    expect(spToday(new Date('2026-10-20T02:59:00Z'))).toBe('2026-10-19')
    expect(spToday(new Date('2026-10-20T03:00:00Z'))).toBe('2026-10-20')
  })
  it('soma dias atravessando mês', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
})

describe('janelas', () => {
  const w = { kind: 'tx', field: 'confirmed_at', chunkDays: 1, overlapDays: 1 }

  it('do último dia sincronizado − 1 até hoje', () => {
    const steps = fieldSteps(w, '2026-10-18', TODAY, '2026-10-01')
    expect(steps.map((s) => s.since)).toEqual(['2026-10-17', '2026-10-18', '2026-10-19', '2026-10-20'])
  })

  it('em dia: só ontem e hoje', () => {
    expect(fieldSteps(w, TODAY, TODAY, '2026-10-01').map((s) => s.since)).toEqual(['2026-10-19', TODAY])
  })

  it('blocos de 7 dias terminam em hoje', () => {
    const steps = fieldSteps({ ...w, chunkDays: 7 }, '2026-10-05', TODAY, '2026-10-01')
    expect(steps.map((s) => [s.since, s.until])).toEqual([
      ['2026-10-04', '2026-10-10'],
      ['2026-10-11', '2026-10-17'],
      ['2026-10-18', TODAY],
    ])
  })

  it('marca só avança sem lacuna', () => {
    expect(markDone({ f: '2026-10-10' }, { kind: 'tx', field: 'f', since: '2026-10-11', until: '2026-10-11' })).toEqual({
      f: '2026-10-11',
    })
    // Backfill antigo não recua a marca.
    expect(markDone({ f: '2026-10-10' }, { kind: 'tx', field: 'f', since: '2026-09-01', until: '2026-09-01' })).toEqual({
      f: '2026-10-10',
    })
    // Backfill que pula dias não avança a marca.
    expect(markDone({ f: '2026-10-10' }, { kind: 'tx', field: 'f', since: '2026-10-15', until: '2026-10-15' })).toEqual({
      f: '2026-10-10',
    })
  })
})

describe('decisão do ciclo', () => {
  const finished: SyncState = { last_completed_at: '2026-10-20T12:30:00Z' }

  it('cron dentro do intervalo não faz nada', () => {
    expect(decide(finished, NOW, 60, 'auto')).toBe('idle')
  })
  it('cron depois do intervalo começa rodada nova', () => {
    expect(decide({ last_completed_at: '2026-10-20T11:59:00Z' }, NOW, 60, 'auto')).toBe('start')
    expect(decide({}, NOW, 60, 'auto')).toBe('start')
  })
  it('plano pendente sempre continua', () => {
    const state = { ...finished, plan: buildGuruPlan({ state: { done: {} }, now: NOW }) }
    expect(decide(state, NOW, 60, 'auto')).toBe('continue')
    expect(decide(state, NOW, 60, 'force')).toBe('continue')
    expect(decide(state, NOW, 60, 'backfill')).toBe('start')
  })
  it('botão começa mesmo dentro do intervalo', () => {
    expect(decide(finished, NOW, 60, 'force')).toBe('start')
  })
})

describe('retomada', () => {
  it('cursor fica salvo no meio do passo e o passo só termina na última página', () => {
    let state: SyncState = { done: { confirmed_at: '2026-10-19' } }
    state = { ...state, plan: buildGuruPlan({ state, now: NOW }) }
    const r1 = afterPage(state, 'cur-2', 50)
    expect(r1.finished).toBeNull()
    expect(r1.state.plan?.cursor).toBe('cur-2')
    expect(r1.state.plan?.index).toBe(0)

    // "Matar a função" = recomeçar do estado salvo: mesmo passo, mesmo cursor.
    const reloaded = JSON.parse(JSON.stringify(r1.state)) as SyncState
    const r2 = afterPage(reloaded, null, 20)
    expect(r2.finished?.since).toBe(r1.state.plan?.steps[0].since)
    expect(r2.state.plan?.index).toBe(1)
    expect(r2.state.plan?.cursor).toBeNull()
    expect(r2.state.plan?.pages).toBe(2)
    expect(r2.state.plan?.records).toBe(70)
  })

  it('dia com 1.000+ transações termina em várias invocações', () => {
    // 21 páginas de 50 = 1.050 transações por campo/dia; 8 páginas por invocação.
    let state: SyncState = { done: { confirmed_at: TODAY, ordered_at: TODAY, cancelled_at: TODAY }, daily_on: TODAY }
    state = { ...state, plan: buildGuruPlan({ state, now: NOW }) }
    let invocations = 0
    while (state.plan && state.plan.index < state.plan.steps.length) {
      state = runPages(state, 21, 8)
      invocations++
    }
    expect(invocations).toBeGreaterThan(1)
    const done = completePlan(state, NOW)
    expect(done.plan).toBeNull()
    expect(done.last_completed_at).toBe(NOW.toISOString())
  })
})

describe('Guru', () => {
  it('depois do importador a primeira rodada pega só os dias novos', () => {
    const state: SyncState = { done: { confirmed_at: '2026-10-18', ordered_at: '2026-10-18', cancelled_at: '2026-10-18' } }
    const plan = buildGuruPlan({ state, now: NOW })
    const tx = plan.steps.filter((s) => s.kind === 'tx')
    expect(Math.min(...tx.map((s) => Date.parse(s.since!)))).toBe(Date.parse('2026-10-11')) // cancelamentos: 7 dias
    expect(tx.filter((s) => s.field === 'confirmed_at').map((s) => s.since)).toEqual([
      '2026-10-17',
      '2026-10-18',
      '2026-10-19',
      TODAY,
    ])
    // Do mais antigo para o mais novo.
    const sinces = tx.map((s) => s.since!)
    expect([...sinces].sort()).toEqual(sinces)
    expect(plan.daily).toBe(true)
    expect(plan.steps.slice(-2).map((s) => s.kind)).toEqual(['subs_active', 'subs_cancelled'])
  })

  it('em dia e com a passada diária feita: ontem e hoje, sem assinaturas', () => {
    const state: SyncState = {
      done: { confirmed_at: TODAY, ordered_at: TODAY, cancelled_at: TODAY },
      daily_on: TODAY,
    }
    expect(caughtUp(state, GURU_FIELDS, NOW)).toBe(true)
    const plan = buildGuruPlan({ state, now: NOW })
    expect(plan.daily).toBe(false)
    expect(plan.steps.map((s) => `${s.field}:${s.since}`)).toEqual([
      'confirmed_at:2026-10-19',
      'ordered_at:2026-10-19',
      'cancelled_at:2026-10-19',
      `confirmed_at:${TODAY}`,
      `ordered_at:${TODAY}`,
    ])
  })

  it('plano completo deixa os três campos em dia e marca a passada diária', () => {
    let state: SyncState = { done: { confirmed_at: '2026-10-18', ordered_at: '2026-10-18', cancelled_at: '2026-10-18' } }
    state = { ...state, plan: buildGuruPlan({ state, now: NOW }) }
    state = completePlan(runPages(state, 1, 1000), NOW)
    expect(caughtUp(state, GURU_FIELDS, NOW)).toBe(true)
    expect(state.daily_on).toBe(TODAY)
  })

  it('backfill cobre o intervalo pedido e não recua as marcas', () => {
    let state: SyncState = { done: { confirmed_at: TODAY, ordered_at: TODAY, cancelled_at: TODAY } }
    const plan = buildGuruPlan({ state, now: NOW, backfill: { since: '2026-10-01', until: '2026-10-19' } })
    expect(plan.reason).toBe('backfill')
    expect(progress(plan).days_total).toBe(19)
    state = completePlan(runPages({ ...state, plan }, 1, 1000), NOW)
    expect(state.done?.confirmed_at).toBe(TODAY)
  })
})

describe('Asaas', () => {
  it('links antes das cobranças e status uma vez por dia', () => {
    const plan = buildAsaasPlan({ state: { done: { dateCreated: '2026-10-15', paymentDate: '2026-10-15' } }, now: NOW })
    expect(plan.steps[0].kind).toBe('links')
    expect(plan.steps.filter((s) => s.kind === 'payments').length).toBe(14) // 14..20, dois campos
    expect(plan.steps.filter((s) => s.kind === 'status').map((s) => s.status)).toContain('OVERDUE')
    const again = buildAsaasPlan({ state: { done: { dateCreated: TODAY, paymentDate: TODAY }, daily_on: TODAY }, now: NOW })
    expect(again.steps.every((s) => s.kind === 'payments')).toBe(true)
  })
})

describe('Meta', () => {
  it('janela longa de 35 dias uma vez por semana, senão 7 dias', () => {
    const long = buildMetaPlan({ state: { done: { insights: TODAY } }, now: NOW })
    expect(long.long).toBe(true)
    expect(long.steps[0].kind).toBe('campaigns')
    expect(long.steps[1].since).toBe(addDays(TODAY, -34))
    expect(long.steps.length).toBe(1 + 5)

    const short = buildMetaPlan({ state: { done: { insights: TODAY }, long_on: '2026-10-19' }, now: NOW })
    expect(short.long).toBeUndefined()
    expect(short.steps.slice(1).map((s) => [s.since, s.until])).toEqual([[addDays(TODAY, -6), TODAY]])
  })
})

describe('progresso', () => {
  it('conta dias distintos concluídos', () => {
    let state: SyncState = { done: {} }
    state = { ...state, plan: buildGuruPlan({ state, now: NOW, backfill: { since: '2026-10-01', until: '2026-10-19' } }) }
    // Três primeiros passos: confirmed/ordered/cancelled de 01/10 (cancelled cobre 01–07).
    state = runPages(state, 1, 3)
    const p = progress(state.plan)
    expect(p.steps_done).toBe(3)
    expect(p.days_done).toBe(1)
    expect(p.days_total).toBe(19)
    expect(p.current).toBe('tx confirmed_at 02/10')
  })
})
