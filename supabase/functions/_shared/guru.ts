import { int, num, sleep, str } from './http.ts'

export const GURU_BASE = 'https://digitalmanager.guru/api/v2'

type Obj = Record<string, unknown>
const flag = (v: unknown): boolean => v === true || v === 1 || v === '1' || v === 'true'
const obj = (v: unknown): Obj => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : {})

/** REST devolve Unix (segundos); webhook devolve ISO. Normaliza para ISO ou null. */
export function toIso(v: unknown): string | null {
  if (v === null || v === undefined || v === '' || v === 0) return null
  if (typeof v === 'number') return new Date(v * 1000).toISOString()
  let s = String(v).trim()
  if (/^\d{9,11}$/.test(s)) return new Date(Number(s) * 1000).toISOString()
  // "YYYY-MM-DD HH:MM:SS" sem fuso: horário da conta (Brasília, sem horário de verão).
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s)) s = s.replace(' ', 'T') + '-03:00'
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

/**
 * Cópia da transação para a coluna `raw`, sem `infrastructure` (IP, navegador,
 * geolocalização): não serve ao financeiro e é ~15% do tamanho.
 */
export function compactRaw(t: Obj): Obj {
  const { infrastructure: _infrastructure, ...rest } = t
  return rest
}

/** Converte uma transação (REST ou webhook) na linha de guru_transactions. */
export function mapTransaction(t: Obj, userId: string): Obj | null {
  const id = str(t.id)
  if (!id) return null
  const dates = obj(t.dates)
  const payment = obj(t.payment)
  const product = obj(t.product)
  const offer = obj(product.offer)
  const contact = obj(t.contact)
  const installments = obj(payment.installments)
  const tax = obj(payment.tax)
  const coupon = obj(payment.coupon)
  // UTMs: `trackings` no REST, `source` no webhook.
  const track = Object.keys(obj(t.trackings)).length ? obj(t.trackings) : obj(t.source)
  const affiliations = Array.isArray(t.affiliations) ? (t.affiliations as Obj[]) : []
  const subscription = obj(t.subscription)
  const invoice = obj(t.invoice)

  return {
    user_id: userId,
    guru_id: id,
    status: str(t.status) ?? 'unknown',
    type: str(t.type),
    is_order_bump: flag(t.is_order_bump),
    has_order_bump: flag(t.has_order_bump),
    product_id: str(product.id),
    product_name: str(product.name),
    product_type: str(product.type),
    offer_id: str(offer.id),
    offer_name: str(offer.name),
    quantity: product.qty === undefined ? null : int(product.qty),
    payment_method: str(payment.method),
    installments: installments.qty === undefined ? null : int(installments.qty),
    gross: num(payment.gross),
    net: num(payment.net),
    total: num(payment.total),
    discount_value: num(payment.discount_value),
    affiliate_value: num(payment.affiliate_value),
    marketplace_value: num(payment.marketplace_value),
    tax_value: num(tax.value),
    currency: str(payment.currency),
    marketplace_name: str(payment.marketplace_name),
    marketplace_id: str(payment.marketplace_id),
    customer_id: str(contact.id),
    customer_name: str(contact.name),
    customer_email: str(contact.email),
    customer_doc: str(contact.doc),
    affiliate_name: affiliations.length ? str(affiliations[0].name) : null,
    coupon_code: str(coupon.coupon_code),
    source: str(track.source),
    checkout_source: str(track.checkout_source),
    // Nome do checkout ("Comercial - Maju - R$ 297 - ...") identifica a vendedora.
    checkout_name: str(obj(track.pptc).checkout_name),
    utm_source: str(track.utm_source),
    utm_medium: str(track.utm_medium),
    utm_campaign: str(track.utm_campaign),
    utm_content: str(track.utm_content),
    utm_term: str(track.utm_term),
    subscription_code: str(subscription.subscription_code) ?? str(subscription.id),
    subscription_status: str(subscription.last_status),
    invoice_cycle: invoice.cycle === undefined ? null : int(invoice.cycle),
    invoice_type: str(invoice.type),
    ordered_at: toIso(dates.ordered_at),
    confirmed_at: toIso(dates.confirmed_at),
    canceled_at: toIso(dates.canceled_at),
    guru_updated_at: toIso(dates.updated_at),
    raw: compactRaw(t),
  }
}

/** Converte uma assinatura (REST ou webhook) na linha de guru_subscriptions. */
export function mapSubscription(s: Obj, userId: string): Obj | null {
  // REST: id = UUID. Webhook: id = sub_..., internal_id = UUID.
  const id = str(s.internal_id) ?? str(s.id)
  if (!id) return null
  const dates = obj(s.dates)
  const product = obj(s.product)
  const contact = Object.keys(obj(s.subscriber)).length ? obj(s.subscriber) : obj(s.contact)
  const nextCycle = toIso(dates.next_cycle_at ?? s.next_cycle_at)
  return {
    user_id: userId,
    guru_id: id,
    subscription_code: str(s.subscription_code) ?? (String(s.id ?? '').startsWith('sub_') ? str(s.id) : null),
    status: str(s.last_status) ?? 'unknown',
    product_id: str(product.id),
    product_name: str(product.name) ?? str(s.name),
    customer_id: str(contact.id),
    customer_name: str(contact.name),
    customer_email: str(contact.email),
    payment_method: str(s.payment_method),
    charged_every_days: s.charged_every_days === undefined ? null : int(s.charged_every_days),
    charged_times: s.charged_times === undefined ? null : int(s.charged_times),
    next_cycle_at: nextCycle ? nextCycle.slice(0, 10) : null,
    next_cycle_value: s.next_cycle_value === undefined ? null : num(s.next_cycle_value),
    started_at: toIso(dates.started_at ?? s.started_at),
    cancelled_at: toIso(dates.canceled_at ?? s.cancelled_at),
    cancel_at_cycle_end: Boolean(Number(s.cancel_at_cycle_end ?? 0)),
    raw: s,
  }
}

/** GET autenticado na API do Guru com tratamento de 429. */
export async function guruGet(
  token: string,
  path: string,
  params: Record<string, string | string[]>,
): Promise<Obj> {
  const url = new URL(GURU_BASE + path)
  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) v.forEach((x) => url.searchParams.append(`${k}[]`, x))
    else url.searchParams.set(k, v)
  }
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    })
    if (res.status === 429) {
      const retry = Number(res.headers.get('Retry-After') ?? '5')
      await sleep(Math.min(60, Math.max(1, retry)) * 1000)
      continue
    }
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`Guru ${res.status} em ${path}: ${body.slice(0, 300)}`)
    }
    return (await res.json()) as Obj
  }
  throw new Error(`Guru: limite de requisições excedido em ${path}`)
}

/** Percorre todas as páginas (cursor) de um endpoint de listagem. */
export async function* guruPaginate(
  token: string,
  path: string,
  params: Record<string, string | string[]>,
): AsyncGenerator<Obj> {
  let cursor: string | null = null
  for (let page = 0; page < 500; page++) {
    const res = await guruGet(token, path, cursor ? { ...params, cursor } : params)
    const data = Array.isArray(res.data) ? (res.data as Obj[]) : []
    for (const item of data) yield item
    if (!res.has_more_pages || !res.next_cursor) break
    cursor = String(res.next_cursor)
  }
}
