import { int, num, ProviderAuthError, RateLimitError, sleep, str } from './http.ts'

export const META_VERSION = Deno.env.get('META_API_VERSION') ?? 'v26.0'
export const META_BASE = `https://graph.facebook.com/${META_VERSION}`

type Obj = Record<string, unknown>
type ActionStat = { action_type?: string; value?: string | number }

export const INSIGHT_FIELDS = [
  'campaign_id',
  'campaign_name',
  'date_start',
  'date_stop',
  'spend',
  'impressions',
  'reach',
  'clicks',
  'inline_link_clicks',
  'cpm',
  'cpc',
  'ctr',
  'frequency',
  'actions',
  'action_values',
].join(',')

export const CAMPAIGN_FIELDS = [
  'id',
  'name',
  'status',
  'effective_status',
  'objective',
  'created_time',
  'updated_time',
].join(',')

/** Soma o valor de um ou mais action_type (o array só traz tipos com valor > 0). */
function pick(arr: unknown, types: string[]): number {
  if (!Array.isArray(arr)) return 0
  const list = arr as ActionStat[]
  // Usa o primeiro tipo encontrado na ordem de preferência (evita somar agregados com componentes).
  for (const t of types) {
    const hit = list.find((a) => a.action_type === t)
    if (hit) return num(hit.value)
  }
  return 0
}

/** Converte uma linha de insights (level=campaign, time_increment=1) em meta_ad_insights. */
export function mapInsight(row: Obj, userId: string, adAccountId: string): Obj | null {
  const campaignId = str(row.campaign_id)
  const date = str(row.date_start)
  if (!campaignId || !date) return null
  return {
    user_id: userId,
    date: date.slice(0, 10),
    campaign_id: campaignId,
    campaign_name: str(row.campaign_name),
    ad_account_id: adAccountId,
    spend: num(row.spend),
    impressions: int(row.impressions),
    reach: int(row.reach),
    clicks: int(row.clicks),
    link_clicks: int(row.inline_link_clicks),
    cpm: row.cpm === undefined ? null : num(row.cpm),
    cpc: row.cpc === undefined ? null : num(row.cpc),
    ctr: row.ctr === undefined ? null : num(row.ctr),
    frequency: row.frequency === undefined ? null : num(row.frequency),
    landing_page_views: int(pick(row.actions, ['landing_page_view'])),
    leads: int(pick(row.actions, ['lead', 'offsite_conversion.fb_pixel_lead'])),
    initiate_checkouts: int(
      pick(row.actions, ['omni_initiated_checkout', 'offsite_conversion.fb_pixel_initiate_checkout']),
    ),
    purchases: int(pick(row.actions, ['omni_purchase', 'offsite_conversion.fb_pixel_purchase'])),
    purchase_value: pick(row.action_values, ['omni_purchase', 'offsite_conversion.fb_pixel_purchase']),
    actions: Array.isArray(row.actions) ? row.actions : null,
    action_values: Array.isArray(row.action_values) ? row.action_values : null,
    raw: row,
  }
}

export function mapCampaign(c: Obj, userId: string, adAccountId: string): Obj | null {
  const id = str(c.id)
  if (!id) return null
  return {
    user_id: userId,
    campaign_id: id,
    ad_account_id: adAccountId,
    name: str(c.name),
    status: str(c.status),
    effective_status: str(c.effective_status),
    objective: str(c.objective),
    created_time: str(c.created_time),
    updated_time: str(c.updated_time),
    raw: c,
  }
}

/**
 * GET na Graph API. Throttling (códigos 4, 17, 32, 613, 80000) é repetido uma
 * vez depois de 5 s; persistindo, vira RateLimitError (5 min). Token inválido
 * ou sem permissão (190, 102, 10, 200) vira ProviderAuthError.
 */
export async function metaGet(token: string, pathOrUrl: string, params: Record<string, string> = {}): Promise<Obj> {
  const url = new URL(pathOrUrl.startsWith('http') ? pathOrUrl : META_BASE + pathOrUrl)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  url.searchParams.set('access_token', token)
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(url)
    const body = (await res.json().catch(() => ({}))) as Obj
    if (res.ok && !body.error) return body
    const err = (body.error ?? {}) as Obj
    const code = Number(err.code ?? 0)
    const message = `Meta ${res.status} em ${url.pathname}: ${String(err.message ?? JSON.stringify(body)).slice(0, 300)} (code ${code})`
    if ([4, 17, 32, 613, 80000].includes(code)) {
      if (attempt === 0) {
        await sleep(5_000)
        continue
      }
      throw new RateLimitError(message, 300)
    }
    if ([190, 102, 10, 200].includes(code) || res.status === 401) throw new ProviderAuthError(message)
    throw new Error(message)
  }
  throw new RateLimitError('Meta: limite de requisições excedido', 300)
}

/** Percorre todas as páginas (paging.next) de uma listagem da Graph API. */
export async function* metaPaginate(
  token: string,
  path: string,
  params: Record<string, string>,
): AsyncGenerator<Obj> {
  let next: string | null = null
  for (let page = 0; page < 500; page++) {
    const res = next ? await metaGet(token, next) : await metaGet(token, path, params)
    const data = Array.isArray(res.data) ? (res.data as Obj[]) : []
    for (const item of data) yield item
    const paging = (res.paging ?? {}) as Obj
    next = str(paging.next)
    if (!next) break
  }
}

/** Normaliza o id da conta de anúncios para o formato act_123. */
export function normalizeAdAccountId(v: string): string {
  const s = v.trim()
  return s.startsWith('act_') ? s : `act_${s}`
}
