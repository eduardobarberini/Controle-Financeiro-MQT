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
import { CalendarDays, Save, Loader2, Check, Info, TrendingUp, Trash2 } from 'lucide-react'
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
import { useMonthlyDetails } from '@/hooks/use-monthly-details'
import { toast } from '@/hooks/use-toast'
import {
  MONTH_NAMES_PT,
  MONTH_SHORT_NAMES_PT,
  formatCurrency,
  formatPercent,
  formatRoas,
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
  revenueStr: string
  investmentStr: string
  adsMetaStr: string
  taxMetaStr: string
  salesTaxStr: string
  salesCommissionStr: string
  otherVariableStr: string
  fixedCostsStr: string
  // saved snapshot (numbers) for change detection
  saved: {
    revenue: number
    investment: number
    ads_meta: number
    tax_meta: number
    sales_tax: number
    sales_commission: number
    other_variable_costs: number
    fixed_costs: number
  }
  isSavingRow: boolean
}

const NUM_FIELDS = [
  'revenueStr',
  'investmentStr',
  'adsMetaStr',
  'taxMetaStr',
  'salesTaxStr',
  'salesCommissionStr',
  'otherVariableStr',
  'fixedCostsStr',
] as const
type NumField = (typeof NUM_FIELDS)[number]

const num = (s: string): number => parseFloat(s.replace(',', '.')) || 0

const EMPTY_SAVED = {
  revenue: 0,
  investment: 0,
  ads_meta: 0,
  tax_meta: 0,
  sales_tax: 0,
  sales_commission: 0,
  other_variable_costs: 0,
  fixed_costs: 0,
}

