// Webhook do Digital Manager Guru (vendas e assinaturas).
// Deploy com verify_jwt = false (config.toml). Autenticação: campo api_token do
// corpo deve ser igual ao Account Token da conta (secret GURU_ACCOUNT_TOKEN).
import { adminClient } from '../_shared/admin.ts'
import { json, readJson, safeEqual, str } from '../_shared/http.ts'
import { mapSubscription, mapTransaction } from '../_shared/guru.ts'
import { markWebhookProcessed, recordWebhookEvent, resolveOwner } from '../_shared/sync.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({ ok: true })
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405)

  let body: Record<string, unknown>
  try {
    body = await readJson(req)
  } catch (e) {
    return json({ error: (e as Error).message }, 400)
  }

  const expected = Deno.env.get('GURU_ACCOUNT_TOKEN') ?? ''
  const received = String(body.api_token ?? '')
  if (!expected || !received || !safeEqual(received, expected)) {
    // 401 faz o Guru não reenviar (código sem retentativa).
    return json({ error: 'api_token inválido' }, 401)
  }

  const sb = adminClient()
  const type = str(body.webhook_type) ?? 'unknown'
  const externalId = str(body.internal_id) ?? str(body.id)
  const dates = (body.dates ?? {}) as Record<string, unknown>
  const eventKey =
    req.headers.get('x-request-id') ??
    `${type}:${externalId ?? 'sem-id'}:${str(dates.updated_at) ?? str(body.last_status_at) ?? Date.now()}`

  let owner
  try {
    owner = await resolveOwner(sb, 'guru')
  } catch (e) {
    return json({ error: (e as Error).message }, 500)
  }

  let event
  try {
    event = await recordWebhookEvent(sb, {
      userId: owner?.userId ?? null,
      provider: 'guru',
      eventKey,
      eventType: `${type}:${str(body.status) ?? str(body.last_status) ?? ''}`,
      externalId,
      payload: body,
    })
  } catch (e) {
    return json({ error: `Falha ao registrar evento: ${(e as Error).message}` }, 500)
  }
  if (event.duplicate) return json({ ok: true, duplicate: true })

  if (!owner) {
    await markWebhookProcessed(sb, event.id, 'Integração Guru sem usuário configurado')
    return json({ ok: true, stored: true, warning: 'integração não configurada' })
  }

  try {
    if (type === 'transaction') {
      const row = mapTransaction(body, owner.userId)
      if (!row) throw new Error('Transação sem id')
      const { error } = await sb.from('guru_transactions').upsert(row, { onConflict: 'guru_id' })
      if (error) throw error
    } else if (type === 'subscription') {
      const row = mapSubscription(body, owner.userId)
      if (!row) throw new Error('Assinatura sem id')
      const { error } = await sb.from('guru_subscriptions').upsert(row, { onConflict: 'guru_id' })
      if (error) throw error
      // A última transação da assinatura também vem no payload.
      const last = body.last_transaction
      if (last && typeof last === 'object') {
        const tx = mapTransaction(last as Record<string, unknown>, owner.userId)
        if (tx) await sb.from('guru_transactions').upsert(tx, { onConflict: 'guru_id' })
      }
    }
    await markWebhookProcessed(sb, event.id)
    return json({ ok: true, type })
  } catch (e) {
    const msg = (e as Error).message
    await markWebhookProcessed(sb, event.id, msg)
    // 200 mesmo em erro de processamento: o evento está salvo e o sync diário corrige.
    return json({ ok: false, stored: true, error: msg })
  }
})
