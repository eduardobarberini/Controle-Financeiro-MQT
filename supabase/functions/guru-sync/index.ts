// Sincronização do Guru: transações (por data de pedido e de cancelamento) e
// assinaturas. Chamada pelo cron (service role) ou pelo botão "Sincronizar
// agora" (JWT do usuário). Parâmetro `days` (1..180, padrão 7).
import { adminClient, requireEnv } from '../_shared/admin.ts'
import { clampInt, daysAgoIso, json, readJson, todayIso } from '../_shared/http.ts'
import { guruPaginate, mapSubscription, mapTransaction } from '../_shared/guru.ts'
import {
  authenticateCaller,
  finishRun,
  resolveOwner,
  startRun,
  upsertBatches,
  type Trigger,
} from '../_shared/sync.ts'

type Obj = Record<string, unknown>

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({ ok: true })

  const sb = adminClient()
  const caller = await authenticateCaller(req, sb)
  if (!caller.isService && !caller.userId) return json({ error: 'Não autorizado' }, 401)

  const body = req.method === 'POST' ? await readJson(req).catch(() => ({})) : {}
  const url = new URL(req.url)
  const days = clampInt(body.days ?? url.searchParams.get('days'), 7, 1, 180)
  const trigger: Trigger = caller.isService
    ? (body.trigger === 'backfill' ? 'backfill' : 'cron')
    : days > 30
      ? 'backfill'
      : 'manual'

  const owner = await resolveOwner(sb, 'guru')
  if (!owner) return json({ error: 'Integração Guru não configurada' }, 422)
  if (caller.userId && caller.userId !== owner.userId) return json({ error: 'Não autorizado' }, 403)

  const runId = await startRun(sb, { userId: owner.userId, provider: 'guru', trigger, details: { days } })

  try {
    const token = requireEnv('GURU_API_TOKEN')
    const since = daysAgoIso(days)
    const until = todayIso()

    // Transações: novas (ordered_at) e canceladas/reembolsadas (cancelled_at).
    const byId = new Map<string, Obj>()
    for (const window of [
      { ordered_at_ini: since, ordered_at_end: until },
      { cancelled_at_ini: since, cancelled_at_end: until },
    ]) {
      for await (const t of guruPaginate(token, '/transactions', window)) {
        const row = mapTransaction(t, owner.userId)
        if (row) byId.set(row.guru_id as string, row)
      }
    }
    const txCount = await upsertBatches(sb, 'guru_transactions', [...byId.values()], 'guru_id')

    // Assinaturas: ativas/atrasadas/trial/iniciadas (estado atual) + canceladas na janela.
    const subs = new Map<string, Obj>()
    for await (const s of guruPaginate(token, '/subscriptions', {
      subscription_status: ['active', 'pastdue', 'trial', 'started'],
    })) {
      const row = mapSubscription(s, owner.userId)
      if (row) subs.set(row.guru_id as string, row)
    }
    for await (const s of guruPaginate(token, '/subscriptions', {
      cancelled_at_ini: since,
      cancelled_at_end: until,
    })) {
      const row = mapSubscription(s, owner.userId)
      if (row) subs.set(row.guru_id as string, row)
    }
    const subCount = await upsertBatches(sb, 'guru_subscriptions', [...subs.values()], 'guru_id')

    const details = { days, since, until, transactions: txCount, subscriptions: subCount }
    await finishRun(sb, runId, {
      userId: owner.userId,
      provider: 'guru',
      status: 'success',
      records: txCount + subCount,
      details,
    })
    return json({ ok: true, ...details })
  } catch (e) {
    const msg = (e as Error).message
    await finishRun(sb, runId, { userId: owner.userId, provider: 'guru', status: 'error', error: msg })
    return json({ ok: false, error: msg }, 500)
  }
})
