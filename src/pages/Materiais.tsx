import { Download, Paperclip, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useStore } from '../lib/store'
import { toISODate, formatDatePt } from '../lib/dates'
import { formatBRL, parseMoneyInput } from '../lib/money'
import { baixarPlanilha } from '../lib/exportar'
import { generateId } from '../lib/id'
import { removerAnexosDe } from '../lib/anexos'
import Anexos from '../components/Anexos'
import type { CompraMaterial } from '../lib/types'
import { Button, Card, EmptyState, Field, Input, PageTitle, Select } from '../components/ui'

interface FormState {
  data: string
  fornecedorId: string
  obraId: string
  descricao: string
  valor: string
  numeroNota: string
}

export default function Materiais() {
  const { db, addCompraMaterial, updateCompraMaterial, removeCompraMaterial } = useStore()
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [idForm, setIdForm] = useState(() => generateId())
  const [comprovante, setComprovante] = useState<string | null>(null)

  const formVazio: FormState = {
    data: toISODate(new Date()),
    fornecedorId: db.fornecedores[0]?.id ?? '',
    obraId: db.obras[0]?.id ?? '',
    descricao: '',
    valor: '',
    numeroNota: '',
  }
  const [form, setForm] = useState<FormState>(formVazio)

  function iniciarNovo() {
    setEditandoId(null)
    setIdForm(generateId())
    setForm(formVazio)
    setMostrarForm(true)
  }

  function iniciarEdicao(c: CompraMaterial) {
    setEditandoId(c.id)
    setIdForm(c.id)
    setForm({
      data: c.data,
      fornecedorId: c.fornecedorId,
      obraId: c.obraId,
      descricao: c.descricao,
      valor: String(c.valor).replace('.', ','),
      numeroNota: c.numeroNota ?? '',
    })
    setMostrarForm(true)
  }

  function salvar() {
    if (!form.fornecedorId || !form.obraId || !form.descricao.trim()) return
    const dados = {
      data: form.data,
      fornecedorId: form.fornecedorId,
      obraId: form.obraId,
      descricao: form.descricao.trim(),
      valor: parseMoneyInput(form.valor),
      numeroNota: form.numeroNota.trim() || undefined,
    }
    if (editandoId) {
      updateCompraMaterial(editandoId, dados)
    } else {
      addCompraMaterial({ ...dados, id: idForm })
    }
    setMostrarForm(false)
    setEditandoId(null)
  }

  const nomeFornecedor = (id: string) => db.fornecedores.find((f) => f.id === id)?.nome ?? '—'
  const nomeObra = (id: string) => db.obras.find((o) => o.id === id)?.nome ?? '—'

  const comprasOrdenadas = [...db.comprasMaterial].sort((a, b) => b.data.localeCompare(a.data))
  const totalGeral = comprasOrdenadas.reduce((acc, c) => acc + c.valor, 0)

  const semCadastros = db.fornecedores.length === 0 || db.obras.length === 0

  return (
    <div>
      <PageTitle
        title="Materiais"
        subtitle="Notas fiscais de compras de material"
        actions={
          comprasOrdenadas.length > 0 && (
            <Button
              variant="secondary"
              onClick={() =>
                baixarPlanilha(
                  `compras-de-material-${toISODate(new Date())}`,
                  ['Data', 'Obra', 'Fornecedor', 'Descrição', 'Nº da nota', 'Valor (R$)'],
                  [...comprasOrdenadas]
                    .reverse()
                    .map((c) => [
                      formatDatePt(c.data),
                      db.obras.find((o) => o.id === c.obraId)?.nome,
                      db.fornecedores.find((f) => f.id === c.fornecedorId)?.nome,
                      c.descricao,
                      c.numeroNota,
                      c.valor,
                    ]),
                )
              }
            >
              <Download className="h-4 w-4" /> Excel
            </Button>
          )
        }
      />

      {semCadastros && <EmptyState text="Cadastre ao menos um fornecedor e uma obra em Cadastros para lançar compras." />}

      {!semCadastros && !mostrarForm && (
        <Button onClick={iniciarNovo} className="w-full sm:w-auto mb-3">
          + Nova compra
        </Button>
      )}

      {mostrarForm && (
        <Card className="p-4 space-y-3 mb-3">
          <Field label="Data">
            <Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
          </Field>
          <Field label="Fornecedor">
            <Select value={form.fornecedorId} onChange={(e) => setForm({ ...form, fornecedorId: e.target.value })}>
              {db.fornecedores.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Obra">
            <Select value={form.obraId} onChange={(e) => setForm({ ...form, obraId: e.target.value })}>
              {db.obras.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nome}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Descrição do material">
            <Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Ex: 20 sacos de cimento" />
          </Field>
          <Field label="Valor (R$)">
            <Input value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} placeholder="Ex: 250,00" inputMode="decimal" />
          </Field>
          <Field label="Nº da nota (opcional)">
            <Input value={form.numeroNota} onChange={(e) => setForm({ ...form, numeroNota: e.target.value })} placeholder="Ex: 1234" />
          </Field>
          <Anexos refColecao="comprasMaterial" refId={idForm} titulo="Foto da nota ou do cupom" />
          <div className="flex gap-2 pt-1">
            <Button onClick={salvar} className="flex-1">
              Salvar
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                if (!editandoId) void removerAnexosDe('comprasMaterial', idForm)
                setMostrarForm(false)
              }}
            >
              Cancelar
            </Button>
          </div>
        </Card>
      )}

      {comprasOrdenadas.length === 0 && !mostrarForm && !semCadastros && <EmptyState text="Nenhuma compra lançada ainda." />}

      {comprasOrdenadas.length > 0 && (
        <p className="text-sm text-slate-500 mb-2">
          Total lançado: <span className="font-semibold text-slate-800">{formatBRL(totalGeral)}</span>
        </p>
      )}

      <div className="space-y-2">
        {comprasOrdenadas.map((c) => (
          <Card key={c.id} className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-slate-800 truncate">{c.descricao}</p>
                <p className="text-xs text-slate-500 truncate">
                  {formatDatePt(c.data)} · {nomeFornecedor(c.fornecedorId)} · {nomeObra(c.obraId)}
                  {c.numeroNota ? ` · NF ${c.numeroNota}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <p className="font-semibold text-slate-800 whitespace-nowrap">{formatBRL(c.valor)}</p>
                <Button variant="ghost" onClick={() => setComprovante(comprovante === c.id ? null : c.id)} className="px-2" aria-label="Foto da nota">
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Button variant="ghost" onClick={() => iniciarEdicao(c)} className="px-2">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (confirm('Remover esta compra?')) {
                      removeCompraMaterial(c.id)
                      void removerAnexosDe('comprasMaterial', c.id)
                    }
                  }}
                  className="px-2"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {comprovante === c.id && (
              <div className="mt-2 border-t border-slate-100 pt-2">
                <Anexos refColecao="comprasMaterial" refId={c.id} titulo="Foto da nota" />
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
