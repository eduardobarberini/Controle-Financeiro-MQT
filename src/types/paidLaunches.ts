export interface DailyEntry {
  dayLabel?: string // e.g., 'Seg', 'Ter', etc.
  dateLabel?: string // e.g., '8/6', '9/6', etc.
  investment: number | string // manual
  ticket_sales: number | string // manual (Vendas Ingresso)
  bump_sales: number | string // manual (Vendas Order Bump)
}

export type DailyData = DailyEntry[] // array of 7 days (Seg..Dom)

/** A single delivered class within a paid launch. */
export interface ClassSession {
  date: string // YYYY-MM-DD
  topic: string
  attendees: number | string
  revenue: number | string
  notes: string
}

export type ClassSessions = ClassSession[]

/** Commercial/enterprise sales pipeline entry within a paid launch. */
export interface CommercialSale {
  client: string
  product: string
  value: number | string
  status: 'Prospecto' | 'Negociação' | 'Fechado' | 'Perdido'
  close_date: string // YYYY-MM-DD
  notes: string
}

export type CommercialSales = CommercialSale[]

/** Upsell platform metrics within a paid launch. */
export interface UpsellPlatform {
  total_sales: number | string
  ticket: number | string
  card_pix_sales: number | string
  boleto_3x_sales: number | string
  refunds: number | string
  inadimplencia_rate: number | string
}

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
  class_sessions?: ClassSessions
  commercial_sales?: CommercialSales
  upsell_platform?: UpsellPlatform
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
  class_sessions?: ClassSessions
  commercial_sales?: CommercialSales
  upsell_platform?: UpsellPlatform
}
