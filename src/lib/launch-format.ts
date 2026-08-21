/**
 * Shared formatting helpers for the Lançamento Pago feature (used across all 4 tabs).
 * Kept in one place so currency / percent / number formatting stays consistent.
 */

export const formatCurrency = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(val) || !isFinite(val)) return 'R$ 0,00'
  const isNegative = val < 0
  const absVal = Math.abs(val)
  const formatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(absVal)
    .replace(/\u00A0/g, ' ')
    .replace(/^R\$\s*/, 'R$ ')
  return isNegative ? `-${formatted}` : formatted
}

export const formatPercent = (val: number | null | undefined, decimals = 2): string => {
  if (val === null || val === undefined || isNaN(val) || !isFinite(val)) {
    return (
      (0).toLocaleString('pt-BR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }) + '%'
    )
  }
  return (
    new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(val * 100) + '%'
  )
}

export const formatCalculatedCurrency = (val: number | null | undefined): string => {
  return formatCurrency(val)
}

export const formatCalculatedPercent = (val: number | null | undefined, decimals = 2): string => {
  return formatPercent(val, decimals)
}

export const formatCalculatedNumber = (val: number | null | undefined, decimals = 2): string => {
  if (val === null || val === undefined || isNaN(val) || !isFinite(val)) {
    return (0).toLocaleString('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  }
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val)
}

/**
 * Parses DD/MM/YYYY date from a Turma (batch) string.
 * Example inputs: "S1 - 23/08/2026", "Turma 1 - 16/08/2026", "23/08/2026", "S1 - 16/8/2026"
 * Returns a UTC Date or null if no valid date pattern is found.
 */
export const extractDateFromBatch = (batch: string): Date | null => {
  if (!batch || typeof batch !== 'string') return null
  const match = batch.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (!match) return null

  const day = parseInt(match[1], 10)
  const month = parseInt(match[2], 10) - 1 // 0-indexed in JS Date
  const year = parseInt(match[3], 10)

  const date = new Date(year, month, day)
  if (isNaN(date.getTime())) return null
  return date
}

/**
 * Formats a Date object to "D/M" (e.g. 16/8).
 */
export const formatDateLabel = (date: Date): string => {
  const d = date.getDate()
  const m = date.getMonth() + 1
  return `${d}/${m}`
}

/**
 * Calculates date labels for the 7 days of "Acompanhamento Diário - Vendas da Semana"
 * Table has 7 days: Seg, Ter, Qua, Qui, Sex, Sáb, Dom
 * The date in batch is Dom (index 6, offset 0).
 * Seg to Sáb are -6, -5, -4, -3, -2, -1 days.
 */
export const calculateDailyDataDateLabels = (sundayDate: Date): string[] => {
  // Seg (-6), Ter (-5), Qua (-4), Qui (-3), Sex (-2), Sáb (-1), Dom (0)
  const offsets = [-6, -5, -4, -3, -2, -1, 0]
  return offsets.map((offset) => {
    const d = new Date(sundayDate)
    d.setDate(d.getDate() + offset)
    return formatDateLabel(d)
  })
}

/**
 * Calculates date labels for the "Venda Plataforma" daily tracking table.
 * Platform sales happen in the week following the launch Sunday.
 * Table structure: Primeira Hora (no date or empty), Qui (+4), Sex (+5), Sáb (+6), Dom (+7), Seg (+8), Ter (+9)
 * The date in batch is Sunday (launch start).
 */
export const calculateUpsellDailyDateLabels = (sundayDate: Date): { [key: string]: string } => {
  const getOffsetDateLabel = (offset: number) => {
    const d = new Date(sundayDate)
    d.setDate(d.getDate() + offset)
    return formatDateLabel(d)
  }

  return {
    Qui: getOffsetDateLabel(4),
    Sex: getOffsetDateLabel(5),
    Sáb: getOffsetDateLabel(6),
    Dom: getOffsetDateLabel(7),
    Seg: getOffsetDateLabel(8),
    Ter: getOffsetDateLabel(9),
  }
}
