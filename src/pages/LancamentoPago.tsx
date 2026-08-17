import React, { useEffect, useState, useMemo } from 'react'
import {
  Rocket,
  Plus,
  Trash2,
  Save,
  DollarSign,
  TrendingUp,
  Ticket,
  Percent,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { paidLaunchesService } from '@/services/paidLaunches'
import type { PaidLaunchRecord, PaidLaunchInput } from '@/types/paidLaunches'

interface LaunchRowState {
  id?: string
  capture_days: string | number
  batch: 'Semana 1' | 'Semana 2' | 'Semana 3' | 'Semana 4'
  ticket_ticket: string | number
  traffic_investment: string | number
  total_ticket_sales: string | number
  ticket_refunds: string | number
  bump_ticket: string | number
  bump_sales: string | number
  bump_refunds: string | number
  isSaving?: boolean
  isSaved?: boolean
  isDirty?: boolean
}

const BATCH_OPTIONS = ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'] as const

// Utility for formatting currency
const formatCurrency = (val: number): string => {
  if (isNaN(val) || !isFinite(val)) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(val)
}

// Utility for formatting percentage
const formatPercent = (val: number): string => {
  if (isNaN(val) || !isFinite(val)) return '0,00%'
  return (
    new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val * 100) + '%'
  )
}

// Format numbers nicely or return "—" if div by 0
const formatCalculatedCurrency = (val: number): string => {
  if (isNaN(val) || !isFinite(val)) return '—'
  return formatCurrency(val)
}

const formatCalculatedPercent = (val: number): string => {
  if (isNaN(val) || !isFinite(val)) return '—'
  return formatPercent(val)
}

const formatCalculatedNumber = (val: number, decimals = 2): string => {
  if (isNaN(val) || !isFinite(val)) return '—'
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val)
}

