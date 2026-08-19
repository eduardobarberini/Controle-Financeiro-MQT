import React, { useMemo } from 'react'
import {
  TrendingUp,
  DollarSign,
  PieChart,
  Percent,
  Save,
  Loader2,
  Calculator,
  Lock,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { KpiCard } from '@/components/dashboard/KpiCard'
import {
  formatCurrency,
  formatCalculatedCurrency,
  formatCalculatedPercent,
  formatCalculatedNumber,
} from '@/lib/launch-format'

export interface ConsolidatedCalculations {
  trafficInvestment: number
  apiOfficialCost: number
  commercialCommission: number
  revenueTaxRate: number
  trafficTaxRate: number
  revenueTaxAmount: number
  trafficTaxAmount: number
  totalInvestment: number
  // Revenues breakout
  ingressosRevenue: number
  orderBumpRevenue: number
  upsellPlatformRevenue: number
  totalFaturamento: number
  // Indicators
  roasMedia: number
  lucroLiquido: number
  margemLucroPercent: number
}

interface ConsolidatedResultTabProps {
  apiOfficialCost: number | string
  commercialCommission: number | string
  revenueTaxRate: number | string
  trafficTaxRate: number | string
  trafficInvestment: number
  ingressosRevenue: number
  orderBumpRevenue: number
  upsellPlatformRevenue: number
  onChangeField: (
    field: 'api_official_cost' | 'commercial_commission' | 'revenue_tax_rate' | 'traffic_tax_rate',
    value: string | number,
  ) => void
  onSave: () => Promise<void>
  saving: boolean
  launchBatch: string
  launchId?: string
}

export const ConsolidatedResultTab: React.FC<ConsolidatedResultTabProps> = ({
  apiOfficialCost,
  commercialCommission,
  revenueTaxRate,
  trafficTaxRate,
  trafficInvestment,
  ingressosRevenue,
  orderBumpRevenue,
  upsellPlatformRevenue,
  onChangeField,
  onSave,
  saving,
  launchBatch,
  launchId,
}) => {
  const calc = useMemo<ConsolidatedCalculations>(() => {
    const apiCost = Number(apiOfficialCost) || 0
    const commCost = Number(commercialCommission) || 0
    const revTaxRate =
      revenueTaxRate !== '' && !isNaN(Number(revenueTaxRate)) ? Number(revenueTaxRate) : 9.0
    const trafTaxRate =
      trafficTaxRate !== '' && !isNaN(Number(trafficTaxRate)) ? Number(trafficTaxRate) : 12.15

    const trafInvestment = Number(trafficInvestment) || 0

    // Sum of remaining revenues (Ingressos, Order Bumps, Upsell Plataforma)
    const totalFaturamento =
      (Number(ingressosRevenue) || 0) +
      (Number(orderBumpRevenue) || 0) +
      (Number(upsellPlatformRevenue) || 0)

    // Taxes
    const revenueTaxAmount = totalFaturamento * (revTaxRate / 100)
    const trafficTaxAmount = trafInvestment * (trafTaxRate / 100)

    // Total investment = Tráfego + API Oficial + Comissão Comercial + Imposto Sobre Faturamento + Imposto Sobre Tráfego
    const totalInvestment =
      trafInvestment + apiCost + commCost + revenueTaxAmount + trafficTaxAmount

    // ROAS (Média) = Total Faturamento / Investimento Tráfego
    const roasMedia = trafInvestment > 0 ? totalFaturamento / trafInvestment : 0

    // Lucro Líquido = Total Faturamento - Total Investimento
    const lucroLiquido = totalFaturamento - totalInvestment

    // % Margem de Lucro = Lucro Líquido / Total Faturamento
    const margemLucroPercent = totalFaturamento > 0 ? lucroLiquido / totalFaturamento : 0

    return {
      trafficInvestment: trafInvestment,
      apiOfficialCost: apiCost,
      commercialCommission: commCost,
      revenueTaxRate: revTaxRate,
      trafficTaxRate: trafTaxRate,
      revenueTaxAmount,
      trafficTaxAmount,
      totalInvestment,
      ingressosRevenue: Number(ingressosRevenue) || 0,
      orderBumpRevenue: Number(orderBumpRevenue) || 0,
      upsellPlatformRevenue: Number(upsellPlatformRevenue) || 0,
      totalFaturamento,
      roasMedia,
      lucroLiquido,
      margemLucroPercent,
    }
  }, [
    apiOfficialCost,
    commercialCommission,
    revenueTaxRate,
    trafficTaxRate,
    trafficInvestment,
    ingressosRevenue,
    orderBumpRevenue,
    upsellPlatformRevenue,
  ])

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* 2. Hierarchical KPI Cards */}
      <div className="space-y-4">
        {/* Top large highlight cards (main KPIs): Lucro Líquido, Margem de Lucro % */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <KpiCard
            size="large"
            title="Lucro Líquido"
            value={calc.lucroLiquido}
            formatType="currency"
            icon={DollarSign}
            subtext="Faturamento Consolidado - Investimento Total"
            iconBgColor={
              calc.lucroLiquido >= 0
                ? 'bg-[#C6E0B4]/60 text-emerald-800 border-emerald-300'
                : 'bg-rose-50 text-rose-600 border-rose-200'
            }
          />

          <KpiCard
            size="large"
            title="Margem de Lucro"
            value={calc.margemLucroPercent}
            formatType="percent"
            decimals={1}
            icon={Percent}
            subtext="Lucro Líquido / Total Faturamento"
            iconBgColor={
              calc.margemLucroPercent >= 0
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }
          />
        </div>

        {/* Bottom smaller cards (secondary KPIs): Investimento Total, Faturamento Total, ROAS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <KpiCard
            title="Investimento Total"
            value={calc.totalInvestment}
            formatType="currency"
            icon={Calculator}
            subtext="Tráfego + API + Comissão + Impostos"
            iconBgColor="bg-[#FF2AFF]/10 text-[#FF2AFF] border-[#FF2AFF]/20"
          />

          <KpiCard
            title="Faturamento Total"
            value={calc.totalFaturamento}
            formatType="currency"
            icon={TrendingUp}
            subtext="Soma de Ingressos, Bumps e Upsell"
            iconBgColor="bg-[#6D49F2]/10 text-[#6D49F2] border-[#6D49F2]/20"
          />

          <KpiCard
            title="ROAS"
            value={calc.roasMedia}
            formatType="roas"
            icon={PieChart}
            subtext="Total Faturamento / Investimento Tráfego"
            iconBgColor="bg-amber-50 text-amber-700 border-amber-200"
          />
        </div>
      </div>

      {/* Main Container: Summary Table + Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Summary Table ("Resultado Lançamento") */}
        <Card className="lg:col-span-2 bg-white border border-slate-200/80 shadow-xs rounded-xl overflow-hidden">
          <div className="bg-[#FAF8FF] border-b border-slate-200 text-slate-800 px-6 py-3 font-bold text-xs uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-[#6D49F2]" />
              Resultado Lançamento
            </span>
            <span className="text-[11px] text-slate-500 font-normal normal-case">
              Consolidação financeira global
            </span>
          </div>

          <div className="p-4 sm:p-6 overflow-x-auto">
            <table className="w-full text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-[#FAF8FF] border-b border-slate-200">
                  <th className="p-3 text-left font-bold text-slate-800 text-xs sm:text-sm">
                    Item / Métrica
                  </th>
                  <th className="p-3 text-right font-bold text-slate-800 bg-[#C6E0B4]/40 w-44 sm:w-56 text-xs sm:text-sm border-l border-slate-200">
                    Resultado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* Investimento (Calculated Sum) - Highlighted in bold green (#C6E0B4) */}
                <tr className="bg-[#C6E0B4] font-bold text-slate-900 text-sm sm:text-base border-t border-b border-emerald-300">
                  <td className="p-3 text-slate-950 flex items-center gap-2">
                    <span>Investimento</span>
                  </td>
                  <td className="p-3 text-right tabular-nums text-slate-950 font-extrabold border-l border-emerald-300/60">
                    {formatCurrency(calc.totalInvestment)}
                  </td>
                </tr>

                {/* Tráfego */}
                <tr className="hover:bg-slate-50/60 transition-colors">
                  <td className="p-2.5 pl-6 font-medium text-slate-700">Tráfego</td>
                  <td className="p-2.5 text-right tabular-nums text-slate-800 font-semibold border-l border-slate-100">
                    {formatCurrency(calc.trafficInvestment)}
                  </td>
                </tr>

                {/* API Oficial */}
                <tr className="hover:bg-slate-50/60 transition-colors">
                  <td className="p-2 pl-6 font-medium text-slate-700 align-middle">API Oficial</td>
                  <td className="p-1.5 text-right border-l border-slate-100">
                    <div className="relative ml-auto max-w-[160px]">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium pointer-events-none">
                        R$
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        placeholder="0"
                        value={apiOfficialCost}
                        onChange={(e) => onChangeField('api_official_cost', e.target.value)}
                        className="pl-8 h-8 text-right font-semibold text-slate-900 text-xs bg-white border-slate-200 focus-visible:ring-[#6D49F2]"
                      />
                    </div>
                  </td>
                </tr>

                {/* Comissão Comercial */}
                <tr className="hover:bg-slate-50/60 transition-colors">
                  <td className="p-2 pl-6 font-medium text-slate-700 align-middle">
                    Comissão Comercial
                  </td>
                  <td className="p-1.5 text-right border-l border-slate-100">
                    <div className="relative ml-auto max-w-[160px]">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium pointer-events-none">
                        R$
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        placeholder="0"
                        value={commercialCommission}
                        onChange={(e) => onChangeField('commercial_commission', e.target.value)}
                        className="pl-8 h-8 text-right font-semibold text-slate-900 text-xs bg-white border-slate-200 focus-visible:ring-[#6D49F2]"
                      />
                    </div>
                  </td>
                </tr>

                {/* Imposto Sobre Faturamento */}
                <tr className="hover:bg-slate-50/60 transition-colors">
                  <td className="p-2.5 pl-6 font-medium text-slate-700">
                    Imposto Sobre Faturamento ({calc.revenueTaxRate.toFixed(1).replace('.', ',')}%)
                  </td>
                  <td className="p-2.5 text-right tabular-nums text-slate-800 font-semibold border-l border-slate-100">
                    {formatCurrency(calc.revenueTaxAmount)}
                  </td>
                </tr>

                {/* Imposto Sobre Tráfego */}
                <tr className="hover:bg-slate-50/60 transition-colors">
                  <td className="p-2.5 pl-6 font-medium text-slate-700">
                    Imposto Sobre Tráfego ({calc.trafficTaxRate.toFixed(2).replace('.', ',')}%)
                  </td>
                  <td className="p-2.5 text-right tabular-nums text-slate-800 font-semibold border-l border-slate-100">
                    {formatCurrency(calc.trafficTaxAmount)}
                  </td>
                </tr>

                {/* Faturamento */}
                <tr className="bg-slate-100/90 font-bold text-slate-900 border-t border-b border-slate-200">
                  <td className="p-3 text-slate-900">Faturamento</td>
                  <td className="p-3 text-right tabular-nums text-slate-900 font-extrabold border-l border-slate-200">
                    {formatCurrency(calc.totalFaturamento)}
                  </td>
                </tr>

                {/* ROAS (Média) */}
                <tr className="hover:bg-slate-50/60 transition-colors">
                  <td className="p-2.5 font-medium text-slate-700">ROAS (Média)</td>
                  <td className="p-2.5 text-right tabular-nums font-bold text-slate-800 border-l border-slate-100">
                    {formatCalculatedNumber(calc.roasMedia, 1)}
                  </td>
                </tr>

                {/* Lucro Líquido - Highlighted in bold green (#C6E0B4) */}
                <tr className="bg-[#C6E0B4] font-bold text-slate-900 text-sm sm:text-base border-t border-b border-emerald-300">
                  <td className="p-3 text-slate-950 font-extrabold">Lucro Líquido</td>
                  <td className="p-3 text-right tabular-nums text-slate-950 font-black border-l border-emerald-300/60">
                    {calc.lucroLiquido < 0
                      ? `-R$ ${Math.abs(calc.lucroLiquido).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : formatCurrency(calc.lucroLiquido)}
                  </td>
                </tr>

                {/* % Margem de Lucro */}
                <tr className="bg-slate-50/80 font-bold border-t border-slate-200">
                  <td className="p-3 text-slate-800">% Margem de Lucro</td>
                  <td className="p-3 text-right tabular-nums font-extrabold text-slate-900 border-l border-slate-200">
                    {formatCalculatedPercent(calc.margemLucroPercent)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        {/* Configuration Panel for Tax Percentages & Revenue Breakout */}
        <div className="space-y-6">
          {/* Configuração de Alíquotas de Imposto */}
          <Card className="bg-white border border-slate-200/80 shadow-xs rounded-xl overflow-hidden p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
              <Percent className="w-4 h-4 text-[#6D49F2]" />
              Configurar Alíquotas de Impostos
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Imposto sobre Faturamento (%)
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.1"
                    min={0}
                    max={100}
                    value={revenueTaxRate}
                    onChange={(e) => onChangeField('revenue_tax_rate', e.target.value)}
                    className="pr-8 h-9 text-xs font-semibold text-slate-900 bg-white border-slate-200 focus-visible:ring-[#6D49F2]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold pointer-events-none">
                    %
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Aplicado sobre o Faturamento Consolidado ({formatCurrency(calc.revenueTaxAmount)})
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Imposto sobre Tráfego (%)
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    max={100}
                    value={trafficTaxRate}
                    onChange={(e) => onChangeField('traffic_tax_rate', e.target.value)}
                    className="pr-8 h-9 text-xs font-semibold text-slate-900 bg-white border-slate-200 focus-visible:ring-[#6D49F2]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold pointer-events-none">
                    %
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Aplicado sobre o Investimento em Tráfego ({formatCurrency(calc.trafficTaxAmount)})
                </p>
              </div>
            </div>
          </Card>

          {/* Origem do Faturamento Consolidado */}
          <Card className="bg-white border border-slate-200/80 shadow-xs rounded-xl overflow-hidden p-5 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
              <TrendingUp className="w-4 h-4 text-[#FF2AFF]" />
              Composição do Faturamento
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-600 flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-slate-400" />
                  Venda Ingressos
                </span>
                <span className="font-bold text-slate-900">{formatCurrency(ingressosRevenue)}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-600 flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-slate-400" />
                  Order Bumps
                </span>
                <span className="font-bold text-slate-900">{formatCurrency(orderBumpRevenue)}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-600 flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-slate-400" />
                  Venda Plataforma (Upsell)
                </span>
                <span className="font-bold text-slate-900">
                  {formatCurrency(upsellPlatformRevenue)}
                </span>
              </div>

              <div className="flex justify-between items-center pt-2 font-extrabold text-sm text-[#6D49F2]">
                <span>Total Consolidado</span>
                <span>{formatCurrency(calc.totalFaturamento)}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* 4. Bottom Action Bar ("Salvar Lançamento" Button) */}
      <Card className="bg-white border border-slate-200/80 shadow-xs rounded-xl p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs text-slate-500 font-medium">
          Lançamento: <span className="font-bold text-[#6D49F2]">{launchBatch || 'Sem nome'}</span>
          {launchId ? ' (Salvo no BD)' : ' (Novo Lançamento)'}
        </div>

        <Button
          onClick={onSave}
          disabled={saving}
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
      </Card>
    </div>
  )
}
