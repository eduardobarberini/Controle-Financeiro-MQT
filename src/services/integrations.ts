import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase, requireUserId } from '@/lib/supabase/client'
import type { BaseRow } from '@/types/financial'

export type IntegrationProvider = 'guru' | 'asaas' | 'meta'

export interface IntegrationSetting extends BaseRow {
  provider: IntegrationProvider
  enabled: boolean
  config: Record<string, unknown>
  last_sync_at: string | null
  last_sync_status: string | null
  last_error: string | null
}

export interface SyncRun {
  id: string
  user_id: string | null
  provider: IntegrationProvider
  trigger: 'cron' | 'manual' | 'webhook' | 'backfill'
  status: 'running' | 'success' | 'error'
  started_at: string
  finished_at: string | null
  records_upserted: number
  details: Record<string, unknown>
  error: string | null
}

export interface MonthlyIntegrationRow {
  user_id: string
  year: number
  month: number
  guru_sales: number
  guru_gross: number
  guru_net: number
  guru_refund_count: number
  guru_refunded: number
  asaas_paid_count: number
  asaas_received: number
  asaas_net: number
  asaas_refunded: number
  meta_spend: number
  meta_impressions: number
  meta_link_clicks: number
  meta_leads: number
  meta_purchases: number
  meta_purchase_value: number
}

export interface AsaasReceivables {
  open_count: number
  open_value: number
  overdue_count: number
  overdue_value: number
}

export interface SyncResult {
  ok: boolean
  error?: string
  [key: string]: unknown
}

export const PROVIDER_LABELS: Record<IntegrationProvider, string> = {
  guru: 'Guru (vendas à vista)',
  asaas: 'Asaas (parcelado PIX / boleto)',
  meta: 'Meta Ads (tráfego)',
}

export const integrationsService = {
  async getSettings(): Promise<IntegrationSetting[]> {
    const { data, error } = await supabase.from('integration_settings').select('*').order('provider')
    if (error) {
      console.error('integrationsService.getSettings:', error)
      return []
    }
    return (data ?? []) as unknown as IntegrationSetting[]
  },

  /** Cria ou atualiza a linha do provedor (habilitado / parâmetros). */
  async upsertSetting(
    provider: IntegrationProvider,
    patch: { enabled?: boolean; config?: Record<string, unknown> },
  ): Promise<IntegrationSetting> {
    const userId = await requireUserId()
    const row: Record<string, unknown> = { user_id: userId, provider }
    if (patch.enabled !== undefined) row.enabled = patch.enabled
    if (patch.config !== undefined) row.config = patch.config
    const { data, error } = await supabase
      .from('integration_settings')
      .upsert(row as { user_id: string; provider: IntegrationProvider }, {
        onConflict: 'user_id,provider',
      })
      .select()
      .single()
    if (error) throw error
    return data as unknown as IntegrationSetting
  },

  async getRecentRuns(limit = 20): Promise<SyncRun[]> {
    const { data, error } = await supabase
      .from('sync_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(limit)
    if (error) {
      console.error('integrationsService.getRecentRuns:', error)
      return []
    }
    return (data ?? []) as unknown as SyncRun[]
  },

  /** Dispara a sincronização do provedor (Edge Function <provider>-sync). */
  async triggerSync(provider: IntegrationProvider, days: number): Promise<SyncResult> {
    const { data, error } = await supabase.functions.invoke<SyncResult>(`${provider}-sync`, {
      body: { days },
    })
    if (error) {
      let message = error.message
      if (error instanceof FunctionsHttpError) {
        try {
          const body = (await error.context.json()) as { error?: string }
          if (body?.error) message = body.error
        } catch {
          /* mantém a mensagem padrão */
        }
      }
      throw new Error(message)
    }
    if (!data?.ok) throw new Error(data?.error ?? 'Falha na sincronização')
    return data
  },

  async getMonthlyIntegrations(year: number): Promise<MonthlyIntegrationRow[]> {
    const { data, error } = await supabase
      .from('v_monthly_integrations')
      .select('*')
      .eq('year', year)
      .order('month')
    if (error) {
      console.error('integrationsService.getMonthlyIntegrations:', error)
      return []
    }
    return (data ?? []) as unknown as MonthlyIntegrationRow[]
  },

  async getReceivables(): Promise<AsaasReceivables | null> {
    const { data, error } = await supabase.from('v_asaas_receivables').select('*').maybeSingle()
    if (error) {
      console.error('integrationsService.getReceivables:', error)
      return null
    }
    return (data as unknown as AsaasReceivables) ?? null
  },

  /** URL pública do webhook do provedor (para colar no painel do Guru/Asaas). */
  webhookUrl(provider: 'guru' | 'asaas'): string {
    const base = (import.meta.env.VITE_SUPABASE_URL as string).replace(/\/$/, '')
    return `${base}/functions/v1/${provider}-webhook`
  },
}
