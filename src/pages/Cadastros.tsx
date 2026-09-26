import { useState } from 'react'
import { PageTitle } from '../components/ui'
import TrabalhadoresTab from './cadastros/TrabalhadoresTab'
import ObrasTab from './cadastros/ObrasTab'
import FornecedoresTab from './cadastros/FornecedoresTab'

const ABAS = [
  { id: 'trabalhadores', label: 'Trabalhadores' },
  { id: 'obras', label: 'Obras' },
  { id: 'fornecedores', label: 'Fornecedores' },
] as const

type AbaId = (typeof ABAS)[number]['id']

export default function Cadastros() {
  const [aba, setAba] = useState<AbaId>('trabalhadores')

  return (
    <div>
      <PageTitle title="Cadastros" subtitle="Trabalhadores, obras e fornecedores" />

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

      {aba === 'trabalhadores' && <TrabalhadoresTab />}
      {aba === 'obras' && <ObrasTab />}
      {aba === 'fornecedores' && <FornecedoresTab />}
    </div>
  )
}
