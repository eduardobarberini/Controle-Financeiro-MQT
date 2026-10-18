import { supabase, requireUserId } from '@/lib/supabase/client'
import type { GoalsRecord } from '@/types/financial'

export const goalsService = {
  /** Metas do ano para o usuário logado (ou null se ainda não definidas). */
  async getByYear(year: number): Promise<GoalsRecord | null> {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('year', year)
      .maybeSingle()
    if (error) {
      console.error('goalsService.getByYear:', error)
      return null
    }
    return data as GoalsRecord | null
  },

  /** Cria ou atualiza as metas do ano (único por usuário/ano). */
  async saveGoals(
    year: number,
    annualRevenueGoal: number,
    annualProfitGoal: number,
    taxMetaRate?: number,
    salesTaxRate?: number,
    profitMarginGoal?: number | null,
    renewalRateGoal?: number | null,
  ): Promise<GoalsRecord> {
    const userId = await requireUserId()

    const toNullable = (v: number | null | undefined) =>
      v === undefined || v === null ? null : Number(v) || 0

    const { data, error } = await supabase
      .from('goals')
      .upsert(
        {
          user_id: userId,
          year: Number(year),
          annual_revenue_goal: Number(annualRevenueGoal) || 0,
          annual_profit_goal: Number(annualProfitGoal) || 0,
          tax_meta_rate: taxMetaRate !== undefined ? Number(taxMetaRate) || 0 : 0,
          sales_tax_rate: salesTaxRate !== undefined ? Number(salesTaxRate) || 0 : 0,
          profit_margin_goal: toNullable(profitMarginGoal),
          renewal_rate_goal: toNullable(renewalRateGoal),
        },
        { onConflict: 'user_id,year' },
      )
      .select()
      .single()
    if (error) throw error
    return data as GoalsRecord
  },
}
