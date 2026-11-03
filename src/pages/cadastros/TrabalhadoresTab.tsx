import { Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useStore } from '../../lib/store'
import { FUNCOES_SUGERIDAS, type FormaPagamento, type Trabalhador } from '../../lib/types'
import { formatBRL, parseMoneyInput } from '../../lib/money'
import { mascaraDocumento, mascaraTelefone } from '../../lib/formatos'
import { Button, Card, EmptyState, Field, Input, Select, TextArea } from '../../components/ui'

interface FormState {
  nome: string
  funcao: string
  valorDiaria: string
  formaPagamento: FormaPagamento
  chavePix: string
  cpf: string
  telefone: string
  cidade: string
  dataAdmissao: string
  observacao: string
}

const FORM_VAZIO: FormState = {
  nome: '',
  funcao: '',
  valorDiaria: '',
  formaPagamento: 'pix',
  chavePix: '',
  cpf: '',
  telefone: '',
  cidade: '',
  dataAdmissao: '',
  observacao: '',
}

export default function TrabalhadoresTab() {
  const { db, addTrabalhador, updateTrabalhador, removeTrabalhador } = useStore()
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState<FormState>(FORM_VAZIO)

  function iniciarNovo() {
    setEditandoId(null)
    setForm(FORM_VAZIO)
    setMostrarForm(true)
  }

  function iniciarEdicao(t: Trabalhador) {
    setEditandoId(t.id)
    setForm({
      nome: t.nome,
      funcao: t.funcao,
      valorDiaria: String(t.valorDiaria).replace('.', ','),
      formaPagamento: t.formaPagamento,
      chavePix: t.chavePix ?? '',
      cpf: t.cpf ?? '',
      telefone: t.telefone ?? '',
      cidade: t.cidade ?? '',
      dataAdmissao: t.dataAdmissao ?? '',
      observacao: t.observacao ?? '',
    })
    setMostrarForm(true)
  }

  function salvar() {
    if (!form.nome.trim() || !form.funcao.trim()) return
    const dados = {
      nome: form.nome.trim(),
      funcao: form.funcao.trim(),
      valorDiaria: parseMoneyInput(form.valorDiaria),
      formaPagamento: form.formaPagamento,
      chavePix: form.chavePix.trim() || undefined,
      cpf: form.cpf.trim() || undefined,
      telefone: form.telefone.trim() || undefined,
      cidade: form.cidade.trim() || undefined,
      dataAdmissao: form.dataAdmissao || undefined,
      observacao: form.observacao.trim() || undefined,
      ativo: true,
    }
    if (editandoId) {
      updateTrabalhador(editandoId, dados)
    } else {
      addTrabalhador(dados)
    }
    setMostrarForm(false)
    setForm(FORM_VAZIO)
    setEditandoId(null)
  }

  return (
    <div className="space-y-3">
      {!mostrarForm && (
        <Button onClick={iniciarNovo} className="w-full sm:w-auto">
          + Novo trabalhador
        </Button>
      )}

      {mostrarForm && (
        <Card className="p-4 space-y-3">
          <Field label="Nome">
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: José da Silva" autoFocus />
          </Field>
          <Field label="Função">
            <Input
              value={form.funcao}
              onChange={(e) => setForm({ ...form, funcao: e.target.value })}
              placeholder="Ex: Pedreiro"
              list="funcoes-sugeridas"
            />
            <datalist id="funcoes-sugeridas">
              {FUNCOES_SUGERIDAS.map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
          </Field>
          <Field label="Valor da diária (R$)">
            <Input
              value={form.valorDiaria}
              onChange={(e) => setForm({ ...form, valorDiaria: e.target.value })}
              placeholder="Ex: 100,00"
              inputMode="decimal"
            />
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
          <div className="grid grid-cols-2 gap-2">
            <Field label="CPF">
              <Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: mascaraDocumento(e.target.value).slice(0, 14) })} inputMode="numeric" />
            </Field>
            <Field label="Telefone / WhatsApp">
              <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: mascaraTelefone(e.target.value) })} inputMode="tel" />
            </Field>
            <Field label="Cidade">
              <Input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} />
            </Field>
            <Field label="Início na equipe">
              <Input type="date" value={form.dataAdmissao} onChange={(e) => setForm({ ...form, dataAdmissao: e.target.value })} />
            </Field>
          </div>
          <Field label="Observações">
            <TextArea value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} />
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

      {db.trabalhadores.length === 0 && !mostrarForm && <EmptyState text="Nenhum trabalhador cadastrado ainda." />}

      <div className="space-y-2">
        {db.trabalhadores.map((t) => (
          <Card key={t.id} className="p-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-slate-800 truncate">{t.nome}</p>
              <p className="text-xs text-slate-500">
                {[t.funcao, `${formatBRL(t.valorDiaria)}/dia`, t.formaPagamento === 'pix' ? 'PIX' : 'Dinheiro', t.telefone, t.cidade].filter(Boolean).join(' · ')}
              </p>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button variant="ghost" onClick={() => iniciarEdicao(t)} className="px-2">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  const usos = db.registrosDia.filter((r) => r.trabalhadorId === t.id).length + db.pagamentosTarefa.filter((p) => p.trabalhadorId === t.id).length
                  if (usos) {
                    alert(`${t.nome} tem ${usos} diária(s) ou pagamento(s) lançado(s) e não pode ser removido, para não perder o histórico.`)
                    return
                  }
                  if (confirm(`Remover ${t.nome}?`)) removeTrabalhador(t.id)
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
