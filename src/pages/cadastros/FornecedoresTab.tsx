import { Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useStore } from '../../lib/store'
import { enderecoResumido, limparEndereco, mascaraDocumento, mascaraTelefone } from '../../lib/formatos'
import { CATEGORIA_FORNECEDOR_LABEL, type CategoriaFornecedor, type Endereco, type Fornecedor } from '../../lib/types'
import CamposEndereco from '../../components/CamposEndereco'
import { Button, Card, EmptyState, Field, Input, Select, TextArea } from '../../components/ui'

type Form = { nome: string; categoria: CategoriaFornecedor | ''; documento: string; telefone: string; email: string; contato: string; chavePix: string; observacao: string }

function FormFornecedor({ fornecedor, onFechar }: { fornecedor?: Fornecedor; onFechar: () => void }) {
  const { addFornecedor, updateFornecedor } = useStore()
  const [f, setF] = useState<Form>({
    nome: fornecedor?.nome ?? '',
    categoria: fornecedor?.categoria ?? '',
    documento: fornecedor?.documento ?? '',
    telefone: fornecedor?.telefone ?? '',
    email: fornecedor?.email ?? '',
    contato: fornecedor?.contato ?? '',
    chavePix: fornecedor?.chavePix ?? '',
    observacao: fornecedor?.observacao ?? '',
  })
  const [endereco, setEndereco] = useState<Endereco>(fornecedor ?? {})
  const set = (patch: Partial<Form>) => setF((a) => ({ ...a, ...patch }))

  function salvar() {
    if (!f.nome.trim()) return
    const vazio = (v: string) => v.trim() || undefined
    const doc = f.documento.replace(/\D/g, '')
    const dados = {
      nome: f.nome.trim(),
      categoria: f.categoria || undefined,
      tipoPessoa: doc.length === 14 ? ('pj' as const) : doc.length === 11 ? ('pf' as const) : undefined,
      documento: vazio(f.documento),
      telefone: vazio(f.telefone),
      email: vazio(f.email),
      contato: vazio(f.contato),
      chavePix: vazio(f.chavePix),
      observacao: vazio(f.observacao),
      cep: undefined, logradouro: undefined, numero: undefined, complemento: undefined, bairro: undefined, cidade: undefined, uf: undefined,
      ...limparEndereco(endereco),
    }
    if (fornecedor) updateFornecedor(fornecedor.id, dados)
    else addFornecedor({ ...dados, ativo: true })
    onFechar()
  }

  return (
    <Card className="p-4 space-y-3 border-brand-300">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_14rem] gap-2">
        <Field label="Nome / razão social *">
          <Input value={f.nome} onChange={(e) => set({ nome: e.target.value })} placeholder="Ex: Gabriel Material de Construção" autoFocus={!fornecedor} />
        </Field>
        <Field label="Categoria">
          <Select value={f.categoria} onChange={(e) => set({ categoria: e.target.value as CategoriaFornecedor | '' })}>
            <option value="">—</option>
            {Object.entries(CATEGORIA_FORNECEDOR_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="CNPJ / CPF">
          <Input value={f.documento} onChange={(e) => set({ documento: mascaraDocumento(e.target.value) })} inputMode="numeric" />
        </Field>
        <Field label="Telefone / WhatsApp">
          <Input value={f.telefone} onChange={(e) => set({ telefone: mascaraTelefone(e.target.value) })} inputMode="tel" />
        </Field>
        <Field label="E-mail">
          <Input type="email" value={f.email} onChange={(e) => set({ email: e.target.value })} />
        </Field>
        <Field label="Vendedor / contato">
          <Input value={f.contato} onChange={(e) => set({ contato: e.target.value })} />
        </Field>
      </div>
      <Field label="Chave PIX">
        <Input value={f.chavePix} onChange={(e) => set({ chavePix: e.target.value })} />
      </Field>
      <CamposEndereco valor={endereco} onChange={setEndereco} />
      <Field label="Observações">
        <TextArea value={f.observacao} onChange={(e) => set({ observacao: e.target.value })} placeholder="Ex: prazo de entrega, condições de pagamento" />
      </Field>
      <div className="flex gap-2">
        <Button onClick={salvar} className="flex-1">
          Salvar fornecedor
        </Button>
        <Button variant="secondary" onClick={onFechar}>
          Cancelar
        </Button>
      </div>
    </Card>
  )
}

export default function FornecedoresTab() {
  const { db, removeFornecedor } = useStore()
  const [editando, setEditando] = useState<string | 'novo' | null>(null)
  const [busca, setBusca] = useState('')
  const lista = db.fornecedores.filter((f) => !busca.trim() || `${f.nome} ${f.cidade ?? ''}`.toLowerCase().includes(busca.trim().toLowerCase()))

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        {editando !== 'novo' && (
          <Button onClick={() => setEditando('novo')} className="sm:w-auto">
            + Novo fornecedor
          </Button>
        )}
        {db.fornecedores.length > 5 && <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar fornecedor ou cidade" />}
      </div>
      {editando === 'novo' && <FormFornecedor onFechar={() => setEditando(null)} />}
      {db.fornecedores.length === 0 && editando !== 'novo' && <EmptyState text="Nenhum fornecedor cadastrado ainda." />}

      <div className="space-y-2">
        {lista.map((f) =>
          editando === f.id ? (
            <FormFornecedor key={f.id} fornecedor={f} onFechar={() => setEditando(null)} />
          ) : (
            <Card key={f.id} className="p-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-slate-800 truncate">{f.nome}</p>
                <p className="text-xs text-slate-500 truncate">
                  {[f.categoria && CATEGORIA_FORNECEDOR_LABEL[f.categoria], f.telefone, enderecoResumido(f)].filter(Boolean).join(' · ') || 'Complete o cadastro'}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" className="px-2" aria-label="Editar" onClick={() => setEditando(f.id)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  className="px-2"
                  aria-label="Remover"
                  onClick={() => {
                    const usos = db.comprasMaterial.filter((c) => c.fornecedorId === f.id).length
                    if (usos) {
                      alert(`${f.nome} tem ${usos} compra(s) lançada(s) e não pode ser removido, para não perder o histórico.`)
                      return
                    }
                    if (confirm(`Remover ${f.nome}?`)) removeFornecedor(f.id)
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