export default function LancamentoPago() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<LaunchRowState[]>([])
  const [deleteTargetId, setDeleteTargetId] = useState<{ id?: string; index: number } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch initial records
  const loadData = async () => {
    setLoading(true)
    try {
      const data = await paidLaunchesService.getAll()
      if (data.length > 0) {
        setRows(
          data.map((r) => ({
            id: r.id,
            capture_days: r.capture_days,
            batch: r.batch,
            ticket_ticket: r.ticket_ticket,
            traffic_investment: r.traffic_investment,
            total_ticket_sales: r.total_ticket_sales,
            ticket_refunds: r.ticket_refunds,
            bump_ticket: r.bump_ticket,
            bump_sales: r.bump_sales,
            bump_refunds: r.bump_refunds,
            isDirty: false,
          })),
        )
      } else {
        // Provide 1 empty row by default
        setRows([createDefaultRow('Semana 1')])
      }
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível buscar os lançamentos pagos.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  function createDefaultRow(
    batchName: 'Semana 1' | 'Semana 2' | 'Semana 3' | 'Semana 4' = 'Semana 1',
  ): LaunchRowState {
    return {
      capture_days: 0,
      batch: batchName,
      ticket_ticket: 0,
      traffic_investment: 0,
      total_ticket_sales: 0,
      ticket_refunds: 0,
      bump_ticket: 0,
      bump_sales: 0,
      bump_refunds: 0,
      isDirty: true,
    }
  }

  // Row field handler
  const handleFieldChange = (
    index: number,
    field: keyof LaunchRowState,
    value: string | number,
  ) => {
    setRows((prev) => {
      const newRows = [...prev]
      newRows[index] = {
        ...newRows[index],
        [field]: value,
        isDirty: true,
        isSaved: false,
      }
      return newRows
    })
  }

  const handleAddRow = () => {
    const nextBatchIndex = rows.length % 4
    const nextBatch = BATCH_OPTIONS[nextBatchIndex]
    setRows((prev) => [...prev, createDefaultRow(nextBatch)])
  }

  // Calculated values per row
  const computedRows = useMemo(() => {
    return rows.map((r) => {
      const captureDays = Number(r.capture_days) || 0
      const ticketTicket = Number(r.ticket_ticket) || 0
      const trafficInvestment = Number(r.traffic_investment) || 0
      const totalTicketSales = Number(r.total_ticket_sales) || 0
      const ticketRefunds = Number(r.ticket_refunds) || 0

      const bumpTicket = Number(r.bump_ticket) || 0
      const bumpSales = Number(r.bump_sales) || 0
      const bumpRefunds = Number(r.bump_refunds) || 0

      // Calculations according to formula sheet:
      // Tráfego Diário: Investimento Tráfego / Dias Captação
      const dailyTraffic = captureDays > 0 ? trafficInvestment / captureDays : NaN

      // CAC: Investimento Tráfego / Vendas Totais Ingresso
      const cac = totalTicketSales > 0 ? trafficInvestment / totalTicketSales : NaN

      // Média Vendas / Dia Ingresso: Vendas Totais Ingresso / Dias Captação
      const avgSalesPerDay = captureDays > 0 ? totalTicketSales / captureDays : NaN

      // Taxa Reembolso Ingresso: Reembolso / Vendas Totais Ingresso
      const ticketRefundRate = totalTicketSales > 0 ? ticketRefunds / totalTicketSales : NaN

      // Faturamento Ingressos: Vendas Totais Ingresso x Ticket Ingresso
      const ticketRevenue = totalTicketSales * ticketTicket

      // ROAS Venda Ingresso: Faturamento Ingressos / Investimento Tráfego
      const ticketRoas = trafficInvestment > 0 ? ticketRevenue / trafficInvestment : NaN

      // Order Bump:
      // Conversão Order Bump: Vendas Order Bump / Vendas Totais Ingresso
      const bumpConversion = totalTicketSales > 0 ? bumpSales / totalTicketSales : NaN

      // Taxa Reembolso Bump: Reembolso / Vendas Order Bump
      const bumpRefundRate = bumpSales > 0 ? bumpRefunds / bumpSales : NaN

      // Faturamento Order Bump: Vendas Order Bump x Ticket Order Bump
      const bumpRevenue = bumpSales * bumpTicket

      // Resultado Ingressos + Order Bumps:
      // Faturamento Total: Faturamento Ingressos + Faturamento Order Bump
      const totalRevenue = ticketRevenue + bumpRevenue

      // Ticket Médio: Faturamento Total / Vendas Totais Ingresso
      const averageTicket = totalTicketSales > 0 ? totalRevenue / totalTicketSales : NaN

      // Saldo da Captação: Faturamento Total - Investimento Tráfego
      const captureBalance = totalRevenue - trafficInvestment

      // ROAS Geral: Faturamento Total / Investimento Tráfego
      const overallRoas = trafficInvestment > 0 ? totalRevenue / trafficInvestment : NaN

      return {
        ...r,
        numeric: {
          captureDays,
          ticketTicket,
          trafficInvestment,
          totalTicketSales,
          ticketRefunds,
          bumpTicket,
          bumpSales,
          bumpRefunds,
          dailyTraffic,
          cac,
          avgSalesPerDay,
          ticketRefundRate,
          ticketRevenue,
          ticketRoas,
          bumpConversion,
          bumpRefundRate,
          bumpRevenue,
          totalRevenue,
          averageTicket,
          captureBalance,
          overallRoas,
        },
      }
    })
  }, [rows])

  // Consolidated Top KPIs
  const kpis = useMemo(() => {
    let totalRevenue = 0
    let totalInvestment = 0
    let totalTicketSales = 0
    let totalBumpSales = 0

    computedRows.forEach((row) => {
      const { numeric } = row
      totalRevenue += numeric.totalRevenue || 0
      totalInvestment += numeric.trafficInvestment || 0
      totalTicketSales += numeric.totalTicketSales || 0
      totalBumpSales += numeric.bumpSales || 0
    })

    const roas = totalInvestment > 0 ? totalRevenue / totalInvestment : 0
    // Conversão Order Bump Ponderada: Total Bump Sales / Total Ticket Sales
    const weightedBumpConversion = totalTicketSales > 0 ? totalBumpSales / totalTicketSales : 0

    return {
      faturamento: totalRevenue,
      investimento: totalInvestment,
      roas,
      totalIngressos: totalTicketSales,
      conversaoOrderBump: weightedBumpConversion,
    }
  }, [computedRows])

  // Save row
  const handleSaveRow = async (index: number) => {
    const row = rows[index]
    setRows((prev) => {
      const n = [...prev]
      n[index] = { ...n[index], isSaving: true }
      return n
    })

    try {
      const payload: PaidLaunchInput = {
        capture_days: Number(row.capture_days) || 0,
        batch: row.batch,
        ticket_ticket: Number(row.ticket_ticket) || 0,
        traffic_investment: Number(row.traffic_investment) || 0,
        total_ticket_sales: Number(row.total_ticket_sales) || 0,
        ticket_refunds: Number(row.ticket_refunds) || 0,
        bump_ticket: Number(row.bump_ticket) || 0,
        bump_sales: Number(row.bump_sales) || 0,
        bump_refunds: Number(row.bump_refunds) || 0,
      }

      const saved = await paidLaunchesService.save(row.id, payload)

      setRows((prev) => {
        const n = [...prev]
        n[index] = {
          ...n[index],
          id: saved.id,
          isSaving: false,
          isSaved: true,
          isDirty: false,
        }
        return n
      })

      toast({
        title: 'Lançamento salvo',
        description: `Linha do lançamento (${row.batch}) atualizada com sucesso.`,
      })
    } catch (err) {
      console.error(err)
      setRows((prev) => {
        const n = [...prev]
        n[index] = { ...n[index], isSaving: false }
        return n
      })
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar os dados desta linha.',
        variant: 'destructive',
      })
    }
  }

  // Delete row confirmation execution
  const confirmDelete = async () => {
    if (!deleteTargetId) return
    const { id, index } = deleteTargetId
    setIsDeleting(true)

    try {
      if (id) {
        await paidLaunchesService.delete(id)
      }
      setRows((prev) => prev.filter((_, i) => i !== index))
      toast({
        title: 'Lançamento removido',
        description: 'A linha foi excluída permanentemente.',
      })
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível apagar a linha.',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
      setDeleteTargetId(null)
    }
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-purple-900/40 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-gradient-to-r from-[#6D49F2] to-[#FF2AFF] text-white shadow-md shadow-[#6D49F2]/20">
              <Rocket className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Lançamento Pago</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Acompanhamento e consolidação de performance de ingressos e order bumps por
                turma/semana.
              </p>
            </div>
          </div>
        </div>

        <Button
          onClick={handleAddRow}
          className="bg-gradient-to-r from-[#6D49F2] to-[#FF2AFF] hover:opacity-90 text-white font-semibold text-xs shadow-md shadow-[#6D49F2]/30 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Lançamento</span>
        </Button>
      </div>

      {/* KPI Cards Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* FATURAMENTO */}
        <Card className="bg-[#180B38]/80 border-[#6D49F2]/30 text-white shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#6D49F2] to-[#FF2AFF]" />
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold tracking-wider uppercase text-slate-300">
                Faturamento Total
              </span>
              <DollarSign className="w-4 h-4 text-[#FF2AFF]" />
            </div>
            <div className="mt-2">
              <div className="text-xl font-extrabold text-white tracking-tight">
                {formatCurrency(kpis.faturamento)}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Ingressos + Order Bumps</p>
            </div>
          </CardContent>
        </Card>

        {/* INVESTIMENTO */}
        <Card className="bg-[#180B38]/80 border-[#6D49F2]/30 text-white shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-500 to-indigo-500" />
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold tracking-wider uppercase text-slate-300">
                Investimento Tráfego
              </span>
              <TrendingUp className="w-4 h-4 text-purple-400" />
            </div>
            <div className="mt-2">
              <div className="text-xl font-extrabold text-white tracking-tight">
                {formatCurrency(kpis.investimento)}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Total investido em tráfego</p>
            </div>
          </CardContent>
        </Card>

        {/* ROAS */}
        <Card className="bg-[#180B38]/80 border-[#6D49F2]/30 text-white shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-400 to-teal-500" />
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold tracking-wider uppercase text-slate-300">
                ROAS Consolidado
              </span>
              <Percent className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2">
              <div className="text-xl font-extrabold text-white tracking-tight">
                {formatCalculatedNumber(kpis.roas)}x
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Faturamento / Investimento</p>
            </div>
          </CardContent>
        </Card>

        {/* TOTAL INGRESSOS VENDIDOS */}
        <Card className="bg-[#180B38]/80 border-[#6D49F2]/30 text-white shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-cyan-400 to-blue-500" />
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold tracking-wider uppercase text-slate-300">
                Total Ingressos
              </span>
              <Ticket className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="mt-2">
              <div className="text-xl font-extrabold text-white tracking-tight">
                {kpis.totalIngressos}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Ingressos vendidos</p>
            </div>
          </CardContent>
        </Card>

        {/* CONVERSÃO ORDER BUMP */}
        <Card className="bg-[#180B38]/80 border-[#6D49F2]/30 text-white shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#FF2AFF] to-rose-500" />
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold tracking-wider uppercase text-slate-300">
                Conv. Order Bump
              </span>
              <TrendingUp className="w-4 h-4 text-[#FF2AFF]" />
            </div>
            <div className="mt-2">
              <div className="text-xl font-extrabold text-white tracking-tight">
                {formatPercent(kpis.conversaoOrderBump)}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Bumps / Ingressos Totais</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <div className="bg-[#180B38]/70 border border-[#6D49F2]/30 rounded-xl overflow-hidden shadow-2xl backdrop-blur-md">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-[#FF2AFF]" />
            <p className="text-sm">Carregando lançamentos...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[1200px]">
              {/* Table Column Headers */}
              <thead>
                <tr className="bg-[#2A1254]/90 text-slate-200 border-b border-[#6D49F2]/40 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3 text-center border-r border-[#6D49F2]/20 w-12">Ações</th>
                  <th className="py-3 px-3 border-r border-[#6D49F2]/20 min-w-[120px]">Turma</th>

                  {/* Venda de Ingressos Header Group */}
                  <th
                    colSpan={12}
                    className="py-2 px-3 text-center bg-[#37166E]/80 border-r border-[#6D49F2]/40 text-[#FF2AFF] font-bold tracking-widest text-xs border-b border-[#6D49F2]/30"
                  >
                    Venda de Ingressos
                  </th>

                  {/* Order Bump Header Group */}
                  <th
                    colSpan={6}
                    className="py-2 px-3 text-center bg-[#210D47]/90 border-r border-[#6D49F2]/40 text-purple-300 font-bold tracking-widest text-xs border-b border-[#6D49F2]/30"
                  >
                    Order Bump
                  </th>

                  {/* Resultado Header Group */}
                  <th
                    colSpan={4}
                    className="py-2 px-3 text-center bg-[#431885]/80 text-emerald-300 font-bold tracking-widest text-xs border-b border-[#6D49F2]/30"
                  >
                    Resultado Ingressos + Order Bumps
                  </th>
                </tr>

                {/* Sub-headers for specific metrics */}
                <tr className="bg-[#240E48]/80 text-slate-300 border-b border-[#6D49F2]/30 text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-2 px-3 text-center border-r border-[#6D49F2]/20">—</th>
                  <th className="py-2 px-3 border-r border-[#6D49F2]/20">Nome da Turma</th>

                  {/* Ingressos Fields */}
                  <th className="py-2 px-2 text-center border-r border-[#6D49F2]/20 w-20">
                    Dias Captação
                  </th>
                  <th className="py-2 px-2 text-right border-r border-[#6D49F2]/20 min-w-[100px]">
                    Ticket Ingresso
                  </th>
                  <th className="py-2 px-2 text-right border-r border-[#6D49F2]/20 min-w-[110px]">
                    Invest. Tráfego
                  </th>
                  <th className="py-2 px-2 text-right border-r border-[#6D49F2]/20 bg-purple-950/30 min-w-[100px]">
                    Tráfego Diário
                  </th>
                  <th className="py-2 px-2 text-right border-r border-[#6D49F2]/20 bg-purple-950/30 min-w-[90px]">
                    CAC
                  </th>
                  <th className="py-2 px-2 text-center border-r border-[#6D49F2]/20 w-24">
                    Vendas Totais
                  </th>
                  <th className="py-2 px-2 text-center border-r border-[#6D49F2]/20 bg-purple-950/30 min-w-[100px]">
                    Média Vendas/Dia
                  </th>
                  <th className="py-2 px-2 text-center border-r border-[#6D49F2]/20 w-20">
                    Reembolso
                  </th>
                  <th className="py-2 px-2 text-right border-r border-[#6D49F2]/20 bg-purple-950/30 min-w-[90px]">
                    Taxa Reemb.
                  </th>
                  <th className="py-2 px-2 text-right border-r border-[#6D49F2]/20 bg-purple-950/30 font-extrabold text-[#FF2AFF] min-w-[120px]">
                    Faturamento
                  </th>
                  <th className="py-2 px-2 text-right border-r border-[#6D49F2]/40 bg-purple-950/30 min-w-[90px]">
                    ROAS Ingresso
                  </th>

                  {/* Order Bump Fields */}
                  <th className="py-2 px-2 text-right border-r border-[#6D49F2]/20 bg-purple-950/30 text-purple-300 min-w-[90px]">
                    Conversão Bump
                  </th>
                  <th className="py-2 px-2 text-right border-r border-[#6D49F2]/20 min-w-[100px]">
                    Ticket Bump
                  </th>
                  <th className="py-2 px-2 text-center border-r border-[#6D49F2]/20 w-24">
                    Vendas Bump
                  </th>
                  <th className="py-2 px-2 text-center border-r border-[#6D49F2]/20 w-20">
                    Reembolso
                  </th>
                  <th className="py-2 px-2 text-right border-r border-[#6D49F2]/20 bg-purple-950/30 min-w-[90px]">
                    Taxa Reemb.
                  </th>
                  <th className="py-2 px-2 text-right border-r border-[#6D49F2]/40 bg-purple-950/30 font-extrabold text-purple-300 min-w-[120px]">
                    Fat. Order Bump
                  </th>

                  {/* Result Fields */}
                  <th className="py-2 px-2 text-right border-r border-[#6D49F2]/20 bg-emerald-950/30 font-extrabold text-emerald-300 min-w-[120px]">
                    Faturamento Total
                  </th>
                  <th className="py-2 px-2 text-right border-r border-[#6D49F2]/20 bg-emerald-950/30 min-w-[100px]">
                    Ticket Médio
                  </th>
                  <th className="py-2 px-2 text-right border-r border-[#6D49F2]/20 bg-emerald-950/30 min-w-[110px]">
                    Saldo Captação
                  </th>
                  <th className="py-2 px-2 text-right bg-emerald-950/30 font-bold text-emerald-400 min-w-[90px]">
                    ROAS Geral
                  </th>
                </tr>
              </thead>

              {/* Table Rows */}
              <tbody className="divide-y divide-[#6D49F2]/20 text-slate-200">
                {computedRows.map((row, idx) => {
                  const { numeric } = row

                  return (
                    <tr
                      key={row.id || `row-${idx}`}
                      className="hover:bg-white/[0.03] transition-colors group"
                    >
                      {/* Action buttons */}
                      <td className="py-2 px-2 text-center border-r border-[#6D49F2]/20">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleSaveRow(idx)}
                            disabled={row.isSaving}
                            title="Salvar linha"
                            className={`h-7 w-7 rounded-md transition-all ${
                              row.isDirty
                                ? 'bg-[#FF2AFF]/20 text-[#FF2AFF] hover:bg-[#FF2AFF] hover:text-white'
                                : row.isSaved
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'text-slate-400 hover:text-white hover:bg-white/10'
                            }`}
                          >
                            {row.isSaving ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : row.isSaved ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : (
                              <Save className="w-3.5 h-3.5" />
                            )}
                          </Button>

                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeleteTargetId({ id: row.id, index: idx })}
                            title="Excluir linha"
                            className="h-7 w-7 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-500/20"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>

                      {/* Turma (Dropdown) */}
                      <td className="py-2 px-2 border-r border-[#6D49F2]/20">
                        <Select
                          value={row.batch}
                          onValueChange={(val: 'Semana 1' | 'Semana 2' | 'Semana 3' | 'Semana 4') =>
                            handleFieldChange(idx, 'batch', val)
                          }
                        >
                          <SelectTrigger className="h-8 bg-[#180B38]/90 border-[#6D49F2]/40 text-xs font-semibold text-white focus:ring-[#FF2AFF]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1D0E42] border-[#6D49F2]/50 text-white">
                            {BATCH_OPTIONS.map((opt) => (
                              <SelectItem key={opt} value={opt} className="focus:bg-[#6D49F2]/40">
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>

                      {/* INGRESSOS: Manual Inputs & Calculated Cells */}
                      {/* Dias Captação */}
                      <td className="py-2 px-2 border-r border-[#6D49F2]/20">
                        <Input
                          type="number"
                          min={0}
                          value={row.capture_days}
                          onChange={(e) => handleFieldChange(idx, 'capture_days', e.target.value)}
                          className="h-8 text-center bg-[#180B38]/90 border-[#6D49F2]/40 text-xs text-white focus:border-[#FF2AFF] font-mono"
                        />
                      </td>

                      {/* Ticket Ingresso (R$) */}
                      <td className="py-2 px-2 border-r border-[#6D49F2]/20">
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          value={row.ticket_ticket}
                          onChange={(e) => handleFieldChange(idx, 'ticket_ticket', e.target.value)}
                          className="h-8 text-right bg-[#180B38]/90 border-[#6D49F2]/40 text-xs text-white focus:border-[#FF2AFF] font-mono"
                        />
                      </td>

                      {/* Investimento Tráfego (R$) */}
                      <td className="py-2 px-2 border-r border-[#6D49F2]/20">
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          value={row.traffic_investment}
                          onChange={(e) =>
                            handleFieldChange(idx, 'traffic_investment', e.target.value)
                          }
                          className="h-8 text-right bg-[#180B38]/90 border-[#6D49F2]/40 text-xs text-white focus:border-[#FF2AFF] font-mono"
                        />
                      </td>

                      {/* Tráfego Diário (Calc) */}
                      <td className="py-2 px-2 text-right border-r border-[#6D49F2]/20 bg-purple-950/20 font-mono font-medium text-slate-300">
                        {formatCalculatedCurrency(numeric.dailyTraffic)}
                      </td>

                      {/* CAC (Calc) */}
                      <td className="py-2 px-2 text-right border-r border-[#6D49F2]/20 bg-purple-950/20 font-mono font-medium text-slate-300">
                        {formatCalculatedCurrency(numeric.cac)}
                      </td>

                      {/* Vendas Totais Ingresso (Manual) */}
                      <td className="py-2 px-2 border-r border-[#6D49F2]/20">
                        <Input
                          type="number"
                          min={0}
                          value={row.total_ticket_sales}
                          onChange={(e) =>
                            handleFieldChange(idx, 'total_ticket_sales', e.target.value)
                          }
                          className="h-8 text-center bg-[#180B38]/90 border-[#6D49F2]/40 text-xs text-white focus:border-[#FF2AFF] font-mono"
                        />
                      </td>

                      {/* Média Vendas / Dia Ingresso (Calc) */}
                      <td className="py-2 px-2 text-center border-r border-[#6D49F2]/20 bg-purple-950/20 font-mono font-medium text-slate-300">
                        {formatCalculatedNumber(numeric.avgSalesPerDay, 1)}
                      </td>

                      {/* Reembolso Ingresso (Manual) */}
                      <td className="py-2 px-2 border-r border-[#6D49F2]/20">
                        <Input
                          type="number"
                          min={0}
                          value={row.ticket_refunds}
                          onChange={(e) => handleFieldChange(idx, 'ticket_refunds', e.target.value)}
                          className="h-8 text-center bg-[#180B38]/90 border-[#6D49F2]/40 text-xs text-white focus:border-[#FF2AFF] font-mono"
                        />
                      </td>

                      {/* Taxa Reembolso Ingresso (Calc) */}
                      <td className="py-2 px-2 text-right border-r border-[#6D49F2]/20 bg-purple-950/20 font-mono font-medium text-slate-300">
                        {formatCalculatedPercent(numeric.ticketRefundRate)}
                      </td>

                      {/* Faturamento Ingressos (Calc) */}
                      <td className="py-2 px-2 text-right border-r border-[#6D49F2]/20 bg-purple-950/30 font-mono font-bold text-[#FF2AFF]">
                        {formatCurrency(numeric.ticketRevenue)}
                      </td>

                      {/* ROAS Venda Ingresso (Calc) */}
                      <td className="py-2 px-2 text-right border-r border-[#6D49F2]/40 bg-purple-950/20 font-mono font-semibold text-slate-200">
                        {isNaN(numeric.ticketRoas) || !isFinite(numeric.ticketRoas)
                          ? '—'
                          : `${formatCalculatedNumber(numeric.ticketRoas, 2)}x`}
                      </td>

                      {/* ORDER BUMP: Calculated Cells & Manual Inputs */}
                      {/* Conversão Order Bump (Calc) */}
                      <td className="py-2 px-2 text-right border-r border-[#6D49F2]/20 bg-purple-950/20 font-mono font-medium text-purple-300">
                        {formatCalculatedPercent(numeric.bumpConversion)}
                      </td>

                      {/* Ticket Order Bump (Manual R$) */}
                      <td className="py-2 px-2 border-r border-[#6D49F2]/20">
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          value={row.bump_ticket}
                          onChange={(e) => handleFieldChange(idx, 'bump_ticket', e.target.value)}
                          className="h-8 text-right bg-[#180B38]/90 border-[#6D49F2]/40 text-xs text-white focus:border-[#FF2AFF] font-mono"
                        />
                      </td>

                      {/* Vendas Order Bump (Manual) */}
                      <td className="py-2 px-2 border-r border-[#6D49F2]/20">
                        <Input
                          type="number"
                          min={0}
                          value={row.bump_sales}
                          onChange={(e) => handleFieldChange(idx, 'bump_sales', e.target.value)}
                          className="h-8 text-center bg-[#180B38]/90 border-[#6D49F2]/40 text-xs text-white focus:border-[#FF2AFF] font-mono"
                        />
                      </td>

                      {/* Reembolso Bump (Manual) */}
                      <td className="py-2 px-2 border-r border-[#6D49F2]/20">
                        <Input
                          type="number"
                          min={0}
                          value={row.bump_refunds}
                          onChange={(e) => handleFieldChange(idx, 'bump_refunds', e.target.value)}
                          className="h-8 text-center bg-[#180B38]/90 border-[#6D49F2]/40 text-xs text-white focus:border-[#FF2AFF] font-mono"
                        />
                      </td>

                      {/* Taxa Reembolso Bump (Calc) */}
                      <td className="py-2 px-2 text-right border-r border-[#6D49F2]/20 bg-purple-950/20 font-mono font-medium text-slate-300">
                        {formatCalculatedPercent(numeric.bumpRefundRate)}
                      </td>

                      {/* Faturamento Order Bump (Calc) */}
                      <td className="py-2 px-2 text-right border-r border-[#6D49F2]/40 bg-purple-950/30 font-mono font-bold text-purple-300">
                        {formatCurrency(numeric.bumpRevenue)}
                      </td>

                      {/* RESULTADO INGRESSOS + ORDER BUMPS */}
                      {/* Faturamento Total (Calc) */}
                      <td className="py-2 px-2 text-right border-r border-[#6D49F2]/20 bg-emerald-950/30 font-mono font-extrabold text-emerald-300">
                        {formatCurrency(numeric.totalRevenue)}
                      </td>

                      {/* Ticket Médio (Calc) */}
                      <td className="py-2 px-2 text-right border-r border-[#6D49F2]/20 bg-emerald-950/20 font-mono font-medium text-slate-200">
                        {formatCalculatedCurrency(numeric.averageTicket)}
                      </td>

                      {/* Saldo da Captação (Calc) */}
                      <td
                        className={`py-2 px-2 text-right border-r border-[#6D49F2]/20 bg-emerald-950/20 font-mono font-semibold ${
                          numeric.captureBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {formatCurrency(numeric.captureBalance)}
                      </td>

                      {/* ROAS Geral (Calc) */}
                      <td className="py-2 px-2 text-right bg-emerald-950/30 font-mono font-bold text-emerald-400">
                        {isNaN(numeric.overallRoas) || !isFinite(numeric.overallRoas)
                          ? '—'
                          : `${formatCalculatedNumber(numeric.overallRoas, 2)}x`}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Popup Modal */}
      <AlertDialog
        open={deleteTargetId !== null}
        onOpenChange={(open) => !open && setDeleteTargetId(null)}
      >
        <AlertDialogContent className="bg-[#1D0E42] border-[#6D49F2]/50 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-rose-400">
              <AlertCircle className="w-5 h-5" />
              Excluir lançamento?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-300">
              Esta ação apagar este lançamento e todos os seus cálculos do banco de dados. Tem
              certeza que deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel
              disabled={isDeleting}
              className="bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white border-slate-700"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold flex items-center gap-2"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
