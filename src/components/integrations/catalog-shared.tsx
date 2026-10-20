import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatPtBrInput, parsePtBrNumber } from '@/lib/financial-utils'
import { KIND_LABELS, KIND_OPTIONS, type KindSource, type ProductKind } from '@/services/catalog'

export const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString('pt-BR') : '—'

export const matchesQuery = (query: string, ...values: (string | null | undefined)[]) => {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return values.some((v) => (v ?? '').toLowerCase().includes(q))
}

/** Sem classificação de verdade: sugestão automática caiu em "outro". */
export const isPending = (row: { kind: ProductKind; kind_source: KindSource }) =>
  row.kind_source === 'auto' && row.kind === 'outro'

export function KindSelect({
  value,
  disabled,
  onChange,
}: {
  value: ProductKind
  disabled?: boolean
  onChange: (kind: ProductKind) => void
}) {
  return (
    <Select value={value} disabled={disabled} onValueChange={(v) => onChange(v as ProductKind)}>
      <SelectTrigger className="h-8 text-xs w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {KIND_OPTIONS.map((k) => (
          <SelectItem key={k} value={k} className="text-xs">
            {KIND_LABELS[k]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** Origem da classificação: novo (a classificar), sugestão automática ou manual. */
export function SourceBadge({
  row,
  onReset,
}: {
  row: { kind: ProductKind; kind_source: KindSource }
  onReset?: () => void
}) {
  if (isPending(row))
    return (
      <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] whitespace-nowrap">
        Novo, classifique
      </Badge>
    )
  if (row.kind_source === 'auto')
    return (
      <Badge className="bg-slate-50 text-slate-500 border-slate-200 text-[10px] whitespace-nowrap">
        Automático
      </Badge>
    )
  return (
    <button
      type="button"
      onClick={onReset}
      disabled={!onReset}
      title="Voltar para a sugestão automática"
      className="inline-flex"
    >
      <Badge className="bg-[#6D49F2]/10 text-[#6D49F2] border-[#6D49F2]/20 text-[10px] whitespace-nowrap hover:bg-[#6D49F2]/20">
        Manual ↺
      </Badge>
    </button>
  )
}

/** Valor em reais editável; grava ao sair do campo. Vazio = sem valor. */
export function MoneyInput({
  value,
  placeholder,
  disabled,
  onSave,
}: {
  value: number | null
  placeholder?: string
  disabled?: boolean
  onSave: (value: number | null) => void
}) {
  const [text, setText] = useState(formatPtBrInput(value ?? ''))
  useEffect(() => setText(formatPtBrInput(value ?? '')), [value])

  const commit = () => {
    const next = text.trim() === '' ? null : parsePtBrNumber(text)
    setText(formatPtBrInput(next ?? ''))
    if (next !== value) onSave(next)
  }

  return (
    <Input
      value={text}
      disabled={disabled}
      placeholder={placeholder}
      inputMode="decimal"
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      className="h-8 text-xs w-28 text-right"
    />
  )
}
