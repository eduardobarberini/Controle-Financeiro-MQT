import { supabase, requireUserId } from '@/lib/supabase/client'
import type { BaseRow } from '@/types/financial'

export interface CompanySettingsRecord extends BaseRow {
  company_name: string
  /** Caminho do arquivo no bucket "logos" (ex.: "<user_id>/logo.png"), ou null. */
  logo_path: string | null
}

const LOGO_BUCKET = 'logos'

/** Configurações da empresa do usuário logado, ou null se ainda não existem. */
export async function getCompanySettings(): Promise<CompanySettingsRecord | null> {
  const { data, error } = await supabase.from('company_settings').select('*').maybeSingle()
  if (error) throw new Error(`Falha ao carregar configurações da empresa: ${error.message}`)
  return data as CompanySettingsRecord | null
}

export interface UpsertCompanySettingsPayload {
  company_name?: string
  /** File = envia novo logo; null = remove o logo; undefined = não mexe. */
  logo?: File | null
}

function extensionOf(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase()
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/jpeg') return 'jpg'
  if (file.type === 'image/svg+xml') return 'svg'
  if (file.type === 'image/webp') return 'webp'
  return 'png'
}

/** Cria ou atualiza as configurações da empresa, cuidando do upload/remoção do logo. */
export async function upsertCompanySettings(
  payload: UpsertCompanySettingsPayload,
): Promise<CompanySettingsRecord> {
  const userId = await requireUserId()
  const existing = await getCompanySettings()

  let logoPath: string | null | undefined = undefined

  if (payload.logo instanceof File) {
    const path = `${userId}/logo.${extensionOf(payload.logo)}`
    // Remove um logo anterior com extensão diferente para não acumular arquivos.
    if (existing?.logo_path && existing.logo_path !== path) {
      await supabase.storage.from(LOGO_BUCKET).remove([existing.logo_path])
    }
    const { error: upErr } = await supabase.storage
      .from(LOGO_BUCKET)
      .upload(path, payload.logo, { upsert: true, contentType: payload.logo.type })
    if (upErr) throw new Error(`Falha ao enviar o logo: ${upErr.message}`)
    logoPath = path
  } else if (payload.logo === null) {
    if (existing?.logo_path) {
      await supabase.storage.from(LOGO_BUCKET).remove([existing.logo_path])
    }
    logoPath = null
  }

  const row: Record<string, unknown> = { user_id: userId }
  if (payload.company_name !== undefined) row.company_name = payload.company_name
  if (logoPath !== undefined) row.logo_path = logoPath

  const { data, error } = await supabase
    .from('company_settings')
    .upsert(row as { user_id: string; company_name?: string; logo_path?: string | null }, {
      onConflict: 'user_id',
    })
    .select()
    .single()
  if (error) throw error
  return data as CompanySettingsRecord
}

/** URL pública do logo (com cache-buster pela data de atualização). */
export function getLogoUrl(record: CompanySettingsRecord | null): string | null {
  if (!record?.logo_path) return null
  const { data } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(record.logo_path)
  const stamp = encodeURIComponent(record.updated_at ?? '')
  return `${data.publicUrl}?v=${stamp}`
}
