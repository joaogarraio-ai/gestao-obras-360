import { useState } from 'react'
import { useStore } from '../../lib/store'
import { Button, Card, EmptyState, Field, Input } from '../../components/ui'

export default function FornecedoresTab() {
  const { db, addFornecedor, updateFornecedor, removeFornecedor } = useStore()
  const [novoNome, setNovoNome] = useState('')
  const [novaCidade, setNovaCidade] = useState('')
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editNome, setEditNome] = useState('')
  const [editCidade, setEditCidade] = useState('')

  function adicionar() {
    if (!novoNome.trim()) return
    addFornecedor({ nome: novoNome.trim(), cidade: novaCidade.trim() || undefined, ativo: true })
    setNovoNome('')
    setNovaCidade('')
  }

  function salvarEdicao() {
    if (!editandoId || !editNome.trim()) return
    updateFornecedor(editandoId, { nome: editNome.trim(), cidade: editCidade.trim() || undefined })
    setEditandoId(null)
  }

  return (
    <div className="space-y-3">
      <Card className="p-4 space-y-3">
        <Field label="Novo fornecedor">
          <Input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Ex: Gabriel Material de Construção" />
        </Field>
        <Field label="Cidade (opcional)">
          <div className="flex gap-2">
            <Input value={novaCidade} onChange={(e) => setNovaCidade(e.target.value)} placeholder="Ex: Feira de Santana" />
            <Button onClick={adicionar}>Adicionar</Button>
          </div>
        </Field>
      </Card>

      {db.fornecedores.length === 0 && <EmptyState text="Nenhum fornecedor cadastrado ainda." />}

      <div className="space-y-2">
        {db.fornecedores.map((f) => (
          <Card key={f.id} className="p-3 flex items-center justify-between gap-2">
            {editandoId === f.id ? (
              <div className="flex flex-col gap-2 flex-1">
                <Input value={editNome} onChange={(e) => setEditNome(e.target.value)} autoFocus placeholder="Nome" />
                <div className="flex gap-2">
                  <Input value={editCidade} onChange={(e) => setEditCidade(e.target.value)} placeholder="Cidade" />
                  <Button onClick={salvarEdicao}>OK</Button>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <p className="font-semibold text-stone-800">{f.nome}</p>
                  {f.cidade && <p className="text-xs text-stone-500">{f.cidade}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    className="px-2"
                    onClick={() => {
                      setEditandoId(f.id)
                      setEditNome(f.nome)
                      setEditCidade(f.cidade ?? '')
                    }}
                  >
                    ✏️
                  </Button>
                  <Button
                    variant="ghost"
                    className="px-2"
                    onClick={() => {
                      if (confirm(`Remover ${f.nome}?`)) removeFornecedor(f.id)
                    }}
                  >
                    🗑️
                  </Button>
                </div>
              </>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
