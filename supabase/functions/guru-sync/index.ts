// Sincronização incremental do Guru (spec 03): transações por dia de
// confirmação, de pedido e de cancelamento, e assinaturas uma vez por dia.
// Grava página a página e retoma do cursor salvo; ver _shared/sync-runner.ts.
import { requireEnv } from '../_shared/admin.ts'
import { guruPage, mapSubscription, mapTransaction } from '../_shared/guru.ts'
import { lastLocalDay, serveSync, uniqueBy } from '../_shared/sync-runner.ts'
import { buildGuruPlan, GURU_FIELDS } from '../_shared/sync-state.ts'
import { upsertBatches } from '../_shared/sync.ts'

type Obj = Record<string, unknown>

serveSync<{ token: string }>({
  provider: 'guru',
  intervalMinutes: Number(Deno.env.get('GURU_SYNC_INTERVAL_MINUTES') ?? '') || 60,
  // ~45 páginas por dia: períodos maiores ficam para o importador (spec 02).
  maxBackfillDays: 60,
  prepare: () => ({ token: requireEnv('GURU_API_TOKEN') }),

  // Depois do importador (spec 02) a primeira rodada começa no último dia que já está no banco.
  async initialDone(sb, userId) {
    const day =
      (await lastLocalDay(sb, 'guru_transactions', 'confirmed_at', userId, 'timestamp')) ??
      (await lastLocalDay(sb, 'guru_transactions', 'ordered_at', userId, 'timestamp'))
    return day ? Object.fromEntries(GURU_FIELDS.map((f) => [f, day])) : {}
  },

  buildPlan: buildGuruPlan,

  async runPage(sb, { token }, userId, step, cursor) {
    const c = typeof cursor === 'string' ? cursor : null

    if (step.kind === 'tx') {
      const { data, next } = await guruPage(
        token,
        '/transactions',
        { [`${step.field}_ini`]: step.since!, [`${step.field}_end`]: step.until! },
        c,
      )
      // Versão mais antiga que a gravada é descartada no banco (gatilho keep_newest).
      const rows = uniqueBy(data.map((t) => mapTransaction(t, userId)).filter(Boolean) as Obj[], 'guru_id')
      return { next, records: await upsertBatches(sb, 'guru_transactions', rows, 'guru_id') }
    }

    if (step.kind === 'subs_active' || step.kind === 'subs_cancelled') {
      const params =
        step.kind === 'subs_active'
          ? { subscription_status: ['active', 'pastdue', 'trial', 'started'] }
          : { cancelled_at_ini: step.since!, cancelled_at_end: step.until! }
      const { data, next } = await guruPage(token, '/subscriptions', params, c)
      const rows = uniqueBy(data.map((s) => mapSubscription(s, userId)).filter(Boolean) as Obj[], 'guru_id')
      return { next, records: await upsertBatches(sb, 'guru_subscriptions', rows, 'guru_id') }
    }

    throw new Error(`Passo desconhecido: ${step.kind}`)
  },
})
