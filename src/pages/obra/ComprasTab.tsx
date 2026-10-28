import { useState } from 'react'
import { useStore } from '../../lib/store'
import { etapasDaObra } from '../../lib/gestao'
import { formatDatePt, toISODate } from '../../lib/dates'
import { formatBRL, formatNumero, parseMoneyInput } from '../../lib/money'
import { STATUS_SOLICITACAO_LABEL } from '../../lib/types'
import type { Obra, SolicitacaoCompra, StatusSolicitacao } from '../../lib/types'
import { Badge, Button, Card, EmptyState, Field, Input, Select } from '../../components/ui'

const TONE: Record<StatusSolicitacao, 'amber' | 'green' | 'red' | 'default'> = {
  pendente: 'amber',
  aprovada: 'green',
  rejeitada: 'red',
  comprada: 'default',
}

export default function ComprasTab({ obra }: { obra: Obra }) {
  const { db, addItem, updateItem, removeItem, addCompraMaterial } = useStore()
  const etapas = etapasDaObra(db, obra.id)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [comprando, setComprando] = useState<{ s: SolicitacaoCompra; valor: string; nota: string; fornecedorId: string; entrarEstoque: boolean } | null>(null)
  const formVazio = {
    descricao: '',
    quantidade: '',
    unidade: 'un',
    valorEstimado: '',
    etapaId: '',
    fornecedorId: '',
    solicitante: '',
  }
  const [form, setForm] = useState(formVazio)

  const solicitacoes = db.solicitacoesCompra.filter((s) => s.obraId === obra.id).sort((a, b) => b.data.localeCompare(a.data))
  const ordem: StatusSolicitacao[] = ['pendente', 'aprovada', 'comprada', 'rejeitada']
  const nomeEtapa = (id?: string) => etapas.find((e) => e.id === id)?.nome
  const nomeFornecedor = (id?: string) => db.fornecedores.find((f) => f.id === id)?.nome

  function salvar() {
    if (!form.descricao.trim()) return
    addItem('solicitacoesCompra', {
      obraId: obra.id,
      etapaId: form.etapaId || undefined,
      data: toISODate(new Date()),
      solicitante: form.solicitante.trim() || 'Obra',
      descricao: form.descricao.trim(),
      quantidade: parseMoneyInput(form.quantidade),
      unidade: form.unidade.trim() || 'un',
      valorEstimado: parseMoneyInput(form.valorEstimado),
      fornecedorId: form.fornecedorId || undefined,
      status: 'pendente',
    })
    setForm(formVazio)
    setMostrarForm(false)
  }

  function decidir(s: SolicitacaoCompra, aprovar: boolean) {
    const nome = prompt(aprovar ? 'Aprovado por (nome):' : 'Rejeitado por (nome):', 'Engenheiro')
    if (nome === null) return
    const motivo = aprovar ? undefined : (prompt('Motivo da rejeição (opcional):') ?? undefined)
    updateItem('solicitacoesCompra', s.id, {
      status: aprovar ? 'aprovada' : 'rejeitada',
      aprovadoPor: nome || undefined,
      dataDecisao: toISODate(new Date()),
      motivoRejeicao: motivo || undefined,
    })
  }

  function registrarCompra() {
    if (!comprando) return
    if (!comprando.fornecedorId) {
      alert('Escolha o fornecedor.')
      return
    }
    const compra = addCompraMaterial({
      data: toISODate(new Date()),
      fornecedorId: comprando.fornecedorId,
      obraId: obra.id,
      descricao: comprando.s.descricao,
      valor: parseMoneyInput(comprando.valor),
      numeroNota: comprando.nota.trim() || undefined,
      etapaId: comprando.s.etapaId,
      solicitacaoId: comprando.s.id,
    })
    updateItem('solicitacoesCompra', comprando.s.id, { status: 'comprada', compraId: compra.id })
    if (comprando.entrarEstoque && comprando.s.quantidade > 0) {
      const nome = comprando.s.descricao
      const material =
        db.materiaisEstoque.find((m) => m.nome.toLowerCase() === nome.toLowerCase()) ??
        addItem('materiaisEstoque', { nome, unidade: comprando.s.unidade })
      addItem('movimentosEstoque', {
        materialId: material.id,
        obraId: obra.id,
        data: toISODate(new Date()),
        tipo: 'entrada',
        quantidade: comprando.s.quantidade,
        valorUnitario: parseMoneyInput(comprando.valor) / comprando.s.quantidade,
        compraId: compra.id,
      })
    }
    setComprando(null)
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-stone-500">
        Fluxo: a obra pede o material → alguém aprova → ao comprar, a nota entra automaticamente em Materiais e no financeiro.
      </p>

      {!mostrarForm && (
        <Button className="w-full" onClick={() => setMostrarForm(true)}>
          + Nova solicitação de compra
        </Button>
      )}

      {mostrarForm && (
        <Card className="p-4 space-y-3 border-amber-400">
          <Field label="Material / serviço">
            <Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Ex: Cimento CP-II 50 kg" />
          </Field>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Quantidade">
              <Input value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: e.target.value })} inputMode="decimal" />
            </Field>
            <Field label="Unidade">
              <Input value={form.unidade} onChange={(e) => setForm({ ...form, unidade: e.target.value })} />
            </Field>
            <Field label="Valor estimado">
              <Input value={form.valorEstimado} onChange={(e) => setForm({ ...form, valorEstimado: e.target.value })} inputMode="decimal" placeholder="R$" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Etapa (opcional)">
              <Select value={form.etapaId} onChange={(e) => setForm({ ...form, etapaId: e.target.value })}>
                <option value="">—</option>
                {etapas.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nome}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Fornecedor sugerido">
              <Select value={form.fornecedorId} onChange={(e) => setForm({ ...form, fornecedorId: e.target.value })}>
                <option value="">—</option>
                {db.fornecedores.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Solicitante">
            <Input value={form.solicitante} onChange={(e) => setForm({ ...form, solicitante: e.target.value })} placeholder="Ex: Mestre de obra" />
          </Field>
          <div className="flex gap-2">
            <Button onClick={salvar} className="flex-1">
              Enviar para aprovação
            </Button>
            <Button variant="secondary" onClick={() => setMostrarForm(false)}>
              Cancelar
            </Button>
          </div>
        </Card>
      )}

      {comprando && (
        <Card className="p-4 space-y-3 border-green-400">
          <p className="font-semibold text-stone-700">Registrar compra: {comprando.s.descricao}</p>
          <Field label="Fornecedor">
            <Select value={comprando.fornecedorId} onChange={(e) => setComprando({ ...comprando, fornecedorId: e.target.value })}>
              <option value="">Escolha…</option>
              {db.fornecedores.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Valor da nota (R$)">
              <Input value={comprando.valor} onChange={(e) => setComprando({ ...comprando, valor: e.target.value })} inputMode="decimal" />
            </Field>
            <Field label="Nº da nota">
              <Input value={comprando.nota} onChange={(e) => setComprando({ ...comprando, nota: e.target.value })} />
            </Field>
          </div>
          {comprando.s.quantidade > 0 && (
            <label className="flex items-center gap-2 text-sm text-stone-700">
              <input
                type="checkbox"
                className="accent-amber-700"
                checked={comprando.entrarEstoque}
                onChange={(e) => setComprando({ ...comprando, entrarEstoque: e.target.checked })}
              />
              Dar entrada de {formatNumero(comprando.s.quantidade)} {comprando.s.unidade} no estoque da obra
            </label>
          )}
          <div className="flex gap-2">
            <Button onClick={registrarCompra} className="flex-1">
              Confirmar compra
            </Button>
            <Button variant="secondary" onClick={() => setComprando(null)}>
              Cancelar
            </Button>
          </div>
        </Card>
      )}

      {solicitacoes.length === 0 && <EmptyState text="Nenhuma solicitação de compra." />}

      {ordem.map((status) => {
        const lista = solicitacoes.filter((s) => s.status === status)
        if (lista.length === 0) return null
        return (
          <div key={status}>
            <p className="text-sm font-semibold text-stone-600 mb-1.5">
              {STATUS_SOLICITACAO_LABEL[status]} ({lista.length})
            </p>
            <div className="space-y-2">
              {lista.map((s) => (
                <Card key={s.id} className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-stone-800">{s.descricao}</p>
                      <p className="text-xs text-stone-500">
                        {formatNumero(s.quantidade)} {s.unidade} · {formatDatePt(s.data)} · {s.solicitante}
                        {nomeEtapa(s.etapaId) ? ` · ${nomeEtapa(s.etapaId)}` : ''}
                        {nomeFornecedor(s.fornecedorId) ? ` · ${nomeFornecedor(s.fornecedorId)}` : ''}
                      </p>
                      {s.aprovadoPor && (
                        <p className="text-xs text-stone-500">
                          {s.status === 'rejeitada' ? 'Rejeitada' : 'Aprovada'} por {s.aprovadoPor}
                          {s.dataDecisao ? ` em ${formatDatePt(s.dataDecisao)}` : ''}
                          {s.motivoRejeicao ? `: ${s.motivoRejeicao}` : ''}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-stone-800 whitespace-nowrap">{formatBRL(s.valorEstimado)}</p>
                      <Badge tone={TONE[s.status]}>{STATUS_SOLICITACAO_LABEL[s.status]}</Badge>
                    </div>
                  </div>
                  {s.status === 'pendente' && (
                    <div className="flex gap-2 mt-2">
                      <Button className="flex-1" onClick={() => decidir(s, true)}>
                        Aprovar
                      </Button>
                      <Button variant="danger" className="flex-1" onClick={() => decidir(s, false)}>
                        Rejeitar
                      </Button>
                    </div>
                  )}
                  {s.status === 'aprovada' && (
                    <Button
                      variant="secondary"
                      className="w-full mt-2"
                      onClick={() =>
                        setComprando({ s, valor: String(s.valorEstimado).replace('.', ','), nota: '', fornecedorId: s.fornecedorId ?? '', entrarEstoque: true })
                      }
                    >
                      Registrar compra
                    </Button>
                  )}
                  {(s.status === 'pendente' || s.status === 'rejeitada') && (
                    <button
                      className="text-xs text-stone-400 mt-2"
                      onClick={() => {
                        if (confirm('Excluir esta solicitação?')) removeItem('solicitacoesCompra', s.id)
                      }}
                    >
                      Excluir
                    </button>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
