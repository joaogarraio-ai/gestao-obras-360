import { Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useStore } from '../lib/store'
import { toISODate, formatDatePt } from '../lib/dates'
import { formatBRL, parseMoneyInput } from '../lib/money'
import { TIPO_DESPESA_LABEL, type Despesa, type TipoDespesa } from '../lib/types'
import { Button, Card, EmptyState, Field, Input, PageTitle, Select } from '../components/ui'

interface FormState {
  data: string
  tipo: TipoDespesa
  obraId: string
  descricao: string
  valor: string
}

export default function Despesas() {
  const { db, addDespesa, updateDespesa, removeDespesa } = useStore()
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)

  const formVazio: FormState = {
    data: toISODate(new Date()),
    tipo: 'gasolina',
    obraId: db.obras[0]?.id ?? '',
    descricao: '',
    valor: '',
  }
  const [form, setForm] = useState<FormState>(formVazio)

  function iniciarNovo() {
    setEditandoId(null)
    setForm(formVazio)
    setMostrarForm(true)
  }

  function iniciarEdicao(d: Despesa) {
    setEditandoId(d.id)
    setForm({
      data: d.data,
      tipo: d.tipo,
      obraId: d.obraId ?? '',
      descricao: d.descricao,
      valor: String(d.valor).replace('.', ','),
    })
    setMostrarForm(true)
  }

  function salvar() {
    if (!form.descricao.trim()) return
    const dados = {
      data: form.data,
      tipo: form.tipo,
      obraId: form.obraId || undefined,
      descricao: form.descricao.trim(),
      valor: parseMoneyInput(form.valor),
    }
    if (editandoId) {
      updateDespesa(editandoId, dados)
    } else {
      addDespesa(dados)
    }
    setMostrarForm(false)
    setEditandoId(null)
  }

  const nomeObra = (id?: string) => (id ? db.obras.find((o) => o.id === id)?.nome ?? '—' : '—')
  const despesasOrdenadas = [...db.despesas].sort((a, b) => b.data.localeCompare(a.data))
  const totalGeral = despesasOrdenadas.reduce((acc, d) => acc + d.valor, 0)

  return (
    <div>
      <PageTitle title="Despesas" subtitle="Gasolina, frete e outros gastos da semana" />

      {!mostrarForm && (
        <Button onClick={iniciarNovo} className="w-full sm:w-auto mb-3">
          + Nova despesa
        </Button>
      )}

      {mostrarForm && (
        <Card className="p-4 space-y-3 mb-3">
          <Field label="Data">
            <Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
          </Field>
          <Field label="Tipo">
            <Select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoDespesa })}>
              {Object.entries(TIPO_DESPESA_LABEL).map(([valor, label]) => (
                <option key={valor} value={valor}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Obra (opcional)">
            <Select value={form.obraId} onChange={(e) => setForm({ ...form, obraId: e.target.value })}>
              <option value="">—</option>
              {db.obras.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nome}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Descrição">
            <Input
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              placeholder="Ex: Gasolina do carro na semana"
            />
          </Field>
          <Field label="Valor (R$)">
            <Input value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} placeholder="Ex: 80,00" inputMode="decimal" />
          </Field>
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

      {despesasOrdenadas.length === 0 && !mostrarForm && <EmptyState text="Nenhuma despesa lançada ainda." />}

      {despesasOrdenadas.length > 0 && (
        <p className="text-sm text-slate-500 mb-2">
          Total lançado: <span className="font-semibold text-slate-800">{formatBRL(totalGeral)}</span>
        </p>
      )}

      <div className="space-y-2">
        {despesasOrdenadas.map((d) => (
          <Card key={d.id} className="p-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-slate-800 truncate">{d.descricao}</p>
              <p className="text-xs text-slate-500 truncate">
                {formatDatePt(d.data)} · {TIPO_DESPESA_LABEL[d.tipo]}
                {d.obraId ? ` · ${nomeObra(d.obraId)}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <p className="font-semibold text-slate-800 whitespace-nowrap">{formatBRL(d.valor)}</p>
              <Button variant="ghost" onClick={() => iniciarEdicao(d)} className="px-2">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  if (confirm('Remover esta despesa?')) removeDespesa(d.id)
                }}
                className="px-2"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
