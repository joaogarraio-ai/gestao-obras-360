import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../lib/store'
import { removerObraCompleta } from '../lib/gestao'
import { Button, EmptyState, PageTitle, Tabs } from '../components/ui'
import ResumoTab from './obra/ResumoTab'
import OrcamentoTab from './obra/OrcamentoTab'
import CronogramaTab from './obra/CronogramaTab'
import ComprasTab from './obra/ComprasTab'
import MedicoesTab from './obra/MedicoesTab'
import DiarioTab from './obra/DiarioTab'
import EstoqueTab from './obra/EstoqueTab'

const ABAS = [
  { id: 'resumo', label: 'Resumo' },
  { id: 'orcamento', label: 'Orçamento' },
  { id: 'cronograma', label: 'Cronograma' },
  { id: 'compras', label: 'Compras' },
  { id: 'estoque', label: 'Estoque' },
  { id: 'medicoes', label: 'Medições' },
  { id: 'diario', label: 'Diário' },
] as const

type AbaId = (typeof ABAS)[number]['id']

export default function ObraDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { db, replaceDatabase } = useStore()
  const [aba, setAba] = useState<AbaId>('resumo')
  const obra = db.obras.find((o) => o.id === id)

  if (!obra) {
    return (
      <div>
        <EmptyState text="Obra não encontrada." />
        <Link to="/obras" className="block text-center text-sm text-amber-700 underline mt-3">
          Voltar para obras
        </Link>
      </div>
    )
  }

  return (
    <div>
      <Link to="/obras" className="no-print text-sm text-amber-700">
        ← Obras
      </Link>
      <PageTitle title={obra.nome} subtitle={[obra.cliente, obra.endereco].filter(Boolean).join(' · ') || undefined} />

      <Tabs abas={ABAS} ativa={aba} onChange={setAba} />

      {aba === 'resumo' && <ResumoTab obra={obra} />}
      {aba === 'orcamento' && <OrcamentoTab obra={obra} />}
      {aba === 'cronograma' && <CronogramaTab obra={obra} />}
      {aba === 'compras' && <ComprasTab obra={obra} />}
      {aba === 'estoque' && <EstoqueTab obra={obra} />}
      {aba === 'medicoes' && <MedicoesTab obra={obra} />}
      {aba === 'diario' && <DiarioTab obra={obra} />}

      {aba === 'resumo' && (
        <div className="mt-6 text-center">
          <Button
            variant="danger"
            onClick={() => {
              if (confirm(`Apagar a obra "${obra.nome}" com orçamento, cronograma, compras, medições, contas e diário?`)) {
                replaceDatabase((prev) => removerObraCompleta(prev, obra.id))
                navigate('/obras')
              }
            }}
          >
            Apagar obra
          </Button>
        </div>
      )}
    </div>
  )
}
