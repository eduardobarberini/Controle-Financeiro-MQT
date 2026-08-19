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
  Plus,
  Trash2,
  CalendarDays,
  Lock,
} from 'lucide-react'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { DailySalesChart } from '@/components/dashboard/DailySalesChart'
import { Card } from '@/components/ui/card'
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
import type { PaidLaunchRecord, PaidLaunchInput, DailyEntry } from '@/types/paidLaunches'

const DEFAULT_DAYS: DailyEntry[] = [
  { dayLabel: 'Seg', dateLabel: '8/6', investment: 18201, ticket_sales: 394, bump_sales: 116 },
  { dayLabel: 'Ter', dateLabel: '9/6', investment: '', ticket_sales: '', bump_sales: '' },
  { dayLabel: 'Qua', dateLabel: '10/6', investment: '', ticket_sales: '', bump_sales: '' },
  { dayLabel: 'Qui', dateLabel: '11/6', investment: '', ticket_sales: '', bump_sales: '' },
  { dayLabel: 'Sex', dateLabel: '12/6', investment: '', ticket_sales: '', bump_sales: '' },
  { dayLabel: 'Sáb', dateLabel: '13/6', investment: '', ticket_sales: '', bump_sales: '' },
  { dayLabel: 'Dom', dateLabel: '14/6', investment: '', ticket_sales: '', bump_sales: '' },
]

interface FormState {
  id?: string
  capture_days: string | number
  batch: string
  ticket_ticket: string | number
  ticket_refunds: string | number
  bump_ticket: string | number
  bump_refunds: string | number
  daily_data: DailyEntry[]
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
  batch: 'S1 - 23/08/2026',
  capture_days: 1,
  ticket_ticket: 29.9,
  ticket_refunds: 17,
  bump_ticket: 19.9,
  bump_refunds: 3,
  daily_data: DEFAULT_DAYS,
}

