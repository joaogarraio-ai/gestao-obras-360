import { useState } from 'react'
import { useStore } from '../../lib/store'
import { FUNCOES_SUGERIDAS, type FormaPagamento, type Trabalhador } from '../../lib/types'
import { formatBRL, parseMoneyInput } from '../../lib/money'
import { Button, Card, EmptyState, Field, Input, Select } from '../../components/ui'

interface FormState {
  nome: string
  funcao: string
  valorDiaria: string
  formaPagamento: FormaPagamento
  chavePix: string
}

const FORM_VAZIO: FormState = { nome: '', funcao: '', valorDiaria: '', formaPagamento: 'pix', chavePix: '' }

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
        <Button onClick={iniciarNovo} className="w-full">
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
              <p className="font-semibold text-stone-800 truncate">{t.nome}</p>
              <p className="text-xs text-stone-500">
                {t.funcao} · {formatBRL(t.valorDiaria)}/dia · {t.formaPagamento === 'pix' ? 'PIX' : 'Dinheiro'}
              </p>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button variant="ghost" onClick={() => iniciarEdicao(t)} className="px-2">
                ✏️
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  if (confirm(`Remover ${t.nome}?`)) removeTrabalhador(t.id)
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
