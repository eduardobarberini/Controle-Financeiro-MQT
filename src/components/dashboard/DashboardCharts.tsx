import React from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
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

interface CustomDotProps {
  cx?: number
  cy?: number
  index?: number
  lastIndex: number
  color: string
  value?: number | null
}

const CustomRealizedDot: React.FC<CustomDotProps> = ({
  cx,
  cy,
  index,
  lastIndex,
  color,
  value,
}) => {
  if (cx === undefined || cy === undefined || value === null || value === undefined) return null

  const isLast = index === lastIndex

  if (isLast) {
    return (
      <g key={`dot-${index}`}>
        {/* Glow / outer ring for current month */}
        <circle cx={cx} cy={cy} r={9} fill={color} fillOpacity={0.25} />
        {/* Main larger dot */}
        <circle cx={cx} cy={cy} r={5.5} fill={color} stroke="#FFFFFF" strokeWidth={2} />
      </g>
    )
  }

  return (
    <circle
      key={`dot-${index}`}
      cx={cx}
      cy={cy}
      r={3}
      fill={color}
      stroke="#FFFFFF"
      strokeWidth={1}
    />
  )
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

  // Identify the last month index with data (hasRecord or non-zero activity)
  let lastDataMonthIndex = -1
  monthlyItems.forEach((item, index) => {
    if (item.hasRecord || item.investment > 0 || item.grossRevenue > 0 || item.netProfit !== 0) {
      lastDataMonthIndex = index
    }
  })
  // If no month has data yet, default lastDataMonthIndex to 0 so Jan displays initial point
  const targetLastIndex = lastDataMonthIndex === -1 ? 0 : lastDataMonthIndex

  // --- Row 1: Faturamento ---
  // Chart 1: Cumulative target vs realized revenue
  const monthlyRevenueGoal = revenueGoal > 0 ? revenueGoal / 12 : 0

  let runningRevenueReal = 0
  const cumulativeRevenueData = monthlyItems.map((item, i) => {
    runningRevenueReal += item.grossRevenue
    const isPastOrCurrent = lastDataMonthIndex === -1 ? i === 0 : i <= lastDataMonthIndex
    return {
      name: MONTH_SHORT_NAMES_PT[i],
      monthLabel: item.monthLabel,
      meta: monthlyRevenueGoal * (i + 1), // cumulative target
      realizado: isPastOrCurrent ? runningRevenueReal : null, // cumulative realized up to last data month
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
    const isPastOrCurrent = lastDataMonthIndex === -1 ? i === 0 : i <= lastDataMonthIndex
    return {
      name: MONTH_SHORT_NAMES_PT[i],
      monthLabel: item.monthLabel,
      meta: monthlyProfitGoal * (i + 1), // cumulative profit target
      realizado: isPastOrCurrent ? runningProfitReal : null, // cumulative profit realized up to last data month
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
              <TrendingUp className="w-4 h-4 text-[#6D49F2]" />
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
                <ComposedChart
                  data={cumulativeRevenueData}
                  margin={{ top: 15, right: 20, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6D49F2" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#6D49F2" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
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
                    stroke="#A38CF7"
                    strokeWidth={2}
                    strokeDasharray="6 5"
                    dot={false}
                    activeDot={{ r: 4 }}
                    animationDuration={600}
                  />
                  <Area
                    type="monotone"
                    dataKey="realizado"
                    name="realizado"
                    stroke="#6D49F2"
                    strokeWidth={2.5}
                    fill="url(#revenueGradient)"
                    connectNulls={false}
                    dot={(props: any) => (
                      <CustomRealizedDot {...props} lastIndex={targetLastIndex} color="#6D49F2" />
                    )}
                    activeDot={{ r: 6, fill: '#6D49F2', stroke: '#FFFFFF', strokeWidth: 2 }}
                    animationDuration={600}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Gráfico 2: Progresso da Meta de Faturamento */}
        <Card className="lg:col-span-5 bg-white border-slate-200/90 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Target className="w-4 h-4 text-[#6D49F2]" />
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
                      <Cell fill="#6D49F2" />
                      <Cell fill="#e2e8f0" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-extrabold tabular-nums text-[#6D49F2]">
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
              <TrendingUp className="w-4 h-4 text-[#FF2AFF]" />
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
                <ComposedChart
                  data={cumulativeProfitData}
                  margin={{ top: 15, right: 20, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF2AFF" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#FF2AFF" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
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
                    stroke="#FF88FF"
                    strokeWidth={2}
                    strokeDasharray="6 5"
                    dot={false}
                    activeDot={{ r: 4 }}
                    animationDuration={600}
                  />
                  <Area
                    type="monotone"
                    dataKey="realizado"
                    name="realizado"
                    stroke="#FF2AFF"
                    strokeWidth={2.5}
                    fill="url(#profitGradient)"
                    connectNulls={false}
                    dot={(props: any) => (
                      <CustomRealizedDot {...props} lastIndex={targetLastIndex} color="#FF2AFF" />
                    )}
                    activeDot={{ r: 6, fill: '#FF2AFF', stroke: '#FFFFFF', strokeWidth: 2 }}
                    animationDuration={600}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Gráfico 4: Progresso da Meta de Lucro */}
        <Card className="lg:col-span-5 bg-white border-slate-200/90 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Target className="w-4 h-4 text-[#FF2AFF]" />
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
                      <Cell fill="#FF2AFF" />
                      <Cell fill="#e2e8f0" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-extrabold tabular-nums text-[#FF2AFF]">
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
