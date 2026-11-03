import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useStore } from '../../lib/store'
import { generateId } from '../../lib/id'
import { formatDatePt, toISODate } from '../../lib/dates'
import { formatBRL, parseMoneyInput } from '../../lib/money'
import type { SolicitacaoCompra } from '../../lib/types'
import { Badge, Button, Field, Input, Select } from '../../components/ui'

/** Mapa de cotação: preços de vários fornecedores para o mesmo pedido, lado a lado. */
export default function Cotacoes({ s, editavel }: { s: SolicitacaoCompra; editavel: boolean }) {
  const { db, updateItem } = useStore()
  const [form, setForm] = useState<null | { fornecedorId: string; valor: string; prazo: string; condicao: string; observacao: string }>(null)
  const cotacoes = [...(s.cotacoes ?? [])].sort((a, b) => a.valor - b.valor)
  const menor = cotacoes[0]?.valor
  const maior = cotacoes[cotacoes.length - 1]?.valor
  const nome = (id: string) => db.fornecedores.find((f) => f.id === id)?.nome ?? 'Fornecedor removido'

  function adicionar() {
    if (!form || !form.fornecedorId || parseMoneyInput(form.valor) <= 0) return
    const nova = {
      id: generateId(),
      fornecedorId: form.fornecedorId,
      data: toISODate(new Date()),
      valor: parseMoneyInput(form.valor),
      prazoEntregaDias: form.prazo ? Number(form.prazo) || undefined : undefined,
      condicaoPagamento: form.condicao.trim() || undefined,
      observacao: form.observacao.trim() || undefined,
    }
    updateItem('solicitacoesCompra', s.id, { cotacoes: [...(s.cotacoes ?? []), nova] })
    setForm(null)
  }

  function escolher(id: string) {
    const c = s.cotacoes?.find((x) => x.id === id)
    if (!c) return
    updateItem('solicitacoesCompra', s.id, { cotacaoEscolhidaId: id, fornecedorId: c.fornecedorId, valorEstimado: c.valor })
  }

  function remover(id: string) {
    updateItem('solicitacoesCompra', s.id, {
      cotacoes: (s.cotacoes ?? []).filter((c) => c.id !== id),
      cotacaoEscolhidaId: s.cotacaoEscolhidaId === id ? undefined : s.cotacaoEscolhidaId,
    })
  }

  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-700">Cotações ({cotacoes.length})</p>
        {cotacoes.length >= 2 && menor !== undefined && maior !== undefined && maior > menor && (
          <p className="text-xs text-green-700">Economia de {formatBRL(maior - menor)} escolhendo a menor</p>
        )}
      </div>

      {cotacoes.length === 0 && <p className="text-xs text-slate-500">Peça preço a 2 ou 3 fornecedores e compare aqui antes de comprar.</p>}

      {cotacoes.map((c) => {
        const escolhida = s.cotacaoEscolhidaId === c.id
        return (
          <div key={c.id} className={`rounded-lg border bg-white p-2.5 text-sm ${escolhida ? 'border-green-400' : 'border-slate-200'}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-slate-800 truncate">{nome(c.fornecedorId)}</p>
                <p className="text-xs text-slate-500">
                  {[
                    formatDatePt(c.data),
                    c.prazoEntregaDias !== undefined && `entrega em ${c.prazoEntregaDias} dia(s)`,
                    c.condicaoPagamento,
                    c.observacao,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-semibold text-slate-900 whitespace-nowrap">{formatBRL(c.valor)}</p>
                {c.valor === menor && cotacoes.length > 1 && <Badge tone="green">Menor preço</Badge>}
              </div>
            </div>
            {editavel && (
              <div className="flex gap-2 mt-2">
                {escolhida ? (
                  <Badge tone="green">Escolhida</Badge>
                ) : (
                  <Button variant="secondary" className="py-1 text-xs" onClick={() => escolher(c.id)}>
                    Escolher esta
                  </Button>
                )}
                <button className="ml-auto text-slate-400 hover:text-red-600" aria-label="Remover cotação" onClick={() => remover(c.id)}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )
      })}

      {editavel && !form && (
        <Button
          variant="ghost"
          className="py-1.5 text-sm"
          onClick={() => setForm({ fornecedorId: '', valor: '', prazo: '', condicao: '', observacao: '' })}
          disabled={db.fornecedores.length === 0}
        >
          + Adicionar cotação
        </Button>
      )}
      {editavel && db.fornecedores.length === 0 && <p className="text-xs text-slate-500">Cadastre fornecedores em Cadastros para cotar.</p>}

      {form && (
        <div className="space-y-2 rounded-lg border border-brand-200 bg-white p-2.5">
          <div className="grid grid-cols-[1fr_8rem] gap-2">
            <Field label="Fornecedor">
              <Select value={form.fornecedorId} onChange={(e) => setForm({ ...form, fornecedorId: e.target.value })}>
                <option value="">Escolha…</option>
                {db.fornecedores.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Valor total (R$)">
              <Input value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} inputMode="decimal" />
            </Field>
          </div>
          <div className="grid grid-cols-[6rem_1fr] gap-2">
            <Field label="Entrega (dias)">
              <Input value={form.prazo} onChange={(e) => setForm({ ...form, prazo: e.target.value })} inputMode="numeric" />
            </Field>
            <Field label="Pagamento">
              <Input value={form.condicao} onChange={(e) => setForm({ ...form, condicao: e.target.value })} placeholder="Ex: à vista no PIX, 30 dias" />
            </Field>
          </div>
          <Field label="Observação">
            <Input value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} placeholder="Ex: frete incluso" />
          </Field>
          <div className="flex gap-2">
            <Button className="flex-1 py-1.5" onClick={adicionar}>
              Salvar cotação
            </Button>
            <Button variant="secondary" className="py-1.5" onClick={() => setForm(null)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
