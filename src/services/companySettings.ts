import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

export interface CompanySettingsRecord extends RecordModel {
  user: string
  company_name: string
  logo: string // file name(s) returned by PocketBase
}

/**
 * Returns the authenticated user's company_settings record, or null if none exists.
 * Uses the first matching record (unique per user via index).
 */
export async function getCompanySettings(): Promise<CompanySettingsRecord | null> {
  const userId = pb.authStore.record?.id
  if (!userId) return null

  try {
    const records = await pb.collection<CompanySettingsRecord>('company_settings').getFullList({
      filter: pb.filter('user = {:userId}', { userId }),
      requestKey: null,
    })
    return records[0] ?? null
  } catch (err) {
    console.warn('getCompanySettings failed:', err)
    return null
  }
}

export interface UpsertCompanySettingsPayload {
  company_name?: string
  logo?: File | null
}

/**
 * Creates the company_settings record if it doesn't exist, otherwise updates it.
 * Returns the persisted record (with freshly generated file URLs if a logo was uploaded).
 */
export async function upsertCompanySettings(
  payload: UpsertCompanySettingsPayload,
): Promise<CompanySettingsRecord> {
  const userId = pb.authStore.record?.id
  if (!userId) throw new Error('Usuário não autenticado')

  const existing = await getCompanySettings()

  const data: Record<string, unknown> = {
    user: userId,
    company_name: payload.company_name ?? '',
  }
  if (payload.logo !== undefined) {
    data.logo = payload.logo
  }

  if (existing) {
    return await pb.collection<CompanySettingsRecord>('company_settings').update(existing.id, data)
  }
  return await pb.collection<CompanySettingsRecord>('company_settings').create(data)
}

/**
 * Builds the absolute URL for a logo file stored in company_settings.
 */
export function getLogoUrl(record: CompanySettingsRecord | null): string | null {
  if (!record || !record.logo) return null
  const filename = Array.isArray(record.logo) ? record.logo[0] : record.logo
  if (!filename) return null
  return pb.files.getURL(record, filename)
}
