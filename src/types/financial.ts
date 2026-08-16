export const COMPANY_NAME = 'MQT Negócios Digitais'
export const APP_TITLE = `Controle Financeiro — ${COMPANY_NAME}`
export const DEFAULT_YEAR = 2026

import type { RecordModel } from 'pocketbase'

export interface MonthlyDataRecord extends RecordModel {
  user: string
  month: string // ISO date string (e.g. "2026-01-01 00:00:00.000Z")
  investment: number
  gross_revenue: number
  net_profit: number
}

export interface GoalsRecord extends RecordModel {
  user: string
  year: number
  annual_revenue_goal: number
  annual_profit_goal: number
  profit_margin_goal?: number | null
  min_margin_goal?: number | null
  tax_meta_rate?: number | null
  sales_tax_rate?: number | null
}

export interface MonthlyDetailsRecord extends RecordModel {
  user: string
  year: number
  month: number // 1-12
  revenue: number
  ads_meta: number // Investimento Meta (Anúncios Meta) — manual
  sales_commission: number
  other_variable_costs: number
  fixed_costs: number
}
export interface ComputedMonthlyItem {
  id?: string
  monthDate: string // YYYY-MM-01 format or full ISO
  monthKey: string // e.g. "2026-01"
  monthIndex: number // 0 to 11 (or >11 for extra rows)
  monthLabel: string // e.g. "janeiro/2026"
  shortLabel: string // e.g. "Jan"
  investment: number
  grossRevenue: number
  netProfit: number
  roas: number | null // calculated: grossRevenue / investment, null if investment === 0
  marginPercent: number | null // calculated: (netProfit / grossRevenue) * 100, null if grossRevenue === 0
  isExtra?: boolean
  hasRecord?: boolean
}

export interface YearFinancialSummary {
  totalInvestment: number
  totalRevenue: number
  totalCosts: number
  totalProfit: number
  averageRoas: number | null
  averageMargin: number | null
  currentMonthRevenue: number | null
  lastEnteredMonthLabel: string | null
  revenueGoal: number
  profitGoal: number
  profitMarginGoal: number | null
  revenueGoalPercent: number | null
  profitGoalPercent: number | null
  marginGoalPercent: number | null
  hasAnyData: boolean
  monthlyItems: ComputedMonthlyItem[]
}
