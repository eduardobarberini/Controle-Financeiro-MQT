import React, { useEffect, useState } from 'react'
import { formatCurrency, formatPercent, formatRoas, getProgressColor } from '@/lib/financial-utils'
import { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface KpiCardProps {
  title: string
  value: number | null
  formatType: 'currency' | 'percent' | 'roas' | 'raw'
  decimals?: number
  rawString?: string
  icon: LucideIcon
  subtext?: string
  targetPercent?: number | null
  showProgressBar?: boolean
  statusMode?: 'default' | 'targetComparison'
  tooltipText?: string
  iconBgColor?: string
  iconColor?: string
  size?: 'default' | 'large'
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  formatType,
  decimals,
  rawString,
  icon: Icon,
  subtext,
  targetPercent,
  showProgressBar = false,
  statusMode = 'default',
  iconBgColor = 'bg-[#6D49F2]/10 text-[#6D49F2] border-[#6D49F2]/20',
  iconColor,
  size = 'default',
}) => {
  const isLarge = size === 'large'
  const valueTextClass = isLarge ? 'text-3xl sm:text-4xl font-extrabold' : 'text-2xl font-bold'
  const contentPaddingClass = isLarge ? 'p-6' : 'p-5'
  const iconWrapClass = isLarge ? 'p-2.5' : 'p-2'
  const iconSizeClass = isLarge ? 'w-5 h-5' : 'w-4 h-4'
  const titleTextClass = isLarge ? 'text-sm' : 'text-xs'
  // Animated count-up simulation
  const [displayValue, setDisplayValue] = useState<number>(0)

  useEffect(() => {
    if (value === null || value === undefined || isNaN(value)) {
      setDisplayValue(0)
      return
    }

    const duration = 600
    const steps = 30
    const stepTime = duration / steps
    const increment = value / steps
    let current = 0
    let stepCount = 0

    const timer = setInterval(() => {
      stepCount++
      current += increment
      if (stepCount >= steps) {
        setDisplayValue(value)
        clearInterval(timer)
      } else {
        setDisplayValue(current)
      }
    }, stepTime)

    return () => clearInterval(timer)
  }, [value])

  const renderFormattedValue = () => {
    if (rawString !== undefined) return rawString
    if (value === null || value === undefined) return '—'

    switch (formatType) {
      case 'currency':
        return formatCurrency(displayValue)
      case 'percent':
        return formatPercent(displayValue, decimals ?? 1)
      case 'roas':
        return formatRoas(displayValue)
      default:
        return displayValue.toString()
    }
  }

  const isTargetComparison = statusMode === 'targetComparison'
  const hasTarget = targetPercent !== undefined && targetPercent !== null
  const isGoalReached = hasTarget && targetPercent >= 100

  const getCustomProgress = () => {
    if (!isTargetComparison) {
      return getProgressColor(targetPercent)
    }
    if (isGoalReached) {
      return {
        badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        badgeText: 'text-emerald-600',
        barColor: 'bg-emerald-500',
        gaugeColor: '#10b981',
        status: 'success' as const,
      }
    }
    return {
      badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
      badgeText: 'text-rose-600',
      barColor: 'bg-rose-500',
      gaugeColor: '#f43f5e',
      status: 'danger' as const,
    }
  }

  const progress = getCustomProgress()
  const clampedProgressWidth = Math.min(Math.max(targetPercent || 0, 0), 100)

  const cardBgClass =
    isTargetComparison && hasTarget
      ? isGoalReached
        ? 'bg-emerald-50 border-emerald-200/80'
        : 'bg-rose-50 border-rose-200/80'
      : 'bg-white border-slate-200/90'

  return (
    <Card
      className={`${cardBgClass} shadow-sm rounded-2xl overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200`}
    >
      <CardContent className={`${contentPaddingClass} flex flex-col justify-between h-full`}>
        {/* Top row: Label & Icon */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <span
            className={`${titleTextClass} font-semibold uppercase tracking-wider text-slate-500`}
          >
            {title}
          </span>
          <div
            className={`${iconWrapClass} rounded-xl border ${iconBgColor} shrink-0`}
            style={iconColor ? { color: iconColor } : undefined}
          >
            <Icon className={iconSizeClass} />
          </div>
        </div>

        {/* Main Value */}
        <div className="my-1">
          <div className={`${valueTextClass} tracking-tight text-slate-900 tabular-nums`}>
            {renderFormattedValue()}
          </div>
        </div>

        {/* Target Progress Bar / Subtext */}
        <div className="mt-2 pt-2 border-t border-slate-100 min-h-[32px] flex flex-col justify-center">
          {showProgressBar && targetPercent !== undefined && targetPercent !== null ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">{subtext || 'Meta atingida'}</span>
                <span className={`font-bold tabular-nums ${progress.badgeText}`}>
                  {formatPercent(targetPercent, 1)}
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${progress.barColor}`}
                  style={{ width: `${clampedProgressWidth}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 truncate">{subtext || '—'}</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
