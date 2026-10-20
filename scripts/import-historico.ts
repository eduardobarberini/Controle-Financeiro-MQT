// Importa o histórico exportado pelos scripts de `MQT - IA/ferramentas`
// (Guru e Asaas) direto no Postgres, sem chamar as APIs. Spec 02.
//
// Uso (Node 22.18+ roda o TypeScript direto):
//   node scripts/import-historico.ts                       # Guru + Asaas, banco local
//   node scripts/import-historico.ts --fonte guru --pasta "C:/.../MQT - IA/ferramentas/guru/saidas"
//   node scripts/import-historico.ts --fonte asaas --db "postgresql://postgres.xxx:senha@...pooler.supabase.com:5432/postgres"
//
// Opções:
//   --fonte    guru | asaas | todas (padrão: todas)
//   --pasta    pasta das exportações (padrão: ../MQT - IA/ferramentas/<fonte>/saidas)
//   --db       connection string (padrão: $DATABASE_URL ou o Supabase local na porta 54722)
//   --usuario  e-mail ou id do dono dos dados (padrão: o único usuário cadastrado)
//   --lote     linhas por upsert (padrão: 500)
//   --forcar   regrava também versões iguais às do banco (após mudar os mapeadores)
//
// Idempotente: Guru só sobrescreve quando `dates.updated_at` é mais novo que o
// do banco; Asaas só quando a linha do banco é anterior à data do arquivo
// (sync e webhook mais recentes nunca regridem).
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'
import pg from 'pg'
import { streamJsonArray } from './lib/json-array-stream.ts'
import { mapTransaction } from '../supabase/functions/_shared/guru.ts'
import { mapCustomer, mapPayment } from '../supabase/functions/_shared/asaas.ts'

type Obj = Record<string, unknown>
type Fonte = 'guru' | 'asaas'

const REPO = path.resolve(import.meta.dirname, '..')
const LOCAL_DB = 'postgresql://postgres:postgres@127.0.0.1:54722/postgres'

const { values: opts } = parseArgs({
  options: {
    fonte: { type: 'string', default: 'todas' },
    pasta: { type: 'string' },
    db: { type: 'string' },
    usuario: { type: 'string' },
    lote: { type: 'string', default: '500' },
    forcar: { type: 'boolean', default: false },
  },
})

const fontes: Fonte[] =
  opts.fonte === 'todas'
    ? ['guru', 'asaas']
    : opts.fonte === 'guru' || opts.fonte === 'asaas'
      ? [opts.fonte]
      : []
if (!fontes.length) fail(`--fonte inválida: ${opts.fonte} (use guru, asaas ou todas)`)
if (opts.pasta && fontes.length > 1) fail('--pasta exige --fonte guru ou --fonte asaas')
const LOTE = Math.max(1, Math.min(2000, Number(opts.lote) || 500))

function fail(msg: string): never {
  console.error(`ERRO: ${msg}`)
  process.exit(1)
}

const pasta = (fonte: Fonte) =>
  opts.pasta ?? path.resolve(REPO, '..', 'MQT - IA', 'ferramentas', fonte, 'saidas')

const secs = (t0: number) => `${((Date.now() - t0) / 1000).toFixed(1)} s`
const fmt = (n: number) => n.toLocaleString('pt-BR')

// -----------------------------------------------------------------------------
// Banco
// -----------------------------------------------------------------------------
const db = new pg.Client({ connectionString: opts.db ?? process.env.DATABASE_URL ?? LOCAL_DB })

async function resolveUser(): Promise<string> {
  if (opts.usuario) {
    const { rows } = await db.query<{ id: string }>(
      'select id from auth.users where id::text = $1 or lower(email) = lower($1)',
      [opts.usuario],
    )
    if (!rows.length) fail(`usuário não encontrado: ${opts.usuario}`)
    return rows[0].id
  }
  const { rows } = await db.query<{ id: string; email: string }>(
    'select id, email from auth.users order by created_at',
  )
  if (rows.length === 1) return rows[0].id
  fail(
    rows.length
      ? `há ${rows.length} usuários; informe --usuario (${rows.map((r) => r.email).join(', ')})`
      : 'nenhum usuário cadastrado no banco',
  )
}

