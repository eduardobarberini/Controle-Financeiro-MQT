import React, { useMemo } from 'react'
import { ArrowUpCircle, Save, Loader2, DollarSign, Percent, CalendarDays, Lock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { KpiCard } from '@/components/dashboard/KpiCard'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PlatformDailyChart } from '@/components/launch/PlatformDailyChart'
import type { UpsellPlatform, UpsellDailyEntry } from '@/types/paidLaunches'
import { formatCurrency, formatCalculatedPercent } from '@/lib/launch-format'
import { formatNumber, parsePtBrNumber } from '@/lib/financial-utils'

interface UpsellPlatformTabProps {
  upsellData: UpsellPlatform
  onChangeField: (field: keyof UpsellPlatform, value: string | number | UpsellDailyEntry[]) => void
  onChangeDailyField: (index: number, field: keyof UpsellDailyEntry, value: string | number) => void
  dailySalesList: UpsellDailyEntry[]
  upsellCalc: {
    conversionRate: number
    boletoRate: number
    refundRate: number
    platformRevenue: number
    calculatedCardPixSales: number
    calculatedCardPixRevenue: number
    calculatedBoletoSales: number
    calculatedBoletoRevenue: number
    calculatedTotalSales: number
    dailyCalculatedTotals: {
      cardPixSales: number
      cardPixRevenue: number
      boletoSales: number
      boletoRevenue: number
      totalSales: number
      totalRevenue: number
      conversionRate: number
      dayIngressos: number
    }[]
  }
  onSave: () => Promise<void>
  saving: boolean
  launchBatch: string
  launchId?: string
  totalTicketSales?: number
}

