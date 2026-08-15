import pb from '@/lib/pocketbase/client'
import { MonthlyDataRecord } from '@/types/financial'

export const monthlyDataService = {
  async getByYear(year: number): Promise<MonthlyDataRecord[]> {
    const startDate = `${year}-01-01 00:00:00.000Z`
    const endDate = `${year}-12-31 23:59:59.999Z`

    const records = await pb.collection<MonthlyDataRecord>('monthly_data').getFullList({
      filter: `month >= '${startDate}' && month <= '${endDate}'`,
      sort: 'month',
    })

    return records
  },

  async getAllForUser(): Promise<MonthlyDataRecord[]> {
    return await pb.collection<MonthlyDataRecord>('monthly_data').getFullList({
      sort: 'month',
    })
  },

  async saveMonth(data: {
    id?: string
    month: string
    investment: number
    gross_revenue: number
    net_profit: number
  }): Promise<MonthlyDataRecord> {
    const userId = pb.authStore.record?.id
    if (!userId) throw new Error('Usuário não autenticado')

    if (data.id) {
      return await pb.collection<MonthlyDataRecord>('monthly_data').update(data.id, {
        investment: data.investment,
        gross_revenue: data.gross_revenue,
        net_profit: data.net_profit,
      })
    }

    // Check if record already exists for this exact month date
    try {
      const existing = await pb
        .collection<MonthlyDataRecord>('monthly_data')
        .getFirstListItem(`user = '${userId}' && month = '${data.month}'`)
      if (existing) {
        return await pb.collection<MonthlyDataRecord>('monthly_data').update(existing.id, {
          investment: data.investment,
          gross_revenue: data.gross_revenue,
          net_profit: data.net_profit,
        })
      }
    } catch (_) {
      // not found, proceed to create
    }

    return await pb.collection<MonthlyDataRecord>('monthly_data').create({
      user: userId,
      month: data.month,
      investment: data.investment,
      gross_revenue: data.gross_revenue,
      net_profit: data.net_profit,
    })
  },

  async deleteMonth(id: string): Promise<boolean> {
    await pb.collection('monthly_data').delete(id)
    return true
  },
}