async function startRun(userId: string, fonte: Fonte, details: Obj): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `insert into public.sync_runs (user_id, provider, trigger, status, details)
     values ($1, $2, 'backfill', 'running', $3) returning id`,
    [userId, fonte, JSON.stringify(details)],
  )
  return rows[0].id
}

async function finishRun(
  id: string,
  status: 'success' | 'error',
  records: number,
  details: Obj,
  error?: string,
) {
  await db.query(
    `update public.sync_runs
        set status = $2, finished_at = now(), records_upserted = $3, details = $4, error = $5
      where id = $1`,
    [id, status, records, JSON.stringify(details), error ?? null],
  )
}

interface UpsertCount {
  inserted: number
  updated: number
  unchanged: number
}
const zero = (): UpsertCount => ({ inserted: 0, updated: 0, unchanged: 0 })
const add = (a: UpsertCount, b: UpsertCount) => {
  a.inserted += b.inserted
  a.updated += b.updated
  a.unchanged += b.unchanged
}

/**
 * Upsert de um lote: as linhas vão como um único parâmetro JSON e viram
 * registros da tabela com jsonb_populate_recordset. `where` decide se a
 * versão nova sobrescreve a do banco.
 */
async function upsert(
  table: string,
  conflict: string,
  rows: Obj[],
  where: string,
): Promise<UpsertCount> {
  if (!rows.length) return zero()
  const cols = Object.keys(rows[0])
  const keys = new Set(conflict.split(','))
  const list = cols.map((c) => `"${c}"`).join(', ')
  const set = cols
    .filter((c) => !keys.has(c))
    .map((c) => `"${c}" = excluded."${c}"`)
    .join(', ')
  const { rows: out } = await db.query<{ inserted: boolean }>(
    `insert into public.${table} (${list})
     select ${list} from jsonb_populate_recordset(null::public.${table}, $1::jsonb)
     on conflict (${conflict}) do update set ${set}
     where ${where}
     returning (xmax = 0) as inserted`,
    [JSON.stringify(rows)],
  )
  const inserted = out.filter((r) => r.inserted).length
  return { inserted, updated: out.length - inserted, unchanged: rows.length - out.length }
}

// -----------------------------------------------------------------------------
// Guru
// -----------------------------------------------------------------------------
async function importGuru(userId: string) {
  const dir = pasta('guru')
  const files = readdirSync(dir)
    .filter((f) => /^guru_(confirmed|ordered)_.*\.json$/.test(f))
    .sort()
  if (!files.length) fail(`nenhuma exportação do Guru em ${dir}`)

  const t0 = Date.now()
  const runId = await startRun(userId, 'guru', { pasta: dir, arquivos: files.length })
  const total = zero()
  let linhas = 0
  let repetidas = 0
  const porArquivo: Obj[] = []
  // guru_id -> updated_at (ms) da versão já enviada nesta execução
  const seen = new Map<string, number>()
  const op = opts.forcar ? '>=' : '>'
  const where = `coalesce(excluded.guru_updated_at, '-infinity') ${op} coalesce(guru_transactions.guru_updated_at, '-infinity')`

  try {
    for (const file of files) {
      const tf = Date.now()
      const count = zero()
      let lidas = 0
      let batch = new Map<string, Obj>()
      const flush = async () => {
        add(count, await upsert('guru_transactions', 'guru_id', [...batch.values()], where))
        batch = new Map()
      }
      for await (const t of streamJsonArray(path.join(dir, file))) {
        lidas++
        const row = mapTransaction(t, userId)
        if (!row) continue
        const id = row.guru_id as string
        const updated = Date.parse(String(row.guru_updated_at ?? '')) || 0
        const prev = seen.get(id)
        if (prev !== undefined && prev >= updated) {
          repetidas++
          continue
        }
        seen.set(id, updated)
        batch.set(id, row)
        if (batch.size >= LOTE) await flush()
      }
      await flush()
      linhas += lidas
      add(total, count)
      porArquivo.push({ arquivo: file, linhas: lidas, ...count })
      console.log(
        `  ${file}: ${fmt(lidas)} linhas · ${fmt(count.inserted)} novas · ${fmt(count.updated)} atualizadas (${secs(tf)})`,
      )
    }
    const details = {
      pasta: dir,
      arquivos: files.length,
      linhas,
      transacoes: seen.size,
      repetidas,
      inseridos: total.inserted,
      atualizados: total.updated,
      sem_mudanca: total.unchanged,
      por_arquivo: porArquivo,
    }
    await finishRun(runId, 'success', total.inserted + total.updated, details)
    console.log(
      `Guru: ${fmt(seen.size)} transações únicas em ${fmt(linhas)} linhas · ${fmt(total.inserted)} novas · ` +
        `${fmt(total.updated)} atualizadas · ${fmt(total.unchanged)} sem mudança (${secs(t0)})`,
    )
  } catch (e) {
    await finishRun(
      runId,
      'error',
      total.inserted + total.updated,
      { pasta: dir, por_arquivo: porArquivo },
      String(e),
    )
    throw e
  }
}

