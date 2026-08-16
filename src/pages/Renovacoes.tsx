import React, { useState, useEffect, useMemo } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import {
  RefreshCw,
  Save,
  Loader2,
  Check,
  Info,
  TrendingUp,
  Trash2,
  Users,
  Repeat,
  Percent,
  DollarSign,
} from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useRenewals } from '@/hooks/use-renewals'
import { toast } from '@/hooks/use-toast'
import {
  MONTH_NAMES_PT,
  MONTH_SHORT_NAMES_PT,
  formatCurrency,
  formatPercent,
  formatNumber,
  parsePtBrNumber,
} from '@/lib/financial-utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

/** Editable numeric fields kept as raw strings for the input. */
interface RowState {
  key: string
  id?: string
  monthIndex: number // 0-11
  studentsStr: string
  renewalsStr: string
  revenueStr: string
  // saved snapshot (numbers) for change detection
  saved: {
    students_to_renew: number
    renewals: number
    renewal_revenue: number
  }
  isSavingRow: boolean
}

const NUM_FIELDS = ['studentsStr', 'renewalsStr', 'revenueStr'] as const
type NumField = (typeof NUM_FIELDS)[number]

const num = (s: string): number => parsePtBrNumber(s)

const EMPTY_SAVED = {
  students_to_renew: 0,
  renewals: 0,
  renewal_revenue: 0,
}

/** Computed renewal rate (%) — null when students = 0 (division by zero). */
const renewalRate = (students: number, renewals: number): number | null => {
  if (!students || students <= 0) return null
  return (renewals / students) * 100
}

/** Small R$ prefixed input used across the editable currency cells. */
const CurrencyCell: React.FC<{
  value: string
  onChange: (v: string) => void
  modified: boolean
}> = ({ value, onChange, modified }) => (
  <div className="relative">
    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-medium pointer-events-none">
      R$
    </span>
    <Input
      type="text"
      inputMode="decimal"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/[^0-9.,]/g, ''))}
      placeholder="0,00"
      className={`h-8 pl-7 pr-2 text-xs font-semibold tabular-nums text-slate-900 bg-white rounded-lg shadow-2xs ${
        modified
          ? 'border-amber-400 focus-visible:ring-amber-400'
          : 'border-slate-200 focus-visible:ring-[#6D49F2]'
      }`}
    />
  </div>
)

/** Plain numeric input (no R$ prefix) used for counts. */
const NumberCell: React.FC<{
  value: string
  onChange: (v: string) => void
  modified: boolean
}> = ({ value, onChange, modified }) => (
  <Input
    type="text"
    inputMode="numeric"
    value={value}
    onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ''))}
    placeholder="0"
    className={`h-8 px-2.5 text-xs font-semibold tabular-nums text-slate-900 bg-white rounded-lg shadow-2xs text-center ${
      modified
        ? 'border-amber-400 focus-visible:ring-amber-400'
        : 'border-slate-200 focus-visible:ring-[#6D49F2]'
    }`}
  />
)

/** Read-only computed cell — muted background, no input. */
const ReadOnlyCell: React.FC<{
  value: string
  className?: string
}> = ({ value, className = '' }) => (
  <div
    className={`h-8 flex items-center justify-end px-2.5 text-xs font-bold tabular-nums text-slate-700 bg-slate-100/80 border border-slate-200/70 rounded-lg ${className}`}
  >
    {value}
  </div>
)

