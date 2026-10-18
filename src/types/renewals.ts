import type { BaseRow } from './financial'

/**
 * Monthly renewal tracking record (one per user/year/month).
 * `renewal_rate` is computed on the client (renewals ÷ students_to_renew × 100).
 */
export interface RenewalRecord extends BaseRow {
  year: number
  month: number // 1-12
  students_to_renew: number
  renewals: number
  renewal_revenue: number
}
