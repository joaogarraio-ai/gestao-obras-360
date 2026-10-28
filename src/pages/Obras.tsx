import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../lib/store'
import { avancoFisicoObra, bdiDaObra, custoDiretoObra, formatPercent, movimentos } from '../lib/gestao'
import { adicionarObraExemplo } from '../lib/exemplo'
import { formatBRL } from '../lib/money'
import { BDI_PADRAO } from '../lib/types'
import { Badge, Button, Card, EmptyState, Input, PageTitle, ProgressBar } from '../components/ui'

export default function Obras() {
  const { db, addObra, replaceDatabase } = useStore()
  const [novoNome, setNovoNome] = useState('')
  const movs = movimentos(db)

  function adicionar() {
    if (!novoNome.trim()) return
    addObra({ nome: novoNome.trim(), ativo: true, bdi: BDI_PADRAO })
    setNovoNome('')
  }

  const temExemplo = db.obras.some((o) => o.nome.includes('(demonstração)'))

  return (
    <div>
      <PageTitle title="Obras" subtitle="Orçamento, cronograma, compras, medições e diário de cada obra" />

      <Card className="p-4 mb-3">
        <div className="flex gap-2">
          <Input
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            placeholder="Nome da nova obra"
            onKeyDown={(e) => e.key === 'Enter' && adicionar()}
          />
          <Button onClick={adicionar}>Criar</Button>
        </div>
      </Card>

      {db.obras.length === 0 && <EmptyState text="Nenhuma obra cadastrada ainda." />}

      <div className="space-y-2 mb-4">
        {db.obras.map((o) => {
          const orcamento = custoDiretoObra(db, o.id) * (1 + bdiDaObra(o))
          const gasto = movs.filter((m) => m.obraId === o.id && m.tipo === 'saida' && m.realizado).reduce((a, m) => a + m.valor, 0)
          const avanco = avancoFisicoObra(db, o.id)
          const pendentes = db.solicitacoesCompra.filter((s) => s.obraId === o.id && s.status === 'pendente').length
          return (
            <Link key={o.id} to={`/obras/${o.id}`} className="block">
              <Card className="p-4 hover:border-amber-400">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-stone-800 truncate">{o.nome}</p>
                    {o.cliente && <p className="text-xs text-stone-500 truncate">{o.cliente}</p>}
                  </div>
                  {pendentes > 0 && <Badge tone="amber">{pendentes} compra(s) p/ aprovar</Badge>}
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                  <div>
                    <p className="text-stone-500">Orçamento</p>
                    <p className="font-semibold text-stone-800">{orcamento > 0 ? formatBRL(orcamento) : '—'}</p>
                  </div>
                  <div>
                    <p className="text-stone-500">Gasto</p>
                    <p className="font-semibold text-stone-800">{formatBRL(gasto)}</p>
                  </div>
                  <div>
                    <p className="text-stone-500">Avanço físico</p>
                    <p className="font-semibold text-stone-800">{formatPercent(avanco, 0)}</p>
                  </div>
                </div>
                <div className="mt-2">
                  <ProgressBar value={avanco} />
                </div>
              </Card>
            </Link>
          )
        })}
      </div>

      {!temExemplo && (
        <Card className="p-4 bg-amber-50 border-amber-200">
          <p className="text-sm text-stone-700 mb-3">
            Quer ver como funciona? Crie uma obra de demonstração já preenchida com orçamento, cronograma, compras, medições, contas e diário.
          </p>
          <Button variant="secondary" onClick={() => replaceDatabase(adicionarObraExemplo)}>
            Criar obra de exemplo
          </Button>
        </Card>
      )}
    </div>
  )
}
