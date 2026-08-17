import React, { useEffect, useState, useMemo } from 'react'
import {
  Rocket,
  Save,
  DollarSign,
  TrendingUp,
  Ticket,
  Percent,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Calendar,
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

type BatchType = 'Semana 1' | 'Semana 2' | 'Semana 3' | 'Semana 4'
const BATCH_OPTIONS: BatchType[] = ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4']

interface FormState {
  id?: string
  capture_days: string | number
  batch: BatchType
  ticket_ticket: string | number
  traffic_investment: string | number
  total_ticket_sales: string | number
  ticket_refunds: string | number
  bump_ticket: string | number
  bump_sales: string | number
  bump_refunds: string | number
}

// Utility formatting
const formatCurrency = (val: number): string => {
  if (isNaN(val) || !isFinite(val)) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(val)
}

const formatPercent = (val: number): string => {
  if (isNaN(val) || !isFinite(val)) return '0,00%'
  return (
    new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val * 100) + '%'
  )
}

const formatCalculatedCurrency = (val: number): string => {
  if (isNaN(val) || !isFinite(val)) return 'R$ 0,00'
  return formatCurrency(val)
}

const formatCalculatedPercent = (val: number): string => {
  if (isNaN(val) || !isFinite(val)) return '0,00%'
  return formatPercent(val)
}

const formatCalculatedNumber = (val: number, decimals = 2): string => {
  if (isNaN(val) || !isFinite(val)) return '0'
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val)
}

const DEFAULT_FORM: FormState = {
  capture_days: 7,
  batch: 'Semana 1',
  ticket_ticket: 29.9,
  traffic_investment: 120546,
  total_ticket_sales: 3041,
  ticket_refunds: 17,
  bump_ticket: 19.9,
  bump_sales: 639,
  bump_refunds: 3,
}

