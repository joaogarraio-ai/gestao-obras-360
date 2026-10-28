import { useState } from 'react'
import { useStore } from '../../lib/store'
import { bdiDaObra, custoDiretoEtapa, diasEntre, etapasDaObra, formatPercent, fracaoNoMes, mesesEntre, periodoDaObra } from '../../lib/gestao'
import { formatDateShortPt, toISODate } from '../../lib/dates'
import { formatBRL } from '../../lib/money'
import type { Etapa, Obra } from '../../lib/types'
import { Button, Card, EmptyState, Field, Input, Tabs } from '../../components/ui'

const VISOES = [
  { id: 'gantt', label: 'Gantt' },
  { id: 'fisico', label: 'Físico-financeiro' },
] as const

export default function CronogramaTab({ obra }: { obra: Obra }) {
  const { db, updateItem } = useStore()
  const [visao, setVisao] = useState<(typeof VISOES)[number]['id']>('gantt')
  const [editando, setEditando] = useState<Etapa | null>(null)

  const etapas = etapasDaObra(db, obra.id)
  const periodo = periodoDaObra(db, obra)
  if (etapas.length === 0 || !periodo) return <EmptyState text="Crie as etapas na aba Orçamento para montar o cronograma." />

  const meses = mesesEntre(periodo.inicio, periodo.fim)
  const inicioGrade = meses[0].inicio
  const fimGrade = meses[meses.length - 1].fim
  const diasTotais = diasEntre(inicioGrade, fimGrade)
  const pos = (iso: string) => ((diasEntre(inicioGrade, iso) - 1) / diasTotais) * 100
  const hoje = toISODate(new Date())
  const bdi = bdiDaObra(obra)

  function salvar() {
    if (!editando) return
    if (editando.dataFim < editando.dataInicio) {
      alert('O término não pode ser antes do início.')
      return
    }
    updateItem('etapas', editando.id, {
      nome: editando.nome,
      dataInicio: editando.dataInicio,
      dataFim: editando.dataFim,
      percentualConcluido: editando.percentualConcluido,
    })
    setEditando(null)
  }

  return (
    <div className="space-y-3">
      <Tabs abas={VISOES} ativa={visao} onChange={setVisao} />

      {editando && (
        <Card className="p-4 space-y-3 border-brand-400">
          <Field label="Etapa">
            <Input value={editando.nome} onChange={(e) => setEditando({ ...editando, nome: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Início">
              <Input type="date" value={editando.dataInicio} onChange={(e) => setEditando({ ...editando, dataInicio: e.target.value })} />
            </Field>
            <Field label="Término">
              <Input type="date" value={editando.dataFim} onChange={(e) => setEditando({ ...editando, dataFim: e.target.value })} />
            </Field>
          </div>
          <Field label={`Concluído: ${editando.percentualConcluido}%`}>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={editando.percentualConcluido}
              onChange={(e) => setEditando({ ...editando, percentualConcluido: Number(e.target.value) })}
              className="w-full accent-brand-700"
            />
          </Field>
          <div className="flex gap-2">
            <Button onClick={salvar} className="flex-1">
              Salvar
            </Button>
            <Button variant="secondary" onClick={() => setEditando(null)}>
              Cancelar
            </Button>
          </div>
        </Card>
      )}

      {visao === 'gantt' && (
        <Card className="p-3 overflow-x-auto">
          <div style={{ minWidth: 160 + meses.length * 70 }}>
            <div className="flex text-xs text-slate-500 border-b border-slate-200 pb-1">
              <div className="w-40 shrink-0" />
              <div className="flex-1 flex">
                {meses.map((m) => (
                  <div key={m.chave} className="text-center border-l border-slate-100" style={{ width: `${(diasEntre(m.inicio, m.fim) / diasTotais) * 100}%` }}>
                    {m.label}
                  </div>
                ))}
              </div>
            </div>
            {etapas.map((e) => {
              const atrasada = e.dataFim < hoje && e.percentualConcluido < 100
              return (
                <button key={e.id} onClick={() => setEditando(e)} className="w-full flex items-center py-1.5 border-b border-slate-50 hover:bg-brand-50 text-left">
                  <div className="w-40 shrink-0 pr-2">
                    <p className="text-sm text-slate-800 truncate">{e.nome}</p>
                    <p className="text-[11px] text-slate-500">
                      {formatDateShortPt(e.dataInicio)}–{formatDateShortPt(e.dataFim)} · {e.percentualConcluido}%
                    </p>
                  </div>
                  <div className="flex-1 relative h-6">
                    {hoje >= inicioGrade && hoje <= fimGrade && <div className="absolute top-0 bottom-0 w-px bg-red-400" style={{ left: `${pos(hoje)}%` }} />}
                    <div
                      className={`absolute top-1 h-4 rounded ${atrasada ? 'bg-red-200' : 'bg-brand-200'}`}
                      style={{ left: `${pos(e.dataInicio)}%`, width: `${Math.max(0.5, (diasEntre(e.dataInicio, e.dataFim) / diasTotais) * 100)}%` }}
                    >
                      <div className={`h-full rounded ${atrasada ? 'bg-red-500' : 'bg-brand-600'}`} style={{ width: `${e.percentualConcluido}%` }} />
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
          <p className="text-xs text-slate-500 mt-2">Toque numa etapa para mudar datas e o % concluído. A linha vermelha é hoje; barras vermelhas estão atrasadas.</p>
        </Card>
      )}

      {visao === 'fisico' && (
        <Card className="p-3 overflow-x-auto">
          <table className="text-xs w-full">
            <thead>
              <tr className="text-slate-500">
                <th className="text-left py-1 pr-2 sticky left-0 bg-white">Etapa</th>
                <th className="text-right py-1 px-2">Total</th>
                {meses.map((m) => (
                  <th key={m.chave} className="text-right py-1 px-2 whitespace-nowrap">
                    {m.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {etapas.map((e) => {
                const total = custoDiretoEtapa(db, e.id) * (1 + bdi)
                return (
                  <tr key={e.id} className="border-t border-slate-100">
                    <td className="py-1.5 pr-2 text-slate-800 sticky left-0 bg-white whitespace-nowrap">{e.nome}</td>
                    <td className="py-1.5 px-2 text-right whitespace-nowrap font-semibold">{formatBRL(total)}</td>
                    {meses.map((m) => {
                      const v = total * fracaoNoMes(e, m)
                      return (
                        <td key={m.chave} className={`py-1.5 px-2 text-right whitespace-nowrap ${v > 0 ? 'bg-brand-50' : 'text-slate-300'}`}>
                          {v > 0 ? formatBRL(v) : '—'}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
              <TotaisFisicoFinanceiro etapas={etapas} meses={meses} valor={(e) => custoDiretoEtapa(db, e.id) * (1 + bdi)} />
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}

function TotaisFisicoFinanceiro({ etapas, meses, valor }: { etapas: Etapa[]; meses: ReturnType<typeof mesesEntre>; valor: (e: Etapa) => number }) {
  const total = etapas.reduce((a, e) => a + valor(e), 0)
  const porMes = meses.map((m) => etapas.reduce((a, e) => a + valor(e) * fracaoNoMes(e, m), 0))
  const acumulados = porMes.map((_, i) => porMes.slice(0, i + 1).reduce((a, v) => a + v, 0))
  return (
    <>
      <tr className="border-t-2 border-slate-300 font-semibold">
        <td className="py-1.5 pr-2 sticky left-0 bg-white">Total do mês</td>
        <td className="py-1.5 px-2 text-right whitespace-nowrap">{formatBRL(total)}</td>
        {porMes.map((v, i) => (
          <td key={i} className="py-1.5 px-2 text-right whitespace-nowrap">
            {formatBRL(v)}
          </td>
        ))}
      </tr>
      <tr className="text-slate-600">
        <td className="py-1.5 pr-2 sticky left-0 bg-white">% acumulado</td>
        <td />
        {acumulados.map((v, i) => (
          <td key={i} className="py-1.5 px-2 text-right">
            {total > 0 ? formatPercent(v / total, 0) : '—'}
          </td>
        ))}
      </tr>
    </>
  )
}
