import React, { useEffect, useState, useMemo } from 'react'
import {
  Rocket,
  Save,
  DollarSign,
  TrendingUp,
  Ticket,
  Percent,
  Loader2,
  Calendar,
} from 'lucide-react'
import { KpiCard } from '@/components/dashboard/KpiCard'
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
        // Sample baseline data
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
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Rocket className="w-6 h-6 text-[#6D49F2]" />
            Lançamento Pago
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Gestão vertical de performance de ingressos e order bumps por semana de captação.
          </p>
        </div>

        {/* Turma Switcher in Header */}
        <div className="flex items-center gap-2 bg-white border border-slate-200/90 shadow-2xs p-1.5 rounded-xl">
          <Calendar className="w-4 h-4 text-[#6D49F2] ml-2" />
          <span className="text-xs font-semibold text-slate-600">Turma:</span>
          <Select value={selectedBatch} onValueChange={(val: BatchType) => handleBatchChange(val)}>
            <SelectTrigger className="w-[140px] h-9 bg-slate-50/80 border-slate-200 text-slate-900 font-bold text-xs focus:ring-[#6D49F2] rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-200 text-slate-900 rounded-xl">
              {BATCH_OPTIONS.map((opt) => (
                <SelectItem
                  key={opt}
                  value={opt}
                  className="focus:bg-[#6D49F2]/10 focus:text-[#6D49F2] font-medium text-xs"
                >
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Top Dashboard KPI Grid (Using clean KpiCards matching /mensal) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Faturamento Total */}
        <KpiCard
          title="Faturamento Total"
          value={dashboardKpis.faturamentoTotal}
          formatType="currency"
          icon={DollarSign}
          subtext="Ingressos + Order Bumps"
          iconBgColor="bg-[#6D49F2]/10 text-[#6D49F2] border-[#6D49F2]/20"
        />

        {/* Investimento Tráfego */}
        <KpiCard
          title="Invest. Tráfego"
          value={dashboardKpis.investimentoTrafego}
          formatType="currency"
          icon={TrendingUp}
          subtext="Custo total em anúncios"
          iconBgColor="bg-[#FF2AFF]/10 text-[#FF2AFF] border-[#FF2AFF]/20"
        />

        {/* ROAS Geral */}
        <KpiCard
          title="ROAS Geral"
          value={dashboardKpis.roasGeral}
          formatType="roas"
          icon={Percent}
          subtext="Faturamento / Investimento"
          iconBgColor="bg-emerald-50 text-emerald-600 border-emerald-200"
        />

        {/* Total Ingressos */}
        <KpiCard
          title="Total Ingressos"
          value={dashboardKpis.totalIngressos}
          formatType="raw"
          icon={Ticket}
          subtext="Vendas totais de ingresso"
          iconBgColor="bg-sky-50 text-sky-600 border-sky-200"
        />

        {/* Conversão Order Bump */}
        <KpiCard
          title="Conv. Order Bump"
          value={dashboardKpis.conversaoBump}
          formatType="percent"
          icon={Percent}
          subtext="Bumps / Ingressos Totais"
          iconBgColor="bg-amber-50 text-amber-600 border-amber-200"
        />
      </div>

      {/* Vertical Form Module */}
      {loading ? (
        <Card className="bg-white border-slate-200/90 shadow-sm rounded-2xl p-16 flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-[#6D49F2]" />
          <p className="text-sm text-slate-500 font-medium">Carregando dados do lançamento...</p>
        </Card>
      ) : (
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Main Card Container */}
          <Card className="bg-white border-slate-200/90 shadow-sm rounded-2xl overflow-hidden">
            {/* Table Vertical Container */}
            <div className="divide-y divide-slate-100">
              {/* SECTION 1: VENDA DE INGRESSOS */}
              <div>
                <div className="bg-slate-900 text-white px-6 py-3 font-bold text-xs uppercase tracking-wider text-center">
                  Venda de Ingressos
                </div>

                <div className="p-4 sm:p-6 space-y-2.5">
                  {/* Dias Captação */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-1.5 border-b border-slate-100">
                    <span className="font-bold text-sm text-slate-800">Dias Captação</span>
                    <Input
                      type="number"
                      min={1}
                      value={form.capture_days}
                      onChange={(e) => handleChange('capture_days', e.target.value)}
                      className="bg-white border-slate-200 text-slate-900 font-semibold text-center text-xs h-9 rounded-lg focus-visible:ring-[#6D49F2] shadow-2xs"
                    />
                  </div>

                  {/* Turma */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-1.5 border-b border-slate-100">
                    <span className="font-medium text-sm text-slate-700">Turma</span>
                    <Select
                      value={form.batch}
                      onValueChange={(val: BatchType) => handleBatchChange(val)}
                    >
                      <SelectTrigger className="bg-white border-slate-200 text-slate-900 font-semibold text-xs h-9 rounded-lg focus:ring-[#6D49F2] shadow-2xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200 text-slate-900 rounded-xl">
                        {BATCH_OPTIONS.map((opt) => (
                          <SelectItem
                            key={opt}
                            value={opt}
                            className="focus:bg-[#6D49F2]/10 focus:text-[#6D49F2] font-medium text-xs"
                          >
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Ticket Ingresso */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-1.5 border-b border-slate-100">
                    <span className="font-medium text-sm text-slate-700">Ticket Ingresso</span>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-medium pointer-events-none">
                        R$
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        value={form.ticket_ticket}
                        onChange={(e) => handleChange('ticket_ticket', e.target.value)}
                        className="pl-7 bg-white border-slate-200 text-slate-900 font-semibold tabular-nums text-xs h-9 rounded-lg focus-visible:ring-[#6D49F2] shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Investimento Tráfego */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-1.5 border-b border-slate-100">
                    <span className="font-medium text-sm text-slate-700">Investimento Tráfego</span>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-medium pointer-events-none">
                        R$
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        value={form.traffic_investment}
                        onChange={(e) => handleChange('traffic_investment', e.target.value)}
                        className="pl-7 bg-white border-slate-200 text-slate-900 font-semibold tabular-nums text-xs h-9 rounded-lg focus-visible:ring-[#6D49F2] shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Tráfego Diário (CALCULATED - READ ONLY) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-2 bg-slate-50/80 px-3 rounded-lg border border-slate-200/70">
                    <span className="font-medium text-xs text-slate-500">Tráfego Diário</span>
                    <div className="text-right font-bold tabular-nums text-xs text-slate-700">
                      {formatCalculatedCurrency(calc.dailyTraffic)}
                    </div>
                  </div>

                  {/* CAC (CALCULATED - READ ONLY) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-2 bg-slate-50/80 px-3 rounded-lg border border-slate-200/70">
                    <span className="font-medium text-xs text-slate-500">CAC</span>
                    <div className="text-right font-bold tabular-nums text-xs text-slate-700">
                      {formatCalculatedCurrency(calc.cac)}
                    </div>
                  </div>

                  {/* Vendas Totais Ingresso */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-1.5 border-b border-slate-100">
                    <span className="font-medium text-sm text-slate-700">
                      Vendas Totais Ingresso
                    </span>
                    <Input
                      type="number"
                      min={0}
                      value={form.total_ticket_sales}
                      onChange={(e) => handleChange('total_ticket_sales', e.target.value)}
                      className="bg-white border-slate-200 text-slate-900 font-semibold text-center text-xs h-9 rounded-lg focus-visible:ring-[#6D49F2] shadow-2xs"
                    />
                  </div>

                  {/* Média Vendas / Dia Ingresso (CALCULATED - SOFT PASTEL HIGHLIGHT) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-2.5 bg-amber-50/90 px-3.5 rounded-xl border border-amber-200/90">
                    <span className="font-bold text-sm text-amber-950">
                      Média Vendas / Dia Ingresso
                    </span>
                    <div className="text-center sm:text-right font-bold tabular-nums text-base text-amber-950">
                      {formatCalculatedNumber(calc.avgSalesPerDay, 0)}
                    </div>
                  </div>

                  {/* Reembolso */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-1.5 border-b border-slate-100">
                    <span className="font-medium text-sm text-slate-700">Reembolso</span>
                    <Input
                      type="number"
                      min={0}
                      value={form.ticket_refunds}
                      onChange={(e) => handleChange('ticket_refunds', e.target.value)}
                      className="bg-white border-slate-200 text-slate-900 font-semibold text-center text-xs h-9 rounded-lg focus-visible:ring-[#6D49F2] shadow-2xs"
                    />
                  </div>

                  {/* Taxa Reembolso (CALCULATED - READ ONLY) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-2 bg-slate-50/80 px-3 rounded-lg border border-slate-200/70">
                    <span className="font-medium text-xs text-slate-500">Taxa Reembolso</span>
                    <div className="text-right font-bold tabular-nums text-xs text-slate-700">
                      {formatCalculatedPercent(calc.ticketRefundRate)}
                    </div>
                  </div>

                  {/* Faturamento Ingressos (CALCULATED - READ ONLY) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-2 bg-purple-50/60 px-3 rounded-lg border border-[#6D49F2]/20">
                    <span className="font-semibold text-xs text-slate-700">
                      Faturamento Ingressos
                    </span>
                    <div className="text-right font-bold tabular-nums text-xs text-[#6D49F2]">
                      {formatCurrency(calc.ticketRevenue)}
                    </div>
                  </div>

                  {/* ROAS Venda Ingresso (CALCULATED - SOFT PASTEL HIGHLIGHT) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-2.5 bg-amber-50/90 px-3.5 rounded-xl border border-amber-200/90">
                    <span className="font-bold text-sm text-amber-950">ROAS Venda Ingresso</span>
                    <div className="text-center sm:text-right font-bold tabular-nums text-base text-amber-950">
                      {formatCalculatedNumber(calc.ticketRoas, 2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: ORDER BUMP */}
              <div>
                <div className="bg-slate-900 text-white px-6 py-3 font-bold text-xs uppercase tracking-wider text-center">
                  Order Bump
                </div>

                <div className="p-4 sm:p-6 space-y-2.5">
                  {/* Conversão Order Bump (CALCULATED - READ ONLY) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-2 bg-purple-50/60 px-3 rounded-lg border border-[#6D49F2]/20">
                    <span className="font-bold text-xs text-[#6D49F2]">Conversão Order Bump</span>
                    <div className="text-right font-bold tabular-nums text-xs text-[#FF2AFF]">
                      {formatCalculatedPercent(calc.bumpConversion)}
                    </div>
                  </div>

                  {/* Ticket Order Bump */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-1.5 border-b border-slate-100">
                    <span className="font-medium text-sm text-slate-700">Ticket Order Bump</span>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-medium pointer-events-none">
                        R$
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        value={form.bump_ticket}
                        onChange={(e) => handleChange('bump_ticket', e.target.value)}
                        className="pl-7 bg-white border-slate-200 text-slate-900 font-semibold tabular-nums text-xs h-9 rounded-lg focus-visible:ring-[#6D49F2] shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Vendas Order Bump */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-1.5 border-b border-slate-100">
                    <span className="font-medium text-sm text-slate-700">Vendas Order Bump</span>
                    <Input
                      type="number"
                      min={0}
                      value={form.bump_sales}
                      onChange={(e) => handleChange('bump_sales', e.target.value)}
                      className="bg-white border-slate-200 text-slate-900 font-semibold text-center text-xs h-9 rounded-lg focus-visible:ring-[#6D49F2] shadow-2xs"
                    />
                  </div>

                  {/* Reembolso */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-1.5 border-b border-slate-100">
                    <span className="font-medium text-sm text-slate-700">Reembolso</span>
                    <Input
                      type="number"
                      min={0}
                      value={form.bump_refunds}
                      onChange={(e) => handleChange('bump_refunds', e.target.value)}
                      className="bg-white border-slate-200 text-slate-900 font-semibold text-center text-xs h-9 rounded-lg focus-visible:ring-[#6D49F2] shadow-2xs"
                    />
                  </div>

                  {/* Taxa Reembolso (CALCULATED - READ ONLY) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-2 bg-slate-50/80 px-3 rounded-lg border border-slate-200/70">
                    <span className="font-medium text-xs text-slate-500">Taxa Reembolso</span>
                    <div className="text-right font-bold tabular-nums text-xs text-slate-700">
                      {formatCalculatedPercent(calc.bumpRefundRate)}
                    </div>
                  </div>

                  {/* Faturamento Order Bump (CALCULATED - READ ONLY) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-2 bg-purple-50/60 px-3 rounded-lg border border-[#6D49F2]/20">
                    <span className="font-bold text-xs text-slate-700">Faturamento Order Bump</span>
                    <div className="text-right font-bold tabular-nums text-xs text-[#6D49F2]">
                      {formatCurrency(calc.bumpRevenue)}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: RESULTADO INGRESSOS + ORDER BUMPS */}
              <div>
                <div className="bg-slate-900 text-white px-6 py-3 font-bold text-xs uppercase tracking-wider text-center">
                  Resultado Ingressos + Order Bumps
                </div>

                <div className="p-4 sm:p-6 space-y-2.5">
                  {/* Faturamento Total */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-2.5 bg-emerald-50/80 px-3.5 rounded-xl border border-emerald-200/90">
                    <span className="font-bold text-xs text-emerald-900">Faturamento Total</span>
                    <div className="text-right font-bold tabular-nums text-sm text-emerald-700">
                      {formatCurrency(calc.totalRevenue)}
                    </div>
                  </div>

                  {/* Ticket Médio (CALCULATED - SOFT PASTEL HIGHLIGHT) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-2.5 bg-amber-50/90 px-3.5 rounded-xl border border-amber-200/90">
                    <span className="font-bold text-sm text-amber-950">Ticket Médio</span>
                    <div className="text-center sm:text-right font-bold tabular-nums text-base text-amber-950">
                      {formatCalculatedCurrency(calc.averageTicket)}
                    </div>
                  </div>

                  {/* Saldo da Captação (CALCULATED - SOFT PASTEL HIGHLIGHT WITH CONDITIONAL COLOR) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-2.5 bg-amber-50/90 px-3.5 rounded-xl border border-amber-200/90">
                    <span className="font-bold text-sm text-amber-950">Saldo da Captação</span>
                    <div
                      className={`text-center sm:text-right font-bold tabular-nums text-base ${
                        calc.captureBalance >= 0 ? 'text-emerald-700' : 'text-rose-600'
                      }`}
                    >
                      {formatCurrency(calc.captureBalance)}
                    </div>
                  </div>

                  {/* ROAS Geral (CALCULATED - SOFT PASTEL HIGHLIGHT) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-2.5 bg-amber-50/90 px-3.5 rounded-xl border border-amber-200/90">
                    <span className="font-bold text-sm text-amber-950">ROAS</span>
                    <div className="text-center sm:text-right font-bold tabular-nums text-base text-amber-950">
                      {formatCalculatedNumber(calc.overallRoas, 2)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Save Action Button */}
            <div className="p-4 sm:p-6 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-500 font-medium">
                Lançamento selecionado:{' '}
                <span className="font-bold text-[#6D49F2]">{form.batch}</span>
              </div>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full sm:w-auto px-8 py-5 bg-gradient-to-r from-[#6D49F2] to-[#FF2AFF] hover:opacity-90 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all"
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
          </Card>
        </div>
      )}
    </div>
  )
}
