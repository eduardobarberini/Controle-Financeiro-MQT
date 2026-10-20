import { supabase, requireUserId } from '@/lib/supabase/client'

export type ProductKind = 'ingresso' | 'bump' | 'plataforma' | 'renovacao' | 'outro' | 'ignorar'
export type KindSource = 'auto' | 'manual'

export const KIND_LABELS: Record<ProductKind, string> = {
  ingresso: 'Ingresso (Desafio)',
  bump: 'Order bump',
  plataforma: 'Plataforma',
  renovacao: 'Renovação',
  outro: 'Outro',
  ignorar: 'Ignorar',
}

export const KIND_OPTIONS = Object.keys(KIND_LABELS) as ProductKind[]

export interface GuruProduct {
  id: string
  user_id: string
  guru_product_id: string
  internal_id: string | null
  name: string
  marketplace_name: string | null
  kind: ProductKind
  kind_source: KindSource
  list_price: number | null
  first_seen_at: string | null
  sales_count: number
  last_sale_at: string | null
  typical_price: number | null
}

export interface AsaasLink {
  id: string
  user_id: string
  asaas_link_id: string
  name: string
  kind: ProductKind
  seller_id: string | null
  is_company_link: boolean
  contract_value: number | null
  kind_source: KindSource
  contracts: number
  paid_contracts: number
  last_sale_on: string | null
  typical_contract_value: number | null
}

export interface Seller {
  id: string
  user_id: string
  name: string
  code: string
  fixed_salary: number
  commission_rate: number
  guru_patterns: string[]
  asaas_patterns: string[]
  active: boolean
}

export type SellerInput = Pick<
  Seller,
  | 'name'
  | 'code'
  | 'fixed_salary'
  | 'commission_rate'
  | 'guru_patterns'
  | 'asaas_patterns'
  | 'active'
>

export interface ReclassifyResult {
  new_products: number
  new_links: number
  guru_updated: number
  asaas_updated: number
}

const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v))

export const catalogService = {
  async getProducts(): Promise<GuruProduct[]> {
    const { data, error } = await supabase
      .from('v_guru_product_catalog')
      .select('*')
      .order('sales_count', { ascending: false })
    if (error) throw new Error(`Falha ao carregar produtos do Guru: ${error.message}`)
    return (data ?? []).map((r) => ({
      ...(r as unknown as GuruProduct),
      list_price: num(r.list_price),
      typical_price: num(r.typical_price),
    }))
  },

  async getLinks(): Promise<AsaasLink[]> {
    const { data, error } = await supabase
      .from('v_asaas_link_catalog')
      .select('*')
      .order('contracts', { ascending: false })
    if (error) throw new Error(`Falha ao carregar links do Asaas: ${error.message}`)
    return (data ?? []).map((r) => ({
      ...(r as unknown as AsaasLink),
      contract_value: num(r.contract_value),
      typical_contract_value: num(r.typical_contract_value),
    }))
  },

  /** Vendedoras; cria Maju e Marlene na primeira vez. */
  async getSellers(): Promise<Seller[]> {
    const load = () => supabase.from('sellers').select('*').order('name')
    let { data, error } = await load()
    if (!error && (data ?? []).length === 0) {
      const { error: seedError } = await supabase.rpc('ensure_business_defaults')
      if (seedError) throw new Error(`Falha ao criar as vendedoras padrão: ${seedError.message}`)
      ;({ data, error } = await load())
    }
    if (error) throw new Error(`Falha ao carregar vendedoras: ${error.message}`)
    return (data ?? []).map((r) => ({
      ...(r as unknown as Seller),
      fixed_salary: Number(r.fixed_salary),
      commission_rate: Number(r.commission_rate),
    }))
  },

  /** Classificação manual de um produto (ou volta para a sugestão automática). */
  async updateProduct(
    id: string,
    patch: { kind?: ProductKind; kind_source?: KindSource; list_price?: number | null },
  ): Promise<void> {
    const row = { ...patch }
    if (patch.kind !== undefined && patch.kind_source === undefined) row.kind_source = 'manual'
    const { error } = await supabase.from('guru_products').update(row).eq('id', id)
    if (error) throw new Error(`Falha ao salvar o produto: ${error.message}`)
  },

  /** Qualquer edição de tipo, vendedora ou valor fixa o link como manual. */
  async updateLink(
    id: string,
    patch: {
      kind?: ProductKind
      seller_id?: string | null
      contract_value?: number | null
      kind_source?: KindSource
    },
  ): Promise<void> {
    const row = { kind_source: 'manual' as KindSource, ...patch }
    const { error } = await supabase.from('asaas_payment_links').update(row).eq('id', id)
    if (error) throw new Error(`Falha ao salvar o link: ${error.message}`)
  },

  async createSeller(input: SellerInput): Promise<void> {
    const userId = await requireUserId()
    const { error } = await supabase.from('sellers').insert({ user_id: userId, ...input })
    if (error) throw new Error(`Falha ao criar a vendedora: ${error.message}`)
  },

  async updateSeller(id: string, input: Partial<SellerInput>): Promise<void> {
    const { error } = await supabase.from('sellers').update(input).eq('id', id)
    if (error) throw new Error(`Falha ao salvar a vendedora: ${error.message}`)
  },

  async reclassify(): Promise<ReclassifyResult> {
    const { data, error } = await supabase.rpc('reclassify_sales')
    if (error) throw new Error(`Falha ao reclassificar: ${error.message}`)
    return data as unknown as ReclassifyResult
  },
}
