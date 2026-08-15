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
      badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
      badgeText: 'text-amber-600',
      barColor: 'bg-amber-500',
      gaugeColor: '#f59e0b',
      status: 'warning',
    }
  }
  return {
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    badgeText: 'text-emerald-600',
    barColor: 'bg-emerald-500',
    gaugeColor: '#059669',
    status: 'success',
  }
}

/**
 * Build the annual financial summary directly from `monthly_details` records.
 *
 * Net profit per month = revenue − investment − (all variable costs) − fixed costs.
 * ROAS = total revenue / total investment.
 * Margin = total profit / total revenue × 100.
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
  let totalInvestment = 0
  let totalRevenue = 0
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
      const rev = Number(rec.revenue) || 0
      const inv = Number(rec.investment) || 0
      const adsMeta = Number(rec.ads_meta) || 0
      const taxMeta = Number(rec.tax_meta) || 0
      const salesTax = Number(rec.sales_tax) || 0
      const salesCommission = Number(rec.sales_commission) || 0
      const otherVariable = Number(rec.other_variable_costs) || 0
      const fixedCosts = Number(rec.fixed_costs) || 0

      const variableCosts = adsMeta + taxMeta + salesTax + salesCommission + otherVariable
      const prof = rev - inv - variableCosts - fixedCosts

      if (rev > 0 || inv > 0 || prof !== 0) {
        hasAnyData = true
        lastEnteredMonthLabel = monthLabel
        currentMonthRevenue = rev
      }

      totalInvestment += inv
      totalRevenue += rev
      totalProfit += prof

      computedItems.push({
        id: rec.id,
        monthDate,
        monthKey,
        monthIndex: i,
        monthLabel,
        shortLabel,
        investment: inv,
        grossRevenue: rev,
        netProfit: prof,
        roas: calculateRoas(rev, inv),
        marginPercent: calculateMarginPercent(prof, rev),
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

  const revenueGoalPercent = revenueGoal > 0 ? (totalRevenue / revenueGoal) * 100 : null
  const profitGoalPercent = profitGoal > 0 ? (totalProfit / profitGoal) * 100 : null

  return {
    totalInvestment,
    totalRevenue,
    totalProfit,
    averageRoas: calculateRoas(totalRevenue, totalInvestment),
    averageMargin: calculateMarginPercent(totalProfit, totalRevenue),
    currentMonthRevenue,
    lastEnteredMonthLabel,
    revenueGoal,
    profitGoal,
    revenueGoalPercent,
    profitGoalPercent,
    hasAnyData,
    monthlyItems: computedItems,
  }
}
