export interface PaidLaunchRecord {
  id: string
  user: string
  capture_days: number
  batch: 'Semana 1' | 'Semana 2' | 'Semana 3' | 'Semana 4'
  ticket_ticket: number
  traffic_investment: number
  total_ticket_sales: number
  ticket_refunds: number
  bump_ticket: number
  bump_sales: number
  bump_refunds: number
  created: string
  updated: string
}

export interface PaidLaunchInput {
  capture_days: number
  batch: 'Semana 1' | 'Semana 2' | 'Semana 3' | 'Semana 4'
  ticket_ticket: number
  traffic_investment: number
  total_ticket_sales: number
  ticket_refunds: number
  bump_ticket: number
  bump_sales: number
  bump_refunds: number
}
