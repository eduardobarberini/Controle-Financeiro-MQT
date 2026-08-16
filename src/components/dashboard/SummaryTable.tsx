import React from 'react'
import { YearFinancialSummary } from '@/types/financial'
import { formatCurrency, formatPercent, formatRoas } from '@/lib/financial-utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TableProperties } from 'lucide-react'

interface SummaryTableProps {
  summary: YearFinancialSummary
}

export const SummaryTable: React.FC<SummaryTableProps> = ({ summary }) => {
  const { monthlyItems, totalInvestment, totalRevenue, totalProfit, averageRoas, averageMargin } =
    summary

  // Show only months with data (or extra items with data)
  const populatedMonths = monthlyItems.filter(
    (item) => item.investment > 0 || item.grossRevenue > 0 || item.netProfit > 0,
  )

  if (populatedMonths.length === 0) {
    return null
  }

  return (
    <Card className="bg-white border-slate-200/90 shadow-sm rounded-2xl overflow-hidden">
      <CardHeader className="p-5 pb-3 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <TableProperties className="w-4 h-4 text-[#6D49F2]" />
            Resumo Mensal ({populatedMonths.length}{' '}
            {populatedMonths.length === 1 ? 'mês com dados' : 'meses com dados'})
          </CardTitle>
          <span className="text-xs text-slate-500 font-medium">Valores consolidados em BRL</span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/75">
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-semibold text-slate-700 text-xs py-3.5 px-4 min-w-[140px]">
                  Mês
                </TableHead>
                <TableHead className="font-semibold text-slate-700 text-xs py-3.5 px-4 text-right min-w-[120px]">
                  Investimento
                </TableHead>
                <TableHead className="font-semibold text-slate-700 text-xs py-3.5 px-4 text-right min-w-[130px]">
                  Faturamento
                </TableHead>
                <TableHead className="font-semibold text-slate-700 text-xs py-3.5 px-4 text-right min-w-[90px]">
                  ROAS
                </TableHead>
                <TableHead className="font-semibold text-slate-700 text-xs py-3.5 px-4 text-right min-w-[120px]">
                  Lucro Líquido
                </TableHead>
                <TableHead className="font-semibold text-slate-700 text-xs py-3.5 px-4 text-right min-w-[100px]">
                  Margem %
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {populatedMonths.map((item) => (
                <TableRow
                  key={item.monthKey}
                  className="hover:bg-slate-50/60 transition-colors border-b border-slate-100"
                >
                  <TableCell className="font-medium text-xs text-slate-900 py-3 px-4 capitalize">
                    {item.monthLabel}
                  </TableCell>
                  <TableCell className="text-xs text-slate-700 py-3 px-4 text-right tabular-nums">
                    {formatCurrency(item.investment)}
                  </TableCell>
                  <TableCell className="text-xs text-[#6D49F2] font-semibold py-3 px-4 text-right tabular-nums">
                    {formatCurrency(item.grossRevenue)}
                  </TableCell>
                  <TableCell className="text-xs text-slate-700 py-3 px-4 text-right tabular-nums">
                    {formatRoas(item.roas)}
                  </TableCell>
                  <TableCell className="text-xs text-slate-900 font-medium py-3 px-4 text-right tabular-nums">
                    {formatCurrency(item.netProfit)}
                  </TableCell>
                  <TableCell className="text-xs py-3 px-4 text-right tabular-nums font-semibold">
                    <span
                      className={
                        (item.marginPercent || 0) >= 25
                          ? 'text-[#6D49F2]'
                          : (item.marginPercent || 0) >= 15
                            ? 'text-amber-600'
                            : 'text-slate-600'
                      }
                    >
                      {formatPercent(item.marginPercent, 1)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}

              {/* Totals Row */}
              <TableRow className="bg-slate-900 text-white font-bold hover:bg-slate-900 border-none">
                <TableCell className="text-xs text-white py-3.5 px-4 font-bold uppercase tracking-wider">
                  TOTAIS
                </TableCell>
                <TableCell className="text-xs text-slate-200 py-3.5 px-4 text-right tabular-nums font-bold">
                  {formatCurrency(totalInvestment)}
                </TableCell>
                <TableCell className="text-xs text-[#A38CF7] py-3.5 px-4 text-right tabular-nums font-bold">
                  {formatCurrency(totalRevenue)}
                </TableCell>
                <TableCell className="text-xs text-slate-200 py-3.5 px-4 text-right tabular-nums font-bold">
                  {formatRoas(averageRoas)}
                </TableCell>
                <TableCell className="text-xs text-[#FF88FF] py-3.5 px-4 text-right tabular-nums font-bold">
                  {formatCurrency(totalProfit)}
                </TableCell>
                <TableCell className="text-xs text-white py-3.5 px-4 text-right tabular-nums font-bold">
                  {formatPercent(averageMargin, 1)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
