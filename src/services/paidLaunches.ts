import { supabase, requireUserId, type TablesUpdate } from '@/lib/supabase/client'
import type { Json } from '@/lib/supabase/database.types'
import type {
  PaidLaunchRecord,
  PaidLaunchInput,
  ClassSessions,
  CommercialSales,
  UpsellPlatform,
} from '@/types/paidLaunches'

/** Converte o input da UI para as colunas da tabela (campos JSON tipados como Json). */
function toRow(data: PaidLaunchInput) {
  const students =
    data.students_in_challenge === '' || data.students_in_challenge === undefined
      ? null
      : Number(data.students_in_challenge) || 0
  return {
    capture_days: data.capture_days,
    batch: data.batch,
    ticket_ticket: data.ticket_ticket,
    traffic_investment: data.traffic_investment,
    total_ticket_sales: data.total_ticket_sales,
    ticket_refunds: data.ticket_refunds,
    bump_ticket: data.bump_ticket,
    bump_sales: data.bump_sales,
    bump_refunds: data.bump_refunds,
    api_official_cost: data.api_official_cost ?? null,
    commercial_commission: data.commercial_commission ?? null,
    revenue_tax_rate: data.revenue_tax_rate ?? null,
    traffic_tax_rate: data.traffic_tax_rate ?? null,
    students_in_challenge: students,
    debriefing: data.debriefing ?? null,
    daily_data: (data.daily_data ?? null) as unknown as Json,
    class_sessions: (data.class_sessions ?? null) as unknown as Json,
    commercial_sales: (data.commercial_sales ?? null) as unknown as Json,
    upsell_platform: (data.upsell_platform ?? null) as unknown as Json,
  }
}

export const paidLaunchesService = {
  /** Todas as turmas do usuário logado, mais recentes primeiro. */
  async getAll(): Promise<PaidLaunchRecord[]> {
    const { data, error } = await supabase
      .from('paid_launches')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      console.error('paidLaunchesService.getAll:', error)
      return []
    }
    return (data ?? []) as unknown as PaidLaunchRecord[]
  },

  async create(input: PaidLaunchInput): Promise<PaidLaunchRecord> {
    const userId = await requireUserId()
    const { data, error } = await supabase
      .from('paid_launches')
      .insert({ user_id: userId, ...toRow(input) })
      .select()
      .single()
    if (error) throw error
    return data as unknown as PaidLaunchRecord
  },

  async update(id: string, input: PaidLaunchInput): Promise<PaidLaunchRecord> {
    const { data, error } = await supabase
      .from('paid_launches')
      .update(toRow(input))
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as unknown as PaidLaunchRecord
  },

  /** Atualiza se houver id, senão cria. */
  async save(id: string | undefined, input: PaidLaunchInput): Promise<PaidLaunchRecord> {
    return id ? this.update(id, input) : this.create(input)
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase.from('paid_launches').delete().eq('id', id)
    if (error) throw error
    return true
  },

  /** Atualiza só os campos JSON (aulas / vendas comerciais / upsell). */
  async saveArrays(
    id: string,
    data: {
      class_sessions?: ClassSessions
      commercial_sales?: CommercialSales
      upsell_platform?: UpsellPlatform
    },
  ): Promise<PaidLaunchRecord> {
    const patch: TablesUpdate<'paid_launches'> = {}
    if (data.class_sessions) patch.class_sessions = data.class_sessions as unknown as Json
    if (data.commercial_sales) patch.commercial_sales = data.commercial_sales as unknown as Json
    if (data.upsell_platform) patch.upsell_platform = data.upsell_platform as unknown as Json
    const { data: row, error } = await supabase
      .from('paid_launches')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return row as unknown as PaidLaunchRecord
  },
}