export default function LancamentoPago() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [records, setRecords] = useState<PaidLaunchRecord[]>([])
  const [selectedBatch, setSelectedBatch] = useState<BatchType>('Semana 1')
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)

  // Load all records from backend
  const loadData = async () => {
    setLoading(true)
    try {
      const data = await paidLaunchesService.getAll()
      setRecords(data)

      // Find record matching currently selected batch
      const current = data.find((r) => r.batch === selectedBatch) || data[0]
      if (current) {
        setSelectedBatch(current.batch)
        setForm({
          id: current.id,
          capture_days: current.capture_days,
          batch: current.batch,
          ticket_ticket: current.ticket_ticket,
          traffic_investment: current.traffic_investment,
          total_ticket_sales: current.total_ticket_sales,
          ticket_refunds: current.ticket_refunds,
          bump_ticket: current.bump_ticket,
          bump_sales: current.bump_sales,
          bump_refunds: current.bump_refunds,
        })
      } else {
        // Sample baseline data matching the image formulas
        setForm({ ...DEFAULT_FORM, batch: selectedBatch, id: undefined })
      }
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao carregar lançamentos',
        description: 'Não foi possível buscar os dados do lançamento pago.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // When changing batch selector, load matching existing record or prepare blank form for that batch
  const handleBatchChange = (newBatch: BatchType) => {
    setSelectedBatch(newBatch)
    const existing = records.find((r) => r.batch === newBatch)
    if (existing) {
      setForm({
        id: existing.id,
        capture_days: existing.capture_days,
        batch: existing.batch,
        ticket_ticket: existing.ticket_ticket,
        traffic_investment: existing.traffic_investment,
        total_ticket_sales: existing.total_ticket_sales,
        ticket_refunds: existing.ticket_refunds,
        bump_ticket: existing.bump_ticket,
        bump_sales: existing.bump_sales,
        bump_refunds: existing.bump_refunds,
      })
    } else {
      setForm({
        ...DEFAULT_FORM,
        batch: newBatch,
        id: undefined,
      })
    }
  }

  // Handle single field input changes
  const handleChange = (field: keyof FormState, value: string | number) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  // Calculations for current active vertical form
  const calc = useMemo(() => {
    const captureDays = Number(form.capture_days) || 0
    const ticketTicket = Number(form.ticket_ticket) || 0
    const trafficInvestment = Number(form.traffic_investment) || 0
    const totalTicketSales = Number(form.total_ticket_sales) || 0
    const ticketRefunds = Number(form.ticket_refunds) || 0

    const bumpTicket = Number(form.bump_ticket) || 0
    const bumpSales = Number(form.bump_sales) || 0
    const bumpRefunds = Number(form.bump_refunds) || 0

    // Venda de Ingressos
    const dailyTraffic = captureDays > 0 ? trafficInvestment / captureDays : 0
    const cac = totalTicketSales > 0 ? trafficInvestment / totalTicketSales : 0
    const avgSalesPerDay = captureDays > 0 ? totalTicketSales / captureDays : 0
    const ticketRefundRate = totalTicketSales > 0 ? ticketRefunds / totalTicketSales : 0
    const ticketRevenue = totalTicketSales * ticketTicket
    const ticketRoas = trafficInvestment > 0 ? ticketRevenue / trafficInvestment : 0

    // Order Bump
    const bumpConversion = totalTicketSales > 0 ? bumpSales / totalTicketSales : 0
    const bumpRefundRate = bumpSales > 0 ? bumpRefunds / bumpSales : 0
    const bumpRevenue = bumpSales * bumpTicket

    // Resultado Ingressos + Order Bumps
    const totalRevenue = ticketRevenue + bumpRevenue
    const averageTicket = totalTicketSales > 0 ? totalRevenue / totalTicketSales : 0
    const captureBalance = totalRevenue - trafficInvestment
    const overallRoas = trafficInvestment > 0 ? totalRevenue / trafficInvestment : 0

    return {
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
      trafficInvestment,
      totalTicketSales,
      bumpSales,
    }
  }, [form])

  // Top Dashboard KPIs reflect currently loaded launch
  const dashboardKpis = useMemo(() => {
    return {
      faturamentoTotal: calc.totalRevenue,
      investimentoTrafego: calc.trafficInvestment,
      roasGeral: calc.overallRoas,
      totalIngressos: calc.totalTicketSales,
      conversaoBump: calc.bumpConversion,
    }
  }, [calc])

  // Save current launch
  const handleSave = async () => {
    setSaving(true)
    try {
      const payload: PaidLaunchInput = {
        capture_days: Number(form.capture_days) || 0,
        batch: form.batch,
        ticket_ticket: Number(form.ticket_ticket) || 0,
        traffic_investment: Number(form.traffic_investment) || 0,
        total_ticket_sales: Number(form.total_ticket_sales) || 0,
        ticket_refunds: Number(form.ticket_refunds) || 0,
        bump_ticket: Number(form.bump_ticket) || 0,
        bump_sales: Number(form.bump_sales) || 0,
        bump_refunds: Number(form.bump_refunds) || 0,
      }

      const savedRec = await paidLaunchesService.save(form.id, payload)

      // Update records array
      setRecords((prev) => {
        const idx = prev.findIndex((r) => r.batch === form.batch)
        if (idx >= 0) {
          const updated = [...prev]
          updated[idx] = savedRec
          return updated
        }
        return [...prev, savedRec]
      })

      setForm((prev) => ({ ...prev, id: savedRec.id }))

      toast({
        title: 'Lançamento Salvo',
        description: `Os dados da ${form.batch} foram salvos com sucesso!`,
      })
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar os dados deste lançamento.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8 pb-16 animate-in fade-in-50 duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-purple-900/40 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-r from-[#6D49F2] to-[#FF2AFF] text-white shadow-lg shadow-[#6D49F2]/25">
            <Rocket className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Lançamento Pago
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
              Gestão vertical de performance de ingressos e order bumps por semana de captação.
            </p>
          </div>
        </div>

        {/* Turma Switcher in Header */}
        <div className="flex items-center gap-2 bg-[#180B38] border border-[#6D49F2]/40 p-1.5 rounded-xl">
          <Calendar className="w-4 h-4 text-[#FF2AFF] ml-2" />
          <span className="text-xs font-semibold text-slate-300">Turma:</span>
          <Select value={selectedBatch} onValueChange={(val: BatchType) => handleBatchChange(val)}>
            <SelectTrigger className="w-[140px] h-9 bg-[#2A1254] border-[#6D49F2]/50 text-white font-bold text-xs focus:ring-[#FF2AFF]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1D0E42] border-[#6D49F2]/60 text-white">
              {BATCH_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={opt} className="focus:bg-[#6D49F2]/40">
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Dashboard KPI Top Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Faturamento Total */}
        <Card className="bg-[#180B38]/80 border-[#6D49F2]/30 text-white shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#6D49F2] to-[#FF2AFF]" />
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-[11px] font-bold tracking-wider uppercase">
                Faturamento Total
              </span>
              <DollarSign className="w-4 h-4 text-[#FF2AFF]" />
            </div>
            <div className="mt-2">
              <div className="text-xl font-extrabold text-white tracking-tight">
                {formatCurrency(dashboardKpis.faturamentoTotal)}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Ingressos + Order Bumps</p>
            </div>
          </CardContent>
        </Card>

        {/* Investimento Tráfego */}
        <Card className="bg-[#180B38]/80 border-[#6D49F2]/30 text-white shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-500 to-indigo-500" />
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-[11px] font-bold tracking-wider uppercase">
                Invest. Tráfego
              </span>
              <TrendingUp className="w-4 h-4 text-purple-400" />
            </div>
            <div className="mt-2">
              <div className="text-xl font-extrabold text-white tracking-tight">
                {formatCurrency(dashboardKpis.investimentoTrafego)}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Custo total em anúncios</p>
            </div>
          </CardContent>
        </Card>

        {/* ROAS Geral */}
        <Card className="bg-[#180B38]/80 border-[#6D49F2]/30 text-white shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-400 to-teal-500" />
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-[11px] font-bold tracking-wider uppercase">ROAS Geral</span>
              <Percent className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2">
              <div className="text-xl font-extrabold text-white tracking-tight">
                {formatCalculatedNumber(dashboardKpis.roasGeral)}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Faturamento / Investimento</p>
            </div>
          </CardContent>
        </Card>

        {/* Total Ingressos */}
        <Card className="bg-[#180B38]/80 border-[#6D49F2]/30 text-white shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-cyan-400 to-blue-500" />
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-[11px] font-bold tracking-wider uppercase">
                Total Ingressos
              </span>
              <Ticket className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="mt-2">
              <div className="text-xl font-extrabold text-white tracking-tight">
                {dashboardKpis.totalIngressos.toLocaleString('pt-BR')}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Vendas totais de ingresso</p>
            </div>
          </CardContent>
        </Card>

        {/* Conversão Order Bump */}
        <Card className="bg-[#180B38]/80 border-[#6D49F2]/30 text-white shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#FF2AFF] to-rose-500" />
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-[11px] font-bold tracking-wider uppercase">
                Conv. Order Bump
              </span>
              <TrendingUp className="w-4 h-4 text-[#FF2AFF]" />
            </div>
            <div className="mt-2">
              <div className="text-xl font-extrabold text-white tracking-tight">
                {formatPercent(dashboardKpis.conversaoBump)}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Bumps / Ingressos Totais</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vertical Form Module */}
      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3 text-slate-400 bg-[#180B38]/60 rounded-2xl border border-[#6D49F2]/30">
          <Loader2 className="w-8 h-8 animate-spin text-[#FF2AFF]" />
          <p className="text-sm">Carregando dados do lançamento...</p>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Main Card Container */}
          <div className="bg-[#180B38]/90 border border-[#6D49F2]/40 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl">
            {/* Table Vertical Container */}
            <div className="divide-y divide-[#6D49F2]/30">
              {/* SECTION 1: VENDA DE INGRESSOS */}
              <div>
                <div className="bg-[#000000] text-white px-6 py-3 font-extrabold text-sm uppercase tracking-wider text-center border-b border-[#6D49F2]/30">
                  Venda de Ingressos
                </div>

                <div className="p-4 sm:p-6 space-y-2">
                  {/* Dias Captação */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-1.5 border-b border-purple-900/30">
                    <span className="font-extrabold text-sm text-white">Dias Captação</span>
                    <Input
                      type="number"
                      min={1}
                      value={form.capture_days}
                      onChange={(e) => handleChange('capture_days', e.target.value)}
                      className="bg-[#230F4E] border-[#6D49F2]/50 text-white font-mono text-center font-bold text-sm h-10 focus:border-[#FF2AFF]"
                    />
                  </div>

                  {/* Turma */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-1.5 border-b border-purple-900/30">
                    <span className="font-semibold text-sm text-slate-200">Turma</span>
                    <Select
                      value={form.batch}
                      onValueChange={(val: BatchType) => handleBatchChange(val)}
                    >
                      <SelectTrigger className="bg-[#230F4E] border-[#6D49F2]/50 text-white font-bold text-sm h-10 focus:ring-[#FF2AFF]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1D0E42] border-[#6D49F2]/60 text-white">
                        {BATCH_OPTIONS.map((opt) => (
                          <SelectItem key={opt} value={opt} className="focus:bg-[#6D49F2]/40">
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Ticket Ingresso */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-1.5 border-b border-purple-900/30">
                    <span className="font-semibold text-sm text-slate-200">Ticket Ingresso</span>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        R$
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        value={form.ticket_ticket}
                        onChange={(e) => handleChange('ticket_ticket', e.target.value)}
                        className="pl-9 bg-[#230F4E] border-[#6D49F2]/50 text-white font-mono font-bold text-sm h-10 focus:border-[#FF2AFF]"
                      />
                    </div>
                  </div>

                  {/* Investimento Tráfego */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-1.5 border-b border-purple-900/30">
                    <span className="font-semibold text-sm text-slate-200">
                      Investimento Tráfego
                    </span>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        R$
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        value={form.traffic_investment}
                        onChange={(e) => handleChange('traffic_investment', e.target.value)}
                        className="pl-9 bg-[#230F4E] border-[#6D49F2]/50 text-white font-mono font-bold text-sm h-10 focus:border-[#FF2AFF]"
                      />
                    </div>
                  </div>

                  {/* Tráfego Diário (CALCULATED - LOCKED) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-2 bg-[#2D1658]/40 px-3 rounded-lg border border-[#6D49F2]/20">
                    <span className="font-medium text-xs text-purple-200">Tráfego Diário</span>
                    <div className="text-right font-mono font-bold text-sm text-purple-100">
                      {formatCalculatedCurrency(calc.dailyTraffic)}
                    </div>
                  </div>

                  {/* CAC (CALCULATED - LOCKED) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-2 bg-[#2D1658]/40 px-3 rounded-lg border border-[#6D49F2]/20">
                    <span className="font-medium text-xs text-purple-200">CAC</span>
                    <div className="text-right font-mono font-bold text-sm text-purple-100">
                      {formatCalculatedCurrency(calc.cac)}
                    </div>
                  </div>

                  {/* Vendas Totais Ingresso */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-1.5 border-b border-purple-900/30">
                    <span className="font-semibold text-sm text-slate-200">
                      Vendas Totais Ingresso
                    </span>
                    <Input
                      type="number"
                      min={0}
                      value={form.total_ticket_sales}
                      onChange={(e) => handleChange('total_ticket_sales', e.target.value)}
                      className="bg-[#230F4E] border-[#6D49F2]/50 text-white font-mono text-center font-bold text-sm h-10 focus:border-[#FF2AFF]"
                    />
                  </div>

                  {/* Média Vendas / Dia Ingresso (CALCULATED - HIGHLIGHTED LIKE EXCEL IMAGE) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-2.5 bg-[#F8C498] px-3 rounded-lg border border-amber-600/30">
                    <span className="font-extrabold text-sm text-slate-900">
                      Média Vendas / Dia Ingresso
                    </span>
                    <div className="text-center sm:text-right font-mono font-extrabold text-base text-slate-950">
                      {formatCalculatedNumber(calc.avgSalesPerDay, 0)}
                    </div>
                  </div>

                  {/* Reembolso */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-1.5 border-b border-purple-900/30">
                    <span className="font-semibold text-sm text-slate-200">Reembolso</span>
                    <Input
                      type="number"
                      min={0}
                      value={form.ticket_refunds}
                      onChange={(e) => handleChange('ticket_refunds', e.target.value)}
                      className="bg-[#230F4E] border-[#6D49F2]/50 text-white font-mono text-center font-bold text-sm h-10 focus:border-[#FF2AFF]"
                    />
                  </div>

                  {/* Taxa Reembolso (CALCULATED - LOCKED) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-2 bg-[#2D1658]/40 px-3 rounded-lg border border-[#6D49F2]/20">
                    <span className="font-medium text-xs text-purple-200">Taxa Reembolso</span>
                    <div className="text-right font-mono font-bold text-sm text-purple-100">
                      {formatCalculatedPercent(calc.ticketRefundRate)}
                    </div>
                  </div>

                  {/* Faturamento Ingressos (CALCULATED - LOCKED) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-2 bg-[#2D1658]/60 px-3 rounded-lg border border-[#6D49F2]/30">
                    <span className="font-bold text-xs text-slate-100">Faturamento Ingressos</span>
                    <div className="text-right font-mono font-bold text-sm text-[#FF2AFF]">
                      {formatCurrency(calc.ticketRevenue)}
                    </div>
                  </div>

                  {/* ROAS Venda Ingresso (CALCULATED - HIGHLIGHTED LIKE EXCEL IMAGE) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-2.5 bg-[#F8C498] px-3 rounded-lg border border-amber-600/30">
                    <span className="font-extrabold text-sm text-slate-900">
                      ROAS Venda Ingresso
                    </span>
                    <div className="text-center sm:text-right font-mono font-extrabold text-base text-slate-950">
                      {formatCalculatedNumber(calc.ticketRoas, 2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: ORDER BUMP */}
              <div>
                <div className="bg-[#000000] text-white px-6 py-3 font-extrabold text-sm uppercase tracking-wider text-center border-b border-[#6D49F2]/30">
                  Order Bump
                </div>

                <div className="p-4 sm:p-6 space-y-2">
                  {/* Conversão Order Bump (CALCULATED - LOCKED) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-2 bg-[#2D1658]/40 px-3 rounded-lg border border-[#6D49F2]/20">
                    <span className="font-bold text-xs text-[#FF2AFF]">Conversão Order Bump</span>
                    <div className="text-right font-mono font-extrabold text-sm text-[#FF2AFF]">
                      {formatCalculatedPercent(calc.bumpConversion)}
                    </div>
                  </div>

                  {/* Ticket Order Bump */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-1.5 border-b border-purple-900/30">
                    <span className="font-semibold text-sm text-slate-200">Ticket Order Bump</span>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        R$
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        value={form.bump_ticket}
                        onChange={(e) => handleChange('bump_ticket', e.target.value)}
                        className="pl-9 bg-[#230F4E] border-[#6D49F2]/50 text-white font-mono font-bold text-sm h-10 focus:border-[#FF2AFF]"
                      />
                    </div>
                  </div>

                  {/* Vendas Order Bump */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-1.5 border-b border-purple-900/30">
                    <span className="font-semibold text-sm text-slate-200">Vendas Order Bump</span>
                    <Input
                      type="number"
                      min={0}
                      value={form.bump_sales}
                      onChange={(e) => handleChange('bump_sales', e.target.value)}
                      className="bg-[#230F4E] border-[#6D49F2]/50 text-white font-mono text-center font-bold text-sm h-10 focus:border-[#FF2AFF]"
                    />
                  </div>

                  {/* Reembolso */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-1.5 border-b border-purple-900/30">
                    <span className="font-semibold text-sm text-slate-200">Reembolso</span>
                    <Input
                      type="number"
                      min={0}
                      value={form.bump_refunds}
                      onChange={(e) => handleChange('bump_refunds', e.target.value)}
                      className="bg-[#230F4E] border-[#6D49F2]/50 text-white font-mono text-center font-bold text-sm h-10 focus:border-[#FF2AFF]"
                    />
                  </div>

                  {/* Taxa Reembolso (CALCULATED - LOCKED) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-2 bg-[#2D1658]/40 px-3 rounded-lg border border-[#6D49F2]/20">
                    <span className="font-medium text-xs text-purple-200">Taxa Reembolso</span>
                    <div className="text-right font-mono font-bold text-sm text-purple-100">
                      {formatCalculatedPercent(calc.bumpRefundRate)}
                    </div>
                  </div>

                  {/* Faturamento Order Bump (CALCULATED - LOCKED) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-2 bg-[#2D1658]/60 px-3 rounded-lg border border-[#6D49F2]/30">
                    <span className="font-bold text-xs text-purple-200">
                      Faturamento Order Bump
                    </span>
                    <div className="text-right font-mono font-bold text-sm text-purple-200">
                      {formatCurrency(calc.bumpRevenue)}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: RESULTADO INGRESSOS + ORDER BUMPS */}
              <div>
                <div className="bg-[#000000] text-white px-6 py-3 font-extrabold text-sm uppercase tracking-wider text-center border-b border-[#6D49F2]/30">
                  Resultado Ingressos + Order Bumps
                </div>

                <div className="p-4 sm:p-6 space-y-2.5">
                  {/* Faturamento Total */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-2 bg-[#1A3129]/60 px-3 rounded-lg border border-emerald-500/30">
                    <span className="font-bold text-xs text-emerald-300">Faturamento Total</span>
                    <div className="text-right font-mono font-extrabold text-base text-emerald-300">
                      {formatCurrency(calc.totalRevenue)}
                    </div>
                  </div>

                  {/* Ticket Médio (HIGHLIGHTED LIKE EXCEL IMAGE) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-2.5 bg-[#F8C498] px-3 rounded-lg border border-amber-600/30">
                    <span className="font-extrabold text-sm text-slate-900">Ticket Médio</span>
                    <div className="text-center sm:text-right font-mono font-extrabold text-base text-slate-950">
                      {formatCalculatedCurrency(calc.averageTicket)}
                    </div>
                  </div>

                  {/* Saldo da Captação (HIGHLIGHTED LIKE EXCEL IMAGE WITH CONDITIONAL COLOR) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-2.5 bg-[#F8C498] px-3 rounded-lg border border-amber-600/30">
                    <span className="font-extrabold text-sm text-slate-900">Saldo da Captação</span>
                    <div
                      className={`text-center sm:text-right font-mono font-extrabold text-base ${
                        calc.captureBalance >= 0 ? 'text-emerald-900' : 'text-rose-700'
                      }`}
                    >
                      {formatCurrency(calc.captureBalance)}
                    </div>
                  </div>

                  {/* ROAS Geral (HIGHLIGHTED LIKE EXCEL IMAGE) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-2.5 bg-[#F8C498] px-3 rounded-lg border border-amber-600/30">
                    <span className="font-extrabold text-sm text-slate-900">ROAS</span>
                    <div className="text-center sm:text-right font-mono font-extrabold text-base text-slate-950">
                      {formatCalculatedNumber(calc.overallRoas, 2)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Save Action Button */}
            <div className="p-4 sm:p-6 bg-[#13072E] border-t border-[#6D49F2]/40 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-400">
                Lançamento selecionado:{' '}
                <span className="font-bold text-[#FF2AFF]">{form.batch}</span>
              </div>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full sm:w-auto px-8 py-6 bg-gradient-to-r from-[#6D49F2] to-[#FF2AFF] hover:opacity-90 text-white font-bold text-sm shadow-xl shadow-[#6D49F2]/30 rounded-xl flex items-center justify-center gap-2.5 transition-all"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    <span>Salvar Lançamento</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
