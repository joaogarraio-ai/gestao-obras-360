import { useState } from 'react'
import { PageTitle } from '../components/ui'
import DiariaTab from './lancamentos/DiariaTab'
import TarefaTab from './lancamentos/TarefaTab'

const ABAS = [
  { id: 'diaria', label: 'Diária' },
  { id: 'tarefa', label: 'Tarefa' },
] as const

type AbaId = (typeof ABAS)[number]['id']

export default function LancarDias() {
  const [aba, setAba] = useState<AbaId>('diaria')

  return (
    <div>
      <PageTitle
        title="Lançar pagamentos"
        subtitle={aba === 'diaria' ? 'Toque no dia para marcar presença' : 'Pagamento fixo por serviço (empreitada)'}
      />

      <div className="flex gap-1 mb-4 bg-stone-100 rounded-lg p-1">
        {ABAS.map((a) => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            className={`flex-1 text-sm font-medium rounded-md py-2 transition-colors ${
              aba === a.id ? 'bg-white text-amber-800 shadow-sm' : 'text-stone-500'
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>

      {aba === 'diaria' && <DiariaTab />}
      {aba === 'tarefa' && <TarefaTab />}
    </div>
  )
}