export default function Renovacoes() {
  const { selectedYear, records, isLoading, save } = useRenewals()
  const [rows, setRows] = useState<RowState[]>([])

  // Build rows from records (12 months, gaps filled with empty).
  useEffect(() => {
    const map = new Map<number, (typeof records)[0]>()
    records.forEach((rec) => {
      const m = Number(rec.month)
      if (m >= 1 && m <= 12) map.set(m, rec)
    })

    const newRows: RowState[] = []
    for (let i = 0; i < 12; i++) {
      const rec = map.get(i + 1)
      const s = rec
        ? {
            students_to_renew: Number(rec.students_to_renew) || 0,
            renewals: Number(rec.renewals) || 0,
            renewal_revenue: Number(rec.renewal_revenue) || 0,
          }
        : { ...EMPTY_SAVED }

      const strNum = (n: number) => (n > 0 ? formatNumber(n, 0) : '')
      const strCur = (n: number) => (n > 0 ? formatCurrency(n).replace('R$', '').trim() : '')

      newRows.push({
        key: `r-${i}`,
        id: rec?.id,
        monthIndex: i,
        studentsStr: strNum(s.students_to_renew),
        renewalsStr: strNum(s.renewals),
        revenueStr: strCur(s.renewal_revenue),
        saved: s,
        isSavingRow: false,
      })
    }
    setRows(newRows)
  }, [records])

  const handleField = (key: string, field: NumField, val: string) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: val } : r)))
  }

  // Atomic clear + save: zeros every field of the row AND persists it
  // to the backend immediately, without needing a separate "Salvar" click.
  const handleClearAndSaveRow = async (row: RowState) => {
    const payload = {
      year: selectedYear,
      month: row.monthIndex + 1,
      students_to_renew: 0,
      renewals: 0,
      renewal_revenue: 0,
    }

    setRows((prev) =>
      prev.map((r) =>
        r.key === row.key
          ? {
              ...r,
              studentsStr: '',
              renewalsStr: '',
              revenueStr: '',
              isSavingRow: true,
            }
          : r,
      ),
    )
    try {
      await save(row.id, payload)
      setRows((prev) =>
        prev.map((r) =>
          r.key === row.key
            ? {
                ...r,
                isSavingRow: false,
                saved: { ...EMPTY_SAVED },
              }
            : r,
        ),
      )
      toast({
        title: 'Dados apagados',
        description: `Os dados de ${MONTH_NAMES_PT[row.monthIndex]}/${selectedYear} foram zerados e salvos automaticamente.`,
      })
    } catch (err: unknown) {
      console.error(err)
      toast({
        variant: 'destructive',
        title: 'Erro ao apagar dados',
        description: err instanceof Error ? err.message : 'Tente novamente.',
      })
      setRows((prev) => prev.map((r) => (r.key === row.key ? { ...r, isSavingRow: false } : r)))
    }
  }

  const isRowModified = (row: RowState): boolean => {
    const s = row.saved
    return (
      num(row.studentsStr) !== s.students_to_renew ||
      num(row.renewalsStr) !== s.renewals ||
      num(row.revenueStr) !== s.renewal_revenue
    )
  }

  const handleSaveRow = async (row: RowState) => {
    const payload = {
      year: selectedYear,
      month: row.monthIndex + 1,
      students_to_renew: num(row.studentsStr),
      renewals: num(row.renewalsStr),
      renewal_revenue: num(row.revenueStr),
    }

    setRows((prev) => prev.map((r) => (r.key === row.key ? { ...r, isSavingRow: true } : r)))
    try {
      await save(row.id, payload)
      const strNum = (n: number) => (n > 0 ? formatNumber(n, 0) : '')
      const strCur = (n: number) => (n > 0 ? formatCurrency(n).replace('R$', '').trim() : '')
      setRows((prev) =>
        prev.map((r) =>
          r.key === row.key
            ? {
                ...r,
                studentsStr: strNum(payload.students_to_renew),
                renewalsStr: strNum(payload.renewals),
                revenueStr: strCur(payload.renewal_revenue),
                isSavingRow: false,
                saved: {
                  students_to_renew: payload.students_to_renew,
                  renewals: payload.renewals,
                  renewal_revenue: payload.renewal_revenue,
                },
              }
            : r,
        ),
      )
      toast({
        title: 'Mês salvo com sucesso',
        description: `${MONTH_NAMES_PT[row.monthIndex]}/${selectedYear} atualizado.`,
      })
    } catch (err: unknown) {
      console.error(err)
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar mês',
        description: err instanceof Error ? err.message : 'Tente novamente.',
      })
      setRows((prev) => prev.map((r) => (r.key === row.key ? { ...r, isSavingRow: false } : r)))
    }
  }

  // Chart data
  const chartData = useMemo(
    () =>
      rows.map((row) => {
        const students = num(row.studentsStr)
        const renewals = num(row.renewalsStr)
        const revenue = num(row.revenueStr)
        return {
          name: MONTH_SHORT_NAMES_PT[row.monthIndex],
          monthLabel: `${MONTH_NAMES_PT[row.monthIndex]}/${selectedYear}`,
          faturamento: revenue,
          taxa: renewalRate(students, renewals),
        }
      }),
    [rows, selectedYear],
  )

  // Annual totals / KPIs
  const totals = useMemo(() => {
    let totalStudents = 0,
      totalRenewals = 0,
      totalRevenue = 0
    rows.forEach((row) => {
      totalStudents += num(row.studentsStr)
      totalRenewals += num(row.renewalsStr)
      totalRevenue += num(row.revenueStr)
    })
    const rate = totalStudents > 0 ? (totalRenewals / totalStudents) * 100 : null
    return { totalStudents, totalRenewals, totalRevenue, rate }
  }, [rows])

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <RefreshCw className="w-6 h-6 text-[#6D49F2]" />
            Renovações • {selectedYear}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Acompanhe alunas a renovar, renovações realizadas, taxa de renovação e faturamento de
            renovação mês a mês. A Taxa de Renovação é calculada automaticamente.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Alunas a Renovar */}
        <Card className="bg-white border-slate-200/90 shadow-sm rounded-2xl overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Alunas a Renovar
              </span>
              <div className="p-2 rounded-xl border bg-[#6D49F2]/10 text-[#6D49F2] border-[#6D49F2]/20 shrink-0">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="my-1">
              <div className="text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
                {formatNumber(totals.totalStudents, 0)}
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 min-h-[32px] flex flex-col justify-center">
              <div className="text-xs text-slate-500 truncate">Soma do ano de {selectedYear}</div>
            </div>
          </CardContent>
        </Card>

        {/* Renovações */}
        <Card className="bg-white border-slate-200/90 shadow-sm rounded-2xl overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Renovações
              </span>
              <div className="p-2 rounded-xl border bg-[#FF2AFF]/10 text-[#FF2AFF] border-[#FF2AFF]/20 shrink-0">
                <Repeat className="w-4 h-4" />
              </div>
            </div>
            <div className="my-1">
              <div className="text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
                {formatNumber(totals.totalRenewals, 0)}
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 min-h-[32px] flex flex-col justify-center">
              <div className="text-xs text-slate-500 truncate">Soma do ano de {selectedYear}</div>
            </div>
          </CardContent>
        </Card>

        {/* % Taxa de Renovação */}
        <Card className="bg-white border-slate-200/90 shadow-sm rounded-2xl overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                % Taxa de Renovação
              </span>
              <div className="p-2 rounded-xl border bg-[#6D49F2]/10 text-[#6D49F2] border-[#6D49F2]/20 shrink-0">
                <Percent className="w-4 h-4" />
              </div>
            </div>
            <div className="my-1">
              <div className="text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
                {formatPercent(totals.rate, 1)}
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 min-h-[32px] flex flex-col justify-center">
              <div className="text-xs text-slate-500 truncate">
                Média anual (renovações ÷ alunas)
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Faturamento Renovação */}
        <Card className="bg-white border-slate-200/90 shadow-sm rounded-2xl overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Faturamento Renovação
              </span>
              <div className="p-2 rounded-xl border bg-[#FF2AFF]/10 text-[#FF2AFF] border-[#FF2AFF]/20 shrink-0">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="my-1">
              <div className="text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
                {formatCurrency(totals.totalRevenue)}
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 min-h-[32px] flex flex-col justify-center">
              <div className="text-xs text-slate-500 truncate">Soma do ano de {selectedYear}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="bg-white border-slate-200/90 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="p-5 pb-2">
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#6D49F2]" />
            Faturamento de Renovação e Taxa de Renovação
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 mt-0.5">
            Visão mensal de {selectedYear} — barras para o faturamento (R$) e linha tracejada para a
            taxa de renovação (%).
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-2">
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                />
                <YAxis
                  yAxisId="left"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  tickFormatter={(val) => `R$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 100]}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  tickFormatter={(val) => `${val}%`}
                />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    if (name === 'taxa') {
                      return [formatPercent(value, 1), 'Taxa de Renovação']
                    }
                    return [formatCurrency(value), 'Faturamento Renovação']
                  }}
                  labelFormatter={(_, items) => items?.[0]?.payload?.monthLabel || ''}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '12px',
                    color: '#f8fafc',
                    fontSize: '12px',
                    border: 'none',
                  }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  height={30}
                  iconSize={8}
                  wrapperStyle={{ fontSize: '11px', color: '#64748b' }}
                  formatter={(value) =>
                    value === 'taxa' ? 'Taxa de Renovação (%)' : 'Faturamento Renovação (R$)'
                  }
                />
                <Bar
                  yAxisId="left"
                  dataKey="faturamento"
                  name="faturamento"
                  fill="#6D49F2"
                  radius={[4, 4, 0, 0]}
                  animationDuration={600}
                  barSize={28}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="taxa"
                  name="taxa"
                  stroke="#FF2AFF"
                  strokeDasharray="6 4"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#FF2AFF' }}
                  activeDot={{ r: 5 }}
                  animationDuration={600}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Editable Table */}
      <Card className="bg-white border-slate-200/90 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="p-5 pb-3 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-[#6D49F2]" />
              Detalhamento Mensal ({selectedYear})
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Edite os campos e clique em &ldquo;Salvar&rdquo; por linha. A Taxa de Renovação é
              calculada automaticamente.
            </CardDescription>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-amber-500" />
              Alterado
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-[#6D49F2]/10 border border-[#6D49F2]/20 text-[#6D49F2] flex items-center justify-center">
                <Check className="w-3 h-3" />
              </span>
              Salvo
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-[900px]">
              <TableHeader className="bg-slate-50/80">
                <TableRow className="hover:bg-transparent border-b border-slate-200">
                  <TableHead className="font-semibold text-slate-700 text-xs py-3 px-3 min-w-[140px]">
                    Mês
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700 text-xs py-3 px-3 min-w-[140px] text-center">
                    Alunas a Renovar
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700 text-xs py-3 px-3 min-w-[120px] text-center">
                    Renovações
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs py-3 px-3 text-right min-w-[120px]">
                    Taxa de Renovação
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700 text-xs py-3 px-3 min-w-[150px]">
                    Faturamento Renovação (R$)
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700 text-xs py-3 px-3 text-center min-w-[120px]">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-slate-400 text-sm">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                      Carregando dados de renovação...
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => {
                    const students = num(row.studentsStr)
                    const renewals = num(row.renewalsStr)
                    const rate = renewalRate(students, renewals)
                    const modified = isRowModified(row)
                    return (
                      <TableRow
                        key={row.key}
                        className={`transition-colors border-b border-slate-100 ${
                          modified ? 'bg-amber-50/30' : 'hover:bg-slate-50/50'
                        }`}
                      >
                        {/* Mês (não editável) */}
                        <TableCell className="font-medium text-xs text-slate-900 py-2 px-3 capitalize">
                          {MONTH_NAMES_PT[row.monthIndex]}/{selectedYear}
                        </TableCell>

                        {/* Alunas a Renovar */}
                        <TableCell className="py-1.5 px-2">
                          <NumberCell
                            value={row.studentsStr}
                            onChange={(v) => handleField(row.key, 'studentsStr', v)}
                            modified={modified}
                          />
                        </TableCell>

                        {/* Renovações */}
                        <TableCell className="py-1.5 px-2">
                          <NumberCell
                            value={row.renewalsStr}
                            onChange={(v) => handleField(row.key, 'renewalsStr', v)}
                            modified={modified}
                          />
                        </TableCell>

                        {/* Taxa de Renovação (auto) */}
                        <TableCell className="py-2.5 px-3 text-right tabular-nums text-xs font-bold">
                          <span
                            className={
                              rate === null
                                ? 'text-slate-400'
                                : rate >= 80
                                  ? 'text-[#6D49F2]'
                                  : rate >= 60
                                    ? 'text-amber-600'
                                    : 'text-rose-600'
                            }
                          >
                            {rate === null ? '—' : formatPercent(rate, 1)}
                          </span>
                        </TableCell>

                        {/* Faturamento Renovação */}
                        <TableCell className="py-1.5 px-2">
                          <CurrencyCell
                            value={row.revenueStr}
                            onChange={(v) => handleField(row.key, 'revenueStr', v)}
                            modified={modified}
                          />
                        </TableCell>

                        {/* Ações */}
                        <TableCell className="py-2 px-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div title={modified ? 'Alterações não salvas' : 'Salvo'}>
                              {modified ? (
                                <span className="flex h-2.5 w-2.5 relative">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                                </span>
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-[#6D49F2]/10 border border-[#6D49F2]/20 text-[#6D49F2] flex items-center justify-center shadow-2xs">
                                  <Check className="w-3 h-3" />
                                </div>
                              )}
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              disabled={row.isSavingRow}
                              onClick={() => handleSaveRow(row)}
                              className={`h-7 px-2.5 text-xs font-medium rounded-lg transition-all ${
                                modified
                                  ? 'bg-gradient-to-r from-[#6D49F2] to-[#FF2AFF] hover:opacity-90 text-white shadow-xs'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              }`}
                            >
                              {row.isSavingRow ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <>
                                  <Save className="w-3 h-3 mr-1" />
                                  Salvar
                                </>
                              )}
                            </Button>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  disabled={row.isSavingRow}
                                  title="Limpar dados do mês"
                                  className="h-7 w-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200/80 transition-colors shrink-0"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="rounded-2xl">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Apagar dados de {MONTH_NAMES_PT[row.monthIndex]}?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta ação apagará permanentemente todos os dados daquele mês
                                    (Alunas a Renovar, Renovações e Faturamento Renovação),
                                    zerando-os e salvando automaticamente no banco. Não será
                                    possível desfazer.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="rounded-xl">
                                    Cancelar
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleClearAndSaveRow(row)}
                                    className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl"
                                  >
                                    Apagar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Explanatory footer */}
      <div className="bg-slate-100/80 border border-slate-200/90 rounded-2xl p-4 sm:p-5 flex items-start gap-3 text-xs text-slate-600">
        <Info className="w-4 h-4 text-[#6D49F2] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-slate-800">Regras de Cálculo Automático</p>
          <p>
            • <strong>Taxa de Renovação</strong> = Renovações ÷ Alunas a Renovar × 100 (1 casa
            decimal). Exibe &ldquo;—&rdquo; quando não há alunas a renovar (divisão por zero).
          </p>
          <p>
            • <strong>% Taxa de Renovação (card)</strong> = Total de Renovações ÷ Total de Alunas a
            Renovar × 100 (média anual ponderada).
          </p>
          <p>
            • <strong>Alunas a Renovar</strong> e <strong>Renovações</strong> são somadas ao longo
            do ano nos cards superiores.
          </p>
          <p>
            • <strong>Faturamento Renovação</strong> = soma anual dos valores informados por mês,
            formatada em R$.
          </p>
        </div>
      </div>
    </div>
  )
}