export const UpsellPlatformTab: React.FC<UpsellPlatformTabProps> = ({
  upsellData,
  onChangeField,
  onChangeDailyField,
  dailySalesList,
  upsellCalc,
  onSave,
  saving,
  launchBatch,
  launchId,
}) => {
  // Build chart data from the same dailyPlatformData that feeds the daily control table.
  // Total sales per day = Cartão/PIX + Boleto; conversion = the same "% Conversão Desafio / Plataforma" calc.
  const chartData = useMemo(() => {
    return (dailySalesList ?? []).map((day, idx) => {
      const calcDay = upsellCalc.dailyCalculatedTotals?.[idx]
      return {
        dayLabel: day.isPrimeiraHora ? '1ª Hora' : day.dayLabel,
        totalSales: calcDay?.totalSales ?? 0,
        conversionRate: calcDay?.conversionRate ?? 0,
      }
    })
  }, [dailySalesList, upsellCalc.dailyCalculatedTotals])

  return (
    <div className="space-y-6">
      {/* Upper Header / KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <KpiCard
          title="Vendas Totais"
          value={upsellCalc.calculatedTotalSales}
          formatType="raw"
          icon={DollarSign}
          subtext="Total de vendas na plataforma"
          iconBgColor="bg-slate-100 text-[#6D49F2] border-slate-200"
        />
        <KpiCard
          title="% Conversão Desafio / Plataforma"
          value={upsellCalc.conversionRate * 100}
          formatType="percent"
          decimals={2}
          icon={Percent}
          subtext="Vendas plataforma / Vendas de ingressos"
          iconBgColor="bg-slate-100 text-[#FF2AFF] border-slate-200"
        />
        <KpiCard
          title="Faturamento Plataforma"
          value={upsellCalc.platformRevenue}
          formatType="currency"
          icon={DollarSign}
          subtext="Receita total gerada na plataforma"
          iconBgColor="bg-slate-100 text-[#6D49F2] border-slate-200"
        />
      </div>

      {/* CHART: Vendas Diárias × Conversão (Recharts) */}
      <PlatformDailyChart days={chartData} />

      {/* Main Form Card */}
      <Card className="bg-white border-slate-200/90 shadow-sm rounded-2xl overflow-hidden">
        {/* Header */}
        <CardHeader className="p-5 pb-3 border-b border-slate-100">
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ArrowUpCircle className="w-4 h-4 text-[#6D49F2]" />
            Vendas Plataforma
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 mt-0.5">
            Consolidação e conversão das vendas realizadas na plataforma
          </CardDescription>
        </CardHeader>

        <div className="p-4 sm:p-6 space-y-2.5">
          {/* % Conversão Geral (Calculated) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-2 bg-amber-50 px-3 rounded-lg border border-amber-200">
            <span className="font-bold text-xs text-amber-950">% Conversão Geral</span>
            <div className="text-right font-extrabold tabular-nums text-xs text-amber-950">
              {formatCalculatedPercent(upsellCalc.conversionRate)}
            </div>
          </div>

          {/* Vendas Totais (Calculated from daily sales) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-2 bg-slate-50/80 px-3 rounded-lg border border-slate-200/70">
            <span className="font-bold text-xs text-slate-700 flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-slate-400" />
              Vendas Totais (calculado)
            </span>
            <div className="text-right font-bold tabular-nums text-xs text-slate-900">
              {upsellCalc.calculatedTotalSales}
            </div>
          </div>

          {/* Ticket (Manual) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-1.5 border-b border-slate-100">
            <span className="font-medium text-xs text-slate-700">Ticket</span>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-medium pointer-events-none">
                R$
              </span>
              <Input
                type="text"
                inputMode="decimal"
                value={
                  upsellData.ticket === '' ||
                  upsellData.ticket === undefined ||
                  upsellData.ticket === null
                    ? ''
                    : String(upsellData.ticket)
                }
                onChange={(e) => onChangeField('ticket', e.target.value.replace(/[^0-9.,]/g, ''))}
                onBlur={() => {
                  if (
                    upsellData.ticket !== '' &&
                    upsellData.ticket !== undefined &&
                    upsellData.ticket !== null
                  ) {
                    const parsed = parsePtBrNumber(upsellData.ticket)
                    if (parsed > 0) {
                      onChangeField('ticket', formatNumber(parsed, 2))
                    }
                  }
                }}
                placeholder="0,00"
                className="pl-7 bg-white border-slate-200 text-slate-900 font-semibold tabular-nums text-xs h-8 rounded-lg focus-visible:ring-[#6D49F2] shadow-2xs"
              />
            </div>
          </div>

          {/* Vendas Cartão / Pix (Calculated) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-2 bg-slate-50/80 px-3 rounded-lg border border-slate-200/70">
            <span className="font-medium text-xs text-slate-700 flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-slate-400" />
              Vendas Cartão / Pix (soma dos dias)
            </span>
            <div className="text-right font-bold tabular-nums text-xs text-slate-900">
              {upsellCalc.calculatedCardPixSales}
            </div>
          </div>

          {/* Vendas Boleto 3x (Calculated) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-2 bg-slate-50/80 px-3 rounded-lg border border-slate-200/70">
            <span className="font-medium text-xs text-slate-700 flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-slate-400" />
              Vendas Boleto 3x (soma dos dias)
            </span>
            <div className="text-right font-bold tabular-nums text-xs text-slate-900">
              {upsellCalc.calculatedBoletoSales}
            </div>
          </div>

          {/* % Vendas Boleto 3x (Calculated) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-2 bg-slate-50/80 px-3 rounded-lg border border-slate-200/70">
            <span className="font-medium text-xs text-slate-500">% Vendas Boleto 3x</span>
            <div className="text-right font-bold tabular-nums text-xs text-slate-700">
              {formatCalculatedPercent(upsellCalc.boletoRate)}
            </div>
          </div>

          {/* Reembolsos (Manual) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-1.5 border-b border-slate-100">
            <span className="font-medium text-xs text-slate-700">Reembolsos</span>
            <Input
              type="text"
              inputMode="numeric"
              value={
                upsellData.refunds === '' ||
                upsellData.refunds === undefined ||
                upsellData.refunds === null
                  ? ''
                  : String(upsellData.refunds)
              }
              onChange={(e) => onChangeField('refunds', e.target.value.replace(/[^0-9.,]/g, ''))}
              onBlur={() => {
                if (
                  upsellData.refunds !== '' &&
                  upsellData.refunds !== undefined &&
                  upsellData.refunds !== null
                ) {
                  const parsed = parsePtBrNumber(upsellData.refunds)
                  if (parsed > 0) {
                    onChangeField('refunds', formatNumber(parsed, 0))
                  }
                }
              }}
              placeholder="0"
              className="bg-white border-slate-200 text-slate-900 font-semibold tabular-nums text-center text-xs h-8 rounded-lg focus-visible:ring-[#6D49F2] shadow-2xs"
            />
          </div>

          {/* % Reembolsos (Calculated) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-2 bg-slate-50/80 px-3 rounded-lg border border-slate-200/70">
            <span className="font-medium text-xs text-slate-500">% Reembolsos</span>
            <div className="text-right font-bold tabular-nums text-xs text-slate-700">
              {formatCalculatedPercent(upsellCalc.refundRate)}
            </div>
          </div>

          {/* Faturamento Plataforma (Calculated) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-2 bg-emerald-50 px-3 rounded-lg border border-emerald-200">
            <span className="font-bold text-xs text-emerald-950">Faturamento Plataforma</span>
            <div className="text-right font-extrabold tabular-nums text-xs text-emerald-950">
              {formatCurrency(upsellCalc.platformRevenue)}
            </div>
          </div>

          {/* Taxa inadimplência boleto (%) (Manual) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-1.5 border-b border-slate-100">
            <span className="font-medium text-xs text-slate-700">
              Taxa inadimplência boleto (%)
            </span>
            <div className="relative">
              <Input
                type="text"
                inputMode="decimal"
                value={
                  upsellData.inadimplencia_rate === '' ||
                  upsellData.inadimplencia_rate === undefined ||
                  upsellData.inadimplencia_rate === null
                    ? ''
                    : String(upsellData.inadimplencia_rate)
                }
                onChange={(e) =>
                  onChangeField('inadimplencia_rate', e.target.value.replace(/[^0-9.,]/g, ''))
                }
                onBlur={() => {
                  if (
                    upsellData.inadimplencia_rate !== '' &&
                    upsellData.inadimplencia_rate !== undefined &&
                    upsellData.inadimplencia_rate !== null
                  ) {
                    const parsed = parsePtBrNumber(upsellData.inadimplencia_rate)
                    if (parsed > 0) {
                      onChangeField('inadimplencia_rate', formatNumber(parsed, 2))
                    }
                  }
                }}
                placeholder="0,00"
                className="pr-7 bg-white border-slate-200 text-slate-900 font-semibold tabular-nums text-center text-xs h-8 rounded-lg focus-visible:ring-[#6D49F2] shadow-2xs"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-medium pointer-events-none">
                %
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* CONTROLE DIÁRIO VENDAS - Table below upper consolidated form */}
      <Card className="bg-white border-slate-200/90 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="p-5 pb-3 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-[#6D49F2]" />
              Controle Diário Vendas
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Acompanhamento diário das vendas e faturamento da plataforma
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-[800px]">
              <TableHeader className="bg-slate-50/80">
                <TableRow className="hover:bg-transparent border-b border-slate-200">
                  <TableHead className="py-2.5 px-3 text-center font-bold text-slate-800 bg-slate-100/80 min-w-[220px] text-xs border-r border-slate-200">
                    Controle Diário Vendas
                  </TableHead>
                  {dailySalesList.map((day, idx) => {
                    const isPrimeiraHora =
                      day.isPrimeiraHora ||
                      (idx === 0 && day.dayLabel?.toLowerCase().includes('primeira'))
                    if (isPrimeiraHora) {
                      return (
                        <TableHead
                          key={idx}
                          className="py-2.5 px-3 text-center font-bold text-slate-900 bg-slate-100/80 min-w-[120px] text-xs border-x-2 border-t-2 border-black"
                        >
                          Primeira Hora
                        </TableHead>
                      )
                    }
                    return (
                      <TableHead
                        key={idx}
                        className="py-2 px-2.5 text-center font-bold text-slate-800 bg-slate-50 border-r border-slate-200 min-w-[110px] text-xs"
                      >
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="text"
                            value={day.dayLabel || ''}
                            onChange={(e) => onChangeDailyField(idx, 'dayLabel', e.target.value)}
                            className="w-12 text-center font-bold text-slate-800 bg-transparent border-b border-dashed border-slate-400 focus:outline-none focus:border-[#6D49F2] text-xs"
                            placeholder="Dia"
                          />
                        </div>
                        <div className="text-[11px] text-slate-800 font-medium mt-0.5">
                          <input
                            type="text"
                            value={day.dateLabel || ''}
                            onChange={(e) => onChangeDailyField(idx, 'dateLabel', e.target.value)}
                            className="w-12 text-center text-slate-800 bg-transparent border-b border-dashed border-slate-400 focus:outline-none focus:border-[#6D49F2] text-[11px]"
                            placeholder="Data"
                          />
                        </div>
                      </TableHead>
                    )
                  })}
                </TableRow>
              </TableHeader>

              <TableBody>
                {/* Vendas Cartão / PIX */}
                <TableRow className="bg-white hover:bg-slate-50/50 transition-colors border-b border-slate-100">
                  <TableCell className="py-2.5 px-3 font-medium text-xs text-slate-900 border-r border-slate-200">
                    Vendas Cartão / PIX
                  </TableCell>
                  {dailySalesList.map((day, idx) => {
                    const isPrimeiraHora =
                      day.isPrimeiraHora ||
                      (idx === 0 && day.dayLabel?.toLowerCase().includes('primeira'))
                    return (
                      <TableCell
                        key={idx}
                        className={`py-2 px-2.5 text-center text-xs ${
                          isPrimeiraHora ? 'border-x-2 border-black' : 'border-r border-slate-200'
                        }`}
                      >
                        <Input
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={
                            day.card_pix_sales === '' ||
                            day.card_pix_sales === undefined ||
                            day.card_pix_sales === null
                              ? ''
                              : String(day.card_pix_sales)
                          }
                          onChange={(e) =>
                            onChangeDailyField(
                              idx,
                              'card_pix_sales',
                              e.target.value.replace(/[^0-9.,]/g, ''),
                            )
                          }
                          onBlur={() => {
                            if (
                              day.card_pix_sales !== '' &&
                              day.card_pix_sales !== undefined &&
                              day.card_pix_sales !== null
                            ) {
                              const parsed = parsePtBrNumber(day.card_pix_sales)
                              if (parsed > 0) {
                                onChangeDailyField(idx, 'card_pix_sales', formatNumber(parsed, 0))
                              }
                            }
                          }}
                          className="h-8 text-center font-semibold tabular-nums text-slate-900 text-xs bg-white border-slate-200 focus-visible:ring-[#6D49F2] shadow-2xs"
                        />
                      </TableCell>
                    )
                  })}
                </TableRow>

                {/* Faturamento Cartão / PIX */}
                <TableRow className="bg-slate-50/40 hover:bg-slate-50/50 transition-colors border-b border-slate-100">
                  <TableCell className="py-2.5 px-3 font-medium text-xs text-slate-900 border-r border-slate-200">
                    Faturamento Cartão / PIX
                  </TableCell>
                  {upsellCalc.dailyCalculatedTotals.map((calcDay, idx) => {
                    const day = dailySalesList[idx]
                    const isPrimeiraHora =
                      day?.isPrimeiraHora ||
                      (idx === 0 && day?.dayLabel?.toLowerCase().includes('primeira'))
                    return (
                      <TableCell
                        key={idx}
                        className={`py-2.5 px-3 text-center tabular-nums text-slate-900 font-semibold text-xs ${
                          isPrimeiraHora ? 'border-x-2 border-black' : 'border-r border-slate-200'
                        }`}
                      >
                        {formatCurrency(calcDay.cardPixRevenue)}
                      </TableCell>
                    )
                  })}
                </TableRow>

                {/* Vendas Boleto Parcelado */}
                <TableRow className="bg-white hover:bg-slate-50/50 transition-colors border-b border-slate-100">
                  <TableCell className="py-2.5 px-3 font-medium text-xs text-slate-900 border-r border-slate-200">
                    Vendas Boleto Parcelado
                  </TableCell>
                  {dailySalesList.map((day, idx) => {
                    const isPrimeiraHora =
                      day.isPrimeiraHora ||
                      (idx === 0 && day.dayLabel?.toLowerCase().includes('primeira'))
                    return (
                      <TableCell
                        key={idx}
                        className={`py-2 px-2.5 text-center text-xs ${
                          isPrimeiraHora ? 'border-x-2 border-black' : 'border-r border-slate-200'
                        }`}
                      >
                        <Input
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={
                            day.boleto_sales === '' ||
                            day.boleto_sales === undefined ||
                            day.boleto_sales === null
                              ? ''
                              : String(day.boleto_sales)
                          }
                          onChange={(e) =>
                            onChangeDailyField(
                              idx,
                              'boleto_sales',
                              e.target.value.replace(/[^0-9.,]/g, ''),
                            )
                          }
                          onBlur={() => {
                            if (
                              day.boleto_sales !== '' &&
                              day.boleto_sales !== undefined &&
                              day.boleto_sales !== null
                            ) {
                              const parsed = parsePtBrNumber(day.boleto_sales)
                              if (parsed > 0) {
                                onChangeDailyField(idx, 'boleto_sales', formatNumber(parsed, 0))
                              }
                            }
                          }}
                          className="h-8 text-center font-semibold tabular-nums text-slate-900 text-xs bg-white border-slate-200 focus-visible:ring-[#6D49F2] shadow-2xs"
                        />
                      </TableCell>
                    )
                  })}
                </TableRow>

                {/* Faturamento Boleto Parcelado */}
                <TableRow className="bg-slate-50/40 hover:bg-slate-50/50 transition-colors border-b border-slate-100">
                  <TableCell className="py-2.5 px-3 font-medium text-xs text-slate-900 border-r border-slate-200">
                    Faturamento Boleto Parcelado
                  </TableCell>
                  {upsellCalc.dailyCalculatedTotals.map((calcDay, idx) => {
                    const day = dailySalesList[idx]
                    const isPrimeiraHora =
                      day?.isPrimeiraHora ||
                      (idx === 0 && day?.dayLabel?.toLowerCase().includes('primeira'))
                    return (
                      <TableCell
                        key={idx}
                        className={`py-2.5 px-3 text-center tabular-nums text-slate-900 font-semibold text-xs ${
                          isPrimeiraHora ? 'border-x-2 border-black' : 'border-r border-slate-200'
                        }`}
                      >
                        {formatCurrency(calcDay.boletoRevenue)}
                      </TableCell>
                    )
                  })}
                </TableRow>

                {/* Vendas Totais */}
                <TableRow className="bg-slate-100/90 border-b border-slate-200 text-slate-900 font-bold hover:bg-slate-100">
                  <TableCell className="py-2.5 px-3 font-bold text-slate-900 border-r border-slate-200 text-xs">
                    Vendas Totais
                  </TableCell>
                  {upsellCalc.dailyCalculatedTotals.map((calcDay, idx) => {
                    const day = dailySalesList[idx]
                    const isPrimeiraHora =
                      day?.isPrimeiraHora ||
                      (idx === 0 && day?.dayLabel?.toLowerCase().includes('primeira'))
                    return (
                      <TableCell
                        key={idx}
                        className={`py-2.5 px-3 text-center tabular-nums text-slate-900 font-bold text-xs ${
                          isPrimeiraHora ? 'border-x-2 border-black' : 'border-r border-slate-200'
                        }`}
                      >
                        {calcDay.totalSales}
                      </TableCell>
                    )
                  })}
                </TableRow>

                {/* % Conversão Desafio / Plataforma */}
                <TableRow className="bg-amber-50 text-amber-950 font-bold border-b border-amber-200 hover:bg-amber-50">
                  <TableCell className="py-2.5 px-3 font-bold text-amber-950 border-r border-amber-200 text-xs">
                    % Conversão Desafio / Plataforma
                  </TableCell>
                  {upsellCalc.dailyCalculatedTotals.map((calcDay, idx) => {
                    const day = dailySalesList[idx]
                    const isPrimeiraHora =
                      day?.isPrimeiraHora ||
                      (idx === 0 && day?.dayLabel?.toLowerCase().includes('primeira'))
                    return (
                      <TableCell
                        key={idx}
                        className={`py-2.5 px-3 text-center tabular-nums text-amber-950 font-extrabold text-xs ${
                          isPrimeiraHora ? 'border-x-2 border-black' : 'border-r border-amber-200'
                        }`}
                      >
                        {formatCalculatedPercent(calcDay.conversionRate)}
                      </TableCell>
                    )
                  })}
                </TableRow>

                {/* Faturamento Total */}
                <TableRow className="bg-emerald-50 text-emerald-950 font-bold border-b border-emerald-200 hover:bg-emerald-50">
                  <TableCell className="py-2.5 px-3 text-emerald-950 font-bold text-xs border-r border-emerald-200">
                    Faturamento Total
                  </TableCell>
                  {upsellCalc.dailyCalculatedTotals.map((calcDay, idx) => {
                    const day = dailySalesList[idx]
                    const isPrimeiraHora =
                      day?.isPrimeiraHora ||
                      (idx === 0 && day?.dayLabel?.toLowerCase().includes('primeira'))
                    return (
                      <TableCell
                        key={idx}
                        className={`py-2.5 px-3 text-center tabular-nums text-emerald-950 font-extrabold text-xs ${
                          isPrimeiraHora
                            ? 'border-x-2 border-b-2 border-black'
                            : 'border-r border-emerald-200'
                        }`}
                      >
                        {formatCurrency(calcDay.totalRevenue)}
                      </TableCell>
                    )
                  })}
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>

        {/* Action Bar */}
        <div className="p-4 sm:p-6 bg-slate-50/80 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500 font-medium">
            Lançamento selecionado:{' '}
            <span className="font-bold text-[#6D49F2]">{launchBatch || 'Sem nome'}</span>
            {launchId ? ' (Salvo no BD)' : ' (Novo)'}
          </div>

          <Button
            type="button"
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
        </div>
      </Card>
    </div>
  )
}
