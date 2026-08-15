import React, { useState, useEffect } from 'react'
import { useFinancial } from '@/contexts/FinancialContext'
import { toast } from '@/hooks/use-toast'
import {
  MONTH_NAMES_PT,
  formatPercent,
  formatRoas,
  calculateRoas,
  calculateMarginPercent,
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
import {
  Check,
  Circle,
  Save,
  Plus,
  Trash2,
  TableProperties,
  Info,
  Loader2,
  Sparkles,
  TrendingUp,
} from 'lucide-react'

interface RowState {
  key: string
  id?: string
  monthDate: string
  monthLabel: string
  investmentStr: string
  revenueStr: string
  profitStr: string
  isExtra: boolean
  savedInvestment: number
  savedRevenue: number
  savedProfit: number
  isSavingRow: boolean
}

export default function Dados() {
  const { selectedYear, monthlyRecords, saveMonthRow, deleteMonthRow, isLoading } = useFinancial()
  const [rows, setRows] = useState<RowState[]>([])
  const [extraCount, setExtraCount] = useState<number>(0)

  // Initialize and synchronize rows from context records
  useEffect(() => {
    // Map records by month string or month index
    const recordsMap = new Map<string, (typeof monthlyRecords)[0]>()
    const extraRecs: (typeof monthlyRecords)[0][] = []

    monthlyRecords.forEach((rec) => {
      const d = new Date(rec.month.replace(' ', 'T'))
      const recYear = d.getUTCFullYear()
      const recMonth = d.getUTCMonth()

      if (recYear === selectedYear) {
        if (recMonth >= 0 && recMonth < 12) {
          recordsMap.set(String(recMonth), rec)
        } else {
          extraRecs.push(rec)
        }
      }
    })

    const newRows: RowState[] = []

    // 12 base months
    for (let i = 0; i < 12; i++) {
      const monthNum = String(i + 1).padStart(2, '0')
      const monthDate = `${selectedYear}-${monthNum}-01 00:00:00.000Z`
      const monthLabel = `${MONTH_NAMES_PT[i]}/${selectedYear}`
      const rec = recordsMap.get(String(i))

      const inv = rec ? Number(rec.investment) || 0 : 0
      const rev = rec ? Number(rec.gross_revenue) || 0 : 0
      const prof = rec ? Number(rec.net_profit) || 0 : 0

      newRows.push({
        key: `month-${i}`,
        id: rec?.id,
        monthDate,
        monthLabel,
        investmentStr: inv > 0 ? String(inv) : '',
        revenueStr: rev > 0 ? String(rev) : '',
        profitStr: prof > 0 ? String(prof) : '',
        isExtra: false,
        savedInvestment: inv,
        savedRevenue: rev,
        savedProfit: prof,
        isSavingRow: false,
      })
    }

    // Extra rows from backend
    extraRecs.forEach((rec, idx) => {
      const inv = Number(rec.investment) || 0
      const rev = Number(rec.gross_revenue) || 0
      const prof = Number(rec.net_profit) || 0

      newRows.push({
        key: `extra-${rec.id}`,
        id: rec.id,
        monthDate: rec.month,
        monthLabel: `Linha Extra ${idx + 1}/${selectedYear}`,
        investmentStr: inv > 0 ? String(inv) : '',
        revenueStr: rev > 0 ? String(rev) : '',
        profitStr: prof > 0 ? String(prof) : '',
        isExtra: true,
        savedInvestment: inv,
        savedRevenue: rev,
        savedProfit: prof,
        isSavingRow: false,
      })
    })

    setRows(newRows)
    setExtraCount(extraRecs.length)
  }, [selectedYear, monthlyRecords])

  // Handle cell text change
  const handleInputChange = (
    key: string,
    field: 'investmentStr' | 'revenueStr' | 'profitStr',
    val: string,
  ) => {
    // allow only numbers and decimal point/comma
    const sanitized = val.replace(/[^0-9.,]/g, '').replace(',', '.')
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: sanitized } : r)))
  }

  // Check if row has unsaved changes
  const isRowModified = (row: RowState) => {
    const currInv = parseFloat(row.investmentStr) || 0
    const currRev = parseFloat(row.revenueStr) || 0
    const currProf = parseFloat(row.profitStr) || 0

    return (
      currInv !== row.savedInvestment ||
      currRev !== row.savedRevenue ||
      currProf !== row.savedProfit
    )
  }

  // Save single row
  const handleSaveRow = async (row: RowState) => {
    const inv = parseFloat(row.investmentStr) || 0
    const rev = parseFloat(row.revenueStr) || 0
    const prof = parseFloat(row.profitStr) || 0

    setRows((prev) => prev.map((r) => (r.key === row.key ? { ...r, isSavingRow: true } : r)))

    try {
      const saved = await saveMonthRow({
        id: row.id,
        month: row.monthDate,
        investment: inv,
        gross_revenue: rev,
        net_profit: prof,
      })

      setRows((prev) =>
        prev.map((r) =>
          r.key === row.key
            ? {
                ...r,
                id: saved.id,
                savedInvestment: inv,
                savedRevenue: rev,
                savedProfit: prof,
                isSavingRow: false,
              }
            : r,
        ),
      )

      toast({
        title: 'Dados salvos com sucesso',
        description: `Valores de ${row.monthLabel} atualizados no banco de dados.`,
      })
    } catch (err: unknown) {
      console.error('Error saving row:', err)
      const errMsg = err instanceof Error ? err.message : 'Erro ao salvar'
      toast({
        variant: 'destructive',
        title: 'Falha ao salvar linha',
        description: errMsg,
      })
      setRows((prev) => prev.map((r) => (r.key === row.key ? { ...r, isSavingRow: false } : r)))
    }
  }

  // Add Extra row
  const handleAddExtraRow = () => {
    const nextIdx = extraCount + 1
    const dateStr = `${selectedYear}-12-28 00:00:00.000Z` // Off-period date
    const newKey = `extra-new-${Date.now()}`

    setRows((prev) => [
      ...prev,
      {
        key: newKey,
        monthDate: dateStr,
        monthLabel: `Linha Extra ${nextIdx}/${selectedYear}`,
        investmentStr: '',
        revenueStr: '',
        profitStr: '',
        isExtra: true,
        savedInvestment: 0,
        savedRevenue: 0,
        savedProfit: 0,
        isSavingRow: false,
      },
    ])
    setExtraCount((c) => c + 1)
  }

  // Delete Extra row
  const handleDeleteRow = async (row: RowState) => {
    if (row.id) {
      try {
        await deleteMonthRow(row.id)
        toast({
          title: 'Linha extra removida',
          description: 'Registro excluído do banco de dados.',
        })
      } catch (err: unknown) {
        console.error('Delete error:', err)
        toast({
          variant: 'destructive',
          title: 'Erro ao excluir linha',
          description: err instanceof Error ? err.message : 'Não foi possível excluir.',
        })
        return
      }
    }
    setRows((prev) => prev.filter((r) => r.key !== row.key))
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Entrada de Dados Mensais • {selectedYear}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Preencha os valores reais de Investimento, Faturamento e Lucro. ROAS e Margem calculam
            ao vivo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddExtraRow}
            className="text-xs text-slate-700 border-slate-300 hover:bg-slate-100 rounded-xl"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
            Adicionar linha extra
          </Button>
        </div>
      </div>

      {/* Main Table Card */}
      <Card className="bg-white border-slate-200/90 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="p-5 pb-3 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <TableProperties className="w-4 h-4 text-emerald-600" />
              Grade de Lançamentos ({selectedYear})
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              12 meses do ano selecionado. Clique em &ldquo;Salvar&rdquo; em cada linha para
              persistir.
            </CardDescription>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              Salvo
            </span>
            <span className="flex items-center gap-1.5">
              <Circle className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              Alterado (não salvo)
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold text-slate-700 text-xs py-3.5 px-4 min-w-[140px]">
                    Mês
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700 text-xs py-3.5 px-4 min-w-[150px]">
                    Investimento (R$)
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700 text-xs py-3.5 px-4 min-w-[150px]">
                    Faturamento Total (R$)
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700 text-xs py-3.5 px-4 text-right min-w-[100px]">
                    ROAS (Auto)
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700 text-xs py-3.5 px-4 min-w-[150px]">
                    Lucro Líquido (R$)
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700 text-xs py-3.5 px-4 text-right min-w-[100px]">
                    Margem % (Auto)
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700 text-xs py-3.5 px-4 text-center min-w-[130px]">
                    Ações / Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const inv = parseFloat(row.investmentStr) || 0
                  const rev = parseFloat(row.revenueStr) || 0
                  const prof = parseFloat(row.profitStr) || 0

                  const roas = calculateRoas(rev, inv)
                  const margin = calculateMarginPercent(prof, rev)
                  const modified = isRowModified(row)

                  return (
                    <TableRow
                      key={row.key}
                      className={`transition-colors border-b border-slate-100 ${
                        modified ? 'bg-amber-50/30' : 'hover:bg-slate-50/50'
                      }`}
                    >
                      {/* Mês (Read-only label) */}
                      <TableCell className="font-medium text-xs text-slate-900 py-2.5 px-4 capitalize">
                        <div className="flex items-center gap-2">
                          {row.isExtra && (
                            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold border border-indigo-200">
                              Extra
                            </span>
                          )}
                          <span>{row.monthLabel}</span>
                        </div>
                      </TableCell>

                      {/* Investimento (Editable) */}
                      <TableCell className="py-2 px-4">
                        <div className="relative">
                          <span className="absolute left-2.5 top-2.5 text-xs text-slate-400 font-medium">
                            R$
                          </span>
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={row.investmentStr}
                            onChange={(e) =>
                              handleInputChange(row.key, 'investmentStr', e.target.value)
                            }
                            placeholder="0,00"
                            className="h-8 pl-8 pr-2 text-xs font-semibold tabular-nums text-slate-900 bg-white border-slate-200 focus-visible:ring-emerald-500 rounded-lg shadow-2xs"
                          />
                        </div>
                      </TableCell>

                      {/* Faturamento Total (Editable) */}
                      <TableCell className="py-2 px-4">
                        <div className="relative">
                          <span className="absolute left-2.5 top-2.5 text-xs text-slate-400 font-medium">
                            R$
                          </span>
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={row.revenueStr}
                            onChange={(e) =>
                              handleInputChange(row.key, 'revenueStr', e.target.value)
                            }
                            placeholder="0,00"
                            className="h-8 pl-8 pr-2 text-xs font-semibold tabular-nums text-slate-900 bg-white border-slate-200 focus-visible:ring-emerald-500 rounded-lg shadow-2xs"
                          />
                        </div>
                      </TableCell>

                      {/* ROAS (Auto calculated) */}
                      <TableCell className="py-2.5 px-4 text-right tabular-nums text-xs font-bold text-slate-800">
                        {formatRoas(roas)}
                      </TableCell>

                      {/* Lucro Líquido (Editable) */}
                      <TableCell className="py-2 px-4">
                        <div className="relative">
                          <span className="absolute left-2.5 top-2.5 text-xs text-slate-400 font-medium">
                            R$
                          </span>
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={row.profitStr}
                            onChange={(e) =>
                              handleInputChange(row.key, 'profitStr', e.target.value)
                            }
                            placeholder="0,00"
                            className="h-8 pl-8 pr-2 text-xs font-semibold tabular-nums text-slate-900 bg-white border-slate-200 focus-visible:ring-emerald-500 rounded-lg shadow-2xs"
                          />
                        </div>
                      </TableCell>

                      {/* Margem % (Auto calculated) */}
                      <TableCell className="py-2.5 px-4 text-right tabular-nums text-xs font-bold">
                        <span
                          className={
                            (margin || 0) >= 25
                              ? 'text-emerald-600'
                              : (margin || 0) >= 15
                                ? 'text-amber-600'
                                : 'text-slate-700'
                          }
                        >
                          {formatPercent(margin, 1)}
                        </span>
                      </TableCell>

                      {/* Actions & Status */}
                      <TableCell className="py-2 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {/* Visual Status Indicator */}
                          <div title={modified ? 'Alterações não salvas' : 'Salvo'}>
                            {modified ? (
                              <span className="flex h-2.5 w-2.5 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                              </span>
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shadow-2xs">
                                <Check className="w-3 h-3" />
                              </div>
                            )}
                          </div>

                          {/* Save Button */}
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

                          {/* Trash button for extra rows */}
                          {row.isExtra && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteRow(row)}
                              className="h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                              title="Excluir linha extra"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Explanatory Footer Card */}
      <div className="bg-slate-100/80 border border-slate-200/90 rounded-2xl p-4 sm:p-5 flex items-start gap-3 text-xs text-slate-600">
        <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-slate-800">Regras de Cálculo Automático</p>
          <p>
            • <strong>ROAS</strong>: Faturamento Total ÷ Investimento (exibido com 2 casas
            decimais). Quando investimento for zero, exibe &ldquo;—&rdquo;.
          </p>
          <p>
            • <strong>Margem %</strong>: Lucro Líquido ÷ Faturamento Total × 100 (exibido com 1 casa
            decimal). Quando faturamento for zero, exibe &ldquo;—&rdquo;.
          </p>
          <p>
            • Os dados salvos são vinculados ao usuário logado e atualizam instantaneamente todos os
            gráficos e KPIs do Dashboard.
          </p>
        </div>
      </div>
    </div>
  )
}
