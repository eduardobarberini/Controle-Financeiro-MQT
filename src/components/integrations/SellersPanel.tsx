import { useState } from 'react'
import { Pencil, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { formatCurrency, formatPtBrInput, parsePtBrNumber } from '@/lib/financial-utils'
import type { Seller, SellerInput } from '@/services/catalog'

interface Props {
  sellers: Seller[]
  onSave: (id: string | null, input: SellerInput) => Promise<boolean>
}

const EMPTY: SellerInput = {
  name: '',
  code: '',
  fixed_salary: 0,
  commission_rate: 5,
  guru_patterns: [],
  asaas_patterns: [],
  active: true,
}

const lines = (text: string) =>
  text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

export function SellersPanel({ sellers, onSave }: Props) {
  const [editing, setEditing] = useState<{ id: string | null; input: SellerInput } | null>(null)

  return (
    <>
      <div className="flex justify-end px-4 pb-3">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 text-xs"
          onClick={() => setEditing({ id: null, input: EMPTY })}
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Nova vendedora
        </Button>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80">
              <TableHead className="text-[11px]">Vendedora</TableHead>
              <TableHead className="text-[11px] text-right">Fixo</TableHead>
              <TableHead className="text-[11px] text-right">Comissão</TableHead>
              <TableHead className="text-[11px]">Checkout do Guru</TableHead>
              <TableHead className="text-[11px]">Link do Asaas</TableHead>
              <TableHead className="text-[11px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sellers.map((s) => (
              <TableRow key={s.id} className="border-b border-slate-100">
                <TableCell className="text-xs">
                  <span className="font-medium text-slate-900">{s.name}</span>{' '}
                  <span className="text-slate-400">({s.code})</span>
                  {!s.active && (
                    <Badge className="ml-2 bg-slate-100 text-slate-500 border-slate-200 text-[10px]">
                      Inativa
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-xs text-right">
                  {formatCurrency(s.fixed_salary)}
                </TableCell>
                <TableCell className="text-xs text-right">
                  {formatPtBrInput(s.commission_rate)}%
                </TableCell>
                <TableCell className="text-[11px] font-mono text-slate-600">
                  {s.guru_patterns.join(' · ') || '—'}
                </TableCell>
                <TableCell className="text-[11px] font-mono text-slate-600">
                  {s.asaas_patterns.join(' · ') || '—'}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2"
                    onClick={() => setEditing({ id: s.id, input: { ...s } })}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {editing && (
        <SellerDialog
          key={editing.id ?? 'new'}
          initial={editing.input}
          isNew={editing.id === null}
          onClose={() => setEditing(null)}
          onSave={async (input) => {
            if (await onSave(editing.id, input)) setEditing(null)
          }}
        />
      )}
    </>
  )
}

function SellerDialog({
  initial,
  isNew,
  onClose,
  onSave,
}: {
  initial: SellerInput
  isNew: boolean
  onClose: () => void
  onSave: (input: SellerInput) => Promise<void>
}) {
  const [name, setName] = useState(initial.name)
  const [code, setCode] = useState(initial.code)
  const [fixed, setFixed] = useState(formatPtBrInput(initial.fixed_salary))
  const [rate, setRate] = useState(formatPtBrInput(initial.commission_rate))
  const [guru, setGuru] = useState(initial.guru_patterns.join('\n'))
  const [asaas, setAsaas] = useState(initial.asaas_patterns.join('\n'))
  const [active, setActive] = useState(initial.active)
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        fixed_salary: parsePtBrNumber(fixed),
        commission_rate: parsePtBrNumber(rate),
        guru_patterns: lines(guru),
        asaas_patterns: lines(asaas),
        active,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isNew ? 'Nova vendedora' : `Editar ${initial.name}`}</DialogTitle>
          <DialogDescription className="text-xs">
            Os padrões identificam as vendas da vendedora. São expressões regulares aplicadas ao
            texto em minúsculas e sem acento, uma por linha (ex.:{' '}
            <code>^comercial\s*-\s*maju\b</code>). Ao salvar, as vendas são reclassificadas.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-[11px]">Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Sigla (links do Asaas)</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Fixo mensal (R$)</Label>
            <Input
              value={fixed}
              inputMode="decimal"
              onChange={(e) => setFixed(e.target.value)}
              onBlur={() => setFixed(formatPtBrInput(fixed))}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Comissão (%)</Label>
            <Input
              value={rate}
              inputMode="decimal"
              onChange={(e) => setRate(e.target.value)}
              onBlur={() => setRate(formatPtBrInput(rate))}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1 col-span-2">
            <Label className="text-[11px]">Nome do checkout no Guru</Label>
            <Textarea
              value={guru}
              rows={2}
              onChange={(e) => setGuru(e.target.value)}
              className="text-xs font-mono"
            />
          </div>
          <div className="space-y-1 col-span-2">
            <Label className="text-[11px]">Nome do link no Asaas</Label>
            <Textarea
              value={asaas}
              rows={3}
              onChange={(e) => setAsaas(e.target.value)}
              className="text-xs font-mono"
            />
          </div>
          <label className="flex items-center gap-2 text-xs col-span-2">
            <Switch checked={active} onCheckedChange={setActive} /> Ativa (aparece no fechamento)
          </label>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={saving || !name.trim() || !code.trim()}
            onClick={submit}
            className="bg-gradient-to-r from-[#6D49F2] to-[#FF2AFF] text-white hover:opacity-90"
          >
            {saving ? 'Salvando…' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
