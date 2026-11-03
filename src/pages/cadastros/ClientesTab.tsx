import { Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useStore } from '../../lib/store'
import { enderecoResumido, limparEndereco, mascaraDocumento, mascaraTelefone } from '../../lib/formatos'
import type { Cliente, Endereco, TipoPessoa } from '../../lib/types'
import CamposEndereco from '../../components/CamposEndereco'
import { Button, Card, EmptyState, Field, Input, Select, TextArea } from '../../components/ui'

type Form = Omit<Cliente, 'id' | 'ativo' | keyof Endereco>
const VAZIO: Form = { nome: '', tipoPessoa: 'pf', documento: '', telefone: '', email: '', contato: '', observacao: '' }

function FormCliente({ cliente, onFechar }: { cliente?: Cliente; onFechar: () => void }) {
  const { addItem, updateItem } = useStore()
  const [f, setF] = useState<Form>(cliente ? { ...VAZIO, ...cliente } : VAZIO)
  const [endereco, setEndereco] = useState<Endereco>(cliente ?? {})
  const set = (patch: Partial<Form>) => setF((a) => ({ ...a, ...patch }))

  function salvar() {
    if (!f.nome.trim()) return
    const vazio = (v?: string) => v?.trim() || undefined
    const dados = {
      nome: f.nome.trim(),
      tipoPessoa: f.tipoPessoa,
      documento: vazio(f.documento),
      telefone: vazio(f.telefone),
      email: vazio(f.email),
      contato: vazio(f.contato),
      observacao: vazio(f.observacao),
      cep: undefined, logradouro: undefined, numero: undefined, complemento: undefined, bairro: undefined, cidade: undefined, uf: undefined,
      ...limparEndereco(endereco),
      ativo: true,
    }
    if (cliente) updateItem('clientes', cliente.id, dados)
    else addItem('clientes', dados)
    onFechar()
  }

  return (
    <Card className="p-4 space-y-3 border-brand-300">
      <div className="grid grid-cols-[1fr_9rem] gap-2">
        <Field label={f.tipoPessoa === 'pj' ? 'Razão social / nome *' : 'Nome completo *'}>
          <Input value={f.nome} onChange={(e) => set({ nome: e.target.value })} autoFocus={!cliente} />
        </Field>
        <Field label="Tipo">
          <Select value={f.tipoPessoa} onChange={(e) => set({ tipoPessoa: e.target.value as TipoPessoa })}>
            <option value="pf">Pessoa física</option>
            <option value="pj">Empresa</option>
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label={f.tipoPessoa === 'pj' ? 'CNPJ' : 'CPF'}>
          <Input value={f.documento} onChange={(e) => set({ documento: mascaraDocumento(e.target.value) })} inputMode="numeric" />
        </Field>
        <Field label="Telefone / WhatsApp">
          <Input value={f.telefone} onChange={(e) => set({ telefone: mascaraTelefone(e.target.value) })} inputMode="tel" />
        </Field>
        <Field label="E-mail">
          <Input type="email" value={f.email} onChange={(e) => set({ email: e.target.value })} />
        </Field>
        <Field label="Pessoa de contato">
          <Input value={f.contato} onChange={(e) => set({ contato: e.target.value })} />
        </Field>
      </div>
      <CamposEndereco valor={endereco} onChange={setEndereco} />
      <Field label="Observações">
        <TextArea value={f.observacao} onChange={(e) => set({ observacao: e.target.value })} />
      </Field>
      <div className="flex gap-2">
        <Button onClick={salvar} className="flex-1">
          Salvar cliente
        </Button>
        <Button variant="secondary" onClick={onFechar}>
          Cancelar
        </Button>
      </div>
    </Card>
  )
}

export default function ClientesTab() {
  const { db, removeItem } = useStore()
  const [editando, setEditando] = useState<string | 'novo' | null>(null)
  const obrasDo = (id: string) => db.obras.filter((o) => o.clienteId === id)

  return (
    <div className="space-y-3">
      {editando !== 'novo' && (
        <Button onClick={() => setEditando('novo')} className="w-full sm:w-auto">
          + Novo cliente
        </Button>
      )}
      {editando === 'novo' && <FormCliente onFechar={() => setEditando(null)} />}
      {db.clientes.length === 0 && editando !== 'novo' && <EmptyState text="Nenhum cliente cadastrado ainda." />}

      <div className="space-y-2">
        {db.clientes.map((c) =>
          editando === c.id ? (
            <FormCliente key={c.id} cliente={c} onFechar={() => setEditando(null)} />
          ) : (
            <Card key={c.id} className="p-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-slate-800 truncate">{c.nome}</p>
                <p className="text-xs text-slate-500 truncate">
                  {[c.documento, c.telefone, enderecoResumido(c), obrasDo(c.id).length ? `${obrasDo(c.id).length} obra(s)` : ''].filter(Boolean).join(' · ') ||
                    'Complete o cadastro'}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" className="px-2" aria-label="Editar" onClick={() => setEditando(c.id)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  className="px-2"
                  aria-label="Remover"
                  onClick={() => {
                    if (obrasDo(c.id).length) {
                      alert('Este cliente tem obras ligadas a ele. Troque o cliente dessas obras antes de remover.')
                      return
                    }
                    if (confirm(`Remover ${c.nome}?`)) removeItem('clientes', c.id)
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ),
        )}
      </div>
    </div>
  )
}
