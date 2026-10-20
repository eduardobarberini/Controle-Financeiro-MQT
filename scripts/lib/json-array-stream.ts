// Lê um arquivo com um array JSON gigante (`[{...},{...}]`) objeto a objeto,
// sem carregar o arquivo inteiro: varre os caracteres acompanhando a
// profundidade e as strings, recorta cada objeto do nível 1 e faz JSON.parse
// só dele. As exportações do Guru têm até 270 MB numa única linha.
import { createReadStream } from 'node:fs'

const OPEN_OBJ = 123 // {
const CLOSE_OBJ = 125 // }
const OPEN_ARR = 91 // [
const CLOSE_ARR = 93 // ]
const QUOTE = 34 // "
const BACKSLASH = 92 // \

export async function* streamJsonArray<T = Record<string, unknown>>(
  file: string,
  chunkSize = 4 * 1024 * 1024,
): AsyncGenerator<T> {
  const stream = createReadStream(file, { encoding: 'utf8', highWaterMark: chunkSize })
  let depth = 0
  let inString = false
  let escaped = false
  let started = false
  // Texto do objeto em andamento que veio de chunks anteriores.
  let carry = ''

  for await (const chunk of stream as AsyncIterable<string>) {
    let objStart = carry ? 0 : -1
    for (let i = 0; i < chunk.length; i++) {
      const c = chunk.charCodeAt(i)
      if (inString) {
        if (escaped) escaped = false
        else if (c === BACKSLASH) escaped = true
        else if (c === QUOTE) inString = false
        continue
      }
      if (c === QUOTE) {
        inString = true
      } else if (c === OPEN_OBJ || c === OPEN_ARR) {
        if (!started) {
          if (c !== OPEN_ARR) throw new Error(`${file}: esperado um array JSON`)
          started = true
          depth = 1
          continue
        }
        if (depth === 1) objStart = i
        depth++
      } else if (c === CLOSE_OBJ || c === CLOSE_ARR) {
        depth--
        if (depth === 1) {
          const text = carry + chunk.slice(objStart, i + 1)
          carry = ''
          objStart = -1
          yield JSON.parse(text) as T
        } else if (depth === 0) {
          return
        }
      }
    }
    if (objStart >= 0) carry += chunk.slice(objStart)
  }
  if (!started) return
  if (depth !== 0) throw new Error(`${file}: JSON truncado`)
}
