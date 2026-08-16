import pb from '@/lib/pocketbase/client'
import { GoalsRecord } from '@/types/financial'

export const goalsService = {
  async getByYear(year: number): Promise<GoalsRecord | null> {
    const userId = pb.authStore.record?.id
    if (!userId) return null

    try {
      const records = await pb.collection<GoalsRecord>('goals').getFullList({
        filter: pb.filter('user = {:userId} && year = {:year}', { userId, year }),
        requestKey: null,
      })
      return records[0] || null
    } catch (err) {
      console.error('Error in goalsService.getByYear:', err)
      return null
    }
  },

  async saveGoals(
    year: number,
    annualRevenueGoal: number,
    annualProfitGoal: number,
    taxMetaRate?: number,
    salesTaxRate?: number,
    profitMarginGoal?: number | null,
  ): Promise<GoalsRecord> {
    const userId = pb.authStore.record?.id
    if (!userId) throw new Error('Usuário não autenticado')

    const cleanRevenue = Number(annualRevenueGoal) || 0
    const cleanProfit = Number(annualProfitGoal) || 0
    const cleanTaxMeta = taxMetaRate !== undefined ? Number(taxMetaRate) || 0 : 0
    const cleanSalesTax = salesTaxRate !== undefined ? Number(salesTaxRate) || 0 : 0
    const cleanMarginGoal =
      profitMarginGoal !== undefined && profitMarginGoal !== null
        ? Number(profitMarginGoal) || 0
        : null

    // 1. Check if record already exists using safe parameterized filter with requestKey: null
    let existing: GoalsRecord | null = null
    try {
      const records = await pb.collection<GoalsRecord>('goals').getFullList({
        filter: pb.filter('user = {:userId} && year = {:year}', { userId, year }),
        requestKey: null,
      })
      if (records.length > 0) {
        existing = records[0]
      }
    } catch (err) {
      console.warn('Error checking existing goal record:', err)
    }

    const data: Partial<GoalsRecord> = {
      annual_revenue_goal: cleanRevenue,
      annual_profit_goal: cleanProfit,
      tax_meta_rate: cleanTaxMeta,
      sales_tax_rate: cleanSalesTax,
      profit_margin_goal: cleanMarginGoal,
    }

    if (existing) {
      return await pb.collection<GoalsRecord>('goals').update(existing.id, data)
    }

    // 2. If not found by filter, attempt creation with a fallback catch for unique constraint race/conflict
    try {
      return await pb.collection<GoalsRecord>('goals').create({
        user: userId,
        year: Number(year),
        ...data,
      })
    } catch (err: unknown) {
      // If creation fails due to unique constraint or collision, try one final search & update
      try {
        const records = await pb.collection<GoalsRecord>('goals').getFullList({
          filter: pb.filter('user = {:userId} && year = {:year}', { userId, year }),
          requestKey: null,
        })
        if (records.length > 0) {
          return await pb.collection<GoalsRecord>('goals').update(records[0].id, data)
        }
      } catch (_) {
        // Ignore fallback search error and throw original
      }
      throw err
    }
  },
}
