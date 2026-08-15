import React, { useState } from 'react'
import { useFinancial } from '@/contexts/FinancialContext'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { DashboardCharts } from '@/components/dashboard/DashboardCharts'
import { SummaryTable } from '@/components/dashboard/SummaryTable'
import { MetasModal } from '@/components/MetasModal'
import {
  TrendingUp,
  Wallet,
  Percent,
  Info,
  ChevronDown,
  ChevronUp,
  PlusCircle,
  Sparkles,
  Target,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'

export default function Dashboard() {
  const { summary, selectedYear, isLoading } = useFinancial()
  const [showInstructions, setShowInstructions] = useState(false)
  const [metasOpen, setMetasOpen] = useState(false)

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300">
      {/* Top Section: Header & Instructions trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Painel Executivo • {selectedYear}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Visão consolidada de receitas, lucros, metas e indicadores de performance
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowInstructions(!showInstructions)}
            className="text-xs text-slate-700 border-slate-300 hover:bg-slate-100 rounded-xl"
          >
            <Info className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
            <span>Instruções de uso</span>
            {showInstructions ? (
              <ChevronUp className="w-3.5 h-3.5 ml-1.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 ml-1.5" />
            )}
          </Button>

          <Button
            asChild
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded-xl shadow-xs"
          >
            <Link to="/mensal">
              <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
              Lançar Dados
            </Link>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setMetasOpen(true)}
            className="text-xs text-slate-700 border-slate-300 hover:bg-slate-100 rounded-xl"
            title="Editar metas anuais"
          >
            <Target className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
            <span>Metas</span>
          </Button>
        </div>
      </div>

      {/* Collapsible Instructions Card */}
      {showInstructions && (
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-5 text-slate-800 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2 font-semibold text-sm text-emerald-900 mb-3">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            Como utilizar o sistema em 3 passos:
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-white/90 p-3.5 rounded-xl border border-emerald-200/60 shadow-2xs">
              <span className="font-bold text-emerald-700 text-sm block mb-1">Passo 1</span>
              <p className="text-slate-600">
                Preencha os dados mensais na aba{' '}
                <strong className="text-slate-900">Controle Mensal</strong> — <em>Faturamento</em>,{' '}
                <em>Investimento Meta</em> e os custos variáveis e fixos; o Imposto Meta, o Imposto
                Sobre Vendas, os Custos Totais, o Lucro Líquido, o ROAS e a Margem são calculados
                automaticamente ao vivo.
              </p>
            </div>
            <div className="bg-white/90 p-3.5 rounded-xl border border-emerald-200/60 shadow-2xs">
              <span className="font-bold text-emerald-700 text-sm block mb-1">Passo 2</span>
              <p className="text-slate-600">
                Defina as metas financeiras pelo botão{' '}
                <strong className="text-slate-900">Metas</strong> no topo deste Dashboard para
                parametrizar os gauges circulares e as linhas de referência dos gráficos.
              </p>
            </div>
            <div className="bg-white/90 p-3.5 rounded-xl border border-emerald-200/60 shadow-2xs">
              <span className="font-bold text-emerald-700 text-sm block mb-1">Passo 3</span>
              <p className="text-slate-600">
                Este <strong className="text-slate-900">Dashboard</strong> sincroniza
                automaticamente em tempo real sempre que qualquer dado for salvo ou editado.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Responsive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Faturamento Anual */}
        <KpiCard
          title="Faturamento Anual"
          value={summary.totalRevenue}
          formatType="currency"
          icon={TrendingUp}
          targetPercent={summary.revenueGoalPercent}
          showProgressBar={true}
          iconBgColor="bg-emerald-50 text-emerald-600 border-emerald-200"
        />

        {/* 2. Custos Anuais */}
        <KpiCard
          title="Custos Anuais"
          value={summary.totalCosts}
          formatType="currency"
          icon={Wallet}
          subtext="Soma dos custos fixos e variáveis"
          iconBgColor="bg-rose-50 text-rose-600 border-rose-200"
        />

        {/* 3. Lucro Líquido */}
        <KpiCard
          title="Lucro Líquido"
          value={summary.totalProfit}
          formatType="currency"
          icon={TrendingUp}
          targetPercent={summary.profitGoalPercent}
          showProgressBar={true}
          iconBgColor="bg-teal-50 text-teal-600 border-teal-200"
        />

        {/* 4. Margem Lucro % */}
        <KpiCard
          title="Margem Lucro %"
          value={summary.averageMargin}
          formatType="percent"
          icon={Percent}
          subtext={
            summary.totalRevenue > 0
              ? `Margem líquida global do exercício`
              : 'Sem receita registrada'
          }
          iconBgColor="bg-amber-50 text-amber-600 border-amber-200"
        />
      </div>

      {/* Empty State vs Charts */}
      {!isLoading && !summary.hasAnyData ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-100">
            <PlusCircle className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">
            Nenhum dado cadastrado para {selectedYear}
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-6">
            Lance os primeiros valores de investimento, faturamento e lucro para visualizar
            gráficos, gauges e relatórios.
          </p>
          <Button asChild className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl">
            <Link to="/mensal">Ir para Controle Mensal</Link>
          </Button>
        </div>
      ) : (
        <>
          {/* Charts Grid 2x2 */}
          <DashboardCharts summary={summary} />

          {/* Monthly Summary Table */}
          <SummaryTable summary={summary} />
        </>
      )}

      {/* Metas Modal */}
      <MetasModal open={metasOpen} onOpenChange={setMetasOpen} />
    </div>
  )
}
