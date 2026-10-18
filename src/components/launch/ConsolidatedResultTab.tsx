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
  FileText,
  Info,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { KpiCard } from '@/components/dashboard/KpiCard'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  formatCurrency,
  formatCalculatedPercent,
  formatCalculatedNumber,
} from '@/lib/launch-format'
import { formatNumber, parsePtBrNumber } from '@/lib/financial-utils'

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
  debriefing?: string
  onChangeField: (
    field:
      | 'api_official_cost'
      | 'commercial_commission'
      | 'revenue_tax_rate'
      | 'traffic_tax_rate'
      | 'debriefing',
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
  debriefing = '',
  onChangeField,
  onSave,
  saving,
  launchBatch,
  launchId,
}) => {
  const calc = useMemo<ConsolidatedCalculations>(() => {
    const apiCost =
      typeof apiOfficialCost === 'string'
        ? parsePtBrNumber(apiOfficialCost)
        : Number(apiOfficialCost) || 0
    const commCost =
      typeof commercialCommission === 'string'
        ? parsePtBrNumber(commercialCommission)
        : Number(commercialCommission) || 0
    const revTaxRate =
      revenueTaxRate !== '' && revenueTaxRate !== undefined && revenueTaxRate !== null
        ? typeof revenueTaxRate === 'string'
          ? parsePtBrNumber(revenueTaxRate)
          : Number(revenueTaxRate)
        : 9.0
    const trafTaxRate =
      trafficTaxRate !== '' && trafficTaxRate !== undefined && trafficTaxRate !== null
        ? typeof trafficTaxRate === 'string'
          ? parsePtBrNumber(trafficTaxRate)
          : Number(trafficTaxRate)
        : 12.15

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
                ? 'bg-slate-100 text-[#6D49F2] border-slate-200'
                : 'bg-rose-50 text-rose-600 border-rose-200'
            }
          />
          <KpiCard
            size="large"
            title="Margem de Lucro"
            value={calc.margemLucroPercent * 100}
            formatType="percent"
            decimals={1}
            icon={Percent}
            subtext="Lucro Líquido / Total Faturamento"
            iconBgColor={
              calc.margemLucroPercent >= 0
                ? 'bg-slate-100 text-[#6D49F2] border-slate-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }
          />{' '}
        </div>

        {/* Bottom smaller cards (secondary KPIs): Investimento Total, Faturamento Total, ROAS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <KpiCard
            title="Investimento Total"
            value={calc.totalInvestment}
            formatType="currency"
            icon={Calculator}
            subtext="Tráfego + API + Comissão + Impostos"
            iconBgColor="bg-slate-100 text-slate-700 border-slate-200"
          />

          <KpiCard
            title="Faturamento Total"
            value={calc.totalFaturamento}
            formatType="currency"
            icon={TrendingUp}
            subtext="Soma de Ingressos, Bumps e Upsell"
            iconBgColor="bg-slate-100 text-[#6D49F2] border-slate-200"
          />

          <KpiCard
            title="ROAS"
            value={calc.roasMedia}
            formatType="roas"
            icon={PieChart}
            subtext="Total Faturamento / Investimento Tráfego"
            iconBgColor="bg-slate-100 text-[#6D49F2] border-slate-200"
          />
        </div>
      </div>

      {/* Main Container: Summary Table + Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Summary Table ("Resultado Lançamento") */}
        <Card className="lg:col-span-2 bg-white border-slate-200/90 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="p-5 pb-3 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-[#6D49F2]" />
                Resultado Lançamento
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Consolidação financeira global
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow className="hover:bg-transparent border-b border-slate-200">
                    <TableHead className="py-2.5 px-3 text-left font-bold text-slate-800 text-xs">
                      Item / Métrica
                    </TableHead>
                    <TableHead className="py-2.5 px-3 text-right font-bold text-slate-800 bg-slate-100/80 w-44 sm:w-56 text-xs border-l border-slate-200">
                      Resultado
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Investimento (Calculated Sum) */}
                  <TableRow className="bg-slate-100/90 font-bold text-slate-900 text-xs border-b border-slate-200 hover:bg-slate-100">
                    <TableCell className="py-2.5 px-3 text-slate-900 font-bold">
                      Investimento
                    </TableCell>
                    <TableCell className="py-2.5 px-3 text-right tabular-nums text-slate-900 font-extrabold border-l border-slate-200">
                      {formatCurrency(calc.totalInvestment)}
                    </TableCell>
                  </TableRow>

                  {/* Tráfego */}
                  <TableRow className="hover:bg-slate-50/50 transition-colors border-b border-slate-100">
                    <TableCell className="py-2.5 px-3 pl-6 font-medium text-xs text-slate-700">
                      Tráfego
                    </TableCell>
                    <TableCell className="py-2.5 px-3 text-right tabular-nums text-slate-800 font-semibold border-l border-slate-100 text-xs">
                      {formatCurrency(calc.trafficInvestment)}
                    </TableCell>
                  </TableRow>

                  {/* API Oficial */}
                  <TableRow className="hover:bg-slate-50/50 transition-colors border-b border-slate-100">
                    <TableCell className="py-2 px-3 pl-6 font-medium text-xs text-slate-700 align-middle">
                      API Oficial
                    </TableCell>
                    <TableCell className="py-2 px-3 text-right border-l border-slate-100">
                      <div className="relative ml-auto max-w-[160px]">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium pointer-events-none">
                          R$
                        </span>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="0,00"
                          value={
                            apiOfficialCost === '' ||
                            apiOfficialCost === undefined ||
                            apiOfficialCost === null
                              ? ''
                              : String(apiOfficialCost)
                          }
                          onChange={(e) =>
                            onChangeField(
                              'api_official_cost',
                              e.target.value.replace(/[^0-9.,]/g, ''),
                            )
                          }
                          onBlur={() => {
                            if (
                              apiOfficialCost !== '' &&
                              apiOfficialCost !== undefined &&
                              apiOfficialCost !== null
                            ) {
                              const parsed = parsePtBrNumber(apiOfficialCost)
                              if (parsed > 0) {
                                onChangeField('api_official_cost', formatNumber(parsed, 2))
                              }
                            }
                          }}
                          className="pl-8 h-8 text-right font-semibold text-slate-900 text-xs bg-white border-slate-200 focus-visible:ring-[#6D49F2] shadow-2xs"
                        />
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Comissão Comercial (auto-derived from "Vendas Comercial" tab) */}
                  <TableRow className="hover:bg-slate-50/50 transition-colors border-b border-slate-100">
                    <TableCell className="py-2 px-3 pl-6 font-medium text-xs text-slate-700 align-middle">
                      <span className="flex items-center gap-1.5">
                        Comissão Comercial
                        <Lock
                          className="w-3 h-3 text-slate-400"
                          aria-label="Calculado automaticamente na aba Vendas Comercial"
                        />
                      </span>
                    </TableCell>
                    <TableCell className="py-2 px-3 text-right border-l border-slate-100">
                      <div className="ml-auto max-w-[160px]">
                        <span className="inline-flex items-center justify-end w-full px-2.5 h-8 rounded-md bg-slate-50 border border-slate-200 font-semibold tabular-nums text-slate-900 text-xs">
                          {formatCurrency(calc.commercialCommission)}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Imposto Sobre Faturamento */}
                  <TableRow className="hover:bg-slate-50/50 transition-colors border-b border-slate-100">
                    <TableCell className="py-2.5 px-3 pl-6 font-medium text-xs text-slate-700">
                      Imposto Sobre Faturamento ({formatNumber(calc.revenueTaxRate, 1)}%)
                    </TableCell>
                    <TableCell className="py-2.5 px-3 text-right tabular-nums text-slate-800 font-semibold border-l border-slate-100 text-xs">
                      {formatCurrency(calc.revenueTaxAmount)}
                    </TableCell>
                  </TableRow>

                  {/* Imposto Sobre Tráfego */}
                  <TableRow className="hover:bg-slate-50/50 transition-colors border-b border-slate-100">
                    <TableCell className="py-2.5 px-3 pl-6 font-medium text-xs text-slate-700">
                      Imposto Sobre Tráfego ({formatNumber(calc.trafficTaxRate, 2)}%)
                    </TableCell>
                    <TableCell className="py-2.5 px-3 text-right tabular-nums text-slate-800 font-semibold border-l border-slate-100 text-xs">
                      {formatCurrency(calc.trafficTaxAmount)}
                    </TableCell>
                  </TableRow>

                  {/* Faturamento */}
                  <TableRow className="bg-emerald-50 font-bold text-emerald-950 border-b border-emerald-200 hover:bg-emerald-50">
                    <TableCell className="py-2.5 px-3 text-xs text-emerald-950 font-bold">
                      Faturamento
                    </TableCell>
                    <TableCell className="py-2.5 px-3 text-right tabular-nums text-emerald-950 font-extrabold border-l border-emerald-200 text-xs">
                      {formatCurrency(calc.totalFaturamento)}
                    </TableCell>
                  </TableRow>

                  {/* ROAS (Média) */}
                  <TableRow className="bg-amber-50 hover:bg-amber-50/80 transition-colors border-b border-amber-200">
                    <TableCell className="py-2.5 px-3 font-bold text-xs text-amber-950">
                      ROAS (Média)
                    </TableCell>
                    <TableCell className="py-2.5 px-3 text-right tabular-nums font-extrabold text-amber-950 border-l border-amber-200 text-xs">
                      {formatCalculatedNumber(calc.roasMedia, 2)}
                    </TableCell>
                  </TableRow>

                  {/* Lucro Líquido */}
                  <TableRow className="bg-emerald-50 font-bold text-emerald-950 text-xs border-b border-emerald-200 hover:bg-emerald-50">
                    <TableCell className="py-2.5 px-3 text-emerald-950 font-extrabold">
                      Lucro Líquido
                    </TableCell>
                    <TableCell className="py-2.5 px-3 text-right tabular-nums text-emerald-950 font-black border-l border-emerald-200 text-xs">
                      {formatCurrency(calc.lucroLiquido)}
                    </TableCell>
                  </TableRow>

                  {/* % Margem de Lucro */}
                  <TableRow className="bg-amber-50 font-bold border-b border-amber-200 hover:bg-amber-50">
                    <TableCell className="py-2.5 px-3 text-amber-950 font-bold text-xs">
                      % Margem de Lucro
                    </TableCell>
                    <TableCell className="py-2.5 px-3 text-right tabular-nums font-extrabold text-amber-950 border-l border-amber-200 text-xs">
                      {formatCalculatedPercent(calc.margemLucroPercent)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Configuration Panel for Tax Percentages & Revenue Breakout */}
        <div className="space-y-6">
          {/* Configuração de Alíquotas de Imposto */}
          <Card className="bg-white border-slate-200/90 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="p-5 pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Percent className="w-4 h-4 text-[#6D49F2]" />
                Alíquotas de Impostos
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Defina os percentuais de tributação aplicados
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5 space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Imposto sobre Faturamento (%)
                  </label>
                  <div className="relative">
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="9,0"
                      value={
                        revenueTaxRate === '' ||
                        revenueTaxRate === undefined ||
                        revenueTaxRate === null
                          ? ''
                          : String(revenueTaxRate)
                      }
                      onChange={(e) =>
                        onChangeField('revenue_tax_rate', e.target.value.replace(/[^0-9.,]/g, ''))
                      }
                      onBlur={() => {
                        if (
                          revenueTaxRate !== '' &&
                          revenueTaxRate !== undefined &&
                          revenueTaxRate !== null
                        ) {
                          const parsed = parsePtBrNumber(revenueTaxRate)
                          if (parsed > 0) {
                            onChangeField('revenue_tax_rate', formatNumber(parsed, 1))
                          }
                        }
                      }}
                      className="pr-8 h-8 text-xs font-semibold text-slate-900 bg-white border-slate-200 focus-visible:ring-[#6D49F2] shadow-2xs tabular-nums"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold pointer-events-none">
                      %
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Aplicado sobre o Faturamento Consolidado (
                    {formatCurrency(calc.revenueTaxAmount)})
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Imposto sobre Tráfego (%)
                  </label>
                  <div className="relative">
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="12,15"
                      value={
                        trafficTaxRate === '' ||
                        trafficTaxRate === undefined ||
                        trafficTaxRate === null
                          ? ''
                          : String(trafficTaxRate)
                      }
                      onChange={(e) =>
                        onChangeField('traffic_tax_rate', e.target.value.replace(/[^0-9.,]/g, ''))
                      }
                      onBlur={() => {
                        if (
                          trafficTaxRate !== '' &&
                          trafficTaxRate !== undefined &&
                          trafficTaxRate !== null
                        ) {
                          const parsed = parsePtBrNumber(trafficTaxRate)
                          if (parsed > 0) {
                            onChangeField('traffic_tax_rate', formatNumber(parsed, 2))
                          }
                        }
                      }}
                      className="pr-8 h-8 text-xs font-semibold text-slate-900 bg-white border-slate-200 focus-visible:ring-[#6D49F2] shadow-2xs tabular-nums"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold pointer-events-none">
                      %
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Aplicado sobre o Investimento em Tráfego (
                    {formatCurrency(calc.trafficTaxAmount)})
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Origem do Faturamento Consolidado */}
          <Card className="bg-white border-slate-200/90 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="p-5 pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#FF2AFF]" />
                Composição do Faturamento
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Origem das receitas do lançamento
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5">
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-slate-400" />
                    Venda Ingressos
                  </span>
                  <span className="font-bold text-slate-900">
                    {formatCurrency(ingressosRevenue)}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-slate-400" />
                    Order Bumps
                  </span>
                  <span className="font-bold text-slate-900">
                    {formatCurrency(orderBumpRevenue)}
                  </span>
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
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 3. Debriefing Section */}
      <Card className="bg-white border-slate-200/90 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="p-5 pb-3 border-b border-slate-100">
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#6D49F2]" />
            Debriefing
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 mt-0.5">
            Espaço para descrever o lançamento e observações importantes
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5">
          <Textarea
            value={debriefing || ''}
            onChange={(e) => onChangeField('debriefing', e.target.value)}
            placeholder="Descreva aqui o resumo do lançamento, aprendizados, pontos positivos, gargalos, testes de criativos e ofertas, observações do time comercial e planos para a próxima turma..."
            rows={8}
            className="min-h-[160px] text-sm text-slate-800 bg-white border-slate-200 focus-visible:ring-[#6D49F2] rounded-xl resize-y leading-relaxed"
          />
        </CardContent>
      </Card>

      {/* 4. Bottom Action Bar ("Salvar Lançamento" Button) */}
      <Card className="bg-white border-slate-200/90 shadow-sm rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
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

      {/* 5. Explanatory Footer */}
      <div className="bg-slate-100/80 border border-slate-200/90 rounded-2xl p-4 sm:p-5 flex items-start gap-3 text-xs text-slate-600">
        <Info className="w-4 h-4 text-[#6D49F2] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-slate-800">Regras de Cálculo Automático</p>
          <p>
            • <strong>Faturamento Total</strong> = Venda Ingressos + Order Bumps + Venda Plataforma
            (Upsell).
          </p>
          <p>
            • <strong>Imposto Sobre Faturamento</strong> = Faturamento Total ×{' '}
            {formatNumber(calc.revenueTaxRate, 1)}% (auto, calculado sobre o faturamento
            consolidado).
          </p>
          <p>
            • <strong>Imposto Sobre Tráfego</strong> = Investimento Tráfego ×{' '}
            {formatNumber(calc.trafficTaxRate, 2)}% (auto, calculado sobre os anúncios em tráfego).
          </p>
          <p>
            • <strong>Investimento Total</strong> = Tráfego + API Oficial + Comissão Comercial +
            Imposto Sobre Faturamento + Imposto Sobre Tráfego.
          </p>
          <p>
            • <strong>ROAS (Média)</strong> = Faturamento Total ÷ Investimento Tráfego. Exibe
            &ldquo;—&rdquo; se o tráfego for 0.
          </p>
          <p>
            • <strong>Lucro Líquido</strong> = Faturamento Total − Investimento Total.
          </p>
          <p>
            • <strong>% Margem de Lucro</strong> = Lucro Líquido ÷ Faturamento Total × 100 (1 casa).
            Exibe &ldquo;—&rdquo; se o faturamento for 0.
          </p>
        </div>
      </div>
    </div>
  )
}
