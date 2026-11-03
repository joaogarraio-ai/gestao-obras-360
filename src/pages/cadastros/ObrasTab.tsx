import { Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { enderecoResumido } from '../../lib/formatos'
import { BDI_PADRAO, STATUS_OBRA_LABEL } from '../../lib/types'
import FormObra from '../../components/FormObra'
import { Button, Card, EmptyState } from '../../components/ui'

export default function ObrasTab() {
  const { db, addObra, updateObra, removeObra } = useStore()
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [criando, setCriando] = useState(false)
  const nomeCliente = (id?: string, texto?: string) => db.clientes.find((c) => c.id === id)?.nome ?? texto

  return (
    <div className="space-y-3">
      {!criando && (
        <Button onClick={() => setCriando(true)} className="w-full sm:w-auto">
          + Nova obra
        </Button>
      )}
      {criando && (
        <FormObra
          textoSalvar="Criar obra"
          onCancelar={() => setCriando(false)}
          onSalvar={(dados) => {
            addObra({ ...dados, ativo: true, bdi: BDI_PADRAO })
            setCriando(false)
          }}
        />
      )}

      {db.obras.length === 0 && !criando && <EmptyState text="Nenhuma obra cadastrada ainda." />}

      <div className="space-y-2">
        {db.obras.map((o) =>
          editandoId === o.id ? (
            <FormObra
              key={o.id}
              obra={o}
              onCancelar={() => setEditandoId(null)}
              onSalvar={(dados) => {
                updateObra(o.id, dados)
                setEditandoId(null)
              }}
            />
          ) : (
            <Card key={o.id} className="p-3 flex items-center justify-between gap-2">
              <Link to={`/obras/${o.id}`} className="min-w-0">
                <p className="font-semibold text-slate-800 truncate">
                  {o.codigo && <span className="font-normal text-slate-400">{o.codigo} · </span>}
                  {o.nome}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {[o.status && STATUS_OBRA_LABEL[o.status], nomeCliente(o.clienteId, o.cliente), enderecoResumido(o)].filter(Boolean).join(' · ') ||
                    'Sem dados de cliente e endereço'}
                </p>
              </Link>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" className="px-2" aria-label="Editar" onClick={() => setEditandoId(o.id)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  className="px-2"
                  aria-label="Remover"
                  onClick={() => {
                    if (confirm(`Remover ${o.nome} e tudo o que foi lançado nela?`)) removeObra(o.id)
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
