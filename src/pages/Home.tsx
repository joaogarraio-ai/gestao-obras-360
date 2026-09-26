import { Link } from 'react-router-dom'
import { useStore } from '../lib/store'
import { formatDatePt, getMondayOfWeek, getWeekRange } from '../lib/dates'
import { formatBRL } from '../lib/money'
import { gerarRelatorioSemanal } from '../lib/report'
import { Badge, Card, PageTitle } from '../components/ui'

export default function Home() {
  const { db } = useStore()
  const { start, end } = getWeekRange(getMondayOfWeek())
  const relatorio = gerarRelatorioSemanal(db, start, end)

  const hoje = new Date()
  const saudacao = hoje.getHours() < 12 ? 'Bom dia' : hoje.getHours() < 18 ? 'Boa tarde' : 'Boa noite'

  return (
    <div>
      <PageTitle title={`${saudacao} 👷`} subtitle={`Semana de ${formatDatePt(start)} a ${formatDatePt(end)}`} />

      <Card className="p-4 mb-4 bg-amber-800 text-white border-amber-800">
        <p className="text-sm text-amber-100">Total da semana até agora</p>
        <p className="text-3xl font-bold mt-1">{formatBRL(relatorio.totalGeral)}</p>
        <div className="flex gap-2 mt-3 flex-wrap">
          <Badge>Mão de obra {formatBRL(relatorio.totalMaoDeObra)}</Badge>
          <Badge>Materiais {formatBRL(relatorio.totalMateriais)}</Badge>
          <Badge>Despesas {formatBRL(relatorio.totalDespesas)}</Badge>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <Link to="/lancar-dias">
          <Card className="p-4 text-center hover:border-amber-400">
            <p className="text-2xl mb-1">✅</p>
            <p className="text-sm font-semibold text-stone-700">Lançar dias</p>
          </Card>
        </Link>
        <Link to="/materiais">
          <Card className="p-4 text-center hover:border-amber-400">
            <p className="text-2xl mb-1">🧱</p>
            <p className="text-sm font-semibold text-stone-700">Materiais</p>
          </Card>
        </Link>
        <Link to="/despesas">
          <Card className="p-4 text-center hover:border-amber-400">
            <p className="text-2xl mb-1">⛽</p>
            <p className="text-sm font-semibold text-stone-700">Despesas</p>
          </Card>
        </Link>
        <Link to="/relatorio">
          <Card className="p-4 text-center hover:border-amber-400">
            <p className="text-2xl mb-1">📋</p>
            <p className="text-sm font-semibold text-stone-700">Relatório</p>
          </Card>
        </Link>
      </div>

      <Card className="p-4 mb-4">
        <p className="text-sm font-semibold text-stone-700 mb-2">Obras em andamento</p>
        {db.obras.length === 0 ? (
          <p className="text-sm text-stone-400">Nenhuma obra cadastrada.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {db.obras.map((o) => (
              <Badge key={o.id} tone="amber">
                {o.nome}
              </Badge>
            ))}
          </div>
        )}
      </Card>

      <Link to="/cadastros" className="block text-center text-sm text-amber-700 underline">
        Gerenciar trabalhadores, obras e fornecedores
      </Link>
    </div>
  )
}
