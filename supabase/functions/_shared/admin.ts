import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.118.0'

/** Cliente com service role: ignora RLS. Só para uso dentro das Edge Functions. */
export function adminClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ausentes')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

/** Lê uma variável de ambiente obrigatória. */
export function requireEnv(name: string): string {
  const v = Deno.env.get(name)
  if (!v) throw new Error(`Variável de ambiente ${name} não configurada (supabase secrets set)`)
  return v
}
