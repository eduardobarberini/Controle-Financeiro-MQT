import React, { useMemo } from 'react'
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { BarChart3 } from 'lucide-react'

interface PlatformDailyChartDay {
  dayLabel?: string
  totalSales: number
  conversionRate: number // ratio 0..1 (same calc as "% Conversão Desafio / Plataforma")
}

interface PlatformDailyChartProps {
  days: PlatformDailyChartDay[]
}

const PURPLE = '#6D49F2'
const PINK = '#FF2AFF'

export const PlatformDailyChart: React.FC<PlatformDailyChartProps> = ({ days }) => {
  // Build chart data from the same dailyPlatformData that feeds the daily control table.
  // Days with no data simply show 0 — they never break the chart.
  const chartData = useMemo(() => {
    return (days ?? []).map((d) => {
      const vendas = Number.isFinite(d.totalSales) ? d.totalSales : 0
      const ratio = Number.isFinite(d.conversionRate) ? d.conversionRate : 0
      return {
        day: d.dayLabel || '',
        vendas,
        // Convert ratio (0..1) to a 0..100 percentage for the right axis
        conversao: Math.round(ratio * 1000) / 10,
      }
    })
  }, [days])

  const hasAnyData = chartData.some((d) => d.vendas > 0 || d.conversao > 0)

  return (
    <Card className="bg-white border-slate-200/90 shadow-sm rounded-2xl overflow-hidden">
      <CardHeader className="bg-slate-50/80 border-b border-slate-200 p-5 pb-3">
        <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-[#6D49F2]" />
          Vendas Diárias × Conversão
        </CardTitle>
        <CardDescription className="text-xs text-slate-500 mt-0.5">
          Barras: vendas totais por dia (Cartão/PIX + Boleto) • Linha: % conversão desafio /
          plataforma
          {!hasAnyData ? ' • Nenhum dado preenchido ainda' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-5">
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 15, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="platformBarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={PURPLE} stopOpacity={0.85} />
                  <stop offset="100%" stopColor={PURPLE} stopOpacity={0.65} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
              />
              {/* Left axis: integer sales quantities */}
              <YAxis
                yAxisId="left"
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                width={36}
              />
              {/* Right axis: percentage 0..100% */}
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 100]}
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                width={42}
                tickFormatter={(val: number) => `${val}%`}
              />
              <Tooltip
                formatter={(value: number, name: string) => {
                  if (name === 'conversao') {
                    return [`${Number(value).toFixed(1)}%`, 'Conversão Desafio / Plataforma']
                  }
                  return [`${value}`, 'Vendas Totais']
                }}
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderRadius: '12px',
                  color: '#f8fafc',
                  fontSize: '12px',
                  border: 'none',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
                }}
                itemStyle={{ color: '#e2e8f0' }}
                labelStyle={{ color: '#f8fafc', fontWeight: 600 }}
                cursor={{ fill: '#6D49F2', fillOpacity: 0.05 }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                height={30}
                iconSize={10}
                wrapperStyle={{ fontSize: '11px', color: '#64748b' }}
                formatter={(value) =>
                  value === 'vendas' ? 'Vendas Totais' : 'Conversão Desafio / Plataforma'
                }
              />
              <Bar
                yAxisId="left"
                dataKey="vendas"
                name="vendas"
                fill="url(#platformBarGradient)"
                fillOpacity={0.8}
                radius={[8, 8, 0, 0]}
                maxBarSize={48}
                animationDuration={600}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="conversao"
                name="conversao"
                stroke={PINK}
                strokeWidth={3}
                strokeDasharray="5 4"
                dot={{ r: 4, fill: PINK, stroke: '#FFFFFF', strokeWidth: 1.5 }}
                activeDot={{ r: 6, fill: PINK, stroke: '#FFFFFF', strokeWidth: 2 }}
                animationDuration={600}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
