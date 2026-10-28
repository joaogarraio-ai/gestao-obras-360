import { useMemo, useState } from 'react'
import { useStore } from '../../lib/store'
import { addDays, formatDateShortPt, getMondayOfWeek, getWeekRange, weekdayLabel } from '../../lib/dates'
import { STATUS_DIA_FRACAO, type RegistroDia, type StatusDia } from '../../lib/types'
import { formatBRL } from '../../lib/money'
import { Button, Card, EmptyState, Select } from '../../components/ui'

const CICLO: (StatusDia | null)[] = [null, 'dia_completo', 'meio_dia', 'falta']

const CELULA_ESTILO: Record<string, string> = {
  vazio: 'bg-slate-50 text-slate-300 border-slate-200',
  dia_completo: 'bg-green-600 text-white border-green-600',
  meio_dia: 'bg-amber-400 text-white border-amber-400',
  falta: 'bg-red-500 text-white border-red-500',
}

const CELULA_TEXTO: Record<string, string> = {
  vazio: '–',
  dia_completo: '✓',
  meio_dia: '½',
  falta: 'F',
}

export default function DiariaTab() {
  const { db, setRegistroDia, removeRegistroDia } = useStore()
  const [mondayIso, setMondayIso] = useState(() => getMondayOfWeek())
  const [obraId, setObraId] = useState<string>(() => db.obras[0]?.id ?? '')

  const { days } = useMemo(() => getWeekRange(mondayIso), [mondayIso])
  const trabalhadoresAtivos = db.trabalhadores.filter((t) => t.ativo)
  const obra = db.obras.find((o) => o.id === obraId)

  function registroDe(trabalhadorId: string, data: string, obraAlvo = obraId): RegistroDia | undefined {
    return db.registrosDia.find((r) => r.trabalhadorId === trabalhadorId && r.obraId === obraAlvo && r.data === data)
  }

  function outroRegistroNoDia(trabalhadorId: string, data: string): RegistroDia | undefined {
    return db.registrosDia.find((r) => r.trabalhadorId === trabalhadorId && r.data === data && r.obraId !== obraId)
  }

  function alternarCelula(trabalhadorId: string, data: string) {
    if (!obraId) return
    const atual = registroDe(trabalhadorId, data)
    const idxAtual = CICLO.indexOf(atual?.status ?? null)
    const proximo = CICLO[(idxAtual + 1) % CICLO.length]

    if (proximo === null) {
      if (atual) removeRegistroDia(atual.id)
      return
    }
    setRegistroDia({ trabalhadorId, obraId, data, status: proximo })
  }

  function totalSemana(trabalhadorId: string): { dias: number; valor: number } {
    const diaria = db.trabalhadores.find((t) => t.id === trabalhadorId)?.valorDiaria ?? 0
    const dias = days.reduce((acc, d) => {
      const r = registroDe(trabalhadorId, d)
      return acc + (r ? STATUS_DIA_FRACAO[r.status] : 0)
    }, 0)
    return { dias, valor: dias * diaria }
  }

  return (
    <div>
      <Card className="p-3 mb-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Button variant="secondary" onClick={() => setMondayIso(addDays(mondayIso, -7))} className="px-3">
            ◀
          </Button>
          <div className="text-center flex-1">
            <p className="font-semibold text-slate-800 text-sm">
              {formatDateShortPt(days[0])} – {formatDateShortPt(days[days.length - 1])}
            </p>
            <button className="text-xs text-brand-700 underline" onClick={() => setMondayIso(getMondayOfWeek())}>
              ir para semana atual
            </button>
          </div>
          <Button variant="secondary" onClick={() => setMondayIso(addDays(mondayIso, 7))} className="px-3">
            ▶
          </Button>
        </div>

        <Select value={obraId} onChange={(e) => setObraId(e.target.value)}>
          {db.obras.length === 0 && <option value="">Cadastre uma obra primeiro</option>}
          {db.obras.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nome}
            </option>
          ))}
        </Select>
      </Card>

      {trabalhadoresAtivos.length === 0 ? (
        <EmptyState text="Cadastre trabalhadores em Cadastros > Trabalhadores para começar a lançar os dias." />
      ) : !obraId ? (
        <EmptyState text="Cadastre uma obra em Cadastros > Obras para começar." />
      ) : (
        <Card className="p-3 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="text-left text-xs font-medium text-slate-500 pb-2 sticky left-0 bg-white">Trabalhador</th>
                {days.map((d) => (
                  <th key={d} className="text-center text-xs font-medium text-slate-500 pb-2 px-0.5">
                    <div>{weekdayLabel(d, true)}</div>
                    <div className="text-slate-400">{formatDateShortPt(d)}</div>
                  </th>
                ))}
                <th className="text-right text-xs font-medium text-slate-500 pb-2 pl-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {trabalhadoresAtivos.map((t) => {
                const { dias, valor } = totalSemana(t.id)
                return (
                  <tr key={t.id} className="border-t border-slate-100">
                    <td className="py-2 pr-2 sticky left-0 bg-white">
                      <p className="font-medium text-slate-800 truncate max-w-[110px]">{t.nome}</p>
                      <p className="text-[11px] text-slate-400 truncate max-w-[110px]">{t.funcao}</p>
                    </td>
                    {days.map((d) => {
                      const r = registroDe(t.id, d)
                      const status = r?.status ?? 'vazio'
                      const conflito = outroRegistroNoDia(t.id, d)
                      return (
                        <td key={d} className="text-center px-0.5 py-1">
                          <button
                            onClick={() => alternarCelula(t.id, d)}
                            className={`relative w-9 h-9 rounded-lg border font-bold text-sm ${CELULA_ESTILO[status]}`}
                            title={conflito ? `Também marcado em outra obra nesse dia` : undefined}
                          >
                            {CELULA_TEXTO[status]}
                            {conflito && (
                              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-brand-600 border border-white" />
                            )}
                          </button>
                        </td>
                      )
                    })}
                    <td className="text-right pl-2 whitespace-nowrap">
                      <p className="font-semibold text-slate-800">{dias}d</p>
                      <p className="text-[11px] text-slate-400">{formatBRL(valor)}</p>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      )}

      <div className="flex items-center gap-3 mt-3 text-xs text-slate-500 flex-wrap">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-600 inline-block" /> Dia completo</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-400 inline-block" /> Meio dia</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500 inline-block" /> Falta</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-brand-600 inline-block" /> Marcado em outra obra</span>
      </div>
      {obra && <p className="text-xs text-slate-400 mt-2">Horário considerado: 07:00–12:00 e 13:00–17:00 (8h/dia) na obra {obra.nome}.</p>}
    </div>
  )
}