export default function LancamentoPago() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [records, setRecords] = useState<PaidLaunchRecord[]>([])
  const [selectedLaunchId, setSelectedLaunchId] = useState<string>('new')
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)

  // Load all records from backend
  const loadData = async (preferredId?: string) => {
    setLoading(true)
    try {
      const data = await paidLaunchesService.getAll()
      setRecords(data)

      if (data.length > 0) {
        // Find preferred or first record
        const target = preferredId ? data.find((r) => r.id === preferredId) || data[0] : data[0]

        setSelectedLaunchId(target.id)
        setForm({
          id: target.id,
          capture_days: target.capture_days ?? 0,
          batch: target.batch,
          ticket_ticket: target.ticket_ticket ?? 0,
          ticket_refunds: target.ticket_refunds ?? 0,
          bump_ticket: target.bump_ticket ?? 0,
          bump_refunds: target.bump_refunds ?? 0,
          daily_data:
            target.daily_data && Array.isArray(target.daily_data) && target.daily_data.length === 7
              ? target.daily_data
              : DEFAULT_DAYS,
        })
      } else {
        setSelectedLaunchId('new')
        setForm(DEFAULT_FORM)
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

  // When changing launch selector in the header / controller
  const handleSelectLaunch = (id: string) => {
    setSelectedLaunchId(id)
    if (id === 'new') {
      setForm({
        ...DEFAULT_FORM,
        id: undefined,
        batch: `Turma ${records.length + 1}`,
      })
    } else {
      const found = records.find((r) => r.id === id)
      if (found) {
        setForm({
          id: found.id,
          capture_days: found.capture_days ?? 0,
          batch: found.batch,
          ticket_ticket: found.ticket_ticket ?? 0,
          ticket_refunds: found.ticket_refunds ?? 0,
          bump_ticket: found.bump_ticket ?? 0,
          bump_refunds: found.bump_refunds ?? 0,
          daily_data:
            found.daily_data && Array.isArray(found.daily_data) && found.daily_data.length === 7
              ? found.daily_data
              : DEFAULT_DAYS,
        })
      }
    }
  }

  // Handle single field input changes
  const handleChange = (field: keyof FormState, value: string | number) => {
    setForm((prev) => {
      const updated = { ...prev, [field]: value }

      // If user typed in 'batch' manually, check if it matches an existing record's batch name
      if (field === 'batch' && typeof value === 'string') {
        const matchingRecord = records.find(
          (r) => r.batch.trim().toLowerCase() === value.trim().toLowerCase(),
        )
        if (matchingRecord && matchingRecord.id !== prev.id) {
          return {
            ...matchingRecord,
            batch: value,
            id: matchingRecord.id,
            daily_data:
              matchingRecord.daily_data &&
              Array.isArray(matchingRecord.daily_data) &&
              matchingRecord.daily_data.length === 7
                ? matchingRecord.daily_data
                : DEFAULT_DAYS,
          }
        }
      }

      return updated
    })
  }

  // Handle changes in daily tracking table
  const handleDailyChange = (
    index: number,
    field: 'dayLabel' | 'dateLabel' | 'investment' | 'ticket_sales' | 'bump_sales',
    val: string,
  ) => {
    setForm((prev) => {
      const newDaily = [...prev.daily_data]
      newDaily[index] = {
        ...newDaily[index],
        [field]: val,
      }
      return { ...prev, daily_data: newDaily }
    })
  }

  // Computed per-day metrics and consolidated totals
  const dailyCalculated = useMemo(() => {
    const ticketTicket = Number(form.ticket_ticket) || 0
    const bumpTicket = Number(form.bump_ticket) || 0

    let totalInvestment = 0
    let totalTicketSales = 0
    let totalBumpSales = 0
    let activeDaysCount = 0

    const days = form.daily_data.map((day) => {
      const inv = Number(day.investment) || 0
      const ticketSales = Number(day.ticket_sales) || 0
      const bumpSales = Number(day.bump_sales) || 0

      // Count day if there is investment or sales
      const hasData = day.investment !== '' || day.ticket_sales !== '' || day.bump_sales !== ''
      if (hasData) {
        activeDaysCount++
      }

      totalInvestment += inv
      totalTicketSales += ticketSales
      totalBumpSales += bumpSales

      const ticketRevenue = ticketSales * ticketTicket
      const bumpRevenue = bumpSales * bumpTicket
      const bumpConversion = ticketSales > 0 ? bumpSales / ticketSales : 0
      const totalRevenue = ticketRevenue + bumpRevenue
      const dailyBalance = totalRevenue - inv
      const averageTicket = ticketSales > 0 ? totalRevenue / ticketSales : 0
      const cac = ticketSales > 0 ? inv / ticketSales : 0
      const roas = inv > 0 ? totalRevenue / inv : 0

      return {
        ...day,
        inv,
        ticketSales,
        bumpSales,
        ticketRevenue,
        bumpRevenue,
        bumpConversion,
        totalRevenue,
        dailyBalance,
        averageTicket,
        cac,
        roas,
        hasData,
      }
    })

    return {
      days,
      totalInvestment,
      totalTicketSales,
      totalBumpSales,
      activeDaysCount,
    }
  }, [form.daily_data, form.ticket_ticket, form.bump_ticket])

  // Consolidated vertical form calculations
  const calc = useMemo(() => {
    // Automatically derived totals from daily tracking
    const trafficInvestment = dailyCalculated.totalInvestment
    const totalTicketSales = dailyCalculated.totalTicketSales
    const bumpSales = dailyCalculated.totalBumpSales
    const captureDays = dailyCalculated.activeDaysCount

    const ticketTicket = Number(form.ticket_ticket) || 0
    const ticketRefunds = Number(form.ticket_refunds) || 0

    const bumpTicket = Number(form.bump_ticket) || 0
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
      captureDays,
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
  }, [
    dailyCalculated,
    form.ticket_ticket,
    form.ticket_refunds,
    form.bump_ticket,
    form.bump_refunds,
  ])

  // Top Dashboard KPIs reflect currently loaded launch
  const dashboardKpis = useMemo(() => {
    return {
      faturamentoTotal: calc.totalRevenue,
      investimentoTrafego: calc.trafficInvestment,
      roasGeral: calc.overallRoas,
      saldoCaptacao: calc.captureBalance,
      totalIngressos: calc.totalTicketSales,
      conversaoBump: calc.bumpConversion,
    }
  }, [calc])
  // Save current launch
  const handleSave = async () => {
    if (!form.batch.trim()) {
      toast({
        title: 'Nome da Turma é obrigatório',
        description: 'Digite um identificador para a turma do lançamento (ex: "S1 - 23/08/2026").',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      const payload: PaidLaunchInput = {
        capture_days: calc.captureDays,
        batch: form.batch.trim(),
        ticket_ticket: Number(form.ticket_ticket) || 0,
        traffic_investment: calc.trafficInvestment,
        total_ticket_sales: calc.totalTicketSales,
        ticket_refunds: Number(form.ticket_refunds) || 0,
        bump_ticket: Number(form.bump_ticket) || 0,
        bump_sales: calc.bumpSales,
        bump_refunds: Number(form.bump_refunds) || 0,
        daily_data: form.daily_data,
      }

      const savedRec = await paidLaunchesService.save(form.id, payload)

      // Reload data and keep active saved launch selected
      await loadData(savedRec.id)

      toast({
        title: 'Lançamento Salvo',
        description: `Os dados de "${savedRec.batch}" foram salvos com sucesso!`,
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

  // Delete launch
  const handleDelete = async () => {
    if (!form.id) return
    if (!confirm(`Tem certeza que deseja excluir o lançamento "${form.batch}"?`)) return

    setDeleting(true)
    try {
      await paidLaunchesService.delete(form.id)
      toast({
        title: 'Lançamento excluído',
        description: `O lançamento "${form.batch}" foi removido.`,
      })
      await loadData()
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o lançamento.',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
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
            Gestão vertical de performance de ingressos e order bumps por lançamento.
          </p>
        </div>

        {/* Launch Switcher Dropdown in Header */}
        <div className="flex items-center gap-2 bg-white border border-slate-200/90 shadow-2xs p-1.5 rounded-xl">
          <Calendar className="w-4 h-4 text-[#6D49F2] ml-2 shrink-0" />
          <span className="text-xs font-semibold text-slate-600 shrink-0">Lançamento:</span>
          <Select value={selectedLaunchId} onValueChange={handleSelectLaunch}>
            <SelectTrigger className="w-[180px] sm:w-[220px] h-9 bg-slate-50/80 border-slate-200 text-slate-900 font-bold text-xs focus:ring-[#6D49F2] rounded-lg truncate">
              <SelectValue placeholder="Selecione um lançamento" />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-200 text-slate-900 rounded-xl">
              {records.map((r) => (
                <SelectItem
                  key={r.id}
                  value={r.id}
                  className="focus:bg-[#6D49F2]/10 focus:text-[#6D49F2] font-medium text-xs"
                >
                  {r.batch}
                </SelectItem>
              ))}
              <SelectItem
                value="new"
                className="focus:bg-[#6D49F2]/10 focus:text-[#6D49F2] font-bold text-xs text-[#6D49F2]"
              >
                <span className="flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" />
                  Novo Lançamento...
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Top Dashboard KPI Grid - Organised in 2 Rows */}
      <div className="space-y-4">
        {/* Row 1 (Featured / Larger Cards): Faturamento Total, Investimento Tráfego, ROAS Geral */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KpiCard
            title="Faturamento Total"
            value={dashboardKpis.faturamentoTotal}
            formatType="currency"
            icon={DollarSign}
            subtext="Ingressos + Order Bumps"
            iconBgColor="bg-[#6D49F2]/10 text-[#6D49F2] border-[#6D49F2]/20"
          />

          <KpiCard
            title="Invest. Tráfego"
            value={dashboardKpis.investimentoTrafego}
            formatType="currency"
            icon={TrendingUp}
            subtext="Custo total em anúncios"
            iconBgColor="bg-[#FF2AFF]/10 text-[#FF2AFF] border-[#FF2AFF]/20"
          />

          <KpiCard
            title="ROAS Geral"
            value={dashboardKpis.roasGeral}
            formatType="roas"
            icon={Percent}
            subtext="Faturamento / Investimento"
            iconBgColor="bg-emerald-50 text-emerald-600 border-emerald-200"
          />
        </div>

        {/* Row 2 (Secondary Cards): Saldo da Captação, Total Ingressos, Conversão Order Bump */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KpiCard
            title="Saldo da Captação"
            value={dashboardKpis.saldoCaptacao}
            formatType="currency"
            icon={DollarSign}
            subtext="Faturamento - Investimento"
            iconBgColor={
              dashboardKpis.saldoCaptacao >= 0
                ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                : 'bg-rose-50 text-rose-600 border-rose-200'
            }
          />

          <KpiCard
            title="Total Ingressos"
            value={dashboardKpis.totalIngressos}
            formatType="raw"
            icon={Ticket}
            subtext="Vendas totais de ingresso"
            iconBgColor="bg-sky-50 text-sky-600 border-sky-200"
          />

          <KpiCard
            title="Conv. Order Bump"
            value={dashboardKpis.conversaoBump}
            formatType="percent"
            decimals={2}
            icon={Percent}
            subtext="Bumps / Ingressos Totais"
            iconBgColor="bg-amber-50 text-amber-600 border-amber-200"
          />
        </div>
      </div>

      {/* Vertical Form Module - 3 Distinct Cards */}
      {loading ? (
        <Card className="bg-white border border-slate-200/80 shadow-xs rounded-xl p-16 flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-[#6D49F2]" />
          <p className="text-sm text-slate-500 font-medium">Carregando dados do lançamento...</p>
        </Card>
      ) : (
        <div className="w-full space-y-6">
          {/* CHART: Vendas Diárias × Conversão Order Bump */}
          <DailySalesChart
            days={dailyCalculated.days.map((d) => ({
              dayLabel: d.dayLabel,
              ticketSales: d.ticketSales,
              bumpConversion: d.bumpConversion,
            }))}
          />

          {/* NEW SECTION: ACOMPANHAMENTO DIÁRIO (TABELA HORIZONTAL) */}
          <Card className="bg-white border border-slate-200/80 shadow-xs rounded-xl overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-3 font-bold text-xs uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-[#FF2AFF]" />
                Acompanhamento Diário - Vendas da Semana
              </span>
              <span className="text-[11px] text-slate-300 font-normal normal-case">
                Preencha Investimento, Vendas Ingresso e Order Bump por dia
              </span>
            </div>

            <div className="p-4 sm:p-6 overflow-x-auto">
              <table className="w-full text-xs border-collapse min-w-[760px]">
                <thead>
                  {/* Row 1: Header - Day labels and dates */}
                  <tr className="bg-[#FAF8FF] border-b border-slate-200">
                    <th className="p-3 text-left font-bold text-slate-800 bg-slate-900 text-white w-48 text-sm">
                      Venda Ingressos
                    </th>
                    {form.daily_data.map((day, idx) => (
                      <th
                        key={idx}
                        className="p-2 text-center font-bold text-slate-800 bg-[#F2EBFF] border-l border-slate-200/80 min-w-[100px]"
                      >
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="text"
                            value={day.dayLabel || ''}
                            onChange={(e) => handleDailyChange(idx, 'dayLabel', e.target.value)}
                            className="w-10 text-center font-bold text-slate-900 bg-transparent border-b border-dashed border-slate-400 focus:outline-none focus:border-[#6D49F2]"
                            placeholder="Dia"
                          />
                        </div>
                        <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                          <input
                            type="text"
                            value={day.dateLabel || ''}
                            onChange={(e) => handleDailyChange(idx, 'dateLabel', e.target.value)}
                            className="w-12 text-center text-slate-600 bg-transparent border-b border-dashed border-slate-300 focus:outline-none focus:border-[#6D49F2]"
                            placeholder="Data"
                          />
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {/* Investimento (Manual) */}
                  <tr className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-2.5 font-medium text-slate-700">Investimento</td>
                    {form.daily_data.map((day, idx) => (
                      <td key={idx} className="p-1.5 border-l border-slate-100 text-center">
                        <div className="relative">
                          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">
                            R$
                          </span>
                          <Input
                            type="number"
                            step="0.01"
                            min={0}
                            placeholder="0"
                            value={day.investment}
                            onChange={(e) => handleDailyChange(idx, 'investment', e.target.value)}
                            className="pl-6 h-8 text-center font-semibold text-slate-900 text-xs bg-white border-slate-200 focus-visible:ring-[#6D49F2]"
                          />
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* Vendas Ingresso (Manual) */}
                  <tr className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-2.5 font-medium text-slate-700">Vendas Ingresso</td>
                    {form.daily_data.map((day, idx) => (
                      <td key={idx} className="p-1.5 border-l border-slate-100 text-center">
                        <Input
                          type="number"
                          min={0}
                          placeholder="0"
                          value={day.ticket_sales}
                          onChange={(e) => handleDailyChange(idx, 'ticket_sales', e.target.value)}
                          className="h-8 text-center font-semibold text-slate-900 text-xs bg-white border-slate-200 focus-visible:ring-[#6D49F2]"
                        />
                      </td>
                    ))}
                  </tr>

                  {/* Faturamento Ingresso (Calculado) */}
                  <tr className="bg-slate-50/80 font-bold">
                    <td className="p-2.5 text-slate-900">Faturamento Ingresso</td>
                    {dailyCalculated.days.map((dayCalc, idx) => (
                      <td
                        key={idx}
                        className="p-2 border-l border-slate-200/80 text-center tabular-nums text-slate-900"
                      >
                        {formatCurrency(dayCalc.ticketRevenue)}
                      </td>
                    ))}
                  </tr>

                  {/* Vendas Order Bump (Manual) */}
                  <tr className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-2.5 font-medium text-slate-700">Vendas Order Bump</td>
                    {form.daily_data.map((day, idx) => (
                      <td key={idx} className="p-1.5 border-l border-slate-100 text-center">
                        <Input
                          type="number"
                          min={0}
                          placeholder="0"
                          value={day.bump_sales}
                          onChange={(e) => handleDailyChange(idx, 'bump_sales', e.target.value)}
                          className="h-8 text-center font-semibold text-slate-900 text-xs bg-white border-slate-200 focus-visible:ring-[#6D49F2]"
                        />
                      </td>
                    ))}
                  </tr>

                  {/* % Conversão Order Bump (Calculado) */}
                  <tr className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-2.5 font-medium text-slate-700">% Conversão Order Bump</td>
                    {dailyCalculated.days.map((dayCalc, idx) => (
                      <td
                        key={idx}
                        className="p-2 border-l border-slate-100 text-center tabular-nums text-slate-600"
                      >
                        {formatPercent(dayCalc.bumpConversion)}
                      </td>
                    ))}
                  </tr>

                  {/* Faturamento Order Bump (Calculado) */}
                  <tr className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-2.5 font-medium text-slate-700">Faturamento Order Bump</td>
                    {dailyCalculated.days.map((dayCalc, idx) => (
                      <td
                        key={idx}
                        className="p-2 border-l border-slate-100 text-center tabular-nums text-slate-700"
                      >
                        {formatCurrency(dayCalc.bumpRevenue)}
                      </td>
                    ))}
                  </tr>

                  {/* Faturamento Total (Calculado - Soft Pastel Green Highlight) */}
                  <tr className="bg-[#EBF9F1] font-bold text-slate-900 border-t border-b border-emerald-200">
                    <td className="p-2.5 text-emerald-950">Faturamento Total</td>
                    {dailyCalculated.days.map((dayCalc, idx) => (
                      <td
                        key={idx}
                        className="p-2 border-l border-emerald-200/80 text-center tabular-nums text-emerald-900"
                      >
                        {formatCurrency(dayCalc.totalRevenue)}
                      </td>
                    ))}
                  </tr>

                  {/* Saldo Diário (Calculado - Soft Pastel Green Highlight with red text for negative) */}
                  <tr className="bg-[#EBF9F1] font-bold text-slate-900 border-b border-emerald-200">
                    <td className="p-2.5 text-emerald-950">Saldo Diário</td>
                    {dailyCalculated.days.map((dayCalc, idx) => (
                      <td
                        key={idx}
                        className={`p-2 border-l border-emerald-200/80 text-center tabular-nums ${
                          dayCalc.dailyBalance < 0
                            ? 'text-rose-600 font-extrabold'
                            : 'text-emerald-900'
                        }`}
                      >
                        {dayCalc.dailyBalance < 0
                          ? `-R$ ${Math.abs(dayCalc.dailyBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : formatCurrency(dayCalc.dailyBalance)}
                      </td>
                    ))}
                  </tr>

                  {/* Ticket Médio (Calculado - Soft Pastel Green Highlight) */}
                  <tr className="bg-[#EBF9F1] font-bold text-slate-900 border-b border-emerald-200">
                    <td className="p-2.5 text-emerald-950">Ticket Médio</td>
                    {dailyCalculated.days.map((dayCalc, idx) => (
                      <td
                        key={idx}
                        className="p-2 border-l border-emerald-200/80 text-center tabular-nums text-emerald-900"
                      >
                        {formatCalculatedNumber(dayCalc.averageTicket, 1)}
                      </td>
                    ))}
                  </tr>

                  {/* CAC (Calculado - Soft Pastel Green Highlight) */}
                  <tr className="bg-[#EBF9F1] font-bold text-slate-900 border-b border-emerald-200">
                    <td className="p-2.5 text-emerald-950">CAC</td>
                    {dailyCalculated.days.map((dayCalc, idx) => (
                      <td
                        key={idx}
                        className="p-2 border-l border-emerald-200/80 text-center tabular-nums text-emerald-900"
                      >
                        {formatCalculatedNumber(dayCalc.cac, 1)}
                      </td>
                    ))}
                  </tr>

                  {/* ROAS (Calculado - Soft Pastel Pink/Red Highlight) */}
                  <tr className="bg-[#FDE8EC] font-bold text-rose-950 border-b border-rose-200">
                    <td className="p-2.5 text-rose-950">ROAS</td>
                    {dailyCalculated.days.map((dayCalc, idx) => (
                      <td
                        key={idx}
                        className="p-2 border-l border-rose-200/80 text-center tabular-nums text-rose-950"
                      >
                        {formatCalculatedNumber(dayCalc.roas, 2)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          {/* BLOCK 1: VENDA DE INGRESSOS */}
          <Card className="bg-white border border-slate-200/80 shadow-xs rounded-xl overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-3 font-bold text-xs uppercase tracking-wider text-center">
              VENDA DE INGRESSOS
            </div>

            <div className="p-4 sm:p-6 space-y-2.5">
              {/* Dias Captação (AUTOMATIC FROM DAILY TRACKING - READ ONLY) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-2 bg-slate-50/80 px-3 rounded-lg border border-slate-200/70">
                <span className="font-bold text-xs text-slate-700 flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-slate-400" />
                  Dias Captação (calculado)
                </span>
                <div className="text-right font-bold tabular-nums text-xs text-[#6D49F2]">
                  {calc.captureDays} {calc.captureDays === 1 ? 'dia' : 'dias'}
                </div>
              </div>

              {/* Turma */}
              <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-1.5 border-b border-slate-100">
                <span className="font-medium text-sm text-slate-700">Turma</span>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder='ex: "S1 - 23/08/2026"'
                    value={form.batch}
                    onChange={(e) => handleChange('batch', e.target.value)}
                    className="bg-white border-slate-200 text-slate-900 font-bold text-xs h-9 rounded-lg focus-visible:ring-[#6D49F2] shadow-2xs"
                  />
                </div>
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

              {/* Investimento Tráfego (AUTOMATIC FROM DAILY TRACKING - READ ONLY) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-2 bg-slate-50/80 px-3 rounded-lg border border-slate-200/70">
                <span className="font-medium text-xs text-slate-700 flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-slate-400" />
                  Investimento Tráfego (soma dos dias)
                </span>
                <div className="text-right font-bold tabular-nums text-xs text-slate-900">
                  {formatCurrency(calc.trafficInvestment)}
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

              {/* Vendas Totais Ingresso (AUTOMATIC FROM DAILY TRACKING - READ ONLY) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-2 bg-slate-50/80 px-3 rounded-lg border border-slate-200/70">
                <span className="font-medium text-xs text-slate-700 flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-slate-400" />
                  Vendas Totais Ingresso (soma dos dias)
                </span>
                <div className="text-right font-bold tabular-nums text-xs text-slate-900">
                  {calc.totalTicketSales}
                </div>
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
                <span className="font-semibold text-xs text-slate-700">Faturamento Ingressos</span>
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
          </Card>

          {/* BLOCK 2: ORDER BUMP */}
          <Card className="bg-white border border-slate-200/80 shadow-xs rounded-xl overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-3 font-bold text-xs uppercase tracking-wider text-center">
              ORDER BUMP
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

              {/* Vendas Order Bump (AUTOMATIC FROM DAILY TRACKING - READ ONLY) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-2 bg-slate-50/80 px-3 rounded-lg border border-slate-200/70">
                <span className="font-medium text-xs text-slate-700 flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-slate-400" />
                  Vendas Order Bump (soma dos dias)
                </span>
                <div className="text-right font-bold tabular-nums text-xs text-slate-900">
                  {calc.bumpSales}
                </div>
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
          </Card>

          {/* BLOCK 3: RESULTADO INGRESSOS + ORDER BUMPS */}
          <Card className="bg-white border border-slate-200/80 shadow-xs rounded-xl overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-3 font-bold text-xs uppercase tracking-wider text-center">
              RESULTADO INGRESSOS + ORDER BUMPS
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

            {/* Bottom Action Bar inside or attached to the bottom section */}
            <div className="p-4 sm:p-6 bg-slate-50/80 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-500 font-medium">
                Lançamento selecionado:{' '}
                <span className="font-bold text-[#6D49F2]">{form.batch || 'Sem nome'}</span>
                {form.id ? ' (Salvo no BD)' : ' (Novo)'}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {form.id && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDelete}
                    disabled={deleting || saving}
                    className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-semibold text-xs rounded-xl h-11 px-4 transition-all"
                  >
                    {deleting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                )}

                <Button
                  onClick={handleSave}
                  disabled={saving || deleting}
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
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
