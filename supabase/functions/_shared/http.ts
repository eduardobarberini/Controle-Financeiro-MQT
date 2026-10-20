export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

export function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders, ...extra },
  })
}

/** Comparação em tempo constante para tokens de webhook. */
export function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder()
  const ab = enc.encode(a)
  const bb = enc.encode(b)
  if (ab.length !== bb.length) return false
  let diff = 0
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i]
  return diff === 0
}

/** Provedor pediu para esperar mais do que cabe na invocação: salva o estado e encerra. */
export class RateLimitError extends Error {
  readonly retryAfterSec: number
  constructor(message: string, retryAfterSec: number) {
    super(message)
    this.name = 'RateLimitError'
    this.retryAfterSec = retryAfterSec
  }
}

/** Credencial recusada (401/403): o cron só tenta de novo depois de 1 hora. */
export class ProviderAuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ProviderAuthError'
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/** Lê o corpo JSON de forma tolerante (corpo vazio vira {}). */
export async function readJson(req: Request): Promise<Record<string, unknown>> {
  const text = await req.text()
  if (!text.trim()) return {}
  try {
    const v = JSON.parse(text)
    return v && typeof v === 'object' ? (v as Record<string, unknown>) : {}
  } catch {
    throw new Error('Corpo da requisição não é JSON válido')
  }
}

/** Data (YYYY-MM-DD) de N dias atrás, em UTC. */
export function daysAgoIso(days: number, from: Date = new Date()): string {
  const d = new Date(from.getTime() - days * 86_400_000)
  return d.toISOString().slice(0, 10)
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Limita um inteiro vindo de query/body a um intervalo. */
export function clampInt(v: unknown, def: number, min: number, max: number): number {
  const n = Number(v)
  if (!Number.isFinite(n)) return def
  return Math.min(max, Math.max(min, Math.trunc(n)))
}

/** Número tolerante: aceita string com vírgula/ponto, null vira 0. */
export function num(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  const n = Number(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

/** Inteiro tolerante. */
export function int(v: unknown): number {
  return Math.trunc(num(v))
}

/** String ou null. */
export function str(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const s = String(v)
  return s.length ? s : null
}
