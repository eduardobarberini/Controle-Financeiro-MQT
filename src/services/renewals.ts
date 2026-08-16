import pb from '@/lib/pocketbase/client'
import type { RenewalRecord } from '@/types/renewals'

export interface RenewalInput {
  year: number
  month: number // 1-12
  students_to_renew: number
  renewals: number
  renewal_revenue: number
}

export const renewalsService = {
  /** List all renewals records for a given year (current user). */
  async getByYear(year: number): Promise<RenewalRecord[]> {
    const userId = pb.authStore.record?.id
    if (!userId) return []

    try {
      const records = await pb.collection<RenewalRecord>('renewals').getFullList({
        filter: `user = "${userId}" && year = ${year}`,
        sort: 'month',
      })
      return records
    } catch (err) {
      console.error('renewalsService.getByYear error:', err)
      return []
    }
  },

  /** Create a new renewals record (current user). */
  async create(data: RenewalInput): Promise<RenewalRecord> {
    const userId = pb.authStore.record?.id
    if (!userId) throw new Error('Usuário não autenticado')

    return await pb.collection<RenewalRecord>('renewals').create({
      user: userId,
      year: data.year,
      month: data.month,
      students_to_renew: data.students_to_renew,
      renewals: data.renewals,
      renewal_revenue: data.renewal_revenue,
    })
  },

  /** Update an existing renewals record by id. */
  async update(id: string, data: RenewalInput): Promise<RenewalRecord> {
    return await pb.collection<RenewalRecord>('renewals').update(id, {
      year: data.year,
      month: data.month,
      students_to_renew: data.students_to_renew,
      renewals: data.renewals,
      renewal_revenue: data.renewal_revenue,
    })
  },

  /** Upsert: update if id present, else create. Idempotent on (user, year, month). */
  async save(id: string | undefined, data: RenewalInput): Promise<RenewalRecord> {
    if (id) {
      return await this.update(id, data)
    }
    return await this.create(data)
  },
}
