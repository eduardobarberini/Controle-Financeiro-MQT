
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "asaas_customers": {
                  Row: {
                    "asaas_id": string,"cpf_cnpj": string | null,"created_at": string,"email": string | null,"id": string,"name": string | null,"phone": string | null,"raw": Json | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "asaas_id": string,"cpf_cnpj"?: string | null,"created_at"?: string,"email"?: string | null,"id"?: string,"name"?: string | null,"phone"?: string | null,"raw"?: Json | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "asaas_id"?: string,"cpf_cnpj"?: string | null,"created_at"?: string,"email"?: string | null,"id"?: string,"name"?: string | null,"phone"?: string | null,"raw"?: Json | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"asaas_payments": {
                  Row: {
                    "asaas_created_at": string | null,"asaas_id": string,"billing_type": string | null,"client_payment_date": string | null,"confirmed_date": string | null,"created_at": string,"credit_date": string | null,"customer_id": string | null,"deleted": boolean,"description": string | null,"due_date": string | null,"estimated_credit_date": string | null,"external_reference": string | null,"id": string,"installment_count": number | null,"installment_id": string | null,"installment_number": number | null,"interest_value": number | null,"invoice_url": string | null,"net_value": number,"original_due_date": string | null,"original_value": number | null,"payment_date": string | null,"raw": Json | null,"refunded_value": number,"status": string,"updated_at": string,"user_id": string,"value": number
                  }
                  ComputedFields: never
                  Insert: {
                    "asaas_created_at"?: string | null,"asaas_id": string,"billing_type"?: string | null,"client_payment_date"?: string | null,"confirmed_date"?: string | null,"created_at"?: string,"credit_date"?: string | null,"customer_id"?: string | null,"deleted"?: boolean,"description"?: string | null,"due_date"?: string | null,"estimated_credit_date"?: string | null,"external_reference"?: string | null,"id"?: string,"installment_count"?: number | null,"installment_id"?: string | null,"installment_number"?: number | null,"interest_value"?: number | null,"invoice_url"?: string | null,"net_value"?: number,"original_due_date"?: string | null,"original_value"?: number | null,"payment_date"?: string | null,"raw"?: Json | null,"refunded_value"?: number,"status": string,"updated_at"?: string,"user_id": string,"value"?: number
                  }
                  Update: {
                    "asaas_created_at"?: string | null,"asaas_id"?: string,"billing_type"?: string | null,"client_payment_date"?: string | null,"confirmed_date"?: string | null,"created_at"?: string,"credit_date"?: string | null,"customer_id"?: string | null,"deleted"?: boolean,"description"?: string | null,"due_date"?: string | null,"estimated_credit_date"?: string | null,"external_reference"?: string | null,"id"?: string,"installment_count"?: number | null,"installment_id"?: string | null,"installment_number"?: number | null,"interest_value"?: number | null,"invoice_url"?: string | null,"net_value"?: number,"original_due_date"?: string | null,"original_value"?: number | null,"payment_date"?: string | null,"raw"?: Json | null,"refunded_value"?: number,"status"?: string,"updated_at"?: string,"user_id"?: string,"value"?: number
                  }
                  Relationships: [
                    
                  ]
                },"company_settings": {
                  Row: {
                    "company_name": string,"created_at": string,"id": string,"logo_path": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "company_name"?: string,"created_at"?: string,"id"?: string,"logo_path"?: string | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "company_name"?: string,"created_at"?: string,"id"?: string,"logo_path"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"fixed_expense_categories": {
                  Row: {
                    "color": string,"created_at": string,"description": string,"id": string,"name": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "color"?: string,"created_at"?: string,"description"?: string,"id"?: string,"name": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "color"?: string,"created_at"?: string,"description"?: string,"id"?: string,"name"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"fixed_expenses": {
                  Row: {
                    "amount": number,"category_id": string,"created_at": string,"description": string,"due_day": number,"ends_month": number | null,"ends_year": number | null,"id": string,"month": number,"notes": string,"origin_id": string | null,"recurrence": Database["public"]['Enums']["expense_recurrence"],"status": Database["public"]['Enums']["expense_status"],"updated_at": string,"user_id": string,"year": number
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"category_id": string,"created_at"?: string,"description": string,"due_day": number,"ends_month"?: number | null,"ends_year"?: number | null,"id"?: string,"month": number,"notes"?: string,"origin_id"?: string | null,"recurrence"?: Database["public"]['Enums']["expense_recurrence"],"status"?: Database["public"]['Enums']["expense_status"],"updated_at"?: string,"user_id": string,"year": number
                  }
                  Update: {
                    "amount"?: number,"category_id"?: string,"created_at"?: string,"description"?: string,"due_day"?: number,"ends_month"?: number | null,"ends_year"?: number | null,"id"?: string,"month"?: number,"notes"?: string,"origin_id"?: string | null,"recurrence"?: Database["public"]['Enums']["expense_recurrence"],"status"?: Database["public"]['Enums']["expense_status"],"updated_at"?: string,"user_id"?: string,"year"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "fixed_expenses_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "fixed_expense_categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fixed_expenses_origin_id_fkey"
      columns: ["origin_id"]
isOneToOne: false
      referencedRelation: "fixed_expenses"
      referencedColumns: ["id"]
    }
                  ]
                },"goals": {
                  Row: {
                    "annual_profit_goal": number,"annual_revenue_goal": number,"created_at": string,"id": string,"profit_margin_goal": number | null,"renewal_rate_goal": number | null,"sales_tax_rate": number | null,"tax_meta_rate": number | null,"updated_at": string,"user_id": string,"year": number
                  }
                  ComputedFields: never
                  Insert: {
                    "annual_profit_goal"?: number,"annual_revenue_goal"?: number,"created_at"?: string,"id"?: string,"profit_margin_goal"?: number | null,"renewal_rate_goal"?: number | null,"sales_tax_rate"?: number | null,"tax_meta_rate"?: number | null,"updated_at"?: string,"user_id": string,"year": number
                  }
                  Update: {
                    "annual_profit_goal"?: number,"annual_revenue_goal"?: number,"created_at"?: string,"id"?: string,"profit_margin_goal"?: number | null,"renewal_rate_goal"?: number | null,"sales_tax_rate"?: number | null,"tax_meta_rate"?: number | null,"updated_at"?: string,"user_id"?: string,"year"?: number
                  }
                  Relationships: [
                    
                  ]
                },"guru_subscriptions": {
                  Row: {
                    "cancel_at_cycle_end": boolean,"cancelled_at": string | null,"charged_every_days": number | null,"charged_times": number | null,"created_at": string,"customer_email": string | null,"customer_id": string | null,"customer_name": string | null,"guru_id": string,"id": string,"next_cycle_at": string | null,"next_cycle_value": number | null,"payment_method": string | null,"product_id": string | null,"product_name": string | null,"raw": Json | null,"started_at": string | null,"status": string,"subscription_code": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cancel_at_cycle_end"?: boolean,"cancelled_at"?: string | null,"charged_every_days"?: number | null,"charged_times"?: number | null,"created_at"?: string,"customer_email"?: string | null,"customer_id"?: string | null,"customer_name"?: string | null,"guru_id": string,"id"?: string,"next_cycle_at"?: string | null,"next_cycle_value"?: number | null,"payment_method"?: string | null,"product_id"?: string | null,"product_name"?: string | null,"raw"?: Json | null,"started_at"?: string | null,"status": string,"subscription_code"?: string | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "cancel_at_cycle_end"?: boolean,"cancelled_at"?: string | null,"charged_every_days"?: number | null,"charged_times"?: number | null,"created_at"?: string,"customer_email"?: string | null,"customer_id"?: string | null,"customer_name"?: string | null,"guru_id"?: string,"id"?: string,"next_cycle_at"?: string | null,"next_cycle_value"?: number | null,"payment_method"?: string | null,"product_id"?: string | null,"product_name"?: string | null,"raw"?: Json | null,"started_at"?: string | null,"status"?: string,"subscription_code"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"guru_transactions": {
                  Row: {
                    "affiliate_name": string | null,"affiliate_value": number,"canceled_at": string | null,"checkout_source": string | null,"confirmed_at": string | null,"coupon_code": string | null,"created_at": string,"currency": string | null,"customer_doc": string | null,"customer_email": string | null,"customer_id": string | null,"customer_name": string | null,"discount_value": number,"gross": number,"guru_id": string,"guru_updated_at": string | null,"has_order_bump": boolean,"id": string,"installments": number | null,"invoice_cycle": number | null,"invoice_type": string | null,"is_order_bump": boolean,"marketplace_id": string | null,"marketplace_name": string | null,"marketplace_value": number,"net": number,"offer_id": string | null,"offer_name": string | null,"ordered_at": string | null,"payment_method": string | null,"product_id": string | null,"product_name": string | null,"product_type": string | null,"quantity": number | null,"raw": Json | null,"source": string | null,"status": string,"subscription_code": string | null,"subscription_status": string | null,"tax_value": number,"total": number,"type": string | null,"updated_at": string,"user_id": string,"utm_campaign": string | null,"utm_content": string | null,"utm_medium": string | null,"utm_source": string | null,"utm_term": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "affiliate_name"?: string | null,"affiliate_value"?: number,"canceled_at"?: string | null,"checkout_source"?: string | null,"confirmed_at"?: string | null,"coupon_code"?: string | null,"created_at"?: string,"currency"?: string | null,"customer_doc"?: string | null,"customer_email"?: string | null,"customer_id"?: string | null,"customer_name"?: string | null,"discount_value"?: number,"gross"?: number,"guru_id": string,"guru_updated_at"?: string | null,"has_order_bump"?: boolean,"id"?: string,"installments"?: number | null,"invoice_cycle"?: number | null,"invoice_type"?: string | null,"is_order_bump"?: boolean,"marketplace_id"?: string | null,"marketplace_name"?: string | null,"marketplace_value"?: number,"net"?: number,"offer_id"?: string | null,"offer_name"?: string | null,"ordered_at"?: string | null,"payment_method"?: string | null,"product_id"?: string | null,"product_name"?: string | null,"product_type"?: string | null,"quantity"?: number | null,"raw"?: Json | null,"source"?: string | null,"status": string,"subscription_code"?: string | null,"subscription_status"?: string | null,"tax_value"?: number,"total"?: number,"type"?: string | null,"updated_at"?: string,"user_id": string,"utm_campaign"?: string | null,"utm_content"?: string | null,"utm_medium"?: string | null,"utm_source"?: string | null,"utm_term"?: string | null
                  }
                  Update: {
                    "affiliate_name"?: string | null,"affiliate_value"?: number,"canceled_at"?: string | null,"checkout_source"?: string | null,"confirmed_at"?: string | null,"coupon_code"?: string | null,"created_at"?: string,"currency"?: string | null,"customer_doc"?: string | null,"customer_email"?: string | null,"customer_id"?: string | null,"customer_name"?: string | null,"discount_value"?: number,"gross"?: number,"guru_id"?: string,"guru_updated_at"?: string | null,"has_order_bump"?: boolean,"id"?: string,"installments"?: number | null,"invoice_cycle"?: number | null,"invoice_type"?: string | null,"is_order_bump"?: boolean,"marketplace_id"?: string | null,"marketplace_name"?: string | null,"marketplace_value"?: number,"net"?: number,"offer_id"?: string | null,"offer_name"?: string | null,"ordered_at"?: string | null,"payment_method"?: string | null,"product_id"?: string | null,"product_name"?: string | null,"product_type"?: string | null,"quantity"?: number | null,"raw"?: Json | null,"source"?: string | null,"status"?: string,"subscription_code"?: string | null,"subscription_status"?: string | null,"tax_value"?: number,"total"?: number,"type"?: string | null,"updated_at"?: string,"user_id"?: string,"utm_campaign"?: string | null,"utm_content"?: string | null,"utm_medium"?: string | null,"utm_source"?: string | null,"utm_term"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"integration_settings": {
                  Row: {
                    "config": NonNullable<Json>,"created_at": string,"enabled": boolean,"id": string,"last_error": string | null,"last_sync_at": string | null,"last_sync_status": string | null,"provider": Database["public"]['Enums']["integration_provider"],"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "config"?: NonNullable<Json>,"created_at"?: string,"enabled"?: boolean,"id"?: string,"last_error"?: string | null,"last_sync_at"?: string | null,"last_sync_status"?: string | null,"provider": Database["public"]['Enums']["integration_provider"],"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "config"?: NonNullable<Json>,"created_at"?: string,"enabled"?: boolean,"id"?: string,"last_error"?: string | null,"last_sync_at"?: string | null,"last_sync_status"?: string | null,"provider"?: Database["public"]['Enums']["integration_provider"],"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"meta_ad_insights": {
                  Row: {
                    "action_values": Json | null,"actions": Json | null,"ad_account_id": string | null,"campaign_id": string,"campaign_name": string | null,"clicks": number,"cpc": number | null,"cpm": number | null,"created_at": string,"ctr": number | null,"date": string,"frequency": number | null,"id": string,"impressions": number,"initiate_checkouts": number,"landing_page_views": number,"leads": number,"link_clicks": number,"purchase_value": number,"purchases": number,"raw": Json | null,"reach": number,"spend": number,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action_values"?: Json | null,"actions"?: Json | null,"ad_account_id"?: string | null,"campaign_id": string,"campaign_name"?: string | null,"clicks"?: number,"cpc"?: number | null,"cpm"?: number | null,"created_at"?: string,"ctr"?: number | null,"date": string,"frequency"?: number | null,"id"?: string,"impressions"?: number,"initiate_checkouts"?: number,"landing_page_views"?: number,"leads"?: number,"link_clicks"?: number,"purchase_value"?: number,"purchases"?: number,"raw"?: Json | null,"reach"?: number,"spend"?: number,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "action_values"?: Json | null,"actions"?: Json | null,"ad_account_id"?: string | null,"campaign_id"?: string,"campaign_name"?: string | null,"clicks"?: number,"cpc"?: number | null,"cpm"?: number | null,"created_at"?: string,"ctr"?: number | null,"date"?: string,"frequency"?: number | null,"id"?: string,"impressions"?: number,"initiate_checkouts"?: number,"landing_page_views"?: number,"leads"?: number,"link_clicks"?: number,"purchase_value"?: number,"purchases"?: number,"raw"?: Json | null,"reach"?: number,"spend"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"meta_campaigns": {
                  Row: {
                    "ad_account_id": string | null,"campaign_id": string,"created_at": string,"created_time": string | null,"effective_status": string | null,"id": string,"name": string | null,"objective": string | null,"raw": Json | null,"status": string | null,"updated_at": string,"updated_time": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ad_account_id"?: string | null,"campaign_id": string,"created_at"?: string,"created_time"?: string | null,"effective_status"?: string | null,"id"?: string,"name"?: string | null,"objective"?: string | null,"raw"?: Json | null,"status"?: string | null,"updated_at"?: string,"updated_time"?: string | null,"user_id": string
                  }
                  Update: {
                    "ad_account_id"?: string | null,"campaign_id"?: string,"created_at"?: string,"created_time"?: string | null,"effective_status"?: string | null,"id"?: string,"name"?: string | null,"objective"?: string | null,"raw"?: Json | null,"status"?: string | null,"updated_at"?: string,"updated_time"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"monthly_details": {
                  Row: {
                    "ads_meta": number,"created_at": string,"fixed_costs": number,"id": string,"month": number,"other_variable_costs": number,"revenue": number,"sales_commission": number,"updated_at": string,"user_id": string,"year": number
                  }
                  ComputedFields: never
                  Insert: {
                    "ads_meta"?: number,"created_at"?: string,"fixed_costs"?: number,"id"?: string,"month": number,"other_variable_costs"?: number,"revenue"?: number,"sales_commission"?: number,"updated_at"?: string,"user_id": string,"year": number
                  }
                  Update: {
                    "ads_meta"?: number,"created_at"?: string,"fixed_costs"?: number,"id"?: string,"month"?: number,"other_variable_costs"?: number,"revenue"?: number,"sales_commission"?: number,"updated_at"?: string,"user_id"?: string,"year"?: number
                  }
                  Relationships: [
                    
                  ]
                },"paid_launches": {
                  Row: {
                    "api_official_cost": number | null,"batch": string,"bump_refunds": number,"bump_sales": number,"bump_ticket": number,"capture_days": number,"class_sessions": Json | null,"commercial_commission": number | null,"commercial_sales": Json | null,"created_at": string,"daily_data": Json | null,"debriefing": string | null,"id": string,"revenue_tax_rate": number | null,"students_in_challenge": number | null,"ticket_refunds": number,"ticket_ticket": number,"total_ticket_sales": number,"traffic_investment": number,"traffic_tax_rate": number | null,"updated_at": string,"upsell_platform": Json | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "api_official_cost"?: number | null,"batch": string,"bump_refunds"?: number,"bump_sales"?: number,"bump_ticket"?: number,"capture_days"?: number,"class_sessions"?: Json | null,"commercial_commission"?: number | null,"commercial_sales"?: Json | null,"created_at"?: string,"daily_data"?: Json | null,"debriefing"?: string | null,"id"?: string,"revenue_tax_rate"?: number | null,"students_in_challenge"?: number | null,"ticket_refunds"?: number,"ticket_ticket"?: number,"total_ticket_sales"?: number,"traffic_investment"?: number,"traffic_tax_rate"?: number | null,"updated_at"?: string,"upsell_platform"?: Json | null,"user_id": string
                  }
                  Update: {
                    "api_official_cost"?: number | null,"batch"?: string,"bump_refunds"?: number,"bump_sales"?: number,"bump_ticket"?: number,"capture_days"?: number,"class_sessions"?: Json | null,"commercial_commission"?: number | null,"commercial_sales"?: Json | null,"created_at"?: string,"daily_data"?: Json | null,"debriefing"?: string | null,"id"?: string,"revenue_tax_rate"?: number | null,"students_in_challenge"?: number | null,"ticket_refunds"?: number,"ticket_ticket"?: number,"total_ticket_sales"?: number,"traffic_investment"?: number,"traffic_tax_rate"?: number | null,"updated_at"?: string,"upsell_platform"?: Json | null,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"renewals": {
                  Row: {
                    "created_at": string,"id": string,"month": number,"renewal_revenue": number,"renewals": number,"students_to_renew": number,"updated_at": string,"user_id": string,"year": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"month": number,"renewal_revenue"?: number,"renewals"?: number,"students_to_renew"?: number,"updated_at"?: string,"user_id": string,"year": number
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"month"?: number,"renewal_revenue"?: number,"renewals"?: number,"students_to_renew"?: number,"updated_at"?: string,"user_id"?: string,"year"?: number
                  }
                  Relationships: [
                    
                  ]
                },"sync_runs": {
                  Row: {
                    "details": NonNullable<Json>,"error": string | null,"finished_at": string | null,"id": string,"provider": Database["public"]['Enums']["integration_provider"],"records_upserted": number,"started_at": string,"status": string,"trigger": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "details"?: NonNullable<Json>,"error"?: string | null,"finished_at"?: string | null,"id"?: string,"provider": Database["public"]['Enums']["integration_provider"],"records_upserted"?: number,"started_at"?: string,"status"?: string,"trigger": string,"user_id"?: string | null
                  }
                  Update: {
                    "details"?: NonNullable<Json>,"error"?: string | null,"finished_at"?: string | null,"id"?: string,"provider"?: Database["public"]['Enums']["integration_provider"],"records_upserted"?: number,"started_at"?: string,"status"?: string,"trigger"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"webhook_events": {
                  Row: {
                    "error": string | null,"event_key": string,"event_type": string | null,"external_id": string | null,"id": string,"payload": NonNullable<Json>,"processed_at": string | null,"provider": Database["public"]['Enums']["integration_provider"],"received_at": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "error"?: string | null,"event_key": string,"event_type"?: string | null,"external_id"?: string | null,"id"?: string,"payload": NonNullable<Json>,"processed_at"?: string | null,"provider": Database["public"]['Enums']["integration_provider"],"received_at"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "error"?: string | null,"event_key"?: string,"event_type"?: string | null,"external_id"?: string | null,"id"?: string,"payload"?: NonNullable<Json>,"processed_at"?: string | null,"provider"?: Database["public"]['Enums']["integration_provider"],"received_at"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            "v_asaas_receivables": {
                  Row: {
                    "open_count": number | null,"open_value": number | null,"overdue_count": number | null,"overdue_value": number | null,"user_id": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"v_monthly_integrations": {
                  Row: {
                    "asaas_net": number | null,"asaas_paid_count": number | null,"asaas_received": number | null,"asaas_refunded": number | null,"guru_gross": number | null,"guru_net": number | null,"guru_refund_count": number | null,"guru_refunded": number | null,"guru_sales": number | null,"meta_impressions": number | null,"meta_leads": number | null,"meta_link_clicks": number | null,"meta_purchase_value": number | null,"meta_purchases": number | null,"meta_spend": number | null,"month": number | null,"user_id": string | null,"year": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                }
          }
          Functions: {
            [_ in never]: never
          }
          Enums: {
            "expense_recurrence": "pontual"|"mensal"|"trimestral"|"semestral"|"anual","expense_status": "pago"|"pendente","integration_provider": "guru"|"asaas"|"meta"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "expense_recurrence": ["pontual", "mensal", "trimestral", "semestral", "anual"],"expense_status": ["pago", "pendente"],"integration_provider": ["guru", "asaas", "meta"]
          }
        }
} as const
