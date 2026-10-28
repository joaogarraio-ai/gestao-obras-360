import { Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useStore } from '../../lib/store'
import { Button, Card, EmptyState, Field, Input } from '../../components/ui'

export default function ObrasTab() {
  const { db, addObra, updateObra, removeObra } = useStore()
  const [novoNome, setNovoNome] = useState('')
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editNome, setEditNome] = useState('')

  function adicionar() {
    if (!novoNome.trim()) return
    addObra({ nome: novoNome.trim(), ativo: true })
    setNovoNome('')
  }

  function salvarEdicao() {
    if (!editandoId || !editNome.trim()) return
    updateObra(editandoId, { nome: editNome.trim() })
    setEditandoId(null)
  }

  return (
    <div className="space-y-3">
      <Card className="p-4">
        <Field label="Nova obra / local">
          <div className="flex gap-2">
            <Input
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              placeholder="Ex: Fazenda Paraíso"
              onKeyDown={(e) => e.key === 'Enter' && adicionar()}
            />
            <Button onClick={adicionar}>Adicionar</Button>
          </div>
        </Field>
      </Card>

      {db.obras.length === 0 && <EmptyState text="Nenhuma obra cadastrada ainda." />}

      <div className="space-y-2">
        {db.obras.map((o) => (
          <Card key={o.id} className="p-3 flex items-center justify-between gap-2">
            {editandoId === o.id ? (
              <div className="flex gap-2 flex-1">
                <Input value={editNome} onChange={(e) => setEditNome(e.target.value)} autoFocus />
                <Button onClick={salvarEdicao}>OK</Button>
              </div>
            ) : (
              <>
                <p className="font-semibold text-slate-800">{o.nome}</p>
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    className="px-2"
                    onClick={() => {
                      setEditandoId(o.id)
                      setEditNome(o.nome)
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    className="px-2"
                    onClick={() => {
                      if (confirm(`Remover ${o.nome}?`)) removeObra(o.id)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
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
