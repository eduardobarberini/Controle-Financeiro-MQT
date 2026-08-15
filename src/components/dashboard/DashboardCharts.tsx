import React from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { ComputedMonthlyItem, YearFinancialSummary } from '@/types/financial'
import { formatCurrency, formatPercent, formatRoas, getProgressColor } from '@/lib/financial-utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { BarChart3, TrendingUp, DollarSign, Target } from 'lucide-react'

interface DashboardChartsProps {
  summary: YearFinancialSummary
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({ summary }) => {
  const { monthlyItems, revenueGoal, profitGoal, revenueGoalPercent, profitGoalPercent } = summary

  // Monthly Revenue target reference line
  const monthlyRevenueGoal = revenueGoal > 0 ? revenueGoal / 12 : 0

  // Prepare data for Cumulative Profit
  let runningProfit = 0
  const cumulativeData = monthlyItems.map((item) => {
    runningProfit += item.netProfit
    return {
      name: item.shortLabel,
      monthLabel: item.monthLabel,
      lucroMensal: item.netProfit,
      lucroAcumulado: runningProfit,
      metaAnual: profitGoal,
    }
  })

  // Prepare Bar chart data (Meta vs Realizado)
  const metaVsRealizadoData = monthlyItems.map((item) => ({
    name: item.shortLabel,
    monthLabel: item.monthLabel,
    realizado: item.grossRevenue,
    metaMensal: monthlyRevenueGoal,
  }))

  // Prepare Investimento vs Faturamento data
  const investVsRevenueData = monthlyItems.map((item) => ({
    name: item.shortLabel,
    monthLabel: item.monthLabel,
    investimento: item.investment,
    faturamento: item.grossRevenue,
    roas: item.roas,
  }))

  // Gauges Data calculation
  const revPercent = Math.min(Math.max(revenueGoalPercent || 0, 0), 200)
  const revProgress = getProgressColor(revenueGoalPercent)

  const profPercent = Math.min(Math.max(profitGoalPercent || 0, 0), 200)
  const profProgress = getProgressColor(profitGoalPercent)

  // Helper for radial gauge
  const renderGauge = (
    percent: number | null,
    actual: number,
    goal: number,
    title: string,
    color: string,
  ) => {
    const validPercent = percent !== null ? Math.min(Math.max(percent, 0), 100) : 0
    const remaining = 100 - validPercent
    const data = [
      { name: 'Atingido', value: validPercent },
      { name: 'Restante', value: remaining },
    ]

    return (
      <div className="flex flex-col items-center justify-center p-3 text-center flex-1">
        <div className="relative w-36 h-36 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={46}
                outerRadius={62}
                startAngle={225}
                endAngle={-45}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                <Cell fill={color} />
                <Cell fill="#e2e8f0" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-extrabold text-slate-800 tabular-nums">
              {formatPercent(percent, 1)}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">atingido</span>
          </div>
        </div>
        <div className="mt-1">
          <p className="text-xs font-semibold text-slate-700">{title}</p>
          <p className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
            {formatCurrency(actual)} de {formatCurrency(goal)}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Chart 1: Meta de Faturamento vs Realizado */}
      <Card className="bg-white border-slate-200/90 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
        <CardHeader className="p-5 pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                Meta de Faturamento vs Realizado
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Comparativo mensal com linha de meta média (R$ {formatCurrency(monthlyRevenueGoal)}
                /mês)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 pt-2">
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={metaVsRealizadoData}
                margin={{ top: 15, right: 10, left: -10, bottom: 0 }}
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
                  tickFormatter={(val) => `R$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    formatCurrency(value),
                    name === 'realizado' ? 'Faturamento Realizado' : 'Meta Mensal',
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
                  iconSize={8}
                  wrapperStyle={{ fontSize: '11px', color: '#64748b' }}
                  formatter={(value) =>
                    value === 'realizado' ? 'Faturamento Realizado' : 'Meta Mensal'
                  }
                />
                {monthlyRevenueGoal > 0 && (
                  <ReferenceLine
                    y={monthlyRevenueGoal}
                    stroke="#6366f1"
                    strokeDasharray="4 4"
                    strokeWidth={2}
                    label={{
                      value: 'Meta',
                      fill: '#6366f1',
                      fontSize: 10,
                      position: 'top',
                    }}
                  />
                )}
                <Bar
                  dataKey="realizado"
                  name="realizado"
                  fill="#059669"
                  radius={[6, 6, 0, 0]}
                  animationDuration={600}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Chart 2: Lucro Acumulado ao longo do ano */}
      <Card className="bg-white border-slate-200/90 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
        <CardHeader className="p-5 pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Evolução do Lucro Acumulado
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Crescimento cumulativo do lucro vs Meta Anual ({formatCurrency(profitGoal)})
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 pt-2">
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={cumulativeData}
                margin={{ top: 15, right: 10, left: -10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
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
                  tickFormatter={(val) => `R$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    formatCurrency(value),
                    name === 'lucroAcumulado' ? 'Lucro Acumulado' : 'Lucro Mensal',
                  ]}
                  labelFormatter={(_, items) => items?.[0]?.payload?.monthLabel || ''}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '12px',
                    color: '#f8fafc',
                    fontSize: '12px',
                    border: 'none',
                  }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  height={30}
                  iconSize={8}
                  wrapperStyle={{ fontSize: '11px', color: '#64748b' }}
                  formatter={(value) =>
                    value === 'lucroAcumulado' ? 'Lucro Acumulado' : 'Lucro do Mês'
                  }
                />
                {profitGoal > 0 && (
                  <ReferenceLine
                    y={profitGoal}
                    stroke="#6366f1"
                    strokeDasharray="4 4"
                    strokeWidth={2}
                    label={{
                      value: 'Meta Anual',
                      fill: '#6366f1',
                      fontSize: 10,
                      position: 'insideTopRight',
                    }}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="lucroAcumulado"
                  stroke="#059669"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#profitGrad)"
                  animationDuration={600}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Chart 3: Investimento vs Faturamento por mês */}
      <Card className="bg-white border-slate-200/90 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
        <CardHeader className="p-5 pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                Investimento vs Faturamento
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Relação entre capital aplicado e faturamento bruto gerado
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 pt-2">
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={investVsRevenueData}
                margin={{ top: 15, right: 10, left: -10, bottom: 0 }}
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
                  tickFormatter={(val) => `R$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    formatCurrency(value),
                    name === 'faturamento' ? 'Faturamento Total' : 'Investimento',
                  ]}
                  labelFormatter={(label, items) => {
                    const item = items?.[0]?.payload
                    return item ? `${item.monthLabel} (ROAS: ${formatRoas(item.roas)})` : label
                  }}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '12px',
                    color: '#f8fafc',
                    fontSize: '12px',
                    border: 'none',
                  }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  height={30}
                  iconSize={8}
                  wrapperStyle={{ fontSize: '11px', color: '#64748b' }}
                  formatter={(value) => (value === 'faturamento' ? 'Faturamento' : 'Investimento')}
                />
                <Bar
                  dataKey="investimento"
                  name="investimento"
                  fill="#f43f5e"
                  radius={[5, 5, 0, 0]}
                  animationDuration={600}
                />
                <Bar
                  dataKey="faturamento"
                  name="faturamento"
                  fill="#059669"
                  radius={[5, 5, 0, 0]}
                  animationDuration={600}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Chart 4: Gauges de Progresso das Metas */}
      <Card className="bg-white border-slate-200/90 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
        <CardHeader className="p-5 pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-600" />
                Progresso das Metas Anuais
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Atingimento percentual do Faturamento e Lucro
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 pt-2 flex flex-col justify-center min-h-[280px]">
          <div className="flex flex-col sm:flex-row items-center justify-around gap-4">
            {renderGauge(
              revenueGoalPercent,
              summary.totalRevenue,
              revenueGoal,
              '% Meta Faturamento',
              revProgress.gaugeColor,
            )}
            <div className="w-full sm:w-px h-px sm:h-32 bg-slate-100" />
            {renderGauge(
              profitGoalPercent,
              summary.totalProfit,
              profitGoal,
              '% Meta Lucro',
              profProgress.gaugeColor,
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
