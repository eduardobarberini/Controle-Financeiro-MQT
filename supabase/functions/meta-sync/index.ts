// Sincronização da Meta Marketing API (spec 03): campanhas e insights diários
// por campanha em blocos de 7 dias. Rodada a cada 4 h repuxa os últimos 7 dias;
// uma vez por semana, os últimos 35 (conversões revisadas por até 28 dias).
// Ver _shared/sync-runner.ts.
import { requireEnv } from '../_shared/admin.ts'
import { json, str } from '../_shared/http.ts'
import {
  CAMPAIGN_FIELDS,
  INSIGHT_FIELDS,
  mapCampaign,
  mapInsight,
  metaPaginate,
  normalizeAdAccountId,
} from '../_shared/meta.ts'
import { lastLocalDay, serveSync, uniqueBy } from '../_shared/sync-runner.ts'
import { buildMetaPlan } from '../_shared/sync-state.ts'
import { upsertBatches } from '../_shared/sync.ts'

type Obj = Record<string, unknown>

serveSync<{ token: string; adAccountId: string }>({
  provider: 'meta',
  intervalMinutes: Number(Deno.env.get('META_SYNC_INTERVAL_MINUTES') ?? '') || 240,
  maxBackfillDays: 400,

  prepare(owner) {
    const configured = (str(owner.config.ad_account_id) ?? Deno.env.get('META_AD_ACCOUNT_ID') ?? '').trim()
    if (!configured) return json({ error: 'Conta de anúncios (ad_account_id) não configurada' }, 422)
    const adAccountId = normalizeAdAccountId(configured)
    if (!/^act_\d+$/.test(adAccountId)) {
      return json({ error: 'Conta de anúncios inválida: use o formato act_1234567890' }, 422)
    }
    return { token: requireEnv('META_ACCESS_TOKEN'), adAccountId }
  },

  async initialDone(sb, userId) {
    const day = await lastLocalDay(sb, 'meta_ad_insights', 'date', userId, 'date')
    return day ? { insights: day } : {}
  },

  buildPlan: buildMetaPlan,

  // Cada passo é pequeno (campanhas × 7 dias): busca o bloco inteiro de uma vez.
  async runPage(sb, { token, adAccountId }, userId, step) {
    if (step.kind === 'campaigns') {
      const rows: Obj[] = []
      for await (const c of metaPaginate(token, `/${adAccountId}/campaigns`, {
        fields: CAMPAIGN_FIELDS,
        effective_status: JSON.stringify(['ACTIVE', 'PAUSED', 'ARCHIVED', 'IN_PROCESS', 'WITH_ISSUES']),
        limit: '200',
      })) {
        const row = mapCampaign(c, userId, adAccountId)
        if (row) rows.push(row)
      }
      return { next: null, records: await upsertBatches(sb, 'meta_campaigns', uniqueBy(rows, 'campaign_id'), 'campaign_id') }
    }

    if (step.kind === 'insights') {
      const rows = new Map<string, Obj>()
      for await (const row of metaPaginate(token, `/${adAccountId}/insights`, {
        level: 'campaign',
        fields: INSIGHT_FIELDS,
        time_range: JSON.stringify({ since: step.since, until: step.until }),
        time_increment: '1',
        use_unified_attribution_setting: 'true',
        limit: '500',
      })) {
        const mapped = mapInsight(row, userId, adAccountId)
        if (mapped) rows.set(`${mapped.campaign_id}:${mapped.date}`, mapped)
      }
      return {
        next: null,
        records: await upsertBatches(sb, 'meta_ad_insights', [...rows.values()], 'user_id,campaign_id,date'),
      }
    }

    throw new Error(`Passo desconhecido: ${step.kind}`)
  },
})