// -----------------------------------------------------------------------------
// Asaas
// -----------------------------------------------------------------------------
async function importAsaas(userId: string) {
  const dir = pasta('asaas')
  const files = readdirSync(dir)
    .filter((f) => /^asaas_\d{4}-\d{2}-\d{2}_a_\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .map((f) => ({ f, mtime: statSync(path.join(dir, f)).mtime }))
    // o arquivo exportado por último tem o status mais recente de cada cobrança
    .sort((a, b) => a.mtime.getTime() - b.mtime.getTime())
  if (!files.length) fail(`nenhuma exportação do Asaas em ${dir}`)

  const t0 = Date.now()
  const runId = await startRun(userId, 'asaas', { pasta: dir, arquivos: files.length })
  const details: Obj = { pasta: dir, arquivos: files.length }
  let records = 0

  try {
    // 1. Links (nome classifica a cobrança): antes das cobranças.
    const linksFile = path.join(dir, 'asaas_links.json')
    try {
      const links = JSON.parse(readFileSync(linksFile, 'utf8')) as Record<string, string>
      const rows = Object.entries(links)
        .map(([id, name]) => ({
          user_id: userId,
          asaas_link_id: id,
          name: String(name ?? '').trim(),
        }))
        .filter((r) => r.name)
      const c = await upsert(
        'asaas_payment_links',
        'user_id,asaas_link_id',
        rows,
        'asaas_payment_links.name is distinct from excluded.name',
      )
      details.links = rows.length
      records += c.inserted + c.updated
      console.log(
        `  asaas_links.json: ${fmt(rows.length)} links · ${fmt(c.inserted)} novos · ${fmt(c.updated)} renomeados`,
      )
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e
      console.log('  asaas_links.json ausente: links ficam sem nome até o próximo sync')
    }

    // 2. Clientes.
    const customersFile = path.join(dir, 'asaas_clientes.json')
    try {
      const mtime = statSync(customersFile).mtime.toISOString()
      const map = JSON.parse(readFileSync(customersFile, 'utf8')) as Record<string, Obj>
      const rows = Object.entries(map)
        .map(([id, c]) =>
          mapCustomer(
            { id, name: c.nome, email: c.email, cpfCnpj: c.cpf, mobilePhone: c.fone },
            userId,
          ),
        )
        .filter((r): r is Obj => r !== null)
        .map((r) => ({ ...r, updated_at: mtime }))
      const count = zero()
      for (let i = 0; i < rows.length; i += LOTE) {
        add(
          count,
          await upsert(
            'asaas_customers',
            'asaas_id',
            rows.slice(i, i + LOTE),
            'asaas_customers.updated_at < excluded.updated_at',
          ),
        )
      }
      details.clientes = rows.length
      records += count.inserted + count.updated
      console.log(
        `  asaas_clientes.json: ${fmt(rows.length)} clientes · ${fmt(count.inserted)} novos · ${fmt(count.updated)} atualizados`,
      )
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e
    }

    // 3. Cobranças: junta todos os arquivos (o mais recente vence) e grava uma vez.
    const byId = new Map<string, Obj>()
    let linhas = 0
    for (const { f, mtime } of files) {
      let lidas = 0
      for await (const p of streamJsonArray(path.join(dir, f))) {
        lidas++
        const row = mapPayment(p, userId)
        if (row) byId.set(row.asaas_id as string, { ...row, updated_at: mtime.toISOString() })
      }
      linhas += lidas
      console.log(`  ${f}: ${fmt(lidas)} cobranças`)
    }

    // Cada arquivo traz todas as cobranças NÃO apagadas criadas no período do
    // nome (a API não lista as apagadas). Cobrança que um arquivo mais novo
    // cobre e não traz foi apagada no Asaas depois (ex.: parcelas canceladas).
    const coverage = files.map(({ f, mtime }) => {
      const [, ini, fim] = /^asaas_(\d{4}-\d{2}-\d{2})_a_(\d{4}-\d{2}-\d{2})\.json$/.exec(f)!
      return { ini, fim, mtime: mtime.toISOString() }
    })
    let apagadas = 0
    for (const row of byId.values()) {
      const created = row.asaas_created_at as string | null
      if (!created || row.deleted) continue
      const later = coverage.filter(
        (c) => c.mtime > (row.updated_at as string) && c.ini <= created && created <= c.fim,
      )
      if (!later.length) continue
      row.deleted = true
      row.updated_at = later[later.length - 1].mtime
      apagadas++
    }
    details.apagadas_inferidas = apagadas
    console.log(
      `  ${fmt(apagadas)} cobranças ausentes de exportações mais novas: marcadas como apagadas`,
    )

    const rows = [...byId.values()]
    const count = zero()
    const where = opts.forcar ? 'true' : 'asaas_payments.updated_at < excluded.updated_at'
    for (let i = 0; i < rows.length; i += LOTE) {
      add(count, await upsert('asaas_payments', 'asaas_id', rows.slice(i, i + LOTE), where))
    }
    records += count.inserted + count.updated
    Object.assign(details, {
      linhas,
      cobrancas: rows.length,
      inseridos: count.inserted,
      atualizados: count.updated,
      sem_mudanca: count.unchanged,
    })
    await finishRun(runId, 'success', records, details)
    console.log(
      `Asaas: ${fmt(rows.length)} cobranças únicas em ${fmt(linhas)} linhas · ${fmt(count.inserted)} novas · ` +
        `${fmt(count.updated)} atualizadas · ${fmt(count.unchanged)} sem mudança (${secs(t0)})`,
    )
  } catch (e) {
    await finishRun(runId, 'error', records, details, String(e))
    throw e
  }
}

// -----------------------------------------------------------------------------
async function main() {
  const t0 = Date.now()
  await db.connect()
  await db.query('set statement_timeout = 0')
  const userId = await resolveUser()
  console.log(`Importando para o usuário ${userId}`)

  // Vendedoras e configurações precisam existir antes: a atribuição é feita na gravação.
  await db.query('select public.ensure_business_defaults($1)', [userId])

  for (const fonte of fontes) {
    console.log(`\n${fonte === 'guru' ? 'Guru' : 'Asaas'} — ${pasta(fonte)}`)
    if (fonte === 'guru') await importGuru(userId)
    else await importAsaas(userId)
  }

  const tr = Date.now()
  const { rows } = await db.query<{ r: Obj }>('select public.reclassify_sales($1) as r', [userId])
  console.log(`\nReclassificação: ${JSON.stringify(rows[0].r)} (${secs(tr)})`)
  console.log(`Concluído em ${secs(t0)}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => db.end())