/** Small R$ prefixed input used across the editable cells. */
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
      onChange={(e) => onChange(e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.'))}
      placeholder="0,00"
      className={`h-8 pl-7 pr-2 text-xs font-semibold tabular-nums text-slate-900 bg-white rounded-lg shadow-2xs ${
        modified
          ? 'border-amber-400 focus-visible:ring-amber-400'
          : 'border-slate-200 focus-visible:ring-emerald-500'
      }`}
    />
  </div>
)

export default function Mensal() {
  const { selectedYear, records, isLoading, save } = useMonthlyDetails()
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
            revenue: Number(rec.revenue) || 0,
            investment: Number(rec.investment) || 0,
            ads_meta: Number(rec.ads_meta) || 0,
            tax_meta: Number(rec.tax_meta) || 0,
            sales_tax: Number(rec.sales_tax) || 0,
            sales_commission: Number(rec.sales_commission) || 0,
            other_variable_costs: Number(rec.other_variable_costs) || 0,
            fixed_costs: Number(rec.fixed_costs) || 0,
          }
        : { ...EMPTY_SAVED }

      const str = (n: number) => (n > 0 ? String(n) : '')

      newRows.push({
        key: `m-${i}`,
        id: rec?.id,
        monthIndex: i,
        revenueStr: str(s.revenue),
        investmentStr: str(s.investment),
        adsMetaStr: str(s.ads_meta),
        taxMetaStr: str(s.tax_meta),
        salesTaxStr: str(s.sales_tax),
        salesCommissionStr: str(s.sales_commission),
        otherVariableStr: str(s.other_variable_costs),
        fixedCostsStr: str(s.fixed_costs),
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
      revenue: 0,
      investment: 0,
      ads_meta: 0,
      tax_meta: 0,
      sales_tax: 0,
      sales_commission: 0,
      other_variable_costs: 0,
      fixed_costs: 0,
    }

    setRows((prev) =>
      prev.map((r) =>
        r.key === row.key
          ? {
              ...r,
              revenueStr: '',
              investmentStr: '',
              adsMetaStr: '',
              taxMetaStr: '',
              salesTaxStr: '',
              salesCommissionStr: '',
              otherVariableStr: '',
              fixedCostsStr: '',
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
      num(row.revenueStr) !== s.revenue ||
      num(row.investmentStr) !== s.investment ||
      num(row.adsMetaStr) !== s.ads_meta ||
      num(row.taxMetaStr) !== s.tax_meta ||
      num(row.salesTaxStr) !== s.sales_tax ||
      num(row.salesCommissionStr) !== s.sales_commission ||
      num(row.otherVariableStr) !== s.other_variable_costs ||
      num(row.fixedCostsStr) !== s.fixed_costs
    )
  }

  const computeRow = (row: RowState) => {
    const revenue = num(row.revenueStr)
    const investment = num(row.investmentStr)
    const adsMeta = num(row.adsMetaStr)
    const taxMeta = num(row.taxMetaStr)
    const salesTax = num(row.salesTaxStr)
    const salesCommission = num(row.salesCommissionStr)
    const otherVariable = num(row.otherVariableStr)
    const fixedCosts = num(row.fixedCostsStr)

    const variableCosts = adsMeta + taxMeta + salesTax + salesCommission + otherVariable
    const netProfit = revenue - investment - variableCosts - fixedCosts
    const roas = investment > 0 ? revenue / investment : null
    const margin = revenue > 0 ? (netProfit / revenue) * 100 : null

    return { revenue, investment, variableCosts, netProfit, roas, margin }
  }

  const handleSaveRow = async (row: RowState) => {
    const payload = {
      year: selectedYear,
      month: row.monthIndex + 1,
      revenue: num(row.revenueStr),
      investment: num(row.investmentStr),
      ads_meta: num(row.adsMetaStr),
      tax_meta: num(row.taxMetaStr),
      sales_tax: num(row.salesTaxStr),
      sales_commission: num(row.salesCommissionStr),
      other_variable_costs: num(row.otherVariableStr),
      fixed_costs: num(row.fixedCostsStr),
    }

    setRows((prev) => prev.map((r) => (r.key === row.key ? { ...r, isSavingRow: true } : r)))
    try {
      await save(row.id, payload)
      setRows((prev) =>
        prev.map((r) =>
          r.key === row.key
            ? {
                ...r,
                isSavingRow: false,
                saved: {
                  revenue: payload.revenue,
                  investment: payload.investment,
                  ads_meta: payload.ads_meta,
                  tax_meta: payload.tax_meta,
                  sales_tax: payload.sales_tax,
                  sales_commission: payload.sales_commission,
                  other_variable_costs: payload.other_variable_costs,
                  fixed_costs: payload.fixed_costs,
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
        const c = computeRow(row)
        return {
          name: MONTH_SHORT_NAMES_PT[row.monthIndex],
          monthLabel: `${MONTH_NAMES_PT[row.monthIndex]}/${selectedYear}`,
          faturamento: c.revenue,
          investimento: c.investment,
          lucro: c.netProfit,
        }
      }),
    [rows, selectedYear],
  )

  // Annual totals
  const totals = useMemo(() => {
    let revenue = 0,
      investment = 0,
      variable = 0,
      fixed = 0,
      profit = 0
    rows.forEach((row) => {
      const c = computeRow(row)
      revenue += c.revenue
      investment += c.investment
      variable += c.variableCosts
      fixed += num(row.fixedCostsStr)
      profit += c.netProfit
    })
    return { revenue, investment, variable, fixed, profit }
  }, [rows])

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-emerald-600" />
            Controle Mensal • {selectedYear}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Faturamento, investimento e detalhamento de custos mês a mês. Lucro, ROAS e margem
            calculam automaticamente.
          </p>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-white border-slate-200/90 shadow-sm rounded-2xl">
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              Faturamento
            </p>
            <p className="text-lg font-bold text-slate-900 tabular-nums mt-1">
              {formatCurrency(totals.revenue)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200/90 shadow-sm rounded-2xl">
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              Investimento
            </p>
            <p className="text-lg font-bold text-amber-600 tabular-nums mt-1">
              {formatCurrency(totals.investment)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200/90 shadow-sm rounded-2xl">
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              Custos Variáveis + Fixos
            </p>
            <p className="text-lg font-bold text-slate-900 tabular-nums mt-1">
              {formatCurrency(totals.variable + totals.fixed)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200/90 shadow-sm rounded-2xl">
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              Lucro Líquido
            </p>
            <p
              className={`text-lg font-bold tabular-nums mt-1 ${
                totals.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {formatCurrency(totals.profit)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="bg-white border-slate-200/90 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="p-5 pb-2">
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            Faturamento, Investimento e Lucro Líquido
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 mt-0.5">
            Visão mensal de {selectedYear} — barras para faturamento/investimento e linha de lucro.
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
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  tickFormatter={(val) => `R$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    const label =
                      name === 'faturamento'
                        ? 'Faturamento'
                        : name === 'investimento'
                          ? 'Investimento'
                          : 'Lucro Líquido'
                    return [formatCurrency(value), label]
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
                    value === 'faturamento'
                      ? 'Faturamento'
                      : value === 'investimento'
                        ? 'Investimento'
                        : 'Lucro Líquido'
                  }
                />
                <Bar
                  dataKey="faturamento"
                  name="faturamento"
                  fill="#3B82F6"
                  radius={[5, 5, 0, 0]}
                  animationDuration={600}
                  barSize={14}
                />
                <Bar
                  dataKey="investimento"
                  name="investimento"
                  fill="#F59E0B"
                  radius={[5, 5, 0, 0]}
                  animationDuration={600}
                  barSize={14}
                />
                <Line
                  type="monotone"
                  dataKey="lucro"
                  name="lucro"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#10B981' }}
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
              <CalendarDays className="w-4 h-4 text-emerald-600" />
              Detalhamento Mensal ({selectedYear})
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Edite os campos e clique em &ldquo;Salvar&rdquo; por linha. ROAS, Custos Variáveis,
              Lucro e Margem são automáticos.
            </CardDescription>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-amber-500" />
              Alterado
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                <Check className="w-3 h-3" />
              </span>
              Salvo
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-[1400px]">
              <TableHeader className="bg-slate-50/80">
                {/* Row 1: group headers */}
                <TableRow className="hover:bg-transparent border-b border-slate-200">
                  <TableHead
                    rowSpan={2}
                    className="font-semibold text-slate-700 text-xs py-3 px-3 min-w-[110px] align-bottom"
                  >
                    Mês
                  </TableHead>
                  <TableHead
                    rowSpan={2}
                    className="font-semibold text-slate-700 text-xs py-3 px-3 min-w-[130px] align-bottom"
                  >
                    Faturamento (R$)
                  </TableHead>
                  <TableHead
                    rowSpan={2}
                    className="font-semibold text-slate-700 text-xs py-3 px-3 text-right min-w-[80px] align-bottom"
                  >
                    ROAS
                  </TableHead>
                  <TableHead
                    rowSpan={2}
                    className="font-semibold text-slate-700 text-xs py-3 px-3 min-w-[130px] align-bottom"
                  >
                    Investimento (R$)
                  </TableHead>
                  <TableHead
                    colSpan={6}
                    className="font-bold text-slate-700 text-xs py-2 px-3 text-center bg-slate-100/80 border-x border-slate-200"
                  >
                    Custos Variáveis
                  </TableHead>
                  <TableHead
                    rowSpan={2}
                    className="font-semibold text-slate-700 text-xs py-3 px-3 min-w-[120px] align-bottom"
                  >
                    Custos Fixos (R$)
                  </TableHead>
                  <TableHead
                    rowSpan={2}
                    className="font-bold text-slate-700 text-xs py-3 px-3 text-right min-w-[120px] align-bottom"
                  >
                    Lucro Líquido
                  </TableHead>
                  <TableHead
                    rowSpan={2}
                    className="font-semibold text-slate-700 text-xs py-3 px-3 text-right min-w-[80px] align-bottom"
                  >
                    Margem %
                  </TableHead>
                  <TableHead
                    rowSpan={2}
                    className="font-semibold text-slate-700 text-xs py-3 px-3 text-center min-w-[110px] align-bottom"
                  >
                    Ações
                  </TableHead>
                </TableRow>
                {/* Row 2: sub-headers for the variable costs group */}
                <TableRow className="hover:bg-transparent border-b border-slate-200">
                  <TableHead className="font-medium text-slate-500 text-[11px] py-2 px-2 min-w-[110px] bg-slate-50">
                    Anúncios Meta
                  </TableHead>
                  <TableHead className="font-medium text-slate-500 text-[11px] py-2 px-2 min-w-[110px] bg-slate-50">
                    Imposto Meta
                  </TableHead>
                  <TableHead className="font-medium text-slate-500 text-[11px] py-2 px-2 min-w-[120px] bg-slate-50">
                    Imposto S/ Vendas
                  </TableHead>
                  <TableHead className="font-medium text-slate-500 text-[11px] py-2 px-2 min-w-[120px] bg-slate-50">
                    Comissão Comercial
                  </TableHead>
                  <TableHead className="font-medium text-slate-500 text-[11px] py-2 px-2 min-w-[90px] bg-slate-50">
                    Outros
                  </TableHead>
                  <TableHead className="font-bold text-slate-600 text-[11px] py-2 px-2 min-w-[120px] text-right bg-slate-100/80 border-l border-slate-200">
                    Total Variável
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={14} className="text-center py-10 text-slate-400 text-sm">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                      Carregando dados mensais...
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => {
                    const c = computeRow(row)
                    const modified = isRowModified(row)
                    return (
                      <TableRow
                        key={row.key}
                        className={`transition-colors border-b border-slate-100 ${
                          modified ? 'bg-amber-50/30' : 'hover:bg-slate-50/50'
                        }`}
                      >
                        {/* Mês */}
                        <TableCell className="font-medium text-xs text-slate-900 py-2 px-3 capitalize">
                          {MONTH_NAMES_PT[row.monthIndex]}
                        </TableCell>

                        {/* Faturamento */}
                        <TableCell className="py-1.5 px-2">
                          <CurrencyCell
                            value={row.revenueStr}
                            onChange={(v) => handleField(row.key, 'revenueStr', v)}
                            modified={modified}
                          />
                        </TableCell>

                        {/* ROAS */}
                        <TableCell className="py-2.5 px-3 text-right tabular-nums text-xs font-bold text-slate-800">
                          {formatRoas(c.roas)}
                        </TableCell>

                        {/* Investimento */}
                        <TableCell className="py-1.5 px-2">
                          <CurrencyCell
                            value={row.investmentStr}
                            onChange={(v) => handleField(row.key, 'investmentStr', v)}
                            modified={modified}
                          />
                        </TableCell>

                        {/* Variable costs group (subitems + total) */}
                        <TableCell className="py-1.5 px-2 bg-slate-50/40">
                          <CurrencyCell
                            value={row.adsMetaStr}
                            onChange={(v) => handleField(row.key, 'adsMetaStr', v)}
                            modified={modified}
                          />
                        </TableCell>
                        <TableCell className="py-1.5 px-2 bg-slate-50/40">
                          <CurrencyCell
                            value={row.taxMetaStr}
                            onChange={(v) => handleField(row.key, 'taxMetaStr', v)}
                            modified={modified}
                          />
                        </TableCell>
                        <TableCell className="py-1.5 px-2 bg-slate-50/40">
                          <CurrencyCell
                            value={row.salesTaxStr}
                            onChange={(v) => handleField(row.key, 'salesTaxStr', v)}
                            modified={modified}
                          />
                        </TableCell>
                        <TableCell className="py-1.5 px-2 bg-slate-50/40">
                          <CurrencyCell
                            value={row.salesCommissionStr}
                            onChange={(v) => handleField(row.key, 'salesCommissionStr', v)}
                            modified={modified}
                          />
                        </TableCell>
                        <TableCell className="py-1.5 px-2 bg-slate-50/40">
                          <CurrencyCell
                            value={row.otherVariableStr}
                            onChange={(v) => handleField(row.key, 'otherVariableStr', v)}
                            modified={modified}
                          />
                        </TableCell>
                        {/* Total Variável (computed, highlighted) */}
                        <TableCell className="py-2.5 px-3 text-right tabular-nums text-xs font-bold text-slate-800 bg-slate-100/80 border-l border-slate-200">
                          {formatCurrency(c.variableCosts)}
                        </TableCell>

                        {/* Custos Fixos */}
                        <TableCell className="py-1.5 px-2">
                          <CurrencyCell
                            value={row.fixedCostsStr}
                            onChange={(v) => handleField(row.key, 'fixedCostsStr', v)}
                            modified={modified}
                          />
                        </TableCell>

                        {/* Lucro Líquido */}
                        <TableCell className="py-2.5 px-3 text-right tabular-nums text-xs font-bold bg-slate-50/40">
                          <span className={c.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                            {formatCurrency(c.netProfit)}
                          </span>
                        </TableCell>

                        {/* Margem */}
                        <TableCell className="py-2.5 px-3 text-right tabular-nums text-xs font-bold">
                          <span
                            className={
                              (c.margin || 0) >= 25
                                ? 'text-emerald-600'
                                : (c.margin || 0) >= 15
                                  ? 'text-amber-600'
                                  : 'text-slate-700'
                            }
                          >
                            {formatPercent(c.margin, 1)}
                          </span>
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
                                <div className="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shadow-2xs">
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
                                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
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
                                    (Faturamento, Investimento, Impostos, Comissões, Custos Fixos e
                                    Outros), zerando-os e salvando automaticamente no banco. Não
                                    será possível desfazer.
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
        <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-slate-800">Regras de Cálculo Automático</p>
          <p>
            • <strong>ROAS</strong> = Faturamento ÷ Investimento (2 casas). Exibe &ldquo;—&rdquo; se
            investimento for 0.
          </p>
          <p>
            • <strong>Custos Variáveis</strong> = Anúncios Meta + Imposto Meta + Imposto Sobre
            Vendas + Comissão Comercial + Outros.
          </p>
          <p>
            • <strong>Lucro Líquido</strong> = Faturamento − Investimento − Custos Variáveis −
            Custos Fixos.
          </p>
          <p>
            • <strong>Margem %</strong> = Lucro Líquido ÷ Faturamento × 100 (1 casa). Exibe
            &ldquo;—&rdquo; se faturamento for 0.
          </p>
        </div>
      </div>
    </div>
  )
}
