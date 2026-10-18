// Webhook do Asaas (eventos de cobrança). Deploy com verify_jwt = false.
// Autenticação: header asaas-access-token igual ao secret ASAAS_WEBHOOK_TOKEN.
// Responde sempre 200 após registrar o evento (fila do Asaas pausa com erros).
import { adminClient } from '../_shared/admin.ts'
import { json, readJson, safeEqual, str } from '../_shared/http.ts'
import { asObject, mapPayment } from '../_shared/asaas.ts'
import { markWebhookProcessed, recordWebhookEvent, resolveOwner } from '../_shared/sync.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({ ok: true })
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405)

  const expected = Deno.env.get('ASAAS_WEBHOOK_TOKEN') ?? ''
  const received = req.headers.get('asaas-access-token') ?? ''
  if (!expected || !received || !safeEqual(received, expected)) {
    return json({ error: 'token inválido' }, 401)
  }

  let body: Record<string, unknown>
  try {
    body = await readJson(req)
  } catch (e) {
    return json({ error: (e as Error).message }, 400)
  }

  const sb = adminClient()
  const eventType = str(body.event)
  const payment = asObject(body.payment)
  const externalId = str(payment.id)
  const eventKey = str(body.id) ?? `${eventType ?? 'evento'}:${externalId ?? 'sem-id'}:${str(body.dateCreated) ?? Date.now()}`

  let owner
  try {
    owner = await resolveOwner(sb, 'asaas')
  } catch (e) {
    return json({ error: (e as Error).message }, 500)
  }

  let event
  try {
    event = await recordWebhookEvent(sb, {
      userId: owner?.userId ?? null,
      provider: 'asaas',
      eventKey,
      eventType,
      externalId,
      payload: body,
    })
  } catch (e) {
    return json({ error: `Falha ao registrar evento: ${(e as Error).message}` }, 500)
  }
  if (event.duplicate) return json({ ok: true, duplicate: true })

  if (!owner) {
    await markWebhookProcessed(sb, event.id, 'Integração Asaas sem usuário configurado')
    return json({ ok: true, stored: true, warning: 'integração não configurada' })
  }

  try {
    if (externalId) {
      const overrides = eventType === 'PAYMENT_DELETED' ? { deleted: true } : {}
      const row = mapPayment(payment, owner.userId, overrides)
      if (row) {
        const { error } = await sb.from('asaas_payments').upsert(row, { onConflict: 'asaas_id' })
        if (error) throw error
      }
    }
    await markWebhookProcessed(sb, event.id)
    return json({ ok: true, event: eventType })
  } catch (e) {
    const msg = (e as Error).message
    await markWebhookProcessed(sb, event.id, msg)
    return json({ ok: false, stored: true, error: msg })
  }
})
