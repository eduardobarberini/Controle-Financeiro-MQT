import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { streamJsonArray } from './json-array-stream.ts'

const dir = mkdtempSync(path.join(tmpdir(), 'json-array-stream-'))
afterAll(() => rmSync(dir, { recursive: true, force: true }))

let n = 0
const file = (content: string) => {
  const f = path.join(dir, `f${n++}.json`)
  writeFileSync(f, content, 'utf8')
  return f
}

const collect = async (f: string, chunk?: number) => {
  const out: unknown[] = []
  for await (const o of streamJsonArray(f, chunk)) out.push(o)
  return out
}

describe('streamJsonArray', () => {
  const tricky = [
    { id: 'a', name: 'Cardápio Detox {S1} [AppMax]', note: 'aspas \\"dentro\\" e } fora' },
    { id: 'b', items: [{ x: [1, 2, { y: '}]' }] }], empty: {}, list: [] },
    { id: 'c', unicode: 'Mães Que Treinam – renovação 😀', esc: 'barra \\\\ final\\\\' },
  ]

  it('lê cada objeto do array, com chaves e colchetes dentro de strings', async () => {
    expect(await collect(file(JSON.stringify(tricky)))).toEqual(tricky)
  })

  it('funciona quando os objetos atravessam vários blocos de leitura', async () => {
    const f = file(JSON.stringify(tricky, null, 2))
    for (const chunk of [1, 2, 3, 7, 16]) expect(await collect(f, chunk)).toEqual(tricky)
  })

  it('array vazio e arquivo vazio não geram nada', async () => {
    expect(await collect(file('[]'))).toEqual([])
    expect(await collect(file(''))).toEqual([])
  })

  it('recusa JSON que não é array e arquivo truncado', async () => {
    await expect(collect(file('{"a":1}'))).rejects.toThrow(/array/)
    await expect(collect(file('[{"a":1},{"b":'))).rejects.toThrow(/truncado/)
  })
})
