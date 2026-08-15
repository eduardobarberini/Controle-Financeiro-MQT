import React from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { YearFinancialSummary } from '@/types/financial'
import {
  formatCurrency,
  formatPercent,
  getProgressColor,
  MONTH_SHORT_NAMES_PT,
} from '@/lib/financial-utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { TrendingUp, Target } from 'lucide-react'

interface DashboardChartsProps {
  summary: YearFinancialSummary
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({ summary }) => {
  const { monthlyItems, revenueGoal, revenueGoalPercent, totalRevenue } = summary

  // --- Chart 1: Cumulative target vs realized revenue ---
  const monthlyGoal = revenueGoal > 0 ? revenueGoal / 12 : 0

  let runningReal = 0
  const cumulativeData = monthlyItems.map((item, i) => {
    runningReal += item.grossRevenue
    return {
      name: MONTH_SHORT_NAMES_PT[i],
      monthLabel: item.monthLabel,
      meta: monthlyGoal * (i + 1), // cumulative target
      realizado: runningReal, // cumulative realized
    }
  })

  // --- Chart 2: Progress gauge (% of revenue goal achieved) ---
  const validPercent =
    revenueGoalPercent !== null && revenueGoalPercent !== undefined
      ? Math.max(revenueGoalPercent, 0)
      : 0
  // Clamp for the gauge ring (cap at 100 for the visual arc)
  const gaugePercent = Math.min(validPercent, 100)
  const remaining = 100 - gaugePercent
  const progress = getProgressColor(revenueGoalPercent)
  const gaugeData = [
    { name: 'Atingido', value: gaugePercent },
    { name: 'Restante', value: remaining },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Chart 1: Linha comparativa Meta vs Realizado (acumulado) */}
      <Card className="lg:col-span-7 bg-white border-slate-200/90 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
        <CardHeader className="p-5 pb-2">
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            Meta vs Realizado — Faturamento Acumulado
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 mt-0.5">
            Evolução acumulada do faturamento em comparação com a meta anual linear
            {revenueGoal > 0 ? ` (${formatCurrency(monthlyGoal)}/mês)` : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-2">
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cumulativeData} margin={{ top: 15, right: 20, left: 0, bottom: 0 }}>
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
                  width={72}
                  tickFormatter={(val: number) =>
                    val >= 1000 ? `R$ ${(val / 1000).toFixed(0)}k` : `R$ ${val}`
                  }
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    formatCurrency(value),
                    name === 'meta' ? 'Meta Acumulada' : 'Realizado Acumulado',
                  ]}
                  labelFormatter={(_, items) => items?.[0]?.payload?.monthLabel || ''}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '12px',
                    color: '#f8fafc',
                    fontSize: '12px',
                    border: 'none',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
                  }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  height={30}
                  iconSize={10}
                  wrapperStyle={{ fontSize: '11px', color: '#64748b' }}
                  formatter={(value) => (value === 'meta' ? 'Meta' : 'Realizado')}
                />
                <Line
                  type="monotone"
                  dataKey="meta"
                  name="meta"
                  stroke="#93c5fd"
                  strokeWidth={2}
                  strokeDasharray="6 5"
                  dot={false}
                  activeDot={{ r: 4 }}
                  animationDuration={600}
                />
                <Line
                  type="monotone"
                  dataKey="realizado"
                  name="realizado"
                  stroke="#059669"
                  strokeWidth={2.5}
                  dot={{ r: 2.5, fill: '#059669', strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                  animationDuration={600}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Chart 2: Indicador de Progresso (% da meta) */}
      <Card className="lg:col-span-5 bg-white border-slate-200/90 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
        <CardHeader className="p-5 pb-2">
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-600" />
            Progresso da Meta Anual
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 mt-0.5">
            Percentual do faturamento realizado em relação à meta anual
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-2">
          <div className="h-[350px] w-full flex flex-col items-center justify-center">
            <div className="relative w-56 h-56 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={gaugeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={72}
                    outerRadius={92}
                    startAngle={225}
                    endAngle={-45}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    <Cell fill={progress.gaugeColor} />
                    <Cell fill="#e2e8f0" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span
                  className="text-4xl font-extrabold tabular-nums"
                  style={{ color: progress.gaugeColor }}
                >
                  {formatPercent(validPercent, 0)}
                </span>
                <span className="text-xs text-slate-400 font-medium mt-1">da meta anual</span>
              </div>
            </div>
            <div className="mt-4 text-center">
              <p className="text-sm font-semibold text-slate-700 tabular-nums">
                {formatCurrency(totalRevenue)}
              </p>
              <p className="text-xs text-slate-500 tabular-nums">
                de {formatCurrency(revenueGoal)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
