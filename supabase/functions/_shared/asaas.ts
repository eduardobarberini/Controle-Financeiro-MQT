import { int, num, sleep, str } from './http.ts'

type Obj = Record<string, unknown>
const obj = (v: unknown): Obj => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : {})

export function asaasBase(): string {
  const env = (Deno.env.get('ASAAS_ENV') ?? 'production').toLowerCase()
  return env === 'sandbox' ? 'https://api-sandbox.asaas.com/v3' : 'https://api.asaas.com/v3'
}

/** Soma dos estornos concluídos de uma cobrança. */
function refundedValue(p: Obj): number {
  const refunds = Array.isArray(p.refunds) ? (p.refunds as Obj[]) : []
  return refunds
    .filter((r) => String(r.status ?? '').toUpperCase() === 'DONE')
    .reduce((s, r) => s + num(r.value), 0)
}

const date = (v: unknown): string | null => {
  const s = str(v)
  return s ? s.slice(0, 10) : null
}

/** Converte uma cobrança (REST ou webhook) na linha de asaas_payments. */
export function mapPayment(p: Obj, userId: string, overrides: Obj = {}): Obj | null {
  const id = str(p.id)
  if (!id) return null
  return {
    user_id: userId,
    asaas_id: id,
    customer_id: str(p.customer),
    installment_id: str(p.installment),
    installment_number: p.installmentNumber === undefined || p.installmentNumber === null ? null : int(p.installmentNumber),
    value: num(p.value),
    net_value: num(p.netValue),
    original_value: p.originalValue === undefined || p.originalValue === null ? null : num(p.originalValue),
    interest_value: p.interestValue === undefined || p.interestValue === null ? null : num(p.interestValue),
    refunded_value: refundedValue(p),
    billing_type: str(p.billingType),
    status: str(p.status) ?? 'UNKNOWN',
    due_date: date(p.dueDate),
    original_due_date: date(p.originalDueDate),
    payment_date: date(p.paymentDate),
    client_payment_date: date(p.clientPaymentDate),
    confirmed_date: date(p.confirmedDate),
    credit_date: date(p.creditDate),
    estimated_credit_date: date(p.estimatedCreditDate),
    description: str(p.description),
    external_reference: str(p.externalReference),
    invoice_url: str(p.invoiceUrl),
    deleted: Boolean(p.deleted),
    asaas_created_at: date(p.dateCreated),
    raw: p,
    ...overrides,
  }
}

export function mapCustomer(c: Obj, userId: string): Obj | null {
  const id = str(c.id)
  if (!id) return null
  return {
    user_id: userId,
    asaas_id: id,
    name: str(c.name),
    email: str(c.email),
    cpf_cnpj: str(c.cpfCnpj),
    phone: str(c.mobilePhone) ?? str(c.phone),
    raw: c,
  }
}

/** GET autenticado no Asaas com tratamento de 429 (sem Retry-After: espera fixa). */
export async function asaasGet(apiKey: string, path: string, params: Record<string, string> = {}): Promise<Obj> {
  const url = new URL(asaasBase() + path)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, {
      headers: {
        access_token: apiKey,
        'User-Agent': 'ControleFinanceiroMQT/1.0',
        Accept: 'application/json',
      },
    })
    if (res.status === 429) {
      await sleep((attempt + 1) * 15_000)
      continue
    }
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`Asaas ${res.status} em ${path}: ${body.slice(0, 300)}`)
    }
    return (await res.json()) as Obj
  }
  throw new Error(`Asaas: limite de requisições excedido em ${path}`)
}

/** Percorre todas as páginas (offset/limit) de uma listagem. */
export async function* asaasPaginate(
  apiKey: string,
  path: string,
  params: Record<string, string> = {},
  limit = 100,
): AsyncGenerator<Obj> {
  let offset = 0
  for (let page = 0; page < 1000; page++) {
    const res = await asaasGet(apiKey, path, { ...params, limit: String(limit), offset: String(offset) })
    const data = Array.isArray(res.data) ? (res.data as Obj[]) : []
    for (const item of data) yield item
    if (!res.hasMore || data.length === 0) break
    offset += limit
  }
}

export { obj as asObject }
