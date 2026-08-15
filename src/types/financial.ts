export const COMPANY_NAME = 'Body4You'
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
}

export interface MonthlyDetailsRecord extends RecordModel {
  user: string
  year: number
  month: number // 1-12
  revenue: number
  investment: number
  ads_meta: number
  tax_meta: number
  sales_tax: number
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
  totalProfit: number
  averageRoas: number | null
  averageMargin: number | null
  currentMonthRevenue: number | null
  lastEnteredMonthLabel: string | null
  revenueGoal: number
  profitGoal: number
  revenueGoalPercent: number | null
  profitGoalPercent: number | null
  hasAnyData: boolean
  monthlyItems: ComputedMonthlyItem[]
}
