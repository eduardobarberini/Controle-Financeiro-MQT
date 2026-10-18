import { supabase, requireUserId } from '@/lib/supabase/client'
import type { RenewalRecord } from '@/types/renewals'

export interface RenewalInput {
  year: number
  month: number // 1-12
  students_to_renew: number
  renewals: number
  renewal_revenue: number
}

export const renewalsService = {
  /** Renovações de um ano (usuário logado), ordenadas por mês. */
  async getByYear(year: number): Promise<RenewalRecord[]> {
    const { data, error } = await supabase
      .from('renewals')
      .select('*')
      .eq('year', year)
      .order('month')
    if (error) {
      console.error('renewalsService.getByYear:', error)
      return []
    }
    return (data ?? []) as RenewalRecord[]
  },

  /** Cria ou atualiza o mês (único por usuário/ano/mês). */
  async save(_id: string | undefined, input: RenewalInput): Promise<RenewalRecord> {
    const userId = await requireUserId()
    const { data, error } = await supabase
      .from('renewals')
      .upsert(
        {
          user_id: userId,
          year: input.year,
          month: input.month,
          students_to_renew: input.students_to_renew,
          renewals: input.renewals,
          renewal_revenue: input.renewal_revenue,
        },
        { onConflict: 'user_id,year,month' },
      )
      .select()
      .single()
    if (error) throw error
    return data as RenewalRecord
  },
}
