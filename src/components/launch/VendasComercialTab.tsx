import React, { useMemo } from 'react'
import {
  Users,
  DollarSign,
  TrendingUp,
  Percent,
  Plus,
  Trash2,
  Save,
  Loader2,
  ShoppingBag,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { KpiCard } from '@/components/dashboard/KpiCard'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type {
  CommercialSales,
  CommercialSellerEntry,
  CommercialCategoryMetrics,
} from '@/types/paidLaunches'
import {
  formatCurrency,
  formatCalculatedCurrency,
  formatCalculatedPercent,
} from '@/lib/launch-format'
import { formatNumber, parsePtBrNumber } from '@/lib/financial-utils'

interface VendasComercialTabProps {
  commercialSales: CommercialSales
  totalIngressos: number
  totalUpsells: number
  onChangeSales: (sales: CommercialSales) => void
  onSave?: () => Promise<void>
  saving?: boolean
  launchBatch?: string
  launchId?: string
}

export const createDefaultSeller = (index: number): CommercialSellerEntry => ({
  id: `seller-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
  name: index === 0 ? 'Maju' : index === 1 ? 'Marlene' : `Vendedor ${index + 1}`,
  commission_rate: 5,
  plataforma: {
    card_pix_sales: index === 0 ? 90 : index === 1 ? 90 : '',
    card_pix_ticket: index === 0 ? 297 : index === 1 ? 297 : '',
    boleto_sales: index === 0 ? 20 : index === 1 ? 20 : '',
    boleto_ticket: index === 0 ? 297 : index === 1 ? 297 : '',
  },
  renovacao: {
    card_pix_sales: index === 0 ? 10 : index === 1 ? 10 : '',
    card_pix_ticket: index === 0 ? 197 : index === 1 ? 197 : '',
    boleto_sales: index === 0 ? 2 : index === 1 ? 2 : '',
    boleto_ticket: index === 0 ? 197 : index === 1 ? 197 : '',
  },
})

export const DEFAULT_COMMERCIAL_SALES: CommercialSales = [
  createDefaultSeller(0),
  createDefaultSeller(1),
]

export const VendasComercialTab: React.FC<VendasComercialTabProps> = ({
  commercialSales = [],
  totalIngressos = 0,
  totalUpsells = 0,
  onChangeSales,
  onSave,
  saving = false,
  launchBatch = '',
  launchId,
}) => {
  const sellers = Array.isArray(commercialSales) ? commercialSales : []

  // Global calculations for KPI Dashboard and per-seller totals
  const sellerCalculations = useMemo(() => {
    let totalVendasCommercial = 0
    let totalFaturamentoCommercial = 0
    let totalComissaoCommercial = 0

    const sellerMetrics = sellers.map((seller) => {
      const commRate = Number(seller.commission_rate) || 0

      // Plataforma
      const platCardSales = Number(seller.plataforma?.card_pix_sales) || 0
      const platCardTicket = Number(seller.plataforma?.card_pix_ticket) || 0
      const platCardRevenue = platCardSales * platCardTicket
      const platCardComm = platCardRevenue * (commRate / 100)

      const platBoletoSales = Number(seller.plataforma?.boleto_sales) || 0
      const platBoletoTicket = Number(seller.plataforma?.boleto_ticket) || 0
      const platBoletoRevenue = platBoletoSales * platBoletoTicket
      const platBoletoComm = platBoletoRevenue * (commRate / 100)

      const platTotalSales = platCardSales + platBoletoSales
      const platTotalRevenue = platCardRevenue + platBoletoRevenue
      const platTotalComm = platCardComm + platBoletoComm
      const platAvgTicket = platTotalSales > 0 ? platTotalRevenue / platTotalSales : 0

      // Renovação
      const renoCardSales = Number(seller.renovacao?.card_pix_sales) || 0
      const renoCardTicket = Number(seller.renovacao?.card_pix_ticket) || 0
      const renoCardRevenue = renoCardSales * renoCardTicket
      const renoCardComm = renoCardRevenue * (commRate / 100)

      const renoBoletoSales = Number(seller.renovacao?.boleto_sales) || 0
      const renoBoletoTicket = Number(seller.renovacao?.boleto_ticket) || 0
      const renoBoletoRevenue = renoBoletoSales * renoBoletoTicket
      const renoBoletoComm = renoBoletoRevenue * (commRate / 100)

      const renoTotalSales = renoCardSales + renoBoletoSales
      const renoTotalRevenue = renoCardRevenue + renoBoletoRevenue
      const renoTotalComm = renoCardComm + renoBoletoComm
      const renoAvgTicket = renoTotalSales > 0 ? renoTotalRevenue / renoTotalSales : 0

      // Seller Totals
      const sellerTotalSales = platTotalSales + renoTotalSales
      const sellerTotalRevenue = platTotalRevenue + renoTotalRevenue
      const sellerTotalComm = platTotalComm + renoTotalComm
      const sellerAvgTicket = sellerTotalSales > 0 ? sellerTotalRevenue / sellerTotalSales : 0

      totalVendasCommercial += sellerTotalSales
      totalFaturamentoCommercial += sellerTotalRevenue
      totalComissaoCommercial += sellerTotalComm

      return {
        seller,
        commRate,
        platCardSales,
        platCardTicket,
        platCardRevenue,
        platCardComm,
        platBoletoSales,
        platBoletoTicket,
        platBoletoRevenue,
        platBoletoComm,
        platTotalSales,
        platTotalRevenue,
        platTotalComm,
        platAvgTicket,
        renoCardSales,
        renoCardTicket,
        renoCardRevenue,
        renoCardComm,
        renoBoletoSales,
        renoBoletoTicket,
        renoBoletoRevenue,
        renoBoletoComm,
        renoTotalSales,
        renoTotalRevenue,
        renoTotalComm,
        renoAvgTicket,
        sellerTotalSales,
        sellerTotalRevenue,
        sellerTotalComm,
        sellerAvgTicket,
      }
    })

    // % Vendas Vindas Comercial = commercialSales / (commercialSales + totalIngressos + totalUpsells)
    const denominator = totalVendasCommercial + totalIngressos + totalUpsells
    const percentVendasComercial = denominator > 0 ? totalVendasCommercial / denominator : 0

    return {
      totalVendasCommercial,
      totalFaturamentoCommercial,
      totalComissaoCommercial,
      percentVendasComercial,
      sellerMetrics,
    }
  }, [sellers, totalIngressos, totalUpsells])

  // Handlers for modifying state
  const handleCategoryFieldChange = (
    sellerIndex: number,
    category: 'plataforma' | 'renovacao',
    field: keyof CommercialCategoryMetrics,
    val: string,
  ) => {
    const updated = sellers.map((s, idx) => {
      if (idx !== sellerIndex) return s
      return {
        ...s,
        [category]: {
          ...s[category],
          [field]: val,
        },
      }
    })
    onChangeSales(updated)
  }

  const handleSellerInfoChange = (
    sellerIndex: number,
    field: 'name' | 'commission_rate',
    val: string | number,
  ) => {
    const updated = sellers.map((s, idx) => {
      if (idx !== sellerIndex) return s
      return {
        ...s,
        [field]: val,
      }
    })
    onChangeSales(updated)
  }

  const handleAddSeller = () => {
    const newSeller = createDefaultSeller(sellers.length)
    // Add seller with empty values so user fills them out
    newSeller.plataforma = {
      card_pix_sales: '',
      card_pix_ticket: '',
      boleto_sales: '',
      boleto_ticket: '',
    }
    newSeller.renovacao = {
      card_pix_sales: '',
      card_pix_ticket: '',
      boleto_sales: '',
      boleto_ticket: '',
    }
    onChangeSales([...sellers, newSeller])
  }

  const handleRemoveSeller = (sellerIndex: number) => {
    if (sellers.length <= 1) {
      alert('É necessário ter ao menos 1 vendedor cadastrado.')
      return
    }
    const updated = sellers.filter((_, idx) => idx !== sellerIndex)
    onChangeSales(updated)
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* 1. KPI Dashboard Top */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Vendas Equipe Comercial"
          value={sellerCalculations.totalVendasCommercial}
          formatType="raw"
          icon={ShoppingBag}
          subtext="Soma de vendas de todos vendedores"
          iconBgColor="bg-slate-100 text-[#6D49F2] border-slate-200"
        />

        <KpiCard
          title="Faturamento Equipe Comercial"
          value={sellerCalculations.totalFaturamentoCommercial}
          formatType="currency"
          icon={DollarSign}
          subtext="Faturamento bruto comercial"
          iconBgColor="bg-slate-100 text-[#6D49F2] border-slate-200"
        />

        <KpiCard
          title="Total Comissão Comercial"
          value={sellerCalculations.totalComissaoCommercial}
          formatType="currency"
          icon={TrendingUp}
          subtext="Comissões a pagar"
          iconBgColor="bg-slate-100 text-slate-700 border-slate-200"
        />

        <KpiCard
          title="% Vendas Vindas Comercial"
          value={sellerCalculations.percentVendasComercial}
          formatType="percent"
          decimals={2}
          icon={Percent}
          subtext="Comercial / Total (Ingressos + Upsell)"
          iconBgColor="bg-slate-100 text-[#FF2AFF] border-slate-200"
        />
      </div>

      {/* 2. Seller Tables */}
      <div className="space-y-6">
        {sellers.map((seller, idx) => {
          const metrics = sellerCalculations.sellerMetrics[idx]
          if (!metrics) return null

          return (
            <Card
              key={seller.id || idx}
              className="bg-white border-slate-200/90 shadow-sm rounded-2xl overflow-hidden"
            >
              <CardHeader className="p-5 pb-3 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#6D49F2]" />
                    Vendedor {idx + 1} ({seller.name || 'Sem nome'})
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    Comissão configurada em {metrics.commRate}% sobre vendas realizadas
                  </CardDescription>
                </div>
              </CardHeader>

              {/* Table Body */}
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table className="min-w-[620px]">
                    <TableHeader className="bg-slate-50/80">
                      <TableRow className="hover:bg-transparent border-b border-slate-200">
                        <TableHead className="py-2.5 px-3 text-left font-bold text-slate-900 text-xs border-r border-slate-200">
                          Categoria / Canal
                        </TableHead>
                        <TableHead className="py-2.5 px-3 text-center font-bold text-slate-900 w-28 border-r border-slate-200 text-xs">
                          Vendas
                        </TableHead>
                        <TableHead className="py-2.5 px-3 text-center font-bold text-slate-900 w-32 border-r border-slate-200 text-xs">
                          Ticket
                        </TableHead>
                        <TableHead className="py-2.5 px-3 text-center font-bold text-slate-900 w-36 border-r border-slate-200 text-xs">
                          Faturamento
                        </TableHead>
                        <TableHead className="py-2.5 px-3 text-center font-bold text-slate-900 w-36 text-xs">
                          Comissão
                        </TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {/* CATEGORY 1: Plataforma Header Row */}
                      <TableRow className="font-bold bg-slate-50/90 border-b border-slate-200 hover:bg-slate-100">
                        <TableCell className="py-2.5 px-3 pl-4 text-slate-900 font-bold border-r border-slate-200 text-xs">
                          Plataforma
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-center tabular-nums text-slate-900 font-bold border-r border-slate-200 text-xs">
                          {metrics.platTotalSales}
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-center tabular-nums text-slate-900 font-bold border-r border-slate-200 text-xs">
                          {formatCurrency(metrics.platAvgTicket)}
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-center tabular-nums text-slate-900 font-bold border-r border-slate-200 text-xs">
                          {formatCurrency(metrics.platTotalRevenue)}
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-center tabular-nums text-slate-900 font-bold text-xs">
                          {formatCurrency(metrics.platTotalComm)}
                        </TableCell>
                      </TableRow>

                      {/* Vendas Cartão / Pix */}
                      <TableRow className="hover:bg-slate-50/50 transition-colors border-b border-slate-100">
                        <TableCell className="py-2 px-3 pl-8 font-medium text-slate-700 border-r border-slate-200 text-xs">
                          Vendas Cartão / Pix
                        </TableCell>
                        <TableCell className="py-2 px-2.5 border-r border-slate-200 text-center text-xs">
                          <Input
                            type="text"
                            inputMode="numeric"
                            placeholder="0"
                            value={
                              seller.plataforma?.card_pix_sales === '' ||
                              seller.plataforma?.card_pix_sales === undefined ||
                              seller.plataforma?.card_pix_sales === null
                                ? ''
                                : String(seller.plataforma.card_pix_sales)
                            }
                            onChange={(e) =>
                              handleCategoryFieldChange(
                                idx,
                                'plataforma',
                                'card_pix_sales',
                                e.target.value.replace(/[^0-9.,]/g, ''),
                              )
                            }
                            onBlur={() => {
                              const val = seller.plataforma?.card_pix_sales
                              if (val !== '' && val !== undefined && val !== null) {
                                const parsed = parsePtBrNumber(val)
                                if (parsed > 0) {
                                  handleCategoryFieldChange(
                                    idx,
                                    'plataforma',
                                    'card_pix_sales',
                                    formatNumber(parsed, 0),
                                  )
                                }
                              }
                            }}
                            className="h-8 text-center font-semibold tabular-nums text-slate-900 text-xs bg-white border-slate-200 focus-visible:ring-[#6D49F2] shadow-2xs"
                          />
                        </TableCell>
                        <TableCell className="py-2 px-2.5 border-r border-slate-200 text-center text-xs">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-medium pointer-events-none">
                              R$
                            </span>
                            <Input
                              type="text"
                              inputMode="decimal"
                              placeholder="0,00"
                              value={
                                seller.plataforma?.card_pix_ticket === '' ||
                                seller.plataforma?.card_pix_ticket === undefined ||
                                seller.plataforma?.card_pix_ticket === null
                                  ? ''
                                  : String(seller.plataforma.card_pix_ticket)
                              }
                              onChange={(e) =>
                                handleCategoryFieldChange(
                                  idx,
                                  'plataforma',
                                  'card_pix_ticket',
                                  e.target.value.replace(/[^0-9.,]/g, ''),
                                )
                              }
                              onBlur={() => {
                                const val = seller.plataforma?.card_pix_ticket
                                if (val !== '' && val !== undefined && val !== null) {
                                  const parsed = parsePtBrNumber(val)
                                  if (parsed > 0) {
                                    handleCategoryFieldChange(
                                      idx,
                                      'plataforma',
                                      'card_pix_ticket',
                                      formatNumber(parsed, 2),
                                    )
                                  }
                                }
                              }}
                              className="pl-6 h-8 text-center font-semibold tabular-nums text-slate-900 text-xs bg-white border-slate-200 focus-visible:ring-[#6D49F2] shadow-2xs"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-center tabular-nums font-semibold text-slate-800 border-r border-slate-200 bg-slate-50/50 text-xs">
                          {formatCurrency(metrics.platCardRevenue)}
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-center tabular-nums font-semibold text-slate-800 bg-slate-50/50 text-xs">
                          {formatCurrency(metrics.platCardComm)}
                        </TableCell>
                      </TableRow>

                      {/* Vendas Boleto 3x */}
                      <TableRow className="hover:bg-slate-50/50 transition-colors border-b border-slate-100">
                        <TableCell className="py-2 px-3 pl-8 font-medium text-slate-700 border-r border-slate-200 text-xs">
                          Vendas Boleto 3x
                        </TableCell>
                        <TableCell className="py-2 px-2.5 border-r border-slate-200 text-center text-xs">
                          <Input
                            type="text"
                            inputMode="numeric"
                            placeholder="0"
                            value={
                              seller.plataforma?.boleto_sales === '' ||
                              seller.plataforma?.boleto_sales === undefined ||
                              seller.plataforma?.boleto_sales === null
                                ? ''
                                : String(seller.plataforma.boleto_sales)
                            }
                            onChange={(e) =>
                              handleCategoryFieldChange(
                                idx,
                                'plataforma',
                                'boleto_sales',
                                e.target.value.replace(/[^0-9.,]/g, ''),
                              )
                            }
                            onBlur={() => {
                              const val = seller.plataforma?.boleto_sales
                              if (val !== '' && val !== undefined && val !== null) {
                                const parsed = parsePtBrNumber(val)
                                if (parsed > 0) {
                                  handleCategoryFieldChange(
                                    idx,
                                    'plataforma',
                                    'boleto_sales',
                                    formatNumber(parsed, 0),
                                  )
                                }
                              }
                            }}
                            className="h-8 text-center font-semibold tabular-nums text-slate-900 text-xs bg-white border-slate-200 focus-visible:ring-[#6D49F2] shadow-2xs"
                          />
                        </TableCell>
                        <TableCell className="py-2 px-2.5 border-r border-slate-200 text-center text-xs">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-medium pointer-events-none">
                              R$
                            </span>
                            <Input
                              type="text"
                              inputMode="decimal"
                              placeholder="0,00"
                              value={
                                seller.plataforma?.boleto_ticket === '' ||
                                seller.plataforma?.boleto_ticket === undefined ||
                                seller.plataforma?.boleto_ticket === null
                                  ? ''
                                  : String(seller.plataforma.boleto_ticket)
                              }
                              onChange={(e) =>
                                handleCategoryFieldChange(
                                  idx,
                                  'plataforma',
                                  'boleto_ticket',
                                  e.target.value.replace(/[^0-9.,]/g, ''),
                                )
                              }
                              onBlur={() => {
                                const val = seller.plataforma?.boleto_ticket
                                if (val !== '' && val !== undefined && val !== null) {
                                  const parsed = parsePtBrNumber(val)
                                  if (parsed > 0) {
                                    handleCategoryFieldChange(
                                      idx,
                                      'plataforma',
                                      'boleto_ticket',
                                      formatNumber(parsed, 2),
                                    )
                                  }
                                }
                              }}
                              className="pl-6 h-8 text-center font-semibold tabular-nums text-slate-900 text-xs bg-white border-slate-200 focus-visible:ring-[#6D49F2] shadow-2xs"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-center tabular-nums font-semibold text-slate-800 border-r border-slate-200 bg-slate-50/50 text-xs">
                          {formatCurrency(metrics.platBoletoRevenue)}
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-center tabular-nums font-semibold text-slate-800 bg-slate-50/50 text-xs">
                          {formatCurrency(metrics.platBoletoComm)}
                        </TableCell>
                      </TableRow>

                      {/* CATEGORY 2: Renovação Header Row */}
                      <TableRow className="font-bold bg-slate-50/90 border-b border-slate-200 hover:bg-slate-100">
                        <TableCell className="py-2.5 px-3 pl-4 text-slate-900 font-bold border-r border-slate-200 text-xs">
                          Renovação
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-center tabular-nums text-slate-900 font-bold border-r border-slate-200 text-xs">
                          {metrics.renoTotalSales}
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-center tabular-nums text-slate-900 font-bold border-r border-slate-200 text-xs">
                          {formatCurrency(metrics.renoAvgTicket)}
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-center tabular-nums text-slate-900 font-bold border-r border-slate-200 text-xs">
                          {formatCurrency(metrics.renoTotalRevenue)}
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-center tabular-nums text-slate-900 font-bold text-xs">
                          {formatCurrency(metrics.renoTotalComm)}
                        </TableCell>
                      </TableRow>

                      {/* Vendas Cartão / Pix */}
                      <TableRow className="hover:bg-slate-50/50 transition-colors border-b border-slate-100">
                        <TableCell className="py-2 px-3 pl-8 font-medium text-slate-700 border-r border-slate-200 text-xs">
                          Vendas Cartão / Pix
                        </TableCell>
                        <TableCell className="py-2 px-2.5 border-r border-slate-200 text-center text-xs">
                          <Input
                            type="text"
                            inputMode="numeric"
                            placeholder="0"
                            value={
                              seller.renovacao?.card_pix_sales === '' ||
                              seller.renovacao?.card_pix_sales === undefined ||
                              seller.renovacao?.card_pix_sales === null
                                ? ''
                                : String(seller.renovacao.card_pix_sales)
                            }
                            onChange={(e) =>
                              handleCategoryFieldChange(
                                idx,
                                'renovacao',
                                'card_pix_sales',
                                e.target.value.replace(/[^0-9.,]/g, ''),
                              )
                            }
                            onBlur={() => {
                              const val = seller.renovacao?.card_pix_sales
                              if (val !== '' && val !== undefined && val !== null) {
                                const parsed = parsePtBrNumber(val)
                                if (parsed > 0) {
                                  handleCategoryFieldChange(
                                    idx,
                                    'renovacao',
                                    'card_pix_sales',
                                    formatNumber(parsed, 0),
                                  )
                                }
                              }
                            }}
                            className="h-8 text-center font-semibold tabular-nums text-slate-900 text-xs bg-white border-slate-200 focus-visible:ring-[#6D49F2] shadow-2xs"
                          />
                        </TableCell>
                        <TableCell className="py-2 px-2.5 border-r border-slate-200 text-center text-xs">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-medium pointer-events-none">
                              R$
                            </span>
                            <Input
                              type="text"
                              inputMode="decimal"
                              placeholder="0,00"
                              value={
                                seller.renovacao?.card_pix_ticket === '' ||
                                seller.renovacao?.card_pix_ticket === undefined ||
                                seller.renovacao?.card_pix_ticket === null
                                  ? ''
                                  : String(seller.renovacao.card_pix_ticket)
                              }
                              onChange={(e) =>
                                handleCategoryFieldChange(
                                  idx,
                                  'renovacao',
                                  'card_pix_ticket',
                                  e.target.value.replace(/[^0-9.,]/g, ''),
                                )
                              }
                              onBlur={() => {
                                const val = seller.renovacao?.card_pix_ticket
                                if (val !== '' && val !== undefined && val !== null) {
                                  const parsed = parsePtBrNumber(val)
                                  if (parsed > 0) {
                                    handleCategoryFieldChange(
                                      idx,
                                      'renovacao',
                                      'card_pix_ticket',
                                      formatNumber(parsed, 2),
                                    )
                                  }
                                }
                              }}
                              className="pl-6 h-8 text-center font-semibold tabular-nums text-slate-900 text-xs bg-white border-slate-200 focus-visible:ring-[#6D49F2] shadow-2xs"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-center tabular-nums font-semibold text-slate-800 border-r border-slate-200 bg-slate-50/50 text-xs">
                          {formatCurrency(metrics.renoCardRevenue)}
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-center tabular-nums font-semibold text-slate-800 bg-slate-50/50 text-xs">
                          {formatCurrency(metrics.renoCardComm)}
                        </TableCell>
                      </TableRow>

                      {/* Vendas Boleto 3x */}
                      <TableRow className="hover:bg-slate-50/50 transition-colors border-b border-slate-100">
                        <TableCell className="py-2 px-3 pl-8 font-medium text-slate-700 border-r border-slate-200 text-xs">
                          Vendas Boleto 3x
                        </TableCell>
                        <TableCell className="py-2 px-2.5 border-r border-slate-200 text-center text-xs">
                          <Input
                            type="text"
                            inputMode="numeric"
                            placeholder="0"
                            value={
                              seller.renovacao?.boleto_sales === '' ||
                              seller.renovacao?.boleto_sales === undefined ||
                              seller.renovacao?.boleto_sales === null
                                ? ''
                                : String(seller.renovacao.boleto_sales)
                            }
                            onChange={(e) =>
                              handleCategoryFieldChange(
                                idx,
                                'renovacao',
                                'boleto_sales',
                                e.target.value.replace(/[^0-9.,]/g, ''),
                              )
                            }
                            onBlur={() => {
                              const val = seller.renovacao?.boleto_sales
                              if (val !== '' && val !== undefined && val !== null) {
                                const parsed = parsePtBrNumber(val)
                                if (parsed > 0) {
                                  handleCategoryFieldChange(
                                    idx,
                                    'renovacao',
                                    'boleto_sales',
                                    formatNumber(parsed, 0),
                                  )
                                }
                              }
                            }}
                            className="h-8 text-center font-semibold tabular-nums text-slate-900 text-xs bg-white border-slate-200 focus-visible:ring-[#6D49F2] shadow-2xs"
                          />
                        </TableCell>
                        <TableCell className="py-2 px-2.5 border-r border-slate-200 text-center text-xs">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-medium pointer-events-none">
                              R$
                            </span>
                            <Input
                              type="text"
                              inputMode="decimal"
                              placeholder="0,00"
                              value={
                                seller.renovacao?.boleto_ticket === '' ||
                                seller.renovacao?.boleto_ticket === undefined ||
                                seller.renovacao?.boleto_ticket === null
                                  ? ''
                                  : String(seller.renovacao.boleto_ticket)
                              }
                              onChange={(e) =>
                                handleCategoryFieldChange(
                                  idx,
                                  'renovacao',
                                  'boleto_ticket',
                                  e.target.value.replace(/[^0-9.,]/g, ''),
                                )
                              }
                              onBlur={() => {
                                const val = seller.renovacao?.boleto_ticket
                                if (val !== '' && val !== undefined && val !== null) {
                                  const parsed = parsePtBrNumber(val)
                                  if (parsed > 0) {
                                    handleCategoryFieldChange(
                                      idx,
                                      'renovacao',
                                      'boleto_ticket',
                                      formatNumber(parsed, 2),
                                    )
                                  }
                                }
                              }}
                              className="pl-6 h-8 text-center font-semibold tabular-nums text-slate-900 text-xs bg-white border-slate-200 focus-visible:ring-[#6D49F2] shadow-2xs"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-center tabular-nums font-semibold text-slate-800 border-r border-slate-200 bg-slate-50/50 text-xs">
                          {formatCurrency(metrics.renoBoletoRevenue)}
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-center tabular-nums font-semibold text-slate-800 bg-slate-50/50 text-xs">
                          {formatCurrency(metrics.renoBoletoComm)}
                        </TableCell>
                      </TableRow>

                      {/* TOTAL ROW per seller */}
                      <TableRow className="bg-emerald-50 font-bold text-emerald-950 text-xs border-t-2 border-slate-200 hover:bg-emerald-50">
                        <TableCell className="py-2.5 px-3 pl-4 text-emerald-950 font-bold border-r border-slate-200">
                          Total
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-center tabular-nums text-emerald-950 font-bold border-r border-slate-200">
                          {metrics.sellerTotalSales}
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-center tabular-nums text-emerald-950 font-bold border-r border-slate-200">
                          {formatCurrency(metrics.sellerAvgTicket)}
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-center tabular-nums text-emerald-950 font-extrabold border-r border-slate-200">
                          {formatCurrency(metrics.sellerTotalRevenue)}
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-center tabular-nums text-emerald-950 font-bold">
                          {formatCurrency(metrics.sellerTotalComm)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* 3. Management Section (Bottom) */}
      <Card className="bg-white border-slate-200/90 shadow-sm rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-1">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-[#6D49F2]" />
              Gerenciamento de Vendedores e Comissões
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure os nomes dos vendedores e suas alíquotas de comissão
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {sellers.map((seller, idx) => (
            <div
              key={seller.id || idx}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50/80 rounded-xl border border-slate-200/80"
            >
              <div className="flex items-center gap-3 flex-1">
                <span className="text-xs font-bold text-slate-700 w-24 shrink-0">
                  Vendedor {idx + 1}
                </span>
                <Input
                  type="text"
                  placeholder="Nome do vendedor"
                  value={seller.name}
                  onChange={(e) => handleSellerInfoChange(idx, 'name', e.target.value)}
                  className="max-w-[220px] h-8 text-xs font-semibold text-slate-900 bg-white border-slate-200 focus-visible:ring-[#6D49F2] shadow-2xs"
                />
              </div>

              <div className="flex items-center gap-4 shrink-0 justify-end">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-600">% Comissão</span>
                  <div className="relative w-24">
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0,0"
                      value={
                        seller.commission_rate === '' ||
                        seller.commission_rate === undefined ||
                        seller.commission_rate === null
                          ? ''
                          : String(seller.commission_rate)
                      }
                      onChange={(e) =>
                        handleSellerInfoChange(
                          idx,
                          'commission_rate',
                          e.target.value.replace(/[^0-9.,]/g, ''),
                        )
                      }
                      onBlur={() => {
                        const val = seller.commission_rate
                        if (val !== '' && val !== undefined && val !== null) {
                          const parsed = parsePtBrNumber(val)
                          if (parsed > 0) {
                            handleSellerInfoChange(idx, 'commission_rate', formatNumber(parsed, 1))
                          }
                        }
                      }}
                      className="pr-6 h-8 text-xs text-right font-bold tabular-nums text-slate-900 bg-white border-slate-200 focus-visible:ring-[#6D49F2] shadow-2xs"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                      %
                    </span>
                  </div>
                </div>

                {sellers.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveSeller(idx)}
                    className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                    title="Remover vendedor"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={handleAddSeller}
            className="w-full sm:w-auto mt-2 border-dashed border-slate-200 text-slate-700 hover:text-[#6D49F2] hover:border-[#6D49F2] hover:bg-purple-50/50 font-bold text-xs h-8 rounded-xl flex items-center justify-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4 text-[#6D49F2]" />
            <span>+ Add vendedor</span>
          </Button>
        </div>

        {/* 4. Bottom Action Bar ("Salvar Lançamento" Button with MQT gradient) */}
        {onSave && (
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-500 font-medium">
              Lançamento selecionado:{' '}
              <span className="font-bold text-[#6D49F2]">{launchBatch || 'Sem nome'}</span>
              {launchId ? ' (Salvo no BD)' : ' (Novo Lançamento)'}
            </div>

            <Button
              onClick={onSave}
              disabled={saving}
              className="w-full sm:w-auto px-8 h-11 bg-gradient-to-r from-[#6D49F2] to-[#FF2AFF] hover:opacity-90 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Salvar Lançamento</span>
                </>
              )}
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}
