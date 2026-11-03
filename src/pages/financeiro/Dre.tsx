import { Download } from 'lucide-react'
import { useState } from 'react'
import { useStore } from '../../lib/store'
import { baixarPlanilha } from '../../lib/exportar'
import { formatBRL } from '../../lib/money'
import type { Movimento } from '../../lib/gestao'
import { Button, Card, EmptyState, Select } from '../../components/ui'

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

type Linha = { rotulo: string; valores: number[]; tipo: 'receita' | 'deducao' | 'subtotal' | 'resultado' | 'margem' }

/** DRE gerencial: o que entrou, o que custou a obra, as despesas da empresa e o resultado, mês a mês. */
export default function Dre({ movs, obraId }: { movs: Movimento[]; obraId: string }) {
  const { db } = useStore()
  const anos = [...new Set(movs.filter((m) => m.realizado).map((m) => Number(m.data.slice(0, 4))))].sort((a, b) => b - a)
  const anoAtual = new Date().getFullYear()
  const [ano, setAno] = useState(anos.includes(anoAtual) ? anoAtual : (anos[0] ?? anoAtual))

  const realizados = movs.filter((m) => m.realizado && m.data.startsWith(String(ano)))
  const porMes = (filtro: (m: Movimento) => boolean) =>
    MESES.map((_, i) => realizados.filter((m) => filtro(m) && Number(m.data.slice(5, 7)) === i + 1).reduce((a, m) => a + m.valor, 0))
  const impostos = MESES.map((_, i) =>
    db.notasFiscais
      .filter(
        (n) => n.tipo === 'saida' && !n.cancelada && (!obraId || n.obraId === obraId) && n.dataEmissao.startsWith(`${ano}-${String(i + 1).padStart(2, '0')}`),
      )
      .reduce((a, n) => a + (n.valorISS ?? 0) + (n.valorICMS ?? 0) + (n.valorPisCofins ?? 0), 0),
  )

  const receita = porMes((m) => m.tipo === 'entrada')
  const liquida = receita.map((v, i) => v - impostos[i])
  const custos = {
    material: porMes((m) => m.tipo === 'saida' && m.categoria === 'material'),
    mao: porMes((m) => m.tipo === 'saida' && m.categoria === 'mao_de_obra'),
    equip: porMes((m) => m.tipo === 'saida' && m.categoria === 'equipamento'),
    serv: porMes((m) => m.tipo === 'saida' && m.categoria === 'servico'),
  }
  const lucroBruto = liquida.map((v, i) => v - custos.material[i] - custos.mao[i] - custos.equip[i] - custos.serv[i])
  const gerais = porMes((m) => m.tipo === 'saida' && m.categoria === 'outros')
  const resultado = lucroBruto.map((v, i) => v - gerais[i])

  const linhas: Linha[] = [
    { rotulo: 'Receita bruta (recebimentos)', valores: receita, tipo: 'receita' },
    { rotulo: '(−) Impostos das notas emitidas', valores: impostos, tipo: 'deducao' },
    { rotulo: '= Receita líquida', valores: liquida, tipo: 'subtotal' },
    { rotulo: '(−) Material', valores: custos.material, tipo: 'deducao' },
    { rotulo: '(−) Mão de obra', valores: custos.mao, tipo: 'deducao' },
    { rotulo: '(−) Equipamentos', valores: custos.equip, tipo: 'deducao' },
    { rotulo: '(−) Serviços e empreiteiros', valores: custos.serv, tipo: 'deducao' },
    { rotulo: '= Lucro bruto das obras', valores: lucroBruto, tipo: 'subtotal' },
    { rotulo: '(−) Despesas gerais e administrativas', valores: gerais, tipo: 'deducao' },
    { rotulo: '= Resultado do período', valores: resultado, tipo: 'resultado' },
  ]
  const soma = (v: number[]) => v.reduce((a, x) => a + x, 0)
  const margem = (i: number | 'total') => {
    const r = i === 'total' ? soma(receita) : receita[i]
    const l = i === 'total' ? soma(resultado) : resultado[i]
    return r > 0 ? `${Math.round((l / r) * 1000) / 10}%`.replace('.', ',') : '—'
  }

  function exportar() {
    baixarPlanilha(
      `dre-${ano}`,
      ['Conta', ...MESES.map((m) => `${m}/${ano}`), 'Total'],
      [...linhas.map((l) => [l.rotulo, ...l.valores, soma(l.valores)]), ['Margem', ...MESES.map((_, i) => margem(i)), margem('total')]],
    )
  }

  if (anos.length === 0) return <EmptyState text="Ainda não há nada realizado para montar o DRE." />

  return (
    <Card className="p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Select value={ano} onChange={(e) => setAno(Number(e.target.value))} aria-label="Ano" className="w-28">
            {anos.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </Select>
          <span className="text-xs text-slate-500">Regime de caixa: conta o que foi pago e recebido.</span>
        </div>
        <Button variant="secondary" onClick={exportar}>
          <Download className="h-4 w-4" /> Excel
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-500 text-right">
              <th className="sticky left-0 bg-white text-left py-1.5 pr-3 min-w-52">Conta</th>
              {MESES.map((m) => (
                <th key={m} className="py-1.5 px-2 font-medium">
                  {m}
                </th>
              ))}
              <th className="py-1.5 pl-2 font-semibold text-slate-700">Total</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => {
              const forte = l.tipo === 'subtotal' || l.tipo === 'resultado'
              return (
                <tr key={l.rotulo} className={`border-t border-slate-100 text-right ${forte ? 'font-semibold bg-slate-50' : ''}`}>
                  <td className={`sticky left-0 text-left py-1.5 pr-3 whitespace-nowrap ${forte ? 'bg-slate-50 text-slate-900' : 'bg-white text-slate-600'}`}>
                    {l.rotulo}
                  </td>
                  {[...l.valores, soma(l.valores)].map((v, i) => (
                    <td
                      key={i}
                      className={`py-1.5 px-2 whitespace-nowrap tabular ${l.tipo === 'resultado' ? (v < 0 ? 'text-red-600' : 'text-emerald-700') : v === 0 ? 'text-slate-300' : ''}`}
                    >
                      {v === 0 && !forte ? '—' : formatBRL(v)}
                    </td>
                  ))}
                </tr>
              )
            })}
            <tr className="border-t border-slate-200 text-right text-slate-600">
              <td className="sticky left-0 bg-white text-left py-1.5 pr-3">Margem sobre a receita</td>
              {MESES.map((_, i) => (
                <td key={i} className="py-1.5 px-2">
                  {margem(i)}
                </td>
              ))}
              <td className="py-1.5 pl-2 font-semibold">{margem('total')}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  )
}
