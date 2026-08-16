import pb from '@/lib/pocketbase/client'
import { GoalsRecord } from '@/types/financial'

export const goalsService = {
  async getByYear(year: number): Promise<GoalsRecord | null> {
    const userId = pb.authStore.record?.id
    if (!userId) return null

    try {
      const record = await pb
        .collection<GoalsRecord>('goals')
        .getFirstListItem(`user = '${userId}' && year = ${year}`)
      return record
    } catch (_) {
      return null
    }
  },

  async saveGoals(
    year: number,
    annualRevenueGoal: number,
    annualProfitGoal: number,
    taxMetaRate?: number,
    salesTaxRate?: number,
  ): Promise<GoalsRecord> {
    const userId = pb.authStore.record?.id
    if (!userId) throw new Error('Usuário não autenticado')

    const data: Partial<GoalsRecord> = {
      annual_revenue_goal: annualRevenueGoal,
      annual_profit_goal: annualProfitGoal,
      ...(taxMetaRate !== undefined && { tax_meta_rate: taxMetaRate }),
      ...(salesTaxRate !== undefined && { sales_tax_rate: salesTaxRate }),
    }

    try {
      const existing = await pb
        .collection<GoalsRecord>('goals')
        .getFirstListItem(`user = '${userId}' && year = ${year}`)
      if (existing) {
        return await pb.collection<GoalsRecord>('goals').update(existing.id, data)
      }
    } catch (_) {
      // not found
    }

    return await pb.collection<GoalsRecord>('goals').create({
      user: userId,
      year: year,
      ...data,
    })
  },
}
