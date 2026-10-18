import { supabase, requireUserId } from '@/lib/supabase/client'
import type { MonthlyDetailsRecord } from '@/types/financial'

export interface MonthlyDetailsInput {
  year: number
  month: number // 1-12
  revenue: number
  ads_meta: number
  sales_commission: number
  other_variable_costs: number
  fixed_costs: number
}

export const monthlyDetailsService = {
  /** Registros mensais de um ano (usuário logado), ordenados por mês. */
  async getByYear(year: number): Promise<MonthlyDetailsRecord[]> {
    const { data, error } = await supabase
      .from('monthly_details')
      .select('*')
      .eq('year', year)
      .order('month')
    if (error) throw new Error(`Falha ao carregar dados mensais: ${error.message}`)
    return (data ?? []) as MonthlyDetailsRecord[]
  },

  /** Cria ou atualiza o mês (único por usuário/ano/mês). O id é ignorado: a chave é a competência. */
  async save(_id: string | undefined, input: MonthlyDetailsInput): Promise<MonthlyDetailsRecord> {
    const userId = await requireUserId()
    const { data, error } = await supabase
      .from('monthly_details')
      .upsert(
        {
          user_id: userId,
          year: input.year,
          month: input.month,
          revenue: input.revenue,
          ads_meta: input.ads_meta,
          sales_commission: input.sales_commission,
          other_variable_costs: input.other_variable_costs,
          fixed_costs: input.fixed_costs,
        },
        { onConflict: 'user_id,year,month' },
      )
      .select()
      .single()
    if (error) throw error
    return data as MonthlyDetailsRecord
  },
}
