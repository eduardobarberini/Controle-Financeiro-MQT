/**
 * Shared formatting helpers for the Lançamento Pago feature (used across all 4 tabs).
 * Kept in one place so currency / percent / number formatting stays consistent.
 */

export const formatCurrency = (val: number): string => {
  if (isNaN(val) || !isFinite(val)) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(val)
}

export const formatPercent = (val: number): string => {
  if (isNaN(val) || !isFinite(val)) return '0,00%'
  return (
    new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val * 100) + '%'
  )
}

export const formatCalculatedCurrency = (val: number): string => {
  if (isNaN(val) || !isFinite(val)) return 'R$ 0,00'
  return formatCurrency(val)
}

export const formatCalculatedPercent = (val: number): string => {
  if (isNaN(val) || !isFinite(val)) return '0,00%'
  return formatPercent(val)
}

export const formatCalculatedNumber = (val: number, decimals = 2): string => {
  if (isNaN(val) || !isFinite(val)) return '0'
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val)
}
