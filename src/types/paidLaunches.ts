export interface DailyEntry {
  dayLabel?: string // e.g., 'Seg', 'Ter', etc.
  dateLabel?: string // e.g., '8/6', '9/6', etc.
  investment: number | string // manual
  ticket_sales: number | string // manual (Vendas Ingresso)
  bump_sales: number | string // manual (Vendas Order Bump)
}

export type DailyData = DailyEntry[] // array of 7 days (Seg..Dom)

export interface PaidLaunchRecord {
  id: string
  user: string
  capture_days: number
  batch: string
  ticket_ticket: number
  traffic_investment: number
  total_ticket_sales: number
  ticket_refunds: number
  bump_ticket: number
  bump_sales: number
  bump_refunds: number
  daily_data?: DailyData
  created: string
  updated: string
}

export interface PaidLaunchInput {
  capture_days: number
  batch: string
  ticket_ticket: number
  traffic_investment: number
  total_ticket_sales: number
  ticket_refunds: number
  bump_ticket: number
  bump_sales: number
  bump_refunds: number
  daily_data?: DailyData
}
