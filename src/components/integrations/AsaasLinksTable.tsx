import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatNumber } from '@/lib/financial-utils'
import type { AsaasLink, KindSource, ProductKind, Seller } from '@/services/catalog'
import { fmtDate, KindSelect, MoneyInput, SourceBadge } from './catalog-shared'

const NO_SELLER = '__empresa__'

interface Props {
  links: AsaasLink[]
  sellers: Seller[]
  saving: string | null
  onUpdate: (
    link: AsaasLink,
    patch: {
      kind?: ProductKind
      seller_id?: string | null
      contract_value?: number | null
      kind_source?: KindSource
    },
  ) => void
}

export function AsaasLinksTable({ links, sellers, saving, onUpdate }: Props) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/80">
            <TableHead className="text-[11px]">Link de pagamento</TableHead>
            <TableHead className="text-[11px]">Tipo</TableHead>
            <TableHead className="text-[11px]">Vendedora</TableHead>
            <TableHead className="text-[11px] text-right">Valor do contrato</TableHead>
            <TableHead className="text-[11px] text-right">Contratos (pagos)</TableHead>
            <TableHead className="text-[11px]">Última venda</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {links.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-10 text-slate-400 text-sm">
                Nenhum link. Eles chegam com a sincronização do Asaas.
              </TableCell>
            </TableRow>
          ) : (
            links.map((l) => (
              <TableRow key={l.id} className="border-b border-slate-100">
                <TableCell className="text-xs max-w-[340px]">
                  <p className="font-medium text-slate-900 truncate" title={l.name}>
                    {l.name}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {l.asaas_link_id}
                    {l.is_company_link ? ' · link da empresa' : ''}
                  </p>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <KindSelect
                      value={l.kind}
                      disabled={saving === l.id}
                      onChange={(kind) => onUpdate(l, { kind })}
                    />
                    <SourceBadge row={l} onReset={() => onUpdate(l, { kind_source: 'auto' })} />
                  </div>
                </TableCell>
                <TableCell>
                  <Select
                    value={l.seller_id ?? NO_SELLER}
                    disabled={saving === l.id}
                    onValueChange={(v) => onUpdate(l, { seller_id: v === NO_SELLER ? null : v })}
                  >
                    <SelectTrigger className="h-8 text-xs w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_SELLER} className="text-xs">
                        Empresa / orgânico
                      </SelectItem>
                      {sellers.map((s) => (
                        <SelectItem key={s.id} value={s.id} className="text-xs">
                          {s.name} ({s.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end">
                    <MoneyInput
                      value={l.contract_value}
                      disabled={saving === l.id}
                      placeholder={
                        l.typical_contract_value !== null
                          ? formatNumber(l.typical_contract_value)
                          : ''
                      }
                      onSave={(contract_value) => onUpdate(l, { contract_value })}
                    />
                  </div>
                </TableCell>
                <TableCell className="text-xs text-right text-slate-700 whitespace-nowrap">
                  {l.contracts.toLocaleString('pt-BR')}{' '}
                  <span className="text-slate-400">
                    ({l.paid_contracts.toLocaleString('pt-BR')})
                  </span>
                </TableCell>
                <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                  {fmtDate(l.last_sale_on)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
