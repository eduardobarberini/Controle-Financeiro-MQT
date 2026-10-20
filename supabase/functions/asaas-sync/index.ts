// Sincronização incremental do Asaas (spec 03): cobranças por dia de criação e
// de pagamento; uma vez por dia, links de pagamento e varredura por status
// (em aberto, vencidas, estornos e contestações). Depois de cada página busca
// os clientes e links ainda desconhecidos. Ver _shared/sync-runner.ts.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.118.0'
import { requireEnv } from '../_shared/admin.ts'
import { asaasGet, asaasPage, mapCustomer, mapPayment } from '../_shared/asaas.ts'
import { lastLocalDay, serveSync, uniqueBy } from '../_shared/sync-runner.ts'
import { addDays, buildAsaasPlan, spToday } from '../_shared/sync-state.ts'
import { chunk, upsertBatches } from '../_shared/sync.ts'

type Obj = Record<string, unknown>

/** Busca por id em lotes de 5 (limite de concorrência do Asaas); 404 é ignorado. */
async function fetchByIds(apiKey: string, path: string, ids: string[]): Promise<Obj[]> {
  const out: Obj[] = []
  for (const slice of chunk(ids, 5)) {
    const results = await Promise.all(
      slice.map((id) =>
        asaasGet(apiKey, `${path}/${id}`).catch((e: Error) => {
          if (/Asaas 404/.test(e.message)) return null
          throw e
        }),
      ),
    )
    for (const r of results) if (r) out.push(r)
  }
  return out
}

/** Clientes da página que ainda não estão no banco. */
async function syncMissingCustomers(sb: SupabaseClient, apiKey: string, userId: string, rows: Obj[]): Promise<number> {
  const ids = [...new Set(rows.map((r) => r.customer_id as string | null).filter(Boolean))] as string[]
  if (!ids.length) return 0
  const { data, error } = await sb.from('asaas_customers').select('asaas_id').in('asaas_id', ids)
  if (error) throw new Error(`asaas_customers: ${error.message}`)
  const known = new Set((data ?? []).map((k) => k.asaas_id as string))
  const missing = ids.filter((id) => !known.has(id))
  if (!missing.length) return 0
  const customers = (await fetchByIds(apiKey, '/customers', missing))
    .map((c) => mapCustomer(c, userId))
    .filter(Boolean) as Obj[]
  return upsertBatches(sb, 'asaas_customers', customers, 'asaas_id')
}

/**
 * Links que o gatilho de classificação criou só com o nome provisório
 * ("Link <id>"): busca o nome real, e a renomeação reclassifica as cobranças.
 */
async function syncPlaceholderLinks(sb: SupabaseClient, apiKey: string, userId: string, rows: Obj[]): Promise<number> {
  const ids = [...new Set(rows.map((r) => r.payment_link_id as string | null).filter(Boolean))] as string[]
  if (!ids.length) return 0
  const { data, error } = await sb
    .from('asaas_payment_links')
    .select('asaas_link_id, name')
    .eq('user_id', userId)
    .in('asaas_link_id', ids)
  if (error) throw new Error(`asaas_payment_links: ${error.message}`)
  const placeholders = (data ?? [])
    .filter((l) => l.name === `Link ${l.asaas_link_id}`)
    .map((l) => l.asaas_link_id as string)
  if (!placeholders.length) return 0
  const links = (await fetchByIds(apiKey, '/paymentLinks', placeholders))
    .map((l) => linkRow(l, userId))
    .filter(Boolean) as Obj[]
  return upsertBatches(sb, 'asaas_payment_links', links, 'user_id,asaas_link_id')
}

function linkRow(l: Obj, userId: string): Obj | null {
  const id = l.id ? String(l.id) : null
  const name = l.name ? String(l.name).trim() : ''
  return id && name ? { user_id: userId, asaas_link_id: id, name } : null
}

serveSync<{ apiKey: string }>({
  provider: 'asaas',
  intervalMinutes: Number(Deno.env.get('ASAAS_SYNC_INTERVAL_MINUTES') ?? '') || 60,
  maxBackfillDays: 400,
  prepare: () => ({ apiKey: requireEnv('ASAAS_API_KEY') }),

  async initialDone(sb, userId) {
    const created = await lastLocalDay(sb, 'asaas_payments', 'asaas_created_at', userId, 'date')
    const paid = await lastLocalDay(sb, 'asaas_payments', 'payment_date', userId, 'date')
    const done: Record<string, string> = {}
    if (created) done.dateCreated = created
    if (paid ?? created) done.paymentDate = (paid ?? created)!
    return done
  },

  buildPlan: buildAsaasPlan,

  async runPage(sb, { apiKey }, userId, step, cursor) {
    const offset = typeof cursor === 'number' ? cursor : 0

    if (step.kind === 'links') {
      const { data, next } = await asaasPage(apiKey, '/paymentLinks', {}, offset)
      const rows = uniqueBy(data.map((l) => linkRow(l, userId)).filter(Boolean) as Obj[], 'asaas_link_id')
      return { next, records: await upsertBatches(sb, 'asaas_payment_links', rows, 'user_id,asaas_link_id') }
    }

    let params: Record<string, string>
    if (step.kind === 'payments') {
      params = { [`${step.field}[ge]`]: step.since!, [`${step.field}[le]`]: step.until! }
    } else if (step.kind === 'status') {
      params = { status: step.status! }
      // Estornos e contestações: só do último ano (em aberto e vencidas: todas).
      if (step.status !== 'PENDING' && step.status !== 'OVERDUE') {
        params['dateCreated[ge]'] = addDays(spToday(), -365)
      }
    } else {
      throw new Error(`Passo desconhecido: ${step.kind}`)
    }

    const { data, next } = await asaasPage(apiKey, '/payments', params, offset)
    const rows = uniqueBy(data.map((p) => mapPayment(p, userId)).filter(Boolean) as Obj[], 'asaas_id')
    let records = await upsertBatches(sb, 'asaas_payments', rows, 'asaas_id')
    records += await syncMissingCustomers(sb, apiKey, userId, rows)
    records += await syncPlaceholderLinks(sb, apiKey, userId, rows)
    return { next, records }
  },
})
