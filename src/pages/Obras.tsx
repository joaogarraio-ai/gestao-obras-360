import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store'
import { avancoFisicoObra, bdiDaObra, custoDiretoObra, formatPercent, movimentos } from '../lib/gestao'
import { adicionarObraExemplo } from '../lib/exemplo'
import { formatBRL } from '../lib/money'
import { enderecoResumido } from '../lib/formatos'
import { BDI_PADRAO, STATUS_OBRA_LABEL, type StatusObra } from '../lib/types'
import FormObra from '../components/FormObra'
import { Badge, Button, Card, EmptyState, PageTitle, ProgressBar } from '../components/ui'

const TOM_STATUS: Record<StatusObra, 'brand' | 'green' | 'amber' | 'default'> = {
  orcamento: 'brand',
  andamento: 'green',
  paralisada: 'amber',
  concluida: 'default',
}

export default function Obras() {
  const { db, addObra, replaceDatabase } = useStore()
  const [criando, setCriando] = useState(false)
  const navigate = useNavigate()
  const movs = movimentos(db)

  const nomeCliente = (o: (typeof db.obras)[number]) => db.clientes.find((c) => c.id === o.clienteId)?.nome ?? o.cliente

  const temExemplo = db.obras.some((o) => o.nome.includes('(demonstração)'))

  return (
    <div>
      <PageTitle
        title="Obras"
        subtitle="Orçamento, cronograma, compras, medições e diário de cada obra"
        actions={!criando && <Button onClick={() => setCriando(true)}>+ Nova obra</Button>}
      />

      {criando && (
        <div className="mb-4 lg:max-w-3xl">
          <FormObra
            textoSalvar="Criar obra"
            onCancelar={() => setCriando(false)}
            onSalvar={(dados) => {
              const nova = addObra({ ...dados, ativo: true, bdi: BDI_PADRAO })
              setCriando(false)
              navigate(`/obras/${nova.id}`)
            }}
          />
        </div>
      )}

      {db.obras.length === 0 && !criando && <EmptyState text="Nenhuma obra cadastrada ainda." />}

      <div className="grid gap-3 mb-4 lg:grid-cols-2">
        {db.obras.map((o) => {
          const orcamento = custoDiretoObra(db, o.id) * (1 + bdiDaObra(o))
          const gasto = movs.filter((m) => m.obraId === o.id && m.tipo === 'saida' && m.realizado).reduce((a, m) => a + m.valor, 0)
          const avanco = avancoFisicoObra(db, o.id)
          const pendentes = db.solicitacoesCompra.filter((s) => s.obraId === o.id && s.status === 'pendente').length
          return (
            <Link key={o.id} to={`/obras/${o.id}`} className="block">
              <Card className="p-4 hover:border-brand-400">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 truncate">
                      {o.codigo && <span className="text-slate-400 font-normal">{o.codigo} · </span>}
                      {o.nome}
                    </p>
                    {(nomeCliente(o) || enderecoResumido(o)) && (
                      <p className="text-xs text-slate-500 truncate">{[nomeCliente(o), [o.cidade, o.uf].filter(Boolean).join('/') || o.endereco].filter(Boolean).join(' · ')}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {o.status && <Badge tone={TOM_STATUS[o.status]}>{STATUS_OBRA_LABEL[o.status]}</Badge>}
                    {pendentes > 0 && <Badge tone="amber">{pendentes} compra(s) p/ aprovar</Badge>}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                  <div>
                    <p className="text-slate-500">Orçamento</p>
                    <p className="font-semibold text-slate-800">{orcamento > 0 ? formatBRL(orcamento) : '—'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Gasto</p>
                    <p className="font-semibold text-slate-800">{formatBRL(gasto)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Avanço físico</p>
                    <p className="font-semibold text-slate-800">{formatPercent(avanco, 0)}</p>
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
        <Card className="p-4 bg-brand-50 border-brand-200">
          <p className="text-sm text-slate-700 mb-3">
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
