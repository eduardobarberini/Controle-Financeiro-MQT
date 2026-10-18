import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.118.0'
import { safeEqual } from './http.ts'

export type Provider = 'guru' | 'asaas' | 'meta'
export type Trigger = 'cron' | 'manual' | 'webhook' | 'backfill'

export interface Owner {
  userId: string
  config: Record<string, unknown>
  /** false quando o usuário desligou a integração na tela. */
  enabled: boolean
}

/**
 * Descobre a quem pertencem os dados de um provedor. O sistema é de usuário
 * único: pega a linha da integração; se não houver, usa OWNER_USER_ID do
 * ambiente; por fim, o único usuário cadastrado (integração considerada ligada).
 */
export async function resolveOwner(sb: SupabaseClient, provider: Provider): Promise<Owner | null> {
  const { data } = await sb
    .from('integration_settings')
    .select('user_id, config, enabled')
    .eq('provider', provider)
    .limit(1)
    .maybeSingle()
  if (data?.user_id) {
    return {
      userId: data.user_id as string,
      config: (data.config ?? {}) as Record<string, unknown>,
      enabled: data.enabled !== false,
    }
  }

  const envOwner = Deno.env.get('OWNER_USER_ID')
  if (envOwner) return { userId: envOwner, config: {}, enabled: true }

  const { data: users } = await sb.auth.admin.listUsers({ perPage: 2 })
  if (users?.users?.length === 1) return { userId: users.users[0].id, config: {}, enabled: true }
  return null
}

/** Identifica quem chamou: usuário (JWT) ou a service role (cron). */
export async function authenticateCaller(
  req: Request,
  sb: SupabaseClient,
): Promise<{ userId: string | null; isService: boolean }> {
  const auth = req.headers.get('Authorization') ?? ''
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  if (!token) return { userId: null, isService: false }
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (serviceKey && safeEqual(token, serviceKey)) return { userId: null, isService: true }
  const { data, error } = await sb.auth.getUser(token)
  if (error || !data.user) return { userId: null, isService: false }
  return { userId: data.user.id, isService: false }
}

export async function startRun(
  sb: SupabaseClient,
  args: { userId: string; provider: Provider; trigger: Trigger; details?: Record<string, unknown> },
): Promise<string> {
  const { data, error } = await sb
    .from('sync_runs')
    .insert({
      user_id: args.userId,
      provider: args.provider,
      trigger: args.trigger,
      details: args.details ?? {},
    })
    .select('id')
    .single()
  if (error) throw error
  await sb.from('integration_settings').upsert(
    { user_id: args.userId, provider: args.provider, last_sync_status: 'running' },
    { onConflict: 'user_id,provider' },
  )
  return data.id as string
}

export async function finishRun(
  sb: SupabaseClient,
  runId: string,
  args: {
    userId: string
    provider: Provider
    status: 'success' | 'error'
    records?: number
    details?: Record<string, unknown>
    error?: string
  },
): Promise<void> {
  const { error: runErr } = await sb
    .from('sync_runs')
    .update({
      status: args.status,
      finished_at: new Date().toISOString(),
      records_upserted: args.records ?? 0,
      details: args.details ?? {},
      error: args.error ?? null,
    })
    .eq('id', runId)
  if (runErr) console.error('finishRun(sync_runs):', runErr.message)

  const { error: setErr } = await sb.from('integration_settings').upsert(
    {
      user_id: args.userId,
      provider: args.provider,
      last_sync_at: new Date().toISOString(),
      last_sync_status: args.status,
      last_error: args.error ?? null,
    },
    { onConflict: 'user_id,provider' },
  )
  if (setErr) console.error('finishRun(integration_settings):', setErr.message)
}

/** Upsert em lotes para não estourar o tamanho da requisição. */
export async function upsertBatches<T extends Record<string, unknown>>(
  sb: SupabaseClient,
  table: string,
  rows: T[],
  onConflict: string,
  batchSize = 200,
): Promise<number> {
  let total = 0
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    const { error } = await sb.from(table).upsert(batch, { onConflict })
    if (error) throw new Error(`${table}: ${error.message}`)
    total += batch.length
  }
  return total
}

/** Divide uma lista em pedaços (ex.: para filtros `.in()` com muitos ids). */
export function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size))
  return out
}

/** Registra um evento de webhook. Retorna duplicate=true se já existia. */
export async function recordWebhookEvent(
  sb: SupabaseClient,
  args: {
    userId: string | null
    provider: Provider
    eventKey: string
    eventType: string | null
    externalId: string | null
    payload: unknown
  },
): Promise<{ id: string | null; duplicate: boolean }> {
  const { data, error } = await sb
    .from('webhook_events')
    .upsert(
      {
        user_id: args.userId,
        provider: args.provider,
        event_key: args.eventKey,
        event_type: args.eventType,
        external_id: args.externalId,
        payload: args.payload,
      },
      { onConflict: 'provider,event_key', ignoreDuplicates: true },
    )
    .select('id')
    .maybeSingle()
  if (error) throw error
  if (!data) return { id: null, duplicate: true }
  return { id: data.id as string, duplicate: false }
}

export async function markWebhookProcessed(
  sb: SupabaseClient,
  id: string | null,
  error?: string,
): Promise<void> {
  if (!id) return
  await sb
    .from('webhook_events')
    .update({ processed_at: new Date().toISOString(), error: error ?? null })
    .eq('id', id)
}
