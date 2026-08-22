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
import { ConsolidatedResultTab } from '@/components/launch/ConsolidatedResultTab'
import { ControleAulasTab } from '@/components/launch/ControleAulasTab'
import { VendasComercialTab } from '@/components/launch/VendasComercialTab'
import { UpsellPlatformTab } from '@/components/launch/UpsellPlatformTab'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { DailySalesChart } from '@/components/dashboard/DailySalesChart'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { paidLaunchesService } from '@/services/paidLaunches'
import type {
  PaidLaunchRecord,
  PaidLaunchInput,
  DailyEntry,
  ClassSession,
  ClassSessions,
  CommercialSales,
  UpsellPlatform,
  UpsellDailyEntry,
} from '@/types/paidLaunches'
import {
  formatCurrency,
  formatPercent,
  formatCalculatedCurrency,
  formatCalculatedPercent,
  formatCalculatedNumber,
  extractDateFromBatch,
  calculateDailyDataDateLabels,
  calculateUpsellDailyDateLabels,
} from '@/lib/launch-format'
import { formatNumber, parsePtBrNumber } from '@/lib/financial-utils'

const DEFAULT_CLASS_SESSIONS: ClassSession[] = [
  { label: 'Aula de Boas Vindas', live_attendees: '', unique_viewers: '' },
  { label: 'Encontro Com a Nutri', live_attendees: '', unique_viewers: '' },
  { label: 'Treino 1', live_attendees: '', unique_viewers: '' },
  { label: 'Treino 2', live_attendees: '', unique_viewers: '' },
  { label: 'Treino 3', live_attendees: '', unique_viewers: '' },
  { label: 'Treino 4', live_attendees: '', unique_viewers: '' },
  { label: 'Treino 5', live_attendees: '', unique_viewers: '' },
]

/**
 * Canonical display order for class sessions in the "Controle Aulas" tab,
 * matched case/accent/space-insensitively against each session's label.
 * Labels not found here keep their relative order and sort to the end.
 */
const CANONICAL_SESSION_ORDER = [
  'aula de boas vindas',
  'encontro com a nutri',
  'treino 1',
  'treino 2',
  'treino 3',
  'treino 4',
  'treino 5',
]

