import React, { useState, useEffect } from 'react'
import { useFinancial } from '@/contexts/FinancialContext'
import { toast } from '@/hooks/use-toast'
import {
  formatCurrency,
  formatPercent,
  formatNumber,
  parsePtBrNumber,
  getProgressColor,
  DEFAULT_TAX_META_PERCENT,
  DEFAULT_SALES_TAX_PERCENT,
} from '@/lib/financial-utils'
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
import { Target, TrendingUp, DollarSign, Save, Loader2, Sparkles, Percent } from 'lucide-react'

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
  const [profitMarginGoalStr, setProfitMarginGoalStr] = useState<string>('')
  const [renewalRateGoalStr, setRenewalRateGoalStr] = useState<string>('')
  const [taxMetaRateStr, setTaxMetaRateStr] = useState<string>('')
  const [salesTaxRateStr, setSalesTaxRateStr] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      setRevenueGoalStr(
        goals?.annual_revenue_goal ? formatNumber(goals.annual_revenue_goal, 2) : '',
      )
      setProfitGoalStr(goals?.annual_profit_goal ? formatNumber(goals.annual_profit_goal, 2) : '')
      setProfitMarginGoalStr(
        goals?.profit_margin_goal !== undefined && goals?.profit_margin_goal !== null
          ? formatNumber(goals.profit_margin_goal, 1)
          : '',
      )
      setRenewalRateGoalStr(
        goals?.renewal_rate_goal !== undefined && goals?.renewal_rate_goal !== null
          ? formatNumber(goals.renewal_rate_goal, 1)
          : '',
      )
      setTaxMetaRateStr(
        goals?.tax_meta_rate !== undefined && goals?.tax_meta_rate !== null
          ? formatNumber(goals.tax_meta_rate, 2)
          : formatNumber(DEFAULT_TAX_META_PERCENT, 2),
      )
      setSalesTaxRateStr(
        goals?.sales_tax_rate !== undefined && goals?.sales_tax_rate !== null
          ? formatNumber(goals.sales_tax_rate, 2)
          : formatNumber(DEFAULT_SALES_TAX_PERCENT, 2),
      )
      setErrors({})
    }
  }, [goals, selectedYear, open])

  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<string>>, val: string) => {
    const sanitized = val.replace(/[^0-9.,]/g, '')
    setter(sanitized)
    setErrors({})
  }

  const handleBlurFormat = (
    setter: React.Dispatch<React.SetStateAction<string>>,
    val: string,
    decimals = 2,
  ) => {
    if (!val.trim()) return
    const parsed = parsePtBrNumber(val)
    if (parsed > 0) {
      setter(formatNumber(parsed, decimals))
    }
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    const rev = parsePtBrNumber(revenueGoalStr)
    const prof = parsePtBrNumber(profitGoalStr)
    const margin = parsePtBrNumber(profitMarginGoalStr)
    const renewalRate = parsePtBrNumber(renewalRateGoalStr)
    const taxMeta = parsePtBrNumber(taxMetaRateStr)
    const salesTax = parsePtBrNumber(salesTaxRateStr)

    if (isNaN(rev) || rev <= 0) {
      errs.revenue = 'A Meta de Faturamento Anual deve ser maior que zero.'
    }
    if (isNaN(prof) || prof <= 0) {
      errs.profit = 'A Meta de Lucro Anual deve ser maior que zero.'
    }
    if (profitMarginGoalStr !== '' && (isNaN(margin) || margin <= 0 || margin > 100)) {
      errs.margin = 'A Meta de Margem de Lucro deve ser um percentual válido (ex: 30).'
    }
    if (
      renewalRateGoalStr !== '' &&
      (isNaN(renewalRate) || renewalRate <= 0 || renewalRate > 100)
    ) {
      errs.renewalRate = 'A Meta de Taxa de Renovação deve ser um percentual válido (ex: 70).'
    }
    if (isNaN(taxMeta) || taxMeta < 0) {
      errs.taxMeta = 'A alíquota de Imposto Meta não pode ser negativa.'
    }
    if (isNaN(salesTax) || salesTax < 0) {
      errs.salesTax = 'A alíquota de Imposto S/ Vendas não pode ser negativa.'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    const rev = parsePtBrNumber(revenueGoalStr)
    const prof = parsePtBrNumber(profitGoalStr)
    const margin = profitMarginGoalStr !== '' ? parsePtBrNumber(profitMarginGoalStr) : null
    const renewalRate = renewalRateGoalStr !== '' ? parsePtBrNumber(renewalRateGoalStr) : null
    const taxMeta = parsePtBrNumber(taxMetaRateStr)
    const salesTax = parsePtBrNumber(salesTaxRateStr)

    try {
      setIsSubmitting(true)
      await saveGoalsData(rev, prof, taxMeta, salesTax, margin, renewalRate)
      toast({
        title: 'Metas e alíquotas salvas com sucesso',
        description: `Configurações para o ano de ${selectedYear} atualizadas.`,
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
            <Target className="w-5 h-5 text-[#6D49F2]" />
            Metas Anuais • {selectedYear}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Estabeleça os objetivos financeiros de Faturamento, Lucro e Margem para o acompanhamento
            no Dashboard.
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
                <DollarSign className="w-3.5 h-3.5 text-[#6D49F2]" />
                Faturamento (R$)
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-xs text-slate-400 font-semibold">
                  R$
                </span>
                <Input
                  id="revenueGoal"
                  type="text"
                  inputMode="decimal"
                  value={revenueGoalStr}
                  onChange={(e) => handleInputChange(setRevenueGoalStr, e.target.value)}
                  onBlur={() => handleBlurFormat(setRevenueGoalStr, revenueGoalStr, 2)}
                  placeholder="500.000,00"
                  className="h-11 pl-8 pr-2 text-xs font-semibold tabular-nums text-slate-900 bg-slate-50/50 border-slate-200 focus-visible:ring-[#6D49F2] rounded-xl"
                  required
                />
              </div>
              {errors.revenue ? (
                <p className="text-[11px] text-rose-500 mt-1">{errors.revenue}</p>
              ) : (
                <p className="text-[10px] text-slate-400">
                  ≈ {formatCurrency((parsePtBrNumber(revenueGoalStr) || 0) / 12)} / mês
                </p>
              )}
            </div>

            {/* Meta de Lucro */}
            <div className="space-y-2">
              <Label
                htmlFor="profitGoal"
                className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5"
              >
                <TrendingUp className="w-3.5 h-3.5 text-[#6D49F2]" />
                Lucro (R$)
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-xs text-slate-400 font-semibold">
                  R$
                </span>
                <Input
                  id="profitGoal"
                  type="text"
                  inputMode="decimal"
                  value={profitGoalStr}
                  onChange={(e) => handleInputChange(setProfitGoalStr, e.target.value)}
                  onBlur={() => handleBlurFormat(setProfitGoalStr, profitGoalStr, 2)}
                  placeholder="150.000,00"
                  className="h-11 pl-8 pr-2 text-xs font-semibold tabular-nums text-slate-900 bg-slate-50/50 border-slate-200 focus-visible:ring-[#6D49F2] rounded-xl"
                  required
                />
              </div>
              {errors.profit ? (
                <p className="text-[11px] text-rose-500 mt-1">{errors.profit}</p>
              ) : (
                <p className="text-[10px] text-slate-400">
                  ≈ {formatCurrency((parsePtBrNumber(profitGoalStr) || 0) / 12)} / mês
                </p>
              )}
            </div>

            {/* Meta de Margem de Lucro (%) */}
            <div className="space-y-2">
              <Label
                htmlFor="profitMarginGoal"
                className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5"
              >
                <Percent className="w-3.5 h-3.5 text-[#6D49F2]" />
                Margem Lucro (%)
              </Label>
              <div className="relative">
                <Input
                  id="profitMarginGoal"
                  type="text"
                  inputMode="decimal"
                  value={profitMarginGoalStr}
                  onChange={(e) => handleInputChange(setProfitMarginGoalStr, e.target.value)}
                  onBlur={() => handleBlurFormat(setProfitMarginGoalStr, profitMarginGoalStr, 1)}
                  placeholder="30,0"
                  className="h-11 pr-7 text-xs font-semibold tabular-nums text-slate-900 bg-slate-50/50 border-slate-200 focus-visible:ring-[#6D49F2] rounded-xl"
                />
                <span className="absolute right-3 top-3 text-xs text-slate-400 font-semibold pointer-events-none">
                  %
                </span>
              </div>
              {errors.margin ? (
                <p className="text-[11px] text-rose-500 mt-1">{errors.margin}</p>
              ) : (
                <p className="text-[10px] text-slate-400">Meta KPI Principal</p>
              )}
            </div>

            {/* Meta de Taxa de Renovação (%) */}
            <div className="space-y-2">
              <Label
                htmlFor="renewalRateGoal"
                className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5"
              >
                <Percent className="w-3.5 h-3.5 text-[#6D49F2]" />
                Taxa de Renovação (%)
              </Label>
              <div className="relative">
                <Input
                  id="renewalRateGoal"
                  type="text"
                  inputMode="decimal"
                  value={renewalRateGoalStr}
                  onChange={(e) => handleInputChange(setRenewalRateGoalStr, e.target.value)}
                  onBlur={() => handleBlurFormat(setRenewalRateGoalStr, renewalRateGoalStr, 1)}
                  placeholder="70,0"
                  className="h-11 pr-7 text-xs font-semibold tabular-nums text-slate-900 bg-slate-50/50 border-slate-200 focus-visible:ring-[#6D49F2] rounded-xl"
                />
                <span className="absolute right-3 top-3 text-xs text-slate-400 font-semibold pointer-events-none">
                  %
                </span>
              </div>
              {errors.renewalRate ? (
                <p className="text-[11px] text-rose-500 mt-1">{errors.renewalRate}</p>
              ) : (
                <p className="text-[10px] text-slate-400">Meta Card Renovações</p>
              )}
            </div>
          </div>

          {/* Alíquotas de Impostos */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
              <Percent className="w-3.5 h-3.5 text-[#6D49F2]" />
              Alíquotas de Impostos (%)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Alíquota Imposto Meta (%) */}
              <div className="space-y-2">
                <Label
                  htmlFor="taxMetaRate"
                  className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"
                >
                  Alíquota Imposto Meta (%)
                </Label>
                <div className="relative">
                  <Input
                    id="taxMetaRate"
                    type="text"
                    inputMode="decimal"
                    value={taxMetaRateStr}
                    onChange={(e) => handleInputChange(setTaxMetaRateStr, e.target.value)}
                    onBlur={() => handleBlurFormat(setTaxMetaRateStr, taxMetaRateStr, 2)}
                    placeholder="12,15"
                    className="h-11 pr-8 text-sm font-semibold tabular-nums text-slate-900 bg-slate-50/50 border-slate-200 focus-visible:ring-purple-500 rounded-xl"
                    required
                  />
                  <span className="absolute right-3.5 top-3 text-sm text-slate-400 font-semibold pointer-events-none">
                    %
                  </span>
                </div>
                {errors.taxMeta ? (
                  <p className="text-xs text-rose-500 mt-1">{errors.taxMeta}</p>
                ) : (
                  <p className="text-[11px] text-slate-400">
                    Incide sobre Investimento Meta (Anúncios)
                  </p>
                )}
              </div>

              {/* Alíquota Imposto S/ Vendas (%) */}
              <div className="space-y-2">
                <Label
                  htmlFor="salesTaxRate"
                  className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"
                >
                  Alíquota Imposto S/ Vendas (%)
                </Label>
                <div className="relative">
                  <Input
                    id="salesTaxRate"
                    type="text"
                    inputMode="decimal"
                    value={salesTaxRateStr}
                    onChange={(e) => handleInputChange(setSalesTaxRateStr, e.target.value)}
                    onBlur={() => handleBlurFormat(setSalesTaxRateStr, salesTaxRateStr, 2)}
                    placeholder="7,50"
                    className="h-11 pr-8 text-sm font-semibold tabular-nums text-slate-900 bg-slate-50/50 border-slate-200 focus-visible:ring-purple-500 rounded-xl"
                    required
                  />
                  <span className="absolute right-3.5 top-3 text-sm text-slate-400 font-semibold pointer-events-none">
                    %
                  </span>
                </div>
                {errors.salesTax ? (
                  <p className="text-xs text-rose-500 mt-1">{errors.salesTax}</p>
                ) : (
                  <p className="text-[11px] text-slate-400">Incide sobre o Faturamento Bruto</p>
                )}
              </div>
            </div>
          </div>

          {/* Progresso atual */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50/70 border border-slate-200/80 rounded-xl p-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Faturamento</span>
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
                <span>Lucro</span>
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
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Margem Real</span>
                <span
                  className={`font-bold tabular-nums ${
                    summary.profitMarginGoal
                      ? (summary.averageMargin || 0) >= summary.profitMarginGoal
                        ? 'text-emerald-600'
                        : 'text-rose-600'
                      : 'text-slate-600'
                  }`}
                >
                  {summary.profitMarginGoal
                    ? `${formatPercent(summary.marginGoalPercent, 1)} da meta`
                    : '—'}
                </span>
              </div>
              <div className="text-sm font-bold text-slate-900 tabular-nums">
                {formatPercent(summary.averageMargin, 1)}
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    summary.profitMarginGoal
                      ? (summary.averageMargin || 0) >= summary.profitMarginGoal
                        ? 'bg-emerald-500'
                        : 'bg-rose-500'
                      : 'bg-slate-400'
                  }`}
                  style={{
                    width: summary.profitMarginGoal
                      ? `${Math.min(Math.max(summary.marginGoalPercent || 0, 0), 100)}%`
                      : '0%',
                  }}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between gap-3 pt-1">
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#6D49F2] shrink-0" />
              <span>Valores positivos e obrigatórios</span>
            </div>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-[#6D49F2] to-[#FF2AFF] hover:opacity-90 text-white font-medium px-6 rounded-xl shadow-xs"
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
