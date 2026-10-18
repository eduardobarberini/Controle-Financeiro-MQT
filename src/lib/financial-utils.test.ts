import { describe, expect, it } from 'vitest'
import {
  buildYearFinancialSummary,
  computeMonthlyMetrics,
  formatCurrency,
  parsePtBrNumber,
} from './financial-utils'
import type { GoalsRecord, MonthlyDetailsRecord } from '@/types/financial'

describe('parsePtBrNumber', () => {
  it('entende formatos brasileiros e americanos', () => {
    expect(parsePtBrNumber('31.871,63')).toBe(31871.63)
    expect(parsePtBrNumber('1234,56')).toBe(1234.56)
    expect(parsePtBrNumber('449.496')).toBe(449496)
    expect(parsePtBrNumber('12.5')).toBe(12.5)
    expect(parsePtBrNumber('R$ 1.000,00')).toBe(1000)
    expect(parsePtBrNumber('')).toBe(0)
    expect(parsePtBrNumber(null)).toBe(0)
  })
})

describe('formatCurrency', () => {
  it('formata em reais com sinal', () => {
    expect(formatCurrency(1234.5)).toBe('R$ 1.234,50')
    expect(formatCurrency(-10)).toBe('-R$ 10,00')
    expect(formatCurrency(undefined)).toBe('R$ 0,00')
  })
})

describe('computeMonthlyMetrics', () => {
  it('aplica impostos padrão e calcula lucro, ROAS e margem', () => {
    const m = computeMonthlyMetrics({
      revenue: 100000,
      adsMeta: 20000,
      salesCommission: 5000,
      otherVariable: 1000,
      fixedCosts: 10000,
    })
    expect(m.taxMeta).toBeCloseTo(2430) // 12,15% de 20.000
    expect(m.salesTax).toBeCloseTo(7500) // 7,5% de 100.000
    expect(m.totalVariable).toBeCloseTo(20000 + 2430 + 7500 + 5000 + 1000)
    expect(m.totalCosts).toBeCloseTo(m.totalVariable + 10000)
    expect(m.netProfit).toBeCloseTo(100000 - m.totalCosts)
    expect(m.roas).toBeCloseTo(5)
    expect(m.margin).toBeCloseTo((m.netProfit / 100000) * 100)
  })

  it('usa alíquotas informadas e trata zeros', () => {
    const m = computeMonthlyMetrics({
      revenue: 0,
      adsMeta: 0,
      salesCommission: 0,
      otherVariable: 0,
      fixedCosts: 500,
      taxMetaRate: 0.1,
      salesTaxRate: 0.05,
    })
    expect(m.roas).toBeNull()
    expect(m.margin).toBeNull()
    expect(m.netProfit).toBe(-500)
  })
})

describe('buildYearFinancialSummary', () => {
  const rec = (month: number, revenue: number, ads: number): MonthlyDetailsRecord => ({
    id: `r${month}`,
    user_id: 'u',
    created_at: '',
    updated_at: '',
    year: 2026,
    month,
    revenue,
    ads_meta: ads,
    sales_commission: 0,
    other_variable_costs: 0,
    fixed_costs: 1000,
  })
  const goals: GoalsRecord = {
    id: 'g',
    user_id: 'u',
    created_at: '',
    updated_at: '',
    year: 2026,
    annual_revenue_goal: 200000,
    annual_profit_goal: 50000,
    profit_margin_goal: 30,
    renewal_rate_goal: null,
    tax_meta_rate: 10,
    sales_tax_rate: 5,
  }

  it('soma os meses, aplica alíquotas das metas e calcula percentuais', () => {
    const s = buildYearFinancialSummary(2026, [rec(1, 50000, 10000), rec(2, 50000, 10000)], goals)
    expect(s.monthlyItems).toHaveLength(12)
    expect(s.totalRevenue).toBe(100000)
    expect(s.totalInvestment).toBe(20000)
    // custos por mês: fixo 1000 + ads 10000 + imposto meta 1000 (10%) + imposto vendas 2500 (5%)
    expect(s.totalCosts).toBeCloseTo(2 * (1000 + 10000 + 1000 + 2500))
    expect(s.totalProfit).toBeCloseTo(100000 - s.totalCosts)
    expect(s.revenueGoalPercent).toBeCloseTo(50)
    expect(s.averageRoas).toBeCloseTo(5)
    expect(s.lastEnteredMonthLabel).toBe('fevereiro/2026')
    expect(s.hasAnyData).toBe(true)
    expect(s.monthlyItems[2].hasRecord).toBe(false)
  })

  it('sem registros não tem dados', () => {
    const s = buildYearFinancialSummary(2026, [], null)
    expect(s.hasAnyData).toBe(false)
    expect(s.revenueGoalPercent).toBeNull()
  })
})
