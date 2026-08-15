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
  const {
    monthlyItems,
    revenueGoal,
    revenueGoalPercent,
    totalRevenue,
    profitGoal,
    profitGoalPercent,
    totalProfit,
  } = summary

  // --- Row 1: Faturamento ---
  // Chart 1: Cumulative target vs realized revenue
  const monthlyRevenueGoal = revenueGoal > 0 ? revenueGoal / 12 : 0

  let runningRevenueReal = 0
  const cumulativeRevenueData = monthlyItems.map((item, i) => {
    runningRevenueReal += item.grossRevenue
    return {
      name: MONTH_SHORT_NAMES_PT[i],
      monthLabel: item.monthLabel,
      meta: monthlyRevenueGoal * (i + 1), // cumulative target
      realizado: runningRevenueReal, // cumulative realized
    }
  })

  // Chart 2: Progress gauge (% of revenue goal achieved)
  const validRevenuePercent =
    revenueGoalPercent !== null && revenueGoalPercent !== undefined
      ? Math.max(revenueGoalPercent, 0)
      : 0
  const revenueGaugePercent = Math.min(validRevenuePercent, 100)
  const revenueRemaining = 100 - revenueGaugePercent
  const revenueProgress = getProgressColor(revenueGoalPercent)
  const revenueGaugeData = [
    { name: 'Atingido', value: revenueGaugePercent },
    { name: 'Restante', value: revenueRemaining },
  ]

  // --- Row 2: Lucro Líquido ---
  // Chart 3: Cumulative target vs realized net profit
  const monthlyProfitGoal = profitGoal > 0 ? profitGoal / 12 : 0

  let runningProfitReal = 0
  const cumulativeProfitData = monthlyItems.map((item, i) => {
    runningProfitReal += item.netProfit
    return {
      name: MONTH_SHORT_NAMES_PT[i],
      monthLabel: item.monthLabel,
      meta: monthlyProfitGoal * (i + 1), // cumulative profit target
      realizado: runningProfitReal, // cumulative profit realized
    }
  })

  // Chart 4: Progress gauge (% of profit goal achieved)
  const validProfitPercent =
    profitGoalPercent !== null && profitGoalPercent !== undefined
      ? Math.max(profitGoalPercent, 0)
      : 0
  const profitGaugePercent = Math.min(validProfitPercent, 100)
  const profitRemaining = 100 - profitGaugePercent
  const profitProgress = getProgressColor(profitGoalPercent)
  const profitGaugeData = [
    { name: 'Atingido', value: profitGaugePercent },
    { name: 'Restante', value: profitRemaining },
  ]

  return (
    <div className="space-y-6">
      {/* Linha 1: Faturamento */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Gráfico 1: Meta vs Realizado — Faturamento Acumulado */}
        <Card className="lg:col-span-7 bg-white border-slate-200/90 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              Meta vs Realizado — Faturamento Acumulado
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Evolução acumulada do faturamento em comparação com a meta anual linear
              {revenueGoal > 0 ? ` (${formatCurrency(monthlyRevenueGoal)}/mês)` : ''}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-2">
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={cumulativeRevenueData}
                  margin={{ top: 15, right: 20, left: 0, bottom: 0 }}
                >
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
                    stroke="#c4b5fd"
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
                    stroke="#9333ea"
                    strokeWidth={2.5}
                    dot={{ r: 2.5, fill: '#9333ea', strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                    animationDuration={600}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Gráfico 2: Progresso da Meta de Faturamento */}
        <Card className="lg:col-span-5 bg-white border-slate-200/90 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Target className="w-4 h-4 text-purple-600" />
              Progresso da Meta de Faturamento
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
                      data={revenueGaugeData}
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
                      <Cell fill={revenueProgress.gaugeColor} />
                      <Cell fill="#e2e8f0" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span
                    className="text-4xl font-extrabold tabular-nums"
                    style={{ color: revenueProgress.gaugeColor }}
                  >
                    {formatPercent(validRevenuePercent, 0)}
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

      {/* Linha 2: Lucro Líquido */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Gráfico 3: Meta vs Realizado — Lucro Líquido Acumulado */}
        <Card className="lg:col-span-7 bg-white border-slate-200/90 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-pink-600" />
              Meta vs Realizado — Lucro Líquido Acumulado
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Evolução acumulada do lucro líquido em comparação com a meta anual linear
              {profitGoal > 0 ? ` (${formatCurrency(monthlyProfitGoal)}/mês)` : ''}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-2">
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={cumulativeProfitData}
                  margin={{ top: 15, right: 20, left: 0, bottom: 0 }}
                >
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
                      Math.abs(val) >= 1000 ? `R$ ${(val / 1000).toFixed(0)}k` : `R$ ${val}`
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
                    stroke="#f9a8d4"
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
                    stroke="#db2777"
                    strokeWidth={2.5}
                    dot={{ r: 2.5, fill: '#db2777', strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                    animationDuration={600}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Gráfico 4: Progresso da Meta de Lucro */}
        <Card className="lg:col-span-5 bg-white border-slate-200/90 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Target className="w-4 h-4 text-pink-600" />
              Progresso da Meta de Lucro
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Percentual do lucro líquido realizado em relação à meta anual
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-2">
            <div className="h-[350px] w-full flex flex-col items-center justify-center">
              <div className="relative w-56 h-56 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={profitGaugeData}
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
                      <Cell fill={profitProgress.gaugeColor} />
                      <Cell fill="#e2e8f0" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span
                    className="text-4xl font-extrabold tabular-nums"
                    style={{ color: profitProgress.gaugeColor }}
                  >
                    {formatPercent(validProfitPercent, 0)}
                  </span>
                  <span className="text-xs text-slate-400 font-medium mt-1">da meta de lucro</span>
                </div>
              </div>
              <div className="mt-4 text-center">
                <p className="text-sm font-semibold text-slate-700 tabular-nums">
                  {formatCurrency(totalProfit)}
                </p>
                <p className="text-xs text-slate-500 tabular-nums">
                  de {formatCurrency(profitGoal)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
