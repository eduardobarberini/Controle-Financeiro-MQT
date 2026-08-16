import {
  ComputedMonthlyItem,
  YearFinancialSummary,
  GoalsRecord,
  MonthlyDetailsRecord,
} from '@/types/financial'

export const MONTH_NAMES_PT = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
]

export const MONTH_SHORT_NAMES_PT = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
]

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const compactCurrencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
})

const numberFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return 'R$ 0,00'
  return currencyFormatter.format(value)
}

/**
 * Parses a Brazilian formatted numeric string (e.g. "449.496", "449496", "31.871,63", "1.234,56", "1234,56")
 * or standard JS number string (e.g. "449496.50") into a valid number.
 *
 * Handling rules for pt-BR formatted input:
 * - If string contains both dots and commas (e.g. "31.871,63"), dots are thousand separators and comma is decimal.
 * - If string contains only commas (e.g. "1234,56"), comma is decimal.
 * - If string contains only dots:
 *    - If there's 1 dot and exactly 1 or 2 digits after it (e.g. "12.5" or "12.50"), treat dot as decimal point.
 *    - Otherwise (e.g. "449.496" or "1.000.000"), treat dots as thousand separators.
 */
export function parsePtBrNumber(val: string | number | null | undefined): number {
  if (val === null || val === undefined) return 0
  if (typeof val === 'number') return isNaN(val) ? 0 : val

  let str = String(val).trim()
  if (!str) return 0

  // Remove currency prefix "R$", non-breaking spaces and whitespace
  str = str.replace(/R\$\s?/, '').replace(/\s+/g, '')

  const hasComma = str.includes(',')
  const hasDot = str.includes('.')

  if (hasComma && hasDot) {
    // Standard pt-BR format: "1.234,56" -> dots are thousands, comma is decimal
    str = str.replace(/\./g, '').replace(',', '.')
  } else if (hasComma) {
    // "1234,56" -> comma is decimal
    str = str.replace(',', '.')
  } else if (hasDot) {
    // Only dot present, e.g. "449.496" or "449.5" or "1.000.000"
    const dotParts = str.split('.')
    if (dotParts.length === 2 && dotParts[1].length <= 2) {
      // Single dot with 1 or 2 digits after: treat as standard decimal (e.g., "12.5" or "100.50")
    } else {
      // Multiple dots OR 3 digits after dot (e.g., "449.496" or "1.000.000") -> thousand separators
      str = str.replace(/\./g, '')
    }
  }

  const parsed = parseFloat(str)
  return isNaN(parsed) ? 0 : parsed
}

export function formatCompactCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return 'R$ 0'
  return compactCurrencyFormatter.format(value)
}

export function formatNumber(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || isNaN(value)) return '0,00'
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatPercent(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined || isNaN(value)) return '—'
  return `${new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)}%`
}

