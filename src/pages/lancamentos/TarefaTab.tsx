import { useState } from 'react'
import { useStore } from '../../lib/store'
import { toISODate, formatDatePt } from '../../lib/dates'
import { formatBRL, parseMoneyInput } from '../../lib/money'
import type { FormaPagamento, PagamentoTarefa } from '../../lib/types'
import { Button, Card, EmptyState, Field, Input, Select } from '../../components/ui'

interface FormState {
  data: string
  trabalhadorId: string // '' = avulso (nome livre)
  nomeAvulso: string
  obraId: string
  descricao: string
  valor: string
  formaPagamento: FormaPagamento
  chavePix: string
}

export default function TarefaTab() {
  const { db, addPagamentoTarefa, updatePagamentoTarefa, removePagamentoTarefa } = useStore()
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)

  const formVazio: FormState = {
    data: toISODate(new Date()),
    trabalhadorId: db.trabalhadores[0]?.id ?? '',
    nomeAvulso: '',
    obraId: db.obras[0]?.id ?? '',
    descricao: '',
    valor: '',
    formaPagamento: 'pix',
    chavePix: '',
  }
  const [form, setForm] = useState<FormState>(formVazio)

  function selecionarTrabalhador(trabalhadorId: string) {
    const trab = db.trabalhadores.find((t) => t.id === trabalhadorId)
    setForm({
      ...form,
      trabalhadorId,
      formaPagamento: trab?.formaPagamento ?? form.formaPagamento,
      chavePix: trab?.chavePix ?? form.chavePix,
    })
  }

  function iniciarNovo() {
    setEditandoId(null)
    setForm(formVazio)
    setMostrarForm(true)
  }

  function iniciarEdicao(p: PagamentoTarefa) {
    setEditandoId(p.id)
    setForm({
      data: p.data,
      trabalhadorId: p.trabalhadorId ?? '',
      nomeAvulso: p.nomeAvulso ?? '',
      obraId: p.obraId,
      descricao: p.descricao,
      valor: String(p.valor).replace('.', ','),
      formaPagamento: p.formaPagamento,
      chavePix: p.chavePix ?? '',
    })
    setMostrarForm(true)
  }

  function salvar() {
    if (!form.obraId || !form.descricao.trim()) return
    if (!form.trabalhadorId && !form.nomeAvulso.trim()) return

    const dados = {
      data: form.data,
      trabalhadorId: form.trabalhadorId || undefined,
      nomeAvulso: form.trabalhadorId ? undefined : form.nomeAvulso.trim(),
      obraId: form.obraId,
      descricao: form.descricao.trim(),
      valor: parseMoneyInput(form.valor),
      formaPagamento: form.formaPagamento,
      chavePix: form.chavePix.trim() || undefined,
    }
    if (editandoId) {
      updatePagamentoTarefa(editandoId, dados)
    } else {
      addPagamentoTarefa(dados)
    }
    setMostrarForm(false)
    setEditandoId(null)
  }

  const nomeDe = (p: PagamentoTarefa) => {
    if (p.trabalhadorId) return db.trabalhadores.find((t) => t.id === p.trabalhadorId)?.nome ?? '—'
    return p.nomeAvulso ?? '—'
  }
  const nomeObra = (id: string) => db.obras.find((o) => o.id === id)?.nome ?? '—'

  const tarefasOrdenadas = [...db.pagamentosTarefa].sort((a, b) => b.data.localeCompare(a.data))
  const totalGeral = tarefasOrdenadas.reduce((acc, p) => acc + p.valor, 0)

  const semObras = db.obras.length === 0

  return (
    <div>
      {semObras && <EmptyState text="Cadastre ao menos uma obra em Cadastros para lançar pagamentos por tarefa." />}

      {!semObras && !mostrarForm && (
        <Button onClick={iniciarNovo} className="w-full mb-3">
          + Novo pagamento por tarefa
        </Button>
      )}

      {mostrarForm && (
        <Card className="p-4 space-y-3 mb-3">
          <Field label="Data">
            <Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
          </Field>
          <Field label="Quem vai receber">
            <Select value={form.trabalhadorId} onChange={(e) => selecionarTrabalhador(e.target.value)}>
              <option value="">— Avulso (nome livre) —</option>
              {db.trabalhadores.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </Select>
          </Field>
          {!form.trabalhadorId && (
            <Field label="Nome (avulso)">
              <Input
                value={form.nomeAvulso}
                onChange={(e) => setForm({ ...form, nomeAvulso: e.target.value })}
                placeholder="Ex: Inforzallim"
              />
            </Field>
          )}
          <Field label="Obra">
            <Select value={form.obraId} onChange={(e) => setForm({ ...form, obraId: e.target.value })}>
              {db.obras.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nome}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Descrição do serviço">
            <Input
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              placeholder="Ex: Pintura da cerca e portão"
            />
          </Field>
          <Field label="Valor (R$)">
            <Input value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} placeholder="Ex: 200,00" inputMode="decimal" />
          </Field>
          <Field label="Forma de pagamento">
            <Select
              value={form.formaPagamento}
              onChange={(e) => setForm({ ...form, formaPagamento: e.target.value as FormaPagamento })}
            >
              <option value="pix">PIX</option>
              <option value="dinheiro">Dinheiro</option>
            </Select>
          </Field>
          {form.formaPagamento === 'pix' && (
            <Field label="Chave PIX (opcional)">
              <Input value={form.chavePix} onChange={(e) => setForm({ ...form, chavePix: e.target.value })} placeholder="CPF, telefone, e-mail..." />
            </Field>
          )}
          <div className="flex gap-2 pt-1">
            <Button onClick={salvar} className="flex-1">
              Salvar
            </Button>
            <Button variant="secondary" onClick={() => setMostrarForm(false)}>
              Cancelar
            </Button>
          </div>
        </Card>
      )}

      {tarefasOrdenadas.length === 0 && !mostrarForm && !semObras && (
        <EmptyState text="Nenhum pagamento por tarefa lançado ainda." />
      )}

      {tarefasOrdenadas.length > 0 && (
        <p className="text-sm text-stone-500 mb-2">
          Total lançado: <span className="font-semibold text-stone-800">{formatBRL(totalGeral)}</span>
        </p>
      )}

      <div className="space-y-2">
        {tarefasOrdenadas.map((p) => (
          <Card key={p.id} className="p-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-stone-800 truncate">
                {nomeDe(p)} {!p.trabalhadorId && <span className="text-xs text-stone-400">(avulso)</span>}
              </p>
              <p className="text-xs text-stone-500 truncate">
                {formatDatePt(p.data)} · {p.descricao} · {nomeObra(p.obraId)} · {p.formaPagamento === 'pix' ? 'PIX' : 'Dinheiro'}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <p className="font-semibold text-stone-800 whitespace-nowrap">{formatBRL(p.valor)}</p>
              <Button variant="ghost" onClick={() => iniciarEdicao(p)} className="px-2">
                ✏️
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  if (confirm('Remover este pagamento?')) removePagamentoTarefa(p.id)
                }}
                className="px-2"
              >
                🗑️
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
