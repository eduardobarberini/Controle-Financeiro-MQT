// Sincronização do Asaas: cobranças criadas ou pagas na janela, todas as
// cobranças em aberto (PENDING/OVERDUE) e cadastro dos clientes desconhecidos.
// Parâmetro `days` (1..365, padrão 7).
import { adminClient, requireEnv } from '../_shared/admin.ts'
import { clampInt, daysAgoIso, json, readJson } from '../_shared/http.ts'
import { asaasGet, asaasPaginate, mapCustomer, mapPayment } from '../_shared/asaas.ts'
import {
  authenticateCaller,
  finishRun,
  resolveOwner,
  startRun,
  upsertBatches,
  chunk,
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
  const days = clampInt(body.days ?? url.searchParams.get('days'), 7, 1, 365)
  const trigger: Trigger = caller.isService
    ? (body.trigger === 'backfill' ? 'backfill' : 'cron')
    : days > 30
      ? 'backfill'
      : 'manual'

  const owner = await resolveOwner(sb, 'asaas')
  if (!owner) return json({ error: 'Integração Asaas não configurada' }, 422)
  if (caller.userId && caller.userId !== owner.userId) return json({ error: 'Não autorizado' }, 403)
  if (caller.isService && !owner.enabled) return json({ ok: true, skipped: 'disabled' })

  const runId = await startRun(sb, { userId: owner.userId, provider: 'asaas', trigger, details: { days } })

  try {
    const apiKey = requireEnv('ASAAS_API_KEY')
    const since = daysAgoIso(days)

    // Links de pagamento primeiro: o nome do link classifica a cobrança
    // (plataforma/renovação, vendedora) quando ela é gravada.
    const links: Obj[] = []
    for await (const l of asaasPaginate(apiKey, '/paymentLinks')) {
      const id = l.id ? String(l.id) : null
      const name = l.name ? String(l.name).trim() : ''
      if (id && name) links.push({ user_id: owner.userId, asaas_link_id: id, name })
    }
    const linksCount = await upsertBatches(sb, 'asaas_payment_links', links, 'user_id,asaas_link_id')

    const byId = new Map<string, Obj>()
    const collect = async (params: Record<string, string>) => {
      for await (const p of asaasPaginate(apiKey, '/payments', params)) {
        const row = mapPayment(p, owner.userId)
        if (row) byId.set(row.asaas_id as string, row)
      }
    }
    await collect({ 'dateCreated[ge]': since })
    await collect({ 'paymentDate[ge]': since })
    await collect({ status: 'PENDING' })
    await collect({ status: 'OVERDUE' })
    // Estornos e contestações de cobranças antigas (fora da janela) também precisam entrar.
    for (const status of ['REFUNDED', 'REFUND_REQUESTED', 'REFUND_IN_PROGRESS', 'CHARGEBACK_REQUESTED', 'CHARGEBACK_DISPUTE', 'AWAITING_CHARGEBACK_REVERSAL']) {
      await collect({ status, 'dateCreated[ge]': daysAgoIso(Math.max(days, 365)) })
    }

    const paymentsCount = await upsertBatches(sb, 'asaas_payments', [...byId.values()], 'asaas_id')

    // Clientes ainda não cadastrados localmente.
    const customerIds = [...new Set([...byId.values()].map((r) => r.customer_id as string | null).filter(Boolean))] as string[]
    let customersCount = 0
    if (customerIds.length) {
      const knownSet = new Set<string>()
      for (const ids of chunk(customerIds, 200)) {
        const { data: known } = await sb.from('asaas_customers').select('asaas_id').in('asaas_id', ids)
        for (const k of known ?? []) knownSet.add(k.asaas_id as string)
      }
      const missing = customerIds.filter((id) => !knownSet.has(id))
      const rows: Obj[] = []
      // Poucas chamadas em paralelo para respeitar o limite de concorrência.
      for (let i = 0; i < missing.length; i += 5) {
        const slice = missing.slice(i, i + 5)
        const results = await Promise.all(
          slice.map((id) => asaasGet(apiKey, `/customers/${id}`).catch(() => null)),
        )
        for (const c of results) {
          const row = c ? mapCustomer(c, owner.userId) : null
          if (row) rows.push(row)
        }
      }
      customersCount = await upsertBatches(sb, 'asaas_customers', rows, 'asaas_id')
    }

    const details = { days, since, links: linksCount, payments: paymentsCount, customers: customersCount }
    await finishRun(sb, runId, {
      userId: owner.userId,
      provider: 'asaas',
      status: 'success',
      records: paymentsCount + customersCount,
      details,
    })
    return json({ ok: true, ...details })
  } catch (e) {
    const msg = (e as Error).message
    await finishRun(sb, runId, { userId: owner.userId, provider: 'asaas', status: 'error', error: msg })
    return json({ ok: false, error: msg }, 500)
  }
})
