import pb from '@/lib/pocketbase/client'
import type { PaidLaunchRecord, PaidLaunchInput } from '@/types/paidLaunches'

export const paidLaunchesService = {
  /** List all paid launch records for current user. */
  async getAll(): Promise<PaidLaunchRecord[]> {
    const userId = pb.authStore.record?.id
    if (!userId) return []

    try {
      const records = await pb.collection<PaidLaunchRecord>('paid_launches').getFullList({
        filter: `user = "${userId}"`,
        sort: '-created',
      })
      return records
    } catch (err) {
      console.error('paidLaunchesService.getAll error:', err)
      return []
    }
  },

  /** Create a new paid launch record. */
  async create(data: PaidLaunchInput): Promise<PaidLaunchRecord> {
    const userId = pb.authStore.record?.id
    if (!userId) throw new Error('Usuário não autenticado')

    return await pb.collection<PaidLaunchRecord>('paid_launches').create({
      user: userId,
      ...data,
    })
  },

  /** Update an existing paid launch record by id. */
  async update(id: string, data: PaidLaunchInput): Promise<PaidLaunchRecord> {
    return await pb.collection<PaidLaunchRecord>('paid_launches').update(id, data)
  },

  /** Save: update if id present, else create. */
  async save(id: string | undefined, data: PaidLaunchInput): Promise<PaidLaunchRecord> {
    if (id) {
      return await this.update(id, data)
    }
    return await this.create(data)
  },

  /** Delete a paid launch record by id. */
  async delete(id: string): Promise<boolean> {
    try {
      await pb.collection('paid_launches').delete(id)
      return true
    } catch (err) {
      console.error('paidLaunchesService.delete error:', err)
      throw err
    }
  },
}
