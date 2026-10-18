// Sincronização da Meta Marketing API: campanhas e insights diários por
// campanha (gasto, impressões, cliques, leads, compras...). Janela deslizante
// `days` (1..400, padrão 7) em blocos de 30 dias, porque conversões podem ser
// revisadas por até 28 dias.
import { adminClient, requireEnv } from '../_shared/admin.ts'
import { clampInt, daysAgoIso, json, readJson, str, todayIso } from '../_shared/http.ts'
import {
  CAMPAIGN_FIELDS,
  INSIGHT_FIELDS,
  mapCampaign,
  mapInsight,
  metaPaginate,
  normalizeAdAccountId,
} from '../_shared/meta.ts'
import {
  authenticateCaller,
  finishRun,
  resolveOwner,
  startRun,
  upsertBatches,
  type Trigger,
} from '../_shared/sync.ts'

type Obj = Record<string, unknown>

function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({ ok: true })

  const sb = adminClient()
  const caller = await authenticateCaller(req, sb)
  if (!caller.isService && !caller.userId) return json({ error: 'Não autorizado' }, 401)

  const body = req.method === 'POST' ? await readJson(req).catch(() => ({})) : {}
  const url = new URL(req.url)
  const days = clampInt(body.days ?? url.searchParams.get('days'), 7, 1, 400)
  const trigger: Trigger = caller.isService
    ? (body.trigger === 'backfill' ? 'backfill' : 'cron')
    : days > 30
      ? 'backfill'
      : 'manual'

  const owner = await resolveOwner(sb, 'meta')
  if (!owner) return json({ error: 'Integração Meta não configurada' }, 422)
  if (caller.userId && caller.userId !== owner.userId) return json({ error: 'Não autorizado' }, 403)
  if (caller.isService && !owner.enabled) return json({ ok: true, skipped: 'disabled' })

  const configured = str(owner.config.ad_account_id) ?? Deno.env.get('META_AD_ACCOUNT_ID') ?? ''
  if (!configured) return json({ error: 'Conta de anúncios (ad_account_id) não configurada' }, 422)
  if (!/^(act_)?\d+$/.test(configured.trim())) {
    return json({ error: 'Conta de anúncios inválida: use o formato act_1234567890' }, 422)
  }
  const adAccountId = normalizeAdAccountId(configured)

  const runId = await startRun(sb, {
    userId: owner.userId,
    provider: 'meta',
    trigger,
    details: { days, ad_account_id: adAccountId },
  })

  try {
    const token = requireEnv('META_ACCESS_TOKEN')

    // Campanhas (inclui pausadas e arquivadas para manter nomes/objetivos).
    const campaigns: Obj[] = []
    for await (const c of metaPaginate(token, `/${adAccountId}/campaigns`, {
      fields: CAMPAIGN_FIELDS,
      effective_status: JSON.stringify(['ACTIVE', 'PAUSED', 'ARCHIVED', 'IN_PROCESS', 'WITH_ISSUES']),
      limit: '200',
    })) {
      const row = mapCampaign(c, owner.userId, adAccountId)
      if (row) campaigns.push(row)
    }
    const campaignsCount = await upsertBatches(sb, 'meta_campaigns', campaigns, 'campaign_id')

    // Insights diários por campanha, em blocos de no máximo 30 dias.
    const until = todayIso()
    let since = daysAgoIso(days - 1)
    const insights = new Map<string, Obj>()
    while (since <= until) {
      const chunkEnd = addDays(since, 29) < until ? addDays(since, 29) : until
      for await (const row of metaPaginate(token, `/${adAccountId}/insights`, {
        level: 'campaign',
        fields: INSIGHT_FIELDS,
        time_range: JSON.stringify({ since, until: chunkEnd }),
        time_increment: '1',
        use_unified_attribution_setting: 'true',
        limit: '500',
      })) {
        const mapped = mapInsight(row, owner.userId, adAccountId)
        if (mapped) insights.set(`${mapped.campaign_id}:${mapped.date}`, mapped)
      }
      since = addDays(chunkEnd, 1)
    }
    const insightsCount = await upsertBatches(
      sb,
      'meta_ad_insights',
      [...insights.values()],
      'user_id,campaign_id,date',
    )

    const details = {
      days,
      ad_account_id: adAccountId,
      campaigns: campaignsCount,
      insight_rows: insightsCount,
    }
    await finishRun(sb, runId, {
      userId: owner.userId,
      provider: 'meta',
      status: 'success',
      records: campaignsCount + insightsCount,
      details,
    })
    return json({ ok: true, ...details })
  } catch (e) {
    const msg = (e as Error).message
    await finishRun(sb, runId, { userId: owner.userId, provider: 'meta', status: 'error', error: msg })
    return json({ ok: false, error: msg }, 500)
  }
})
