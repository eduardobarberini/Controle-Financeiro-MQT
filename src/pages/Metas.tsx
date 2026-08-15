import React, { useState, useEffect } from 'react'
import { useFinancial } from '@/contexts/FinancialContext'
import { toast } from '@/hooks/use-toast'
import { formatCurrency, formatPercent, getProgressColor } from '@/lib/financial-utils'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Target, TrendingUp, DollarSign, Save, Loader2, Sparkles, CheckCircle2 } from 'lucide-react'

export default function Metas() {
  const { selectedYear, goals, saveGoalsData, summary } = useFinancial()
  const [revenueGoalStr, setRevenueGoalStr] = useState<string>('')
  const [profitGoalStr, setProfitGoalStr] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (goals) {
      setRevenueGoalStr(goals.annual_revenue_goal ? String(goals.annual_revenue_goal) : '')
      setProfitGoalStr(goals.annual_profit_goal ? String(goals.annual_profit_goal) : '')
    } else {
      setRevenueGoalStr('')
      setProfitGoalStr('')
    }
  }, [goals, selectedYear])

  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<string>>, val: string) => {
    const sanitized = val.replace(/[^0-9.,]/g, '').replace(',', '.')
    setter(sanitized)
    setErrors({})
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    const rev = parseFloat(revenueGoalStr)
    const prof = parseFloat(profitGoalStr)

    if (isNaN(rev) || rev <= 0) {
      errs.revenue = 'A Meta de Faturamento Anual deve ser maior que zero.'
    }
    if (isNaN(prof) || prof <= 0) {
      errs.profit = 'A Meta de Lucro Anual deve ser maior que zero.'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    const rev = parseFloat(revenueGoalStr)
    const prof = parseFloat(profitGoalStr)

    try {
      setIsSubmitting(true)
      await saveGoalsData(rev, prof)
      toast({
        title: 'Metas salvas com sucesso',
        description: `Metas para o ano de ${selectedYear} atualizadas.`,
      })
    } catch (err: unknown) {
      console.error('Error saving goals:', err)
      const errMsg = err instanceof Error ? err.message : 'Falha ao salvar metas.'
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar metas',
        description: errMsg,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const revProgress = getProgressColor(summary.revenueGoalPercent)
  const profProgress = getProgressColor(summary.profitGoalPercent)

  return (
    <div className="space-y-8 max-w-4xl mx-auto animate-in fade-in-50 duration-300">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Definição de Metas Anuais • {selectedYear}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Estabeleça os objetivos financeiros de Faturamento e Lucro para acompanhamento no
          Dashboard
        </p>
      </div>

      {/* Main Single Goals Card */}
      <Card className="bg-white border-slate-200/90 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="p-6 pb-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Target className="w-5 h-5 text-emerald-600" />
                Metas Corporativas ({selectedYear})
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-1">
                Valores anuais consolidados. Estes números determinam os gauges e barras de
                progresso.
              </CardDescription>
            </div>
            <div className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
              Exercício {selectedYear}
            </div>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Meta de Faturamento */}
              <div className="space-y-2">
                <Label
                  htmlFor="revenueGoal"
                  className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5"
                >
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  Meta de Faturamento Anual (R$)
                </Label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-sm text-slate-400 font-semibold">
                    R$
                  </span>
                  <Input
                    id="revenueGoal"
                    type="text"
                    inputMode="decimal"
                    value={revenueGoalStr}
                    onChange={(e) => handleInputChange(setRevenueGoalStr, e.target.value)}
                    placeholder="500.000,00"
                    className="h-11 pl-10 pr-3 text-sm font-semibold tabular-nums text-slate-900 bg-slate-50/50 border-slate-200 focus-visible:ring-emerald-500 rounded-xl"
                    required
                  />
                </div>
                {errors.revenue ? (
                  <p className="text-xs text-rose-500 mt-1">{errors.revenue}</p>
                ) : (
                  <p className="text-[11px] text-slate-400">
                    Equivalente a {formatCurrency((parseFloat(revenueGoalStr) || 0) / 12)} / mês de
                    média
                  </p>
                )}
              </div>

              {/* Meta de Lucro */}
              <div className="space-y-2">
                <Label
                  htmlFor="profitGoal"
                  className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5"
                >
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  Meta de Lucro Anual (R$)
                </Label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-sm text-slate-400 font-semibold">
                    R$
                  </span>
                  <Input
                    id="profitGoal"
                    type="text"
                    inputMode="decimal"
                    value={profitGoalStr}
                    onChange={(e) => handleInputChange(setProfitGoalStr, e.target.value)}
                    placeholder="150.000,00"
                    className="h-11 pl-10 pr-3 text-sm font-semibold tabular-nums text-slate-900 bg-slate-50/50 border-slate-200 focus-visible:ring-emerald-500 rounded-xl"
                    required
                  />
                </div>
                {errors.profit ? (
                  <p className="text-xs text-rose-500 mt-1">{errors.profit}</p>
                ) : (
                  <p className="text-[11px] text-slate-400">
                    Equivalente a {formatCurrency((parseFloat(profitGoalStr) || 0) / 12)} / mês de
                    média
                  </p>
                )}
              </div>
            </div>
          </CardContent>

          <CardFooter className="p-6 pt-0 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 bg-slate-50/40">
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Valores positivos e obrigatórios para o cálculo de atingimento</span>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-6 py-2.5 rounded-xl shadow-xs transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando Metas...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Metas
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Recap Preview Card */}
      <Card className="bg-slate-900 text-slate-100 border-slate-800 rounded-2xl shadow-md overflow-hidden">
        <CardHeader className="p-6 pb-3">
          <CardTitle className="text-base font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Progresso Acumulado Atual ({selectedYear})
          </CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Comparação em tempo real com base nos lançamentos efetuados na aba Dados
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-2 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Preview Faturamento */}
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Faturamento Acumulado</span>
                <span className={`font-bold tabular-nums ${revProgress.badgeText}`}>
                  {formatPercent(summary.revenueGoalPercent, 1)} da meta
                </span>
              </div>
              <div className="text-xl font-bold text-white tabular-nums">
                {formatCurrency(summary.totalRevenue)}
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${revProgress.barColor}`}
                  style={{
                    width: `${Math.min(Math.max(summary.revenueGoalPercent || 0, 0), 100)}%`,
                  }}
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Meta anual estipulada: {formatCurrency(summary.revenueGoal)}
              </p>
            </div>

            {/* Preview Lucro */}
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Lucro Acumulado</span>
                <span className={`font-bold tabular-nums ${profProgress.badgeText}`}>
                  {formatPercent(summary.profitGoalPercent, 1)} da meta
                </span>
              </div>
              <div className="text-xl font-bold text-white tabular-nums">
                {formatCurrency(summary.totalProfit)}
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${profProgress.barColor}`}
                  style={{
                    width: `${Math.min(Math.max(summary.profitGoalPercent || 0, 0), 100)}%`,
                  }}
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Meta anual estipulada: {formatCurrency(summary.profitGoal)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
