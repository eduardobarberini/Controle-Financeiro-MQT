import React, { useState, useEffect } from 'react'
import { useFinancial } from '@/contexts/FinancialContext'
import { toast } from '@/hooks/use-toast'
import { formatCurrency, formatPercent, getProgressColor } from '@/lib/financial-utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Target, TrendingUp, DollarSign, Save, Loader2, Sparkles } from 'lucide-react'

interface MetasModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Discrete modal for editing annual revenue & profit goals.
 * Reads/writes the `goals` collection (user + year) via FinancialContext,
 * which keeps the Dashboard progress bars in sync through realtime.
 */
export const MetasModal: React.FC<MetasModalProps> = ({ open, onOpenChange }) => {
  const { selectedYear, goals, saveGoalsData, summary } = useFinancial()
  const [revenueGoalStr, setRevenueGoalStr] = useState<string>('')
  const [profitGoalStr, setProfitGoalStr] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      setRevenueGoalStr(goals?.annual_revenue_goal ? String(goals.annual_revenue_goal) : '')
      setProfitGoalStr(goals?.annual_profit_goal ? String(goals.annual_profit_goal) : '')
      setErrors({})
    }
  }, [goals, selectedYear, open])

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
      onOpenChange(false)
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] bg-white border-slate-200 rounded-2xl shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-600" />
            Metas Anuais • {selectedYear}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Estabeleça os objetivos financeiros de Faturamento e Lucro para o acompanhamento no
            Dashboard.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Meta de Faturamento */}
            <div className="space-y-2">
              <Label
                htmlFor="revenueGoal"
                className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5"
              >
                <DollarSign className="w-3.5 h-3.5 text-purple-600" />
                Meta de Faturamento (R$)
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
                  className="h-11 pl-10 pr-3 text-sm font-semibold tabular-nums text-slate-900 bg-slate-50/50 border-slate-200 focus-visible:ring-purple-500 rounded-xl"
                  required
                />
              </div>
              {errors.revenue ? (
                <p className="text-xs text-rose-500 mt-1">{errors.revenue}</p>
              ) : (
                <p className="text-[11px] text-slate-400">
                  ≈ {formatCurrency((parseFloat(revenueGoalStr) || 0) / 12)} / mês de média
                </p>
              )}
            </div>

            {/* Meta de Lucro */}
            <div className="space-y-2">
              <Label
                htmlFor="profitGoal"
                className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5"
              >
                <TrendingUp className="w-3.5 h-3.5 text-purple-600" />
                Meta de Lucro (R$)
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
                  className="h-11 pl-10 pr-3 text-sm font-semibold tabular-nums text-slate-900 bg-slate-50/50 border-slate-200 focus-visible:ring-purple-500 rounded-xl"
                  required
                />
              </div>
              {errors.profit ? (
                <p className="text-xs text-rose-500 mt-1">{errors.profit}</p>
              ) : (
                <p className="text-[11px] text-slate-400">
                  ≈ {formatCurrency((parseFloat(profitGoalStr) || 0) / 12)} / mês de média
                </p>
              )}
            </div>
          </div>

          {/* Progresso atual */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/70 border border-slate-200/80 rounded-xl p-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Faturamento acumulado</span>
                <span className={`font-bold tabular-nums ${revProgress.badgeText}`}>
                  {formatPercent(summary.revenueGoalPercent, 1)}
                </span>
              </div>
              <div className="text-sm font-bold text-slate-900 tabular-nums">
                {formatCurrency(summary.totalRevenue)}
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${revProgress.barColor}`}
                  style={{
                    width: `${Math.min(Math.max(summary.revenueGoalPercent || 0, 0), 100)}%`,
                  }}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Lucro acumulado</span>
                <span className={`font-bold tabular-nums ${profProgress.badgeText}`}>
                  {formatPercent(summary.profitGoalPercent, 1)}
                </span>
              </div>
              <div className="text-sm font-bold text-slate-900 tabular-nums">
                {formatCurrency(summary.totalProfit)}
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${profProgress.barColor}`}
                  style={{
                    width: `${Math.min(Math.max(summary.profitGoalPercent || 0, 0), 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between gap-3 pt-1">
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              <span>Valores positivos e obrigatórios</span>
            </div>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-medium px-6 rounded-xl shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Metas
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
