import pb from '@/lib/pocketbase/client'
import { MonthlyDetailsRecord } from '@/types/financial'

export interface MonthlyDetailsInput {
  year: number
  month: number // 1-12
  revenue: number
  investment: number
  ads_meta: number
  tax_meta: number
  sales_tax: number
  sales_commission: number
  other_variable_costs: number
  fixed_costs: number
}

export const monthlyDetailsService = {
  /** List all monthly_details records for a given year (current user). */
  async getByYear(year: number): Promise<MonthlyDetailsRecord[]> {
    const userId = pb.authStore.record?.id
    if (!userId) return []

    try {
      const records = await pb.collection<MonthlyDetailsRecord>('monthly_details').getFullList({
        filter: `user = "${userId}" && year = ${year}`,
        sort: 'month',
      })
      return records
    } catch (err) {
      console.error('monthlyDetailsService.getByYear error:', err)
      return []
    }
  },

  /** Create a new monthly_details record (current user). */
  async create(data: MonthlyDetailsInput): Promise<MonthlyDetailsRecord> {
    const userId = pb.authStore.record?.id
    if (!userId) throw new Error('Usuário não autenticado')

    return await pb.collection<MonthlyDetailsRecord>('monthly_details').create({
      user: userId,
      year: data.year,
      month: data.month,
      revenue: data.revenue,
      investment: data.investment,
      ads_meta: data.ads_meta,
      tax_meta: data.tax_meta,
      sales_tax: data.sales_tax,
      sales_commission: data.sales_commission,
      other_variable_costs: data.other_variable_costs,
      fixed_costs: data.fixed_costs,
    })
  },

  /** Update an existing monthly_details record by id. */
  async update(id: string, data: MonthlyDetailsInput): Promise<MonthlyDetailsRecord> {
    return await pb.collection<MonthlyDetailsRecord>('monthly_details').update(id, {
      year: data.year,
      month: data.month,
      revenue: data.revenue,
      investment: data.investment,
      ads_meta: data.ads_meta,
      tax_meta: data.tax_meta,
      sales_tax: data.sales_tax,
      sales_commission: data.sales_commission,
      other_variable_costs: data.other_variable_costs,
      fixed_costs: data.fixed_costs,
    })
  },

  /** Upsert: update if id present, else create. Idempotent on (user, year, month). */
  async save(id: string | undefined, data: MonthlyDetailsInput): Promise<MonthlyDetailsRecord> {
    if (id) {
      return await this.update(id, data)
    }
    return await this.create(data)
  },
}