export function formatRoas(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '—'
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function calculateRoas(grossRevenue: number, investment: number): number | null {
  if (!investment || investment <= 0) return null
  return grossRevenue / investment
}

export function calculateMarginPercent(netProfit: number, grossRevenue: number): number | null {
  if (!grossRevenue || grossRevenue <= 0) return null
  return (netProfit / grossRevenue) * 100
}

/**
 * Default fixed rates for the automatic monthly calculations (in decimal: 0.1215 = 12.15%, 0.075 = 7.5%).
 */
export const TAX_META_RATE = 0.1215 // 12,15% sobre investimento meta (anúncios)
export const SALES_TAX_RATE = 0.075 // 7,5% sobre faturamento
export const DEFAULT_TAX_META_PERCENT = 12.15
export const DEFAULT_SALES_TAX_PERCENT = 7.5

/**
 * Result of the automatic monthly metric calculation. Every read-only field
 * shown on the Mensal page derives from these values.
 */
export interface MonthlyMetrics {
  revenue: number
  adsMeta: number // Investimento Meta (manual)
  taxMeta: number // = adsMeta * 12,15%  (auto)
  salesTax: number // = revenue * 7,5%   (auto)
  salesCommission: number
  otherVariable: number
  fixedCosts: number
  totalVariable: number // soma dos custos variáveis (auto)
  totalCosts: number // = fixedCosts + totalVariable (auto)
  netProfit: number // = revenue - totalCosts (auto)
  roas: number | null // = revenue / adsMeta (auto) — null se adsMeta = 0
  margin: number | null // = netProfit / revenue * 100 (auto) — null se revenue = 0
}

/**
 * Compute every automatic monthly metric from the manual inputs.
 *
 * Manual inputs: revenue, adsMeta (Investimento Meta), salesCommission,
 * otherVariable, fixedCosts.
 */
export function computeMonthlyMetrics(input: {
  revenue: number
  adsMeta: number
  salesCommission: number
  otherVariable: number
  fixedCosts: number
  taxMetaRate?: number // e.g. 0.1215 (12.15%)
  salesTaxRate?: number // e.g. 0.075 (7.5%)
}): MonthlyMetrics {
  const revenue = input.revenue || 0
  const adsMeta = input.adsMeta || 0
  const salesCommission = input.salesCommission || 0
  const otherVariable = input.otherVariable || 0
  const fixedCosts = input.fixedCosts || 0

  const taxMetaRate =
    input.taxMetaRate !== undefined && input.taxMetaRate !== null
      ? input.taxMetaRate
      : TAX_META_RATE
  const salesTaxRate =
    input.salesTaxRate !== undefined && input.salesTaxRate !== null
      ? input.salesTaxRate
      : SALES_TAX_RATE

  const taxMeta = adsMeta * taxMetaRate
  const salesTax = revenue * salesTaxRate
  const totalVariable = adsMeta + taxMeta + salesTax + salesCommission + otherVariable
  const totalCosts = fixedCosts + totalVariable
  const netProfit = revenue - totalCosts
  const roas = adsMeta > 0 ? revenue / adsMeta : null
  const margin = revenue > 0 ? (netProfit / revenue) * 100 : null

  return {
    revenue,
    adsMeta,
    taxMeta,
    salesTax,
    salesCommission,
    otherVariable,
    fixedCosts,
    totalVariable,
    totalCosts,
    netProfit,
    roas,
    margin,
  }
}

export function getProgressColor(percent: number | null | undefined): {
  badgeBg: string
  badgeText: string
  barColor: string
  gaugeColor: string
  status: 'danger' | 'warning' | 'success'
} {
  if (percent === null || percent === undefined || percent < 70) {
    return {
      badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
      badgeText: 'text-rose-600',
      barColor: 'bg-rose-500',
      gaugeColor: '#e11d48',
      status: 'danger',
    }
  }
  if (percent < 100) {
    return {
      badgeBg: 'bg-[#6D49F2]/10 text-[#6D49F2] border-[#6D49F2]/20',
      badgeText: 'text-[#6D49F2]',
      barColor: 'bg-[#6D49F2]',
      gaugeColor: '#6D49F2',
      status: 'warning',
    }
  }
  return {
    badgeBg: 'bg-[#FF2AFF]/10 text-[#FF2AFF] border-[#FF2AFF]/20',
    badgeText: 'text-[#FF2AFF]',
    barColor: 'bg-[#FF2AFF]',
    gaugeColor: '#FF2AFF',
    status: 'success',
  }
}

/**
 * Build the annual financial summary directly from `monthly_details` records.
 *
 * Only manual inputs are stored (revenue, ads_meta, sales_commission,
 * other_variable_costs, fixed_costs). Every derived value is recomputed here:
 *   tax_meta     = ads_meta × 12,15%
 *   sales_tax    = revenue × 7,5%
 *   totalVariable = ads_meta + tax_meta + sales_tax + sales_commission + other
 *   totalCosts   = fixed_costs + totalVariable
 *   netProfit    = revenue − totalCosts
 *   roas         = revenue / ads_meta  (null se ads_meta = 0)
 *   margin       = netProfit / revenue × 100  (null se revenue = 0)
 *
 * Annual totals: revenue, ads_meta (investment), profit, totalVariable, fixedCosts.
 */
export function buildYearFinancialSummary(
  year: number,
  monthlyRecords: MonthlyDetailsRecord[],
  goalsRecord: GoalsRecord | null,
): YearFinancialSummary {
  // Map records by month index (0-11). `monthly_details.month` is 1-12.
  const monthMap = new Map<number, MonthlyDetailsRecord>()
  monthlyRecords.forEach((rec) => {
    const m = Number(rec.month)
    if (m >= 1 && m <= 12) {
      monthMap.set(m - 1, rec)
    }
  })

  const computedItems: ComputedMonthlyItem[] = []
  let totalInvestment = 0 // soma de ads_meta (Investimento Meta)
  let totalRevenue = 0
  let totalCosts = 0
  let totalProfit = 0
  let lastEnteredMonthLabel: string | null = null
  let currentMonthRevenue: number | null = null
  let hasAnyData = false

  for (let i = 0; i < 12; i++) {
    const rec = monthMap.get(i)
    const monthNum = String(i + 1).padStart(2, '0')
    const monthDate = `${year}-${monthNum}-01 00:00:00.000Z`
    const monthKey = `${year}-${monthNum}`
    const monthLabel = `${MONTH_NAMES_PT[i]}/${year}`
    const shortLabel = MONTH_SHORT_NAMES_PT[i]

    if (rec) {
      const taxMetaRate =
        goalsRecord?.tax_meta_rate !== undefined && goalsRecord?.tax_meta_rate !== null
          ? Number(goalsRecord.tax_meta_rate) / 100
          : TAX_META_RATE
      const salesTaxRate =
        goalsRecord?.sales_tax_rate !== undefined && goalsRecord?.sales_tax_rate !== null
          ? Number(goalsRecord.sales_tax_rate) / 100
          : SALES_TAX_RATE

      const m = computeMonthlyMetrics({
        revenue: Number(rec.revenue) || 0,
        adsMeta: Number(rec.ads_meta) || 0,
        salesCommission: Number(rec.sales_commission) || 0,
        otherVariable: Number(rec.other_variable_costs) || 0,
        fixedCosts: Number(rec.fixed_costs) || 0,
        taxMetaRate,
        salesTaxRate,
      })

      if (m.revenue > 0 || m.adsMeta > 0 || m.netProfit !== 0 || m.totalCosts > 0) {
        hasAnyData = true
        lastEnteredMonthLabel = monthLabel
        currentMonthRevenue = m.revenue
      }

      totalInvestment += m.adsMeta
      totalRevenue += m.revenue
      totalCosts += m.totalCosts
      totalProfit += m.netProfit

      computedItems.push({
        id: rec.id,
        monthDate,
        monthKey,
        monthIndex: i,
        monthLabel,
        shortLabel,
        investment: m.adsMeta,
        grossRevenue: m.revenue,
        netProfit: m.netProfit,
        roas: m.roas,
        marginPercent: m.margin,
        hasRecord: true,
      })
    } else {
      computedItems.push({
        monthDate,
        monthKey,
        monthIndex: i,
        monthLabel,
        shortLabel,
        investment: 0,
        grossRevenue: 0,
        netProfit: 0,
        roas: null,
        marginPercent: null,
        hasRecord: false,
      })
    }
  }

  const revenueGoal = goalsRecord ? Number(goalsRecord.annual_revenue_goal) || 0 : 0
  const profitGoal = goalsRecord ? Number(goalsRecord.annual_profit_goal) || 0 : 0
  const profitMarginGoal =
    goalsRecord?.profit_margin_goal !== undefined && goalsRecord?.profit_margin_goal !== null
      ? Number(goalsRecord.profit_margin_goal)
      : null

  const revenueGoalPercent = revenueGoal > 0 ? (totalRevenue / revenueGoal) * 100 : null
  const profitGoalPercent = profitGoal > 0 ? (totalProfit / profitGoal) * 100 : null

  const averageMargin = calculateMarginPercent(totalProfit, totalRevenue)
  const marginGoalPercent =
    profitMarginGoal !== null && profitMarginGoal > 0 && averageMargin !== null
      ? (averageMargin / profitMarginGoal) * 100
      : null

  return {
    totalInvestment,
    totalRevenue,
    totalCosts,
    totalProfit,
    averageRoas: calculateRoas(totalRevenue, totalInvestment),
    averageMargin,
    currentMonthRevenue,
    lastEnteredMonthLabel,
    revenueGoal,
    profitGoal,
    profitMarginGoal,
    revenueGoalPercent,
    profitGoalPercent,
    marginGoalPercent,
    hasAnyData,
    monthlyItems: computedItems,
  }
}