const normalizeSessionLabel = (label: string): string =>
  (label || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

const reorderClassSessions = (sessions: ClassSession[]): ClassSession[] => {
  if (!Array.isArray(sessions) || sessions.length === 0) return sessions
  return [...sessions].sort((a, b) => {
    const ia = CANONICAL_SESSION_ORDER.indexOf(normalizeSessionLabel(a.label))
    const ib = CANONICAL_SESSION_ORDER.indexOf(normalizeSessionLabel(b.label))
    const orderA = ia === -1 ? Number.MAX_SAFE_INTEGER : ia
    const orderB = ib === -1 ? Number.MAX_SAFE_INTEGER : ib
    return orderA - orderB
  })
}

const DEFAULT_DAYS: DailyEntry[] = [
  { dayLabel: 'Seg', dateLabel: '17/8', investment: 18201, ticket_sales: 394, bump_sales: 116 },
  { dayLabel: 'Ter', dateLabel: '18/8', investment: '', ticket_sales: '', bump_sales: '' },
  { dayLabel: 'Qua', dateLabel: '19/8', investment: '', ticket_sales: '', bump_sales: '' },
  { dayLabel: 'Qui', dateLabel: '20/8', investment: '', ticket_sales: '', bump_sales: '' },
  { dayLabel: 'Sex', dateLabel: '21/8', investment: '', ticket_sales: '', bump_sales: '' },
  { dayLabel: 'Sáb', dateLabel: '22/8', investment: '', ticket_sales: '', bump_sales: '' },
  { dayLabel: 'Dom', dateLabel: '23/8', investment: '', ticket_sales: '', bump_sales: '' },
]

const DEFAULT_UPSELL_DAILY_SALES: UpsellDailyEntry[] = [
  {
    isPrimeiraHora: true,
    dayLabel: 'Primeira Hora',
    dateLabel: '',
    card_pix_sales: '',
    card_pix_revenue: '',
    boleto_sales: '',
    boleto_revenue: '',
  },
  {
    dayLabel: 'Qui',
    dateLabel: '27/8',
    card_pix_sales: '',
    card_pix_revenue: '',
    boleto_sales: '',
    boleto_revenue: '',
  },
  {
    dayLabel: 'Sex',
    dateLabel: '28/8',
    card_pix_sales: '',
    card_pix_revenue: '',
    boleto_sales: '',
    boleto_revenue: '',
  },
  {
    dayLabel: 'Sáb',
    dateLabel: '29/8',
    card_pix_sales: '',
    card_pix_revenue: '',
    boleto_sales: '',
    boleto_revenue: '',
  },
  {
    dayLabel: 'Dom',
    dateLabel: '30/8',
    card_pix_sales: '',
    card_pix_revenue: '',
    boleto_sales: '',
    boleto_revenue: '',
  },
  {
    dayLabel: 'Seg',
    dateLabel: '31/8',
    card_pix_sales: '',
    card_pix_revenue: '',
    boleto_sales: '',
    boleto_revenue: '',
  },
  {
    dayLabel: 'Ter',
    dateLabel: '1/9',
    card_pix_sales: '',
    card_pix_revenue: '',
    boleto_sales: '',
    boleto_revenue: '',
  },
]

/**
 * Helper to update date labels for both daily_data and upsell_platform.daily_sales
 * when given a batch string.
 */
function applyBatchDateLabels(
  batch: string,
  dailyData: DailyEntry[],
  upsellDailySales: UpsellDailyEntry[],
): { dailyData: DailyEntry[]; upsellDailySales: UpsellDailyEntry[] } {
  const sundayDate = extractDateFromBatch(batch)
  if (!sundayDate) {
    return { dailyData, upsellDailySales }
  }

  // 1. Calculate for daily_data (7 days: Seg, Ter, Qua, Qui, Sex, Sáb, Dom)
  const ingressosLabels = calculateDailyDataDateLabels(sundayDate)
  const defaultDayNames = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
  const updatedDailyData: DailyEntry[] = Array.from({ length: 7 }, (_, i) => {
    const existing = dailyData?.[i] || {
      dayLabel: defaultDayNames[i],
      dateLabel: '',
      investment: '',
      ticket_sales: '',
      bump_sales: '',
    }
    return {
      ...existing,
      dayLabel: existing.dayLabel || defaultDayNames[i],
      dateLabel: ingressosLabels[i],
    }
  })

  // 2. Calculate for upsell platform daily sales
  // Columns: Primeira Hora, Qui, Sex, Sáb, Dom, Seg, Ter
  const upsellLabels = calculateUpsellDailyDateLabels(sundayDate)
  const updatedUpsellDaily: UpsellDailyEntry[] = (
    upsellDailySales || DEFAULT_UPSELL_DAILY_SALES
  ).map((item, idx) => {
    if (item.isPrimeiraHora || (idx === 0 && item.dayLabel?.toLowerCase().includes('primeira'))) {
      return {
        ...item,
        dateLabel: '',
      }
    }

    // Map day label to corresponding dateLabel
    const dayKey = item.dayLabel || ''
    const mappedDate = upsellLabels[dayKey]

    // Fallback by index if dayLabel is customized or missing:
    // index 1 -> Qui, 2 -> Sex, 3 -> Sáb, 4 -> Dom, 5 -> Seg, 6 -> Ter
    let dateLabel = mappedDate
    if (!dateLabel) {
      const order = ['Qui', 'Sex', 'Sáb', 'Dom', 'Seg', 'Ter']
      const targetDay = order[idx - 1]
      if (targetDay && upsellLabels[targetDay]) {
        dateLabel = upsellLabels[targetDay]
      }
    }

    return {
      ...item,
      dateLabel: dateLabel || item.dateLabel || '',
    }
  })

  return {
    dailyData: updatedDailyData,
    upsellDailySales: updatedUpsellDaily,
  }
}

interface FormState {
  id?: string
  capture_days: string | number
  batch: string
  ticket_ticket: string | number
  ticket_refunds: string | number
  bump_ticket: string | number
  bump_refunds: string | number
  api_official_cost: string | number
  commercial_commission: string | number
  revenue_tax_rate: string | number
  traffic_tax_rate: string | number
  students_in_challenge: string | number
  debriefing: string
  daily_data: DailyEntry[]
  class_sessions: ClassSessions
  commercial_sales: CommercialSales
  upsell_platform: UpsellPlatform
}

const DEFAULT_UPSELL_PLATFORM: UpsellPlatform = {
  total_sales: '',
  ticket: '',
  card_pix_sales: '',
  boleto_3x_sales: '',
  refunds: '',
  inadimplencia_rate: '',
  daily_sales: DEFAULT_UPSELL_DAILY_SALES,
}

const DEFAULT_FORM: FormState = {
  batch: 'S1 - 23/08/2026',
  capture_days: 1,
  ticket_ticket: 29.9,
  ticket_refunds: 17,
  bump_ticket: 19.9,
  bump_refunds: 3,
  api_official_cost: 490,
  commercial_commission: 3752,
  revenue_tax_rate: 9.0,
  traffic_tax_rate: 12.15,
  students_in_challenge: '',
  debriefing: '',
  daily_data: DEFAULT_DAYS,
  class_sessions: DEFAULT_CLASS_SESSIONS,
  commercial_sales: [
    {
      id: 'seller-1',
      name: 'Maju',
      commission_rate: 5,
      plataforma: {
        card_pix_sales: 90,
        card_pix_ticket: 297,
        boleto_sales: 20,
        boleto_ticket: 297,
      },
      renovacao: {
        card_pix_sales: 10,
        card_pix_ticket: 197,
        boleto_sales: 2,
        boleto_ticket: 197,
      },
    },
    {
      id: 'seller-2',
      name: 'Marlene',
      commission_rate: 5,
      plataforma: {
        card_pix_sales: 90,
        card_pix_ticket: 297,
        boleto_sales: 20,
        boleto_ticket: 297,
      },
      renovacao: {
        card_pix_sales: 10,
        card_pix_ticket: 197,
        boleto_sales: 2,
        boleto_ticket: 197,
      },
    },
  ],
  upsell_platform: DEFAULT_UPSELL_PLATFORM,
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
        const target = preferredId ? data.find((r) => r.id === preferredId) || data[0] : data[0]

        const rawDailyData =
          target.daily_data && Array.isArray(target.daily_data) && target.daily_data.length === 7
            ? target.daily_data
            : DEFAULT_DAYS
        const rawUpsellDaily =
          target.upsell_platform &&
          typeof target.upsell_platform === 'object' &&
          Array.isArray(target.upsell_platform.daily_sales) &&
          target.upsell_platform.daily_sales.length > 0
            ? target.upsell_platform.daily_sales
            : DEFAULT_UPSELL_DAILY_SALES

        const { dailyData, upsellDailySales } = applyBatchDateLabels(
          target.batch,
          rawDailyData,
          rawUpsellDaily,
        )

        setSelectedLaunchId(target.id)
        setForm({
          id: target.id,
          capture_days: target.capture_days ?? 0,
          batch: target.batch,
          ticket_ticket: target.ticket_ticket ?? 0,
          ticket_refunds: target.ticket_refunds ?? 0,
          bump_ticket: target.bump_ticket ?? 0,
          bump_refunds: target.bump_refunds ?? 0,
          api_official_cost: target.api_official_cost ?? 490,
          commercial_commission: target.commercial_commission ?? 3752,
          revenue_tax_rate: target.revenue_tax_rate ?? 9.0,
          traffic_tax_rate: target.traffic_tax_rate ?? 12.15,
          students_in_challenge: target.students_in_challenge ?? '',
          debriefing: target.debriefing ?? '',
          daily_data: dailyData,
          class_sessions: reorderClassSessions(
            Array.isArray(target.class_sessions) && target.class_sessions.length > 0
              ? target.class_sessions
              : DEFAULT_CLASS_SESSIONS,
          ),
          commercial_sales:
            Array.isArray(target.commercial_sales) && target.commercial_sales.length > 0
              ? target.commercial_sales
              : DEFAULT_FORM.commercial_sales,
          upsell_platform:
            target.upsell_platform &&
            typeof target.upsell_platform === 'object' &&
            !Array.isArray(target.upsell_platform)
              ? {
                  ...DEFAULT_UPSELL_PLATFORM,
                  ...target.upsell_platform,
                  daily_sales: upsellDailySales,
                }
              : {
                  ...DEFAULT_UPSELL_PLATFORM,
                  daily_sales: upsellDailySales,
                },
        })
      } else {
        setSelectedLaunchId('new')
        const { dailyData, upsellDailySales } = applyBatchDateLabels(
          DEFAULT_FORM.batch,
          DEFAULT_DAYS,
          DEFAULT_UPSELL_DAILY_SALES,
        )
        setForm({
          ...DEFAULT_FORM,
          daily_data: dailyData,
          upsell_platform: {
            ...DEFAULT_UPSELL_PLATFORM,
            daily_sales: upsellDailySales,
          },
        })
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
      const newBatch = `Turma ${records.length + 1}`
      const { dailyData, upsellDailySales } = applyBatchDateLabels(
        newBatch,
        DEFAULT_DAYS,
        DEFAULT_UPSELL_DAILY_SALES,
      )
      setForm({
        ...DEFAULT_FORM,
        id: undefined,
        batch: newBatch,
        daily_data: dailyData,
        upsell_platform: {
          ...DEFAULT_UPSELL_PLATFORM,
          daily_sales: upsellDailySales,
        },
      })
    } else {
      const found = records.find((r) => r.id === id)
      if (found) {
        const rawDailyData =
          found.daily_data && Array.isArray(found.daily_data) && found.daily_data.length === 7
            ? found.daily_data
            : DEFAULT_DAYS
        const rawUpsellDaily =
          found.upsell_platform &&
          typeof found.upsell_platform === 'object' &&
          Array.isArray(found.upsell_platform.daily_sales) &&
          found.upsell_platform.daily_sales.length > 0
            ? found.upsell_platform.daily_sales
            : DEFAULT_UPSELL_DAILY_SALES

        const { dailyData, upsellDailySales } = applyBatchDateLabels(
          found.batch,
          rawDailyData,
          rawUpsellDaily,
        )

        setForm({
          id: found.id,
          capture_days: found.capture_days ?? 0,
          batch: found.batch,
          ticket_ticket: found.ticket_ticket ?? 0,
          ticket_refunds: found.ticket_refunds ?? 0,
          bump_ticket: found.bump_ticket ?? 0,
          bump_refunds: found.bump_refunds ?? 0,
          api_official_cost: found.api_official_cost ?? 490,
          commercial_commission: found.commercial_commission ?? 3752,
          revenue_tax_rate: found.revenue_tax_rate ?? 9.0,
          traffic_tax_rate: found.traffic_tax_rate ?? 12.15,
          students_in_challenge: found.students_in_challenge ?? '',
          debriefing: found.debriefing ?? '',
          daily_data: dailyData,
          class_sessions: reorderClassSessions(
            Array.isArray(found.class_sessions) && found.class_sessions.length > 0
              ? found.class_sessions
              : DEFAULT_CLASS_SESSIONS,
          ),
          commercial_sales:
            Array.isArray(found.commercial_sales) && found.commercial_sales.length > 0
              ? found.commercial_sales
              : DEFAULT_FORM.commercial_sales,
          upsell_platform:
            found.upsell_platform &&
            typeof found.upsell_platform === 'object' &&
            !Array.isArray(found.upsell_platform)
              ? {
                  ...DEFAULT_UPSELL_PLATFORM,
                  ...found.upsell_platform,
                  daily_sales: upsellDailySales,
                }
              : {
                  ...DEFAULT_UPSELL_PLATFORM,
                  daily_sales: upsellDailySales,
                },
        })
      }
    }
  }

  // Handle upsell platform field changes
  const handleUpsellChange = (
    field: keyof UpsellPlatform,
    value: string | number | UpsellDailyEntry[],
  ) => {
    setForm((prev) => ({
      ...prev,
      upsell_platform: {
        ...prev.upsell_platform,
        [field]: value,
      },
    }))
  }

  // Handle upsell daily sales entry change
  const handleUpsellDailyChange = (
    index: number,
    field: keyof UpsellDailyEntry,
    val: string | number,
  ) => {
    setForm((prev) => {
      const currentDaily = Array.isArray(prev.upsell_platform?.daily_sales)
        ? [...prev.upsell_platform.daily_sales]
        : [...DEFAULT_UPSELL_DAILY_SALES]

      currentDaily[index] = {
        ...currentDaily[index],
        [field]: val,
      }

      return {
        ...prev,
        upsell_platform: {
          ...prev.upsell_platform,
          daily_sales: currentDaily,
        },
      }
    })
  }

  // Handle single field input changes
  const handleChange = (field: keyof FormState, value: string | number) => {
    setForm((prev) => {
      if (field === 'batch' && typeof value === 'string') {
        const matchingRecord = records.find(
          (r) => r.batch.trim().toLowerCase() === value.trim().toLowerCase(),
        )
        if (matchingRecord && matchingRecord.id !== prev.id) {
          const rawDailyData =
            matchingRecord.daily_data &&
            Array.isArray(matchingRecord.daily_data) &&
            matchingRecord.daily_data.length === 7
              ? matchingRecord.daily_data
              : DEFAULT_DAYS
          const rawUpsellDaily =
            matchingRecord.upsell_platform &&
            typeof matchingRecord.upsell_platform === 'object' &&
            Array.isArray(matchingRecord.upsell_platform.daily_sales) &&
            matchingRecord.upsell_platform.daily_sales.length > 0
              ? matchingRecord.upsell_platform.daily_sales
              : DEFAULT_UPSELL_DAILY_SALES

          const { dailyData, upsellDailySales } = applyBatchDateLabels(
            value,
            rawDailyData,
            rawUpsellDaily,
          )

          return {
            ...matchingRecord,
            batch: value,
            id: matchingRecord.id,
            api_official_cost: matchingRecord.api_official_cost ?? 490,
            commercial_commission: matchingRecord.commercial_commission ?? 3752,
            revenue_tax_rate: matchingRecord.revenue_tax_rate ?? 9.0,
            traffic_tax_rate: matchingRecord.traffic_tax_rate ?? 12.15,
            daily_data: dailyData,
            students_in_challenge: matchingRecord.students_in_challenge ?? '',
            debriefing: matchingRecord.debriefing ?? '',
            class_sessions: reorderClassSessions(
              Array.isArray(matchingRecord.class_sessions) &&
                matchingRecord.class_sessions.length > 0
                ? matchingRecord.class_sessions
                : DEFAULT_CLASS_SESSIONS,
            ),
            commercial_sales:
              Array.isArray(matchingRecord.commercial_sales) &&
              matchingRecord.commercial_sales.length > 0
                ? matchingRecord.commercial_sales
                : DEFAULT_FORM.commercial_sales,
            upsell_platform:
              matchingRecord.upsell_platform &&
              typeof matchingRecord.upsell_platform === 'object' &&
              !Array.isArray(matchingRecord.upsell_platform)
                ? {
                    ...DEFAULT_UPSELL_PLATFORM,
                    ...matchingRecord.upsell_platform,
                    daily_sales: upsellDailySales,
                  }
                : {
                    ...DEFAULT_UPSELL_PLATFORM,
                    daily_sales: upsellDailySales,
                  },
          }
        }

        // Apply automatic date recalculation to current form when typing or pasting batch
        const currentDaily = prev.daily_data || DEFAULT_DAYS
        const currentUpsellDaily = prev.upsell_platform?.daily_sales || DEFAULT_UPSELL_DAILY_SALES
        const { dailyData, upsellDailySales } = applyBatchDateLabels(
          value,
          currentDaily,
          currentUpsellDaily,
        )

        return {
          ...prev,
          batch: value,
          daily_data: dailyData,
          upsell_platform: {
            ...prev.upsell_platform,
            daily_sales: upsellDailySales,
          },
        }
      }

      return { ...prev, [field]: value }
    })
  }

  // Handle class session input changes
  const handleSessionChange = (
    index: number,
    field: 'live_attendees' | 'unique_viewers',
    val: string,
  ) => {
    setForm((prev) => {
      const currentSessions =
        Array.isArray(prev.class_sessions) && prev.class_sessions.length > 0
          ? [...prev.class_sessions]
          : [...DEFAULT_CLASS_SESSIONS]

      currentSessions[index] = {
        ...currentSessions[index],
        [field]: val,
      }

      return {
        ...prev,
        class_sessions: currentSessions,
      }
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
    const ticketTicket = parsePtBrNumber(form.ticket_ticket)
    const bumpTicket = parsePtBrNumber(form.bump_ticket)

    let totalInvestment = 0
    let totalTicketSales = 0
    let totalBumpSales = 0
    let activeDaysCount = 0

    const days = form.daily_data.map((day) => {
      const inv = parsePtBrNumber(day.investment)
      const ticketSales = parsePtBrNumber(day.ticket_sales)
      const bumpSales = parsePtBrNumber(day.bump_sales)

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

  // Upsell Platform Calculations
  const upsellCalc = useMemo(() => {
    const ticket = parsePtBrNumber(form.upsell_platform?.ticket)
    const refunds = parsePtBrNumber(form.upsell_platform?.refunds)
    const inadimplenciaRate = parsePtBrNumber(form.upsell_platform?.inadimplencia_rate)

    const dailySales = Array.isArray(form.upsell_platform?.daily_sales)
      ? form.upsell_platform.daily_sales
      : DEFAULT_UPSELL_DAILY_SALES

    let calculatedCardPixSales = 0
    let calculatedCardPixRevenue = 0
    let calculatedBoletoSales = 0
    let calculatedBoletoRevenue = 0

    const ingressosDays = form.daily_data || []

    const totalTicketSales = dailyCalculated?.totalTicketSales || 0

    const dailyCalculatedTotals = dailySales.map((day, idx) => {
      const isPrimeiraHora =
        day.isPrimeiraHora || (idx === 0 && day.dayLabel?.toLowerCase().includes('primeira'))
      const cardPixSales = parsePtBrNumber(day.card_pix_sales)
      const boletoSales = parsePtBrNumber(day.boleto_sales)

      // 1. Faturamento Vendas Cartão / PIX = Vendas Cartão / PIX * ticket plataforma
      const cardPixRevenue = cardPixSales * ticket

      // 2. Faturamento Boleto Parcelado = (Vendas Boleto Parcelado * ticket plataforma) * (1 - Taxa inadimplência boleto % / 100)
      const boletoRevenue = boletoSales * ticket * (1 - inadimplenciaRate / 100)

      // Vendas Totais (diário)
      const totalSales = cardPixSales + boletoSales

      // 4. Faturamento Total (diário) = Faturamento Cartão / PIX (diário) + Faturamento Boleto Parcelado (diário)
      const totalRevenue = cardPixRevenue + boletoRevenue

      // 3. % Conversão Desafio / Plataforma = vendas totais plataforma (diário) / total de ingressos vendidos (da aba Venda de Ingressos)
      const conversionRate = totalTicketSales > 0 ? totalSales / totalTicketSales : 0

      // Only accumulate regular days into consolidated totals (exclude Primeira Hora)
      if (!isPrimeiraHora) {
        calculatedCardPixSales += cardPixSales
        calculatedCardPixRevenue += cardPixRevenue
        calculatedBoletoSales += boletoSales
        calculatedBoletoRevenue += boletoRevenue
      }

      return {
        cardPixSales,
        cardPixRevenue,
        boletoSales,
        boletoRevenue,
        totalSales,
        totalRevenue,
        conversionRate,
        dayIngressos: totalTicketSales,
      }
    })

    const calculatedTotalSales = calculatedCardPixSales + calculatedBoletoSales
    const sumDailyTotalRevenue = calculatedCardPixRevenue + calculatedBoletoRevenue

    // Total sales in platform is calculated from daily sales (or fallback if empty)
    const totalSales =
      calculatedTotalSales > 0
        ? calculatedTotalSales
        : parsePtBrNumber(form.upsell_platform?.total_sales)

    const conversionRate = totalTicketSales > 0 ? totalSales / totalTicketSales : 0
    const boletoRate = totalSales > 0 ? calculatedBoletoSales / totalSales : 0
    const refundRate = totalSales > 0 ? refunds / totalSales : 0

    // Platform revenue is total daily revenues (Cartão/PIX + Boleto Parcelado)
    const platformRevenue = sumDailyTotalRevenue

    return {
      conversionRate,
      boletoRate,
      refundRate,
      platformRevenue,
      calculatedCardPixSales,
      calculatedCardPixRevenue,
      calculatedBoletoSales,
      calculatedBoletoRevenue,
      calculatedTotalSales,
      dailyCalculatedTotals,
    }
  }, [form.upsell_platform, dailyCalculated?.totalTicketSales])

  // Consolidated vertical form calculations
  const calc = useMemo(() => {
    const trafficInvestment = dailyCalculated.totalInvestment
    const totalTicketSales = dailyCalculated.totalTicketSales
    const bumpSales = dailyCalculated.totalBumpSales
    const captureDays = dailyCalculated.activeDaysCount

    const ticketTicket = parsePtBrNumber(form.ticket_ticket)
    const ticketRefunds = parsePtBrNumber(form.ticket_refunds)

    const bumpTicket = parsePtBrNumber(form.bump_ticket)
    const bumpRefunds = parsePtBrNumber(form.bump_refunds)

    const dailyTraffic = captureDays > 0 ? trafficInvestment / captureDays : 0
    const cac = totalTicketSales > 0 ? trafficInvestment / totalTicketSales : 0
    const avgSalesPerDay = captureDays > 0 ? totalTicketSales / captureDays : 0
    const ticketRefundRate = totalTicketSales > 0 ? ticketRefunds / totalTicketSales : 0
    const ticketRevenue = totalTicketSales * ticketTicket
    const ticketRoas = trafficInvestment > 0 ? ticketRevenue / trafficInvestment : 0

    const bumpConversion = totalTicketSales > 0 ? bumpSales / totalTicketSales : 0
    const bumpRefundRate = bumpSales > 0 ? bumpRefunds / bumpSales : 0
    const bumpRevenue = bumpSales * bumpTicket

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
      conversaoBump: calc.bumpConversion * 100,
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
        ticket_ticket: parsePtBrNumber(form.ticket_ticket),
        traffic_investment: calc.trafficInvestment,
        total_ticket_sales: calc.totalTicketSales,
        ticket_refunds: parsePtBrNumber(form.ticket_refunds),
        bump_ticket: parsePtBrNumber(form.bump_ticket),
        bump_sales: calc.bumpSales,
        bump_refunds: parsePtBrNumber(form.bump_refunds),
        api_official_cost: parsePtBrNumber(form.api_official_cost),
        commercial_commission: parsePtBrNumber(form.commercial_commission),
        revenue_tax_rate: parsePtBrNumber(form.revenue_tax_rate),
        traffic_tax_rate: parsePtBrNumber(form.traffic_tax_rate),
        students_in_challenge:
          form.students_in_challenge !== ''
            ? parsePtBrNumber(form.students_in_challenge) || form.students_in_challenge
            : '',
        debriefing: form.debriefing || '',
        daily_data: form.daily_data,
        class_sessions: form.class_sessions,
        commercial_sales: form.commercial_sales,
        upsell_platform: {
          ...form.upsell_platform,
          total_sales: upsellCalc.calculatedTotalSales,
          card_pix_sales: upsellCalc.calculatedCardPixSales,
          boleto_3x_sales: upsellCalc.calculatedBoletoSales,
        },
      }

      const savedRec = await paidLaunchesService.save(form.id, payload)
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
        <div className="flex items-center gap-2 bg-white border border-slate-200/90 shadow-sm p-1.5 rounded-2xl">
          <Calendar className="w-4 h-4 text-[#6D49F2] ml-2 shrink-0" />
          <span className="text-xs font-semibold text-slate-600 shrink-0">Lançamento:</span>
          <Select value={selectedLaunchId} onValueChange={handleSelectLaunch}>
            <SelectTrigger className="w-[180px] sm:w-[220px] h-8 bg-slate-50/80 border-slate-200 text-slate-900 font-bold text-xs focus:ring-[#6D49F2] rounded-xl truncate">
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

      {loading ? (
        <Card className="bg-white border-slate-200/90 shadow-sm rounded-2xl p-16 flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-[#6D49F2]" />
          <p className="text-sm text-slate-500 font-medium">Carregando dados do lançamento...</p>
        </Card>
      ) : (
        <Tabs defaultValue="consolidado" className="w-full">
          {/* Pills-style tab bar in MQT palette */}
          <TabsList className="bg-white border border-slate-200/90 shadow-sm rounded-2xl p-1.5 h-auto flex flex-col sm:flex-row w-full sm:w-fit gap-1">
            <TabsTrigger
              value="consolidado"
              className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#6D49F2] data-[state=active]:to-[#FF2AFF] data-[state=active]:text-white data-[state=active]:shadow-xs text-xs font-bold px-4 py-2 text-slate-600"
            >
              Resultado Consolidado
            </TabsTrigger>
            <TabsTrigger
              value="ingressos"
              className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#6D49F2] data-[state=active]:to-[#FF2AFF] data-[state=active]:text-white data-[state=active]:shadow-xs text-xs font-bold px-4 py-2 text-slate-600"
            >
              Venda de Ingressos
            </TabsTrigger>
            <TabsTrigger
              value="upsell"
              className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#6D49F2] data-[state=active]:to-[#FF2AFF] data-[state=active]:text-white data-[state=active]:shadow-xs text-xs font-bold px-4 py-2 text-slate-600"
            >
              Venda Plataforma
            </TabsTrigger>
            <TabsTrigger
              value="aulas"
              className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#6D49F2] data-[state=active]:to-[#FF2AFF] data-[state=active]:text-white data-[state=active]:shadow-xs text-xs font-bold px-4 py-2 text-slate-600"
            >
              Controle Aulas
            </TabsTrigger>
            <TabsTrigger
              value="comercial"
              className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#6D49F2] data-[state=active]:to-[#FF2AFF] data-[state=active]:text-white data-[state=active]:shadow-xs text-xs font-bold px-4 py-2 text-slate-600"
            >
              Vendas Comercial
            </TabsTrigger>
          </TabsList>

          {/* ============ TAB: RESULTADO CONSOLIDADO ============ */}
          <TabsContent value="consolidado" className="mt-6 focus:outline-none">
            <ConsolidatedResultTab
              apiOfficialCost={form.api_official_cost}
              commercialCommission={form.commercial_commission}
              revenueTaxRate={form.revenue_tax_rate}
              trafficTaxRate={form.traffic_tax_rate}
              trafficInvestment={calc.trafficInvestment}
              ingressosRevenue={calc.ticketRevenue}
              orderBumpRevenue={calc.bumpRevenue}
              upsellPlatformRevenue={upsellCalc.platformRevenue}
              debriefing={form.debriefing}
              onChangeField={(field, val) => handleChange(field, val)}
              onSave={handleSave}
              saving={saving}
              launchBatch={form.batch}
              launchId={form.id}
            />
          </TabsContent>

          {/* ============ TAB 1: VENDA DE INGRESSOS ============ */}
          <TabsContent value="ingressos" className="mt-6 space-y-6 focus:outline-none">
            <div className="space-y-4">
              {/* Row 1: Faturamento Total, Investimento Tráfego, ROAS Geral */}
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
                  iconBgColor="bg-slate-100 text-[#6D49F2] border-slate-200"
                />
              </div>

              {/* Row 2: Saldo da Captação, Total Ingressos, Conversão Order Bump */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KpiCard
                  title="Saldo da Captação"
                  value={dashboardKpis.saldoCaptacao}
                  formatType="currency"
                  icon={DollarSign}
                  subtext="Faturamento - Investimento"
                  iconBgColor={
                    dashboardKpis.saldoCaptacao >= 0
                      ? 'bg-slate-100 text-[#6D49F2] border-slate-200'
                      : 'bg-rose-50 text-rose-600 border-rose-200'
                  }
                />

                <KpiCard
                  title="Total Ingressos"
                  value={dashboardKpis.totalIngressos}
                  formatType="raw"
                  icon={Ticket}
                  subtext="Vendas totais de ingresso"
                  iconBgColor="bg-slate-100 text-[#6D49F2] border-slate-200"
                />

                <KpiCard
                  title="Conv. Order Bump"
                  value={dashboardKpis.conversaoBump}
                  formatType="percent"
                  decimals={2}
                  icon={Percent}
                  subtext="Bumps / Ingressos Totais"
                  iconBgColor="bg-slate-100 text-[#6D49F2] border-slate-200"
                />
              </div>
            </div>

            <div className="w-full space-y-6">
              {/* CHART: Vendas Diárias × Conversão Order Bump */}
              <DailySalesChart
                days={dailyCalculated.days.map((d) => ({
                  dayLabel: d.dayLabel,
                  ticketSales: d.ticketSales,
                  bumpConversion: d.bumpConversion,
                }))}
              />

              {/* ACOMPANHAMENTO DIÁRIO */}
              <Card className="bg-white border-slate-200/90 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="p-5 pb-3 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-[#6D49F2]" />
                      Acompanhamento Diário - Vendas da Semana
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500 mt-0.5">
                      Preencha Investimento, Vendas Ingresso e Order Bump por dia
                    </CardDescription>
                  </div>
                </CardHeader>

                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table className="min-w-[760px]">
                      <TableHeader className="bg-slate-50/80">
                        <TableRow className="hover:bg-transparent border-b border-slate-200">
                          <TableHead className="py-2.5 px-3 text-left font-bold text-slate-800 bg-slate-100/80 w-48 text-xs">
                            Venda Ingressos
                          </TableHead>
                          {form.daily_data.map((day, idx) => (
                            <TableHead
                              key={idx}
                              className="py-2 px-2.5 text-center font-bold text-slate-800 bg-slate-50 border-l border-slate-200 min-w-[100px] text-xs"
                            >
                              <div className="flex items-center justify-center gap-1">
                                <input
                                  type="text"
                                  value={day.dayLabel || ''}
                                  onChange={(e) =>
                                    handleDailyChange(idx, 'dayLabel', e.target.value)
                                  }
                                  className="w-10 text-center font-bold text-slate-900 bg-transparent border-b border-dashed border-slate-400 focus:outline-none focus:border-[#6D49F2] text-xs"
                                  placeholder="Dia"
                                />
                              </div>
                              <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                                <input
                                  type="text"
                                  value={day.dateLabel || ''}
                                  onChange={(e) =>
                                    handleDailyChange(idx, 'dateLabel', e.target.value)
                                  }
                                  className="w-12 text-center text-slate-600 bg-transparent border-b border-dashed border-slate-200 focus:outline-none focus:border-[#6D49F2] text-[11px]"
                                  placeholder="Data"
                                />
                              </div>
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>

                      <TableBody>
                        {/* Investimento */}
                        <TableRow className="hover:bg-slate-50/50 transition-colors border-b border-slate-100">
                          <TableCell className="py-2.5 px-3 font-medium text-xs text-slate-700">
                            Investimento
                          </TableCell>
                          {form.daily_data.map((day, idx) => (
                            <TableCell
                              key={idx}
                              className="py-2 px-2.5 border-l border-slate-100 text-center text-xs"
                            >
                              <div className="relative">
                                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">
                                  R$
                                </span>
                                <Input
                                  type="text"
                                  inputMode="decimal"
                                  placeholder="0,00"
                                  value={
                                    day.investment === '' ||
                                    day.investment === undefined ||
                                    day.investment === null
                                      ? ''
                                      : String(day.investment)
                                  }
                                  onChange={(e) =>
                                    handleDailyChange(
                                      idx,
                                      'investment',
                                      e.target.value.replace(/[^0-9.,]/g, ''),
                                    )
                                  }
                                  onBlur={() => {
                                    if (
                                      day.investment !== '' &&
                                      day.investment !== undefined &&
                                      day.investment !== null
                                    ) {
                                      const parsed = parsePtBrNumber(day.investment)
                                      if (parsed > 0) {
                                        handleDailyChange(
                                          idx,
                                          'investment',
                                          formatNumber(parsed, 2),
                                        )
                                      }
                                    }
                                  }}
                                  className="pl-6 h-8 text-center font-semibold text-slate-900 text-xs bg-white border-slate-200 focus-visible:ring-[#6D49F2] shadow-2xs tabular-nums"
                                />
                              </div>
                            </TableCell>
                          ))}
                        </TableRow>

                        {/* Vendas Ingresso */}
                        <TableRow className="hover:bg-slate-50/50 transition-colors border-b border-slate-100">
                          <TableCell className="py-2.5 px-3 font-medium text-xs text-slate-700">
                            Vendas Ingresso
                          </TableCell>
                          {form.daily_data.map((day, idx) => (
                            <TableCell
                              key={idx}
                              className="py-2 px-2.5 border-l border-slate-100 text-center text-xs"
                            >
                              <Input
                                type="text"
                                inputMode="numeric"
                                placeholder="0"
                                value={
                                  day.ticket_sales === '' ||
                                  day.ticket_sales === undefined ||
                                  day.ticket_sales === null
                                    ? ''
                                    : String(day.ticket_sales)
                                }
                                onChange={(e) =>
                                  handleDailyChange(
                                    idx,
                                    'ticket_sales',
                                    e.target.value.replace(/[^0-9.,]/g, ''),
                                  )
                                }
                                onBlur={() => {
                                  if (
                                    day.ticket_sales !== '' &&
                                    day.ticket_sales !== undefined &&
                                    day.ticket_sales !== null
                                  ) {
                                    const parsed = parsePtBrNumber(day.ticket_sales)
                                    if (parsed > 0) {
                                      handleDailyChange(
                                        idx,
                                        'ticket_sales',
                                        formatNumber(parsed, 0),
                                      )
                                    }
                                  }
                                }}
                                className="h-8 text-center font-semibold text-slate-900 text-xs bg-white border-slate-200 focus-visible:ring-[#6D49F2] shadow-2xs tabular-nums"
                              />
                            </TableCell>
                          ))}
                        </TableRow>

                        {/* Faturamento Ingresso */}
                        <TableRow className="bg-emerald-50/80 font-bold border-b border-emerald-100 hover:bg-emerald-50">
                          <TableCell className="py-2.5 px-3 text-xs text-emerald-950 font-bold">
                            Faturamento Ingresso
                          </TableCell>
                          {dailyCalculated.days.map((dayCalc, idx) => (
                            <TableCell
                              key={idx}
                              className="py-2.5 px-3 border-l border-emerald-100 text-center tabular-nums text-emerald-950 font-bold text-xs"
                            >
                              {formatCurrency(dayCalc.ticketRevenue)}
                            </TableCell>
                          ))}
                        </TableRow>

                        {/* Vendas Order Bump */}
                        <TableRow className="hover:bg-slate-50/50 transition-colors border-b border-slate-100">
                          <TableCell className="py-2.5 px-3 font-medium text-xs text-slate-700">
                            Vendas Order Bump
                          </TableCell>
                          {form.daily_data.map((day, idx) => (
                            <TableCell
                              key={idx}
                              className="py-2 px-2.5 border-l border-slate-100 text-center text-xs"
                            >
                              <Input
                                type="text"
                                inputMode="numeric"
                                placeholder="0"
                                value={
                                  day.bump_sales === '' ||
                                  day.bump_sales === undefined ||
                                  day.bump_sales === null
                                    ? ''
                                    : String(day.bump_sales)
                                }
                                onChange={(e) =>
                                  handleDailyChange(
                                    idx,
                                    'bump_sales',
                                    e.target.value.replace(/[^0-9.,]/g, ''),
                                  )
                                }
                                onBlur={() => {
                                  if (
                                    day.bump_sales !== '' &&
                                    day.bump_sales !== undefined &&
                                    day.bump_sales !== null
                                  ) {
                                    const parsed = parsePtBrNumber(day.bump_sales)
                                    if (parsed > 0) {
                                      handleDailyChange(idx, 'bump_sales', formatNumber(parsed, 0))
                                    }
                                  }
                                }}
                                className="h-8 text-center font-semibold text-slate-900 text-xs bg-white border-slate-200 focus-visible:ring-[#6D49F2] shadow-2xs tabular-nums"
                              />
                            </TableCell>
                          ))}
                        </TableRow>

                        {/* % Conversão Order Bump */}
                        <TableRow className="bg-amber-50/70 hover:bg-amber-50 transition-colors border-b border-amber-100">
                          <TableCell className="py-2.5 px-3 font-medium text-xs text-amber-950">
                            % Conversão Order Bump
                          </TableCell>
                          {dailyCalculated.days.map((dayCalc, idx) => (
                            <TableCell
                              key={idx}
                              className="py-2.5 px-3 border-l border-amber-100 text-center tabular-nums text-amber-950 font-semibold text-xs"
                            >
                              {formatPercent(dayCalc.bumpConversion)}
                            </TableCell>
                          ))}
                        </TableRow>

                        {/* Faturamento Order Bump */}
                        <TableRow className="hover:bg-slate-50/50 transition-colors border-b border-slate-100">
                          <TableCell className="py-2.5 px-3 font-medium text-xs text-slate-700">
                            Faturamento Order Bump
                          </TableCell>
                          {dailyCalculated.days.map((dayCalc, idx) => (
                            <TableCell
                              key={idx}
                              className="py-2.5 px-3 border-l border-slate-100 text-center tabular-nums text-slate-700 font-medium text-xs"
                            >
                              {formatCurrency(dayCalc.bumpRevenue)}
                            </TableCell>
                          ))}
                        </TableRow>

                        {/* Faturamento Total */}
                        <TableRow className="bg-emerald-50 font-bold text-emerald-950 border-b border-emerald-200 hover:bg-emerald-50">
                          <TableCell className="py-2.5 px-3 text-xs text-emerald-950 font-bold">
                            Faturamento Total
                          </TableCell>
                          {dailyCalculated.days.map((dayCalc, idx) => (
                            <TableCell
                              key={idx}
                              className="py-2.5 px-3 border-l border-emerald-200 text-center tabular-nums text-emerald-950 font-extrabold text-xs"
                            >
                              {formatCurrency(dayCalc.totalRevenue)}
                            </TableCell>
                          ))}
                        </TableRow>

                        {/* Saldo Diário */}
                        <TableRow className="bg-slate-50/90 font-bold text-slate-900 border-b border-slate-200 hover:bg-slate-50">
                          <TableCell className="py-2.5 px-3 text-xs text-slate-900 font-bold">
                            Saldo Diário
                          </TableCell>
                          {dailyCalculated.days.map((dayCalc, idx) => (
                            <TableCell
                              key={idx}
                              className={`py-2.5 px-3 border-l border-slate-200 text-center tabular-nums text-xs ${
                                dayCalc.dailyBalance < 0
                                  ? 'text-rose-600 font-extrabold'
                                  : 'text-slate-900 font-bold'
                              }`}
                            >
                              {formatCurrency(dayCalc.dailyBalance)}
                            </TableCell>
                          ))}
                        </TableRow>

                        {/* Ticket Médio */}
                        <TableRow className="bg-slate-50/90 font-bold text-slate-900 border-b border-slate-200 hover:bg-slate-50">
                          <TableCell className="py-2.5 px-3 text-xs text-slate-900 font-bold">
                            Ticket Médio
                          </TableCell>
                          {dailyCalculated.days.map((dayCalc, idx) => (
                            <TableCell
                              key={idx}
                              className="py-2.5 px-3 border-l border-slate-200 text-center tabular-nums text-slate-900 font-bold text-xs"
                            >
                              {formatCalculatedNumber(dayCalc.averageTicket, 2)}
                            </TableCell>
                          ))}
                        </TableRow>

                        {/* CAC */}
                        <TableRow className="bg-slate-50/90 font-bold text-slate-900 border-b border-slate-200 hover:bg-slate-50">
                          <TableCell className="py-2.5 px-3 text-xs text-slate-900 font-bold">
                            CAC
                          </TableCell>
                          {dailyCalculated.days.map((dayCalc, idx) => (
                            <TableCell
                              key={idx}
                              className="py-2.5 px-3 border-l border-slate-200 text-center tabular-nums text-slate-900 font-bold text-xs"
                            >
                              {formatCalculatedNumber(dayCalc.cac, 2)}
                            </TableCell>
                          ))}
                        </TableRow>

                        {/* ROAS */}
                        <TableRow className="bg-amber-50 font-bold text-amber-950 border-b border-amber-200 hover:bg-amber-50">
                          <TableCell className="py-2.5 px-3 text-xs text-amber-950 font-bold">
                            ROAS
                          </TableCell>
                          {dailyCalculated.days.map((dayCalc, idx) => (
                            <TableCell
                              key={idx}
                              className="py-2.5 px-3 border-l border-amber-200 text-center tabular-nums text-amber-950 font-extrabold text-xs"
                            >
                              {formatCalculatedNumber(dayCalc.roas, 2)}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* BLOCK 1: VENDA DE INGRESSOS */}
              <Card className="bg-white border-slate-200/90 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="p-5 pb-3 border-b border-slate-100">
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Ticket className="w-4 h-4 text-[#6D49F2]" />
                    Venda de Ingressos
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    Métricas de captação e venda de ingressos do lançamento
                  </CardDescription>
                </CardHeader>

                <div className="p-4 sm:p-6 space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-2 bg-slate-50/80 px-3 rounded-lg border border-slate-200/70">
                    <span className="font-bold text-xs text-slate-700 flex items-center gap-1.5">
                      <Lock className="w-3 h-3 text-slate-400" />
                      Dias Captação (calculado)
                    </span>
                    <div className="text-right font-bold tabular-nums text-xs text-[#6D49F2]">
                      {calc.captureDays} {calc.captureDays === 1 ? 'dia' : 'dias'}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-1.5 border-b border-slate-100">
                    <span className="font-medium text-xs text-slate-700">Turma</span>
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder='ex: "S1 - 23/08/2026"'
                        value={form.batch}
                        onChange={(e) => handleChange('batch', e.target.value)}
                        className="bg-white border-slate-200 text-slate-900 font-bold text-xs h-8 rounded-lg focus-visible:ring-[#6D49F2] shadow-2xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-1.5 border-b border-slate-100">
                    <span className="font-medium text-xs text-slate-700">Ticket Ingresso</span>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-medium pointer-events-none">
                        R$
                      </span>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="0,00"
                        value={
                          form.ticket_ticket === '' ||
                          form.ticket_ticket === undefined ||
                          form.ticket_ticket === null
                            ? ''
                            : String(form.ticket_ticket)
                        }
                        onChange={(e) =>
                          handleChange('ticket_ticket', e.target.value.replace(/[^0-9.,]/g, ''))
                        }
                        onBlur={() => {
                          if (
                            form.ticket_ticket !== '' &&
                            form.ticket_ticket !== undefined &&
                            form.ticket_ticket !== null
                          ) {
                            const parsed = parsePtBrNumber(form.ticket_ticket)
                            if (parsed > 0) {
                              handleChange('ticket_ticket', formatNumber(parsed, 2))
                            }
                          }
                        }}
                        className="pl-7 bg-white border-slate-200 text-slate-900 font-semibold tabular-nums text-xs h-8 rounded-lg focus-visible:ring-[#6D49F2] shadow-2xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-2 bg-slate-50/80 px-3 rounded-lg border border-slate-200/70">
                    <span className="font-medium text-xs text-slate-700 flex items-center gap-1.5">
                      <Lock className="w-3 h-3 text-slate-400" />
                      Investimento Tráfego (soma dos dias)
                    </span>
                    <div className="text-right font-bold tabular-nums text-xs text-slate-900">
                      {formatCurrency(calc.trafficInvestment)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-2 bg-slate-50/80 px-3 rounded-lg border border-slate-200/70">
                    <span className="font-medium text-xs text-slate-500">Tráfego Diário</span>
                    <div className="text-right font-bold tabular-nums text-xs text-slate-700">
                      {formatCalculatedCurrency(calc.dailyTraffic)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-2 bg-slate-50/80 px-3 rounded-lg border border-slate-200/70">
                    <span className="font-medium text-xs text-slate-500">CAC</span>
                    <div className="text-right font-bold tabular-nums text-xs text-slate-700">
                      {formatCalculatedCurrency(calc.cac)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-2 bg-slate-50/80 px-3 rounded-lg border border-slate-200/70">
                    <span className="font-medium text-xs text-slate-700 flex items-center gap-1.5">
                      <Lock className="w-3 h-3 text-slate-400" />
                      Vendas Totais Ingresso (soma dos dias)
                    </span>
                    <div className="text-right font-bold tabular-nums text-xs text-slate-900">
                      {calc.totalTicketSales}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-2 bg-slate-100/80 px-3 rounded-lg border border-slate-200">
                    <span className="font-bold text-xs text-slate-900">
                      Média Vendas / Dia Ingresso
                    </span>
                    <div className="text-center sm:text-right font-bold tabular-nums text-xs text-slate-900">
                      {formatCalculatedNumber(calc.avgSalesPerDay, 0)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-1.5 border-b border-slate-100">
                    <span className="font-medium text-xs text-slate-700">Reembolso</span>
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={
                        form.ticket_refunds === '' ||
                        form.ticket_refunds === undefined ||
                        form.ticket_refunds === null
                          ? ''
                          : String(form.ticket_refunds)
                      }
                      onChange={(e) =>
                        handleChange('ticket_refunds', e.target.value.replace(/[^0-9.,]/g, ''))
                      }
                      onBlur={() => {
                        if (
                          form.ticket_refunds !== '' &&
                          form.ticket_refunds !== undefined &&
                          form.ticket_refunds !== null
                        ) {
                          const parsed = parsePtBrNumber(form.ticket_refunds)
                          if (parsed > 0) {
                            handleChange('ticket_refunds', formatNumber(parsed, 0))
                          }
                        }
                      }}
                      className="bg-white border-slate-200 text-slate-900 font-semibold tabular-nums text-center text-xs h-8 rounded-lg focus-visible:ring-[#6D49F2] shadow-2xs"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-2 bg-slate-50/80 px-3 rounded-lg border border-slate-200/70">
                    <span className="font-medium text-xs text-slate-500">Taxa Reembolso</span>
                    <div className="text-right font-bold tabular-nums text-xs text-slate-700">
                      {formatCalculatedPercent(calc.ticketRefundRate)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-2 bg-emerald-50 px-3 rounded-lg border border-emerald-200">
                    <span className="font-bold text-xs text-emerald-950">
                      Faturamento Ingressos
                    </span>
                    <div className="text-right font-extrabold tabular-nums text-xs text-emerald-950">
                      {formatCurrency(calc.ticketRevenue)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-2 bg-amber-50 px-3 rounded-lg border border-amber-200">
                    <span className="font-bold text-xs text-amber-950">ROAS Venda Ingresso</span>
                    <div className="text-center sm:text-right font-extrabold tabular-nums text-xs text-amber-950">
                      {formatCalculatedNumber(calc.ticketRoas, 2)}
                    </div>
                  </div>
                </div>
              </Card>

              {/* BLOCK 2: ORDER BUMP */}
              <Card className="bg-white border-slate-200/90 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="p-5 pb-3 border-b border-slate-100">
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Percent className="w-4 h-4 text-[#FF2AFF]" />
                    Order Bump
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    Taxas de conversão e faturamento adicional de order bumps
                  </CardDescription>
                </CardHeader>

                <div className="p-4 sm:p-6 space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-2 bg-amber-50 px-3 rounded-lg border border-amber-200">
                    <span className="font-bold text-xs text-amber-950">% Conversão Order Bump</span>
                    <div className="text-right font-extrabold tabular-nums text-xs text-amber-950">
                      {formatCalculatedPercent(calc.bumpConversion)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-1.5 border-b border-slate-100">
                    <span className="font-medium text-xs text-slate-700">Ticket Order Bump</span>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-medium pointer-events-none">
                        R$
                      </span>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="0,00"
                        value={
                          form.bump_ticket === '' ||
                          form.bump_ticket === undefined ||
                          form.bump_ticket === null
                            ? ''
                            : String(form.bump_ticket)
                        }
                        onChange={(e) =>
                          handleChange('bump_ticket', e.target.value.replace(/[^0-9.,]/g, ''))
                        }
                        onBlur={() => {
                          if (
                            form.bump_ticket !== '' &&
                            form.bump_ticket !== undefined &&
                            form.bump_ticket !== null
                          ) {
                            const parsed = parsePtBrNumber(form.bump_ticket)
                            if (parsed > 0) {
                              handleChange('bump_ticket', formatNumber(parsed, 2))
                            }
                          }
                        }}
                        className="pl-7 bg-white border-slate-200 text-slate-900 font-semibold tabular-nums text-xs h-8 rounded-lg focus-visible:ring-[#6D49F2] shadow-2xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-2 bg-slate-50/80 px-3 rounded-lg border border-slate-200/70">
                    <span className="font-medium text-xs text-slate-700 flex items-center gap-1.5">
                      <Lock className="w-3 h-3 text-slate-400" />
                      Vendas Order Bump (soma dos dias)
                    </span>
                    <div className="text-right font-bold tabular-nums text-xs text-slate-900">
                      {calc.bumpSales}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-1.5 border-b border-slate-100">
                    <span className="font-medium text-xs text-slate-700">Reembolso</span>
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={
                        form.bump_refunds === '' ||
                        form.bump_refunds === undefined ||
                        form.bump_refunds === null
                          ? ''
                          : String(form.bump_refunds)
                      }
                      onChange={(e) =>
                        handleChange('bump_refunds', e.target.value.replace(/[^0-9.,]/g, ''))
                      }
                      onBlur={() => {
                        if (
                          form.bump_refunds !== '' &&
                          form.bump_refunds !== undefined &&
                          form.bump_refunds !== null
                        ) {
                          const parsed = parsePtBrNumber(form.bump_refunds)
                          if (parsed > 0) {
                            handleChange('bump_refunds', formatNumber(parsed, 0))
                          }
                        }
                      }}
                      className="bg-white border-slate-200 text-slate-900 font-semibold tabular-nums text-center text-xs h-8 rounded-lg focus-visible:ring-[#6D49F2] shadow-2xs"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-2 bg-slate-50/80 px-3 rounded-lg border border-slate-200/70">
                    <span className="font-medium text-xs text-slate-500">Taxa Reembolso</span>
                    <div className="text-right font-bold tabular-nums text-xs text-slate-700">
                      {formatCalculatedPercent(calc.bumpRefundRate)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-2 bg-slate-100/80 px-3 rounded-lg border border-slate-200">
                    <span className="font-bold text-xs text-slate-700">Faturamento Order Bump</span>
                    <div className="text-right font-bold tabular-nums text-xs text-slate-900">
                      {formatCurrency(calc.bumpRevenue)}
                    </div>
                  </div>
                </div>
              </Card>

              {/* BLOCK 3: RESULTADO INGRESSOS + ORDER BUMPS */}
              <Card className="bg-white border-slate-200/90 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="p-5 pb-3 border-b border-slate-100">
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#6D49F2]" />
                    Resultado Ingressos + Order Bumps
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    Consolidação de faturamento, saldo e retorno da captação
                  </CardDescription>
                </CardHeader>

                <div className="p-4 sm:p-6 space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-2 bg-emerald-50 px-3 rounded-lg border border-emerald-200">
                    <span className="font-bold text-xs text-emerald-950">Faturamento Total</span>
                    <div className="text-right font-extrabold tabular-nums text-xs text-emerald-950">
                      {formatCurrency(calc.totalRevenue)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-2 bg-slate-100/80 px-3 rounded-lg border border-slate-200">
                    <span className="font-bold text-xs text-slate-900">Ticket Médio</span>
                    <div className="text-center sm:text-right font-bold tabular-nums text-xs text-slate-900">
                      {formatCalculatedCurrency(calc.averageTicket)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-2 bg-slate-100/80 px-3 rounded-lg border border-slate-200">
                    <span className="font-bold text-xs text-slate-900">Saldo da Captação</span>
                    <div
                      className={`text-center sm:text-right font-bold tabular-nums text-xs ${
                        calc.captureBalance >= 0 ? 'text-[#FF2AFF]' : 'text-rose-600'
                      }`}
                    >
                      {formatCurrency(calc.captureBalance)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-2 bg-amber-50 px-3 rounded-lg border border-amber-200">
                    <span className="font-bold text-xs text-amber-950">ROAS</span>
                    <div className="text-center sm:text-right font-extrabold tabular-nums text-xs text-amber-950">
                      {formatCalculatedNumber(calc.overallRoas, 2)}
                    </div>
                  </div>
                </div>

                {/* Bottom Action Bar */}
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
          </TabsContent>

          {/* ============ TAB 2: UPSELL PLATAFORMA ============ */}
          <TabsContent value="upsell" className="mt-6 focus:outline-none">
            <UpsellPlatformTab
              upsellData={{
                ...form.upsell_platform,
                total_sales: upsellCalc.calculatedTotalSales,
                card_pix_sales: upsellCalc.calculatedCardPixSales,
                boleto_3x_sales: upsellCalc.calculatedBoletoSales,
              }}
              onChangeField={handleUpsellChange}
              onChangeDailyField={handleUpsellDailyChange}
              dailySalesList={
                Array.isArray(form.upsell_platform?.daily_sales) &&
                form.upsell_platform.daily_sales.length > 0
                  ? form.upsell_platform.daily_sales
                  : DEFAULT_UPSELL_DAILY_SALES
              }
              upsellCalc={upsellCalc}
              onSave={handleSave}
              saving={saving}
              launchBatch={form.batch}
              launchId={form.id}
              totalTicketSales={dailyCalculated.totalTicketSales}
            />{' '}
          </TabsContent>

          {/* ============ TAB 3: CONTROLE AULAS ============ */}
          <TabsContent value="aulas" className="mt-6 focus:outline-none">
            <ControleAulasTab
              studentsInChallenge={dailyCalculated.totalTicketSales}
              sessions={
                Array.isArray(form.class_sessions) && form.class_sessions.length > 0
                  ? form.class_sessions
                  : DEFAULT_CLASS_SESSIONS
              }
              onChangeSession={handleSessionChange}
              onSave={handleSave}
              saving={saving}
            />
          </TabsContent>

          {/* ============ TAB 4: VENDAS COMERCIAL ============ */}
          <TabsContent value="comercial" className="mt-6 focus:outline-none">
            <VendasComercialTab
              commercialSales={
                Array.isArray(form.commercial_sales) && form.commercial_sales.length > 0
                  ? form.commercial_sales
                  : DEFAULT_FORM.commercial_sales
              }
              upsellPlatformRevenue={upsellCalc.platformRevenue}
              onChangeSales={(sales) => handleChange('commercial_sales', sales as any)}
              onSave={handleSave}
              saving={saving}
              launchBatch={form.batch}
              launchId={form.id}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
