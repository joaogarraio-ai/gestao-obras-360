import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { addDays, formatDatePt, getMondayOfWeek, getWeekRange } from '../lib/dates'
import { formatBRL } from '../lib/money'
import { gerarRelatorioSemanal } from '../lib/report'
import { Badge, Button, Card, PageTitle } from '../components/ui'

function montarTextoResumo(rel: ReturnType<typeof gerarRelatorioSemanal>): string {
  const linhas: string[] = []
  linhas.push(`*Relatório da obra – ${formatDatePt(rel.start)} a ${formatDatePt(rel.end)}*`)
  linhas.push('')

  if (rel.pagamentos.length > 0) {
    linhas.push('*Pagamento dos trabalhadores*')
    const pix = rel.pagamentos.filter((p) => p.formaPagamento === 'pix')
    const dinheiro = rel.pagamentos.filter((p) => p.formaPagamento === 'dinheiro')
    const linhaTexto = (p: (typeof rel.pagamentos)[number]) => {
      const partes: string[] = []
      if (p.totalDias > 0) partes.push(`${p.totalDias}d`)
      if (p.tarefas.length > 0) partes.push(`${p.tarefas.length} tarefa(s)`)
      return `- ${p.nome} (${p.funcao}): ${partes.join(' + ')} = ${formatBRL(p.valorTotal)}`
    }
    if (pix.length) {
      linhas.push('_PIX:_')
      pix.forEach((p) => linhas.push(linhaTexto(p)))
    }
    if (dinheiro.length) {
      linhas.push('_Dinheiro:_')
      dinheiro.forEach((p) => linhas.push(linhaTexto(p)))
    }
    linhas.push(`Total mão de obra: ${formatBRL(rel.totalMaoDeObra)} (PIX ${formatBRL(rel.totalPix)} / Dinheiro ${formatBRL(rel.totalDinheiro)})`)
    linhas.push('')
  }

  if (rel.materiais.length > 0) {
    linhas.push('*Materiais*')
    rel.materiais.forEach((m) => linhas.push(`- ${m.fornecedorNome}: ${formatBRL(m.totalFornecedor)}`))
    linhas.push(`Total materiais: ${formatBRL(rel.totalMateriais)}`)
    linhas.push('')
  }

  if (rel.despesas.length > 0) {
    linhas.push('*Despesas*')
    rel.despesas.forEach((d) => linhas.push(`- ${d.descricao}: ${formatBRL(d.valor)}`))
    linhas.push(`Total despesas: ${formatBRL(rel.totalDespesas)}`)
    linhas.push('')
  }

  linhas.push(`*TOTAL GERAL: ${formatBRL(rel.totalGeral)}*`)
  return linhas.join('\n')
}

export default function Relatorio() {
  const { db } = useStore()
  const [mondayIso, setMondayIso] = useState(() => getMondayOfWeek())
  const { start, end } = useMemo(() => getWeekRange(mondayIso), [mondayIso])

  const relatorio = useMemo(() => gerarRelatorioSemanal(db, start, end), [db, start, end])

  async function compartilhar() {
    const texto = montarTextoResumo(relatorio)
    if (navigator.share) {
      try {
        await navigator.share({ text: texto, title: 'Relatório da obra' })
        return
      } catch {
        // usuário cancelou ou share falhou, cai no fallback abaixo
      }
    }
    try {
      await navigator.clipboard.writeText(texto)
      alert('Resumo copiado! Cole no WhatsApp para enviar.')
    } catch {
      window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank')
    }
  }

  return (
    <div>
      <PageTitle title="Relatório semanal" subtitle="Resumo para pagamento" />

      <Card className="no-print p-3 mb-3 flex items-center justify-between gap-2">
        <Button variant="secondary" onClick={() => setMondayIso(addDays(mondayIso, -7))} className="px-3">
          ◀
        </Button>
        <div className="text-center flex-1">
          <p className="font-semibold text-stone-800 text-sm">
            {formatDatePt(start)} – {formatDatePt(end)}
          </p>
          <button className="text-xs text-amber-700 underline" onClick={() => setMondayIso(getMondayOfWeek())}>
            ir para semana atual
          </button>
        </div>
        <Button variant="secondary" onClick={() => setMondayIso(addDays(mondayIso, 7))} className="px-3">
          ▶
        </Button>
      </Card>

      <div className="no-print flex gap-2 mb-4">
        <Button onClick={compartilhar} className="flex-1">
          📤 Compartilhar
        </Button>
        <Button variant="secondary" onClick={() => window.print()} className="flex-1">
          🖨️ Imprimir / PDF
        </Button>
      </div>

      <div className="space-y-4 print:text-black">
        <div className="text-center hidden print:block mb-2">
          <h2 className="text-lg font-bold">Relatório semanal da obra</h2>
          <p className="text-sm">
            {formatDatePt(start)} a {formatDatePt(end)}
          </p>
        </div>

        <Card className="p-4">
          <h2 className="font-bold text-stone-800 mb-3">Pagamento dos trabalhadores</h2>
          {relatorio.pagamentos.length === 0 ? (
            <p className="text-sm text-stone-400">Nenhum dia lançado nesse período.</p>
          ) : (
            <div className="space-y-3">
              {(['pix', 'dinheiro'] as const).map((forma) => {
                const linhas = relatorio.pagamentos.filter((p) => p.formaPagamento === forma)
                if (linhas.length === 0) return null
                return (
                  <div key={forma}>
                    <p className="text-xs font-semibold text-stone-500 uppercase mb-1.5">{forma === 'pix' ? 'PIX' : 'Dinheiro'}</p>
                    <div className="space-y-2.5">
                      {linhas.map((p) => (
                        <div key={p.chave} className="text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-medium text-stone-800 truncate">{p.nome}</p>
                              <p className="text-xs text-stone-500 truncate">
                                {p.funcao}
                                {p.totalDias > 0 ? ` · ${p.totalDias}d (${p.diasCompletos} completos, ${p.meiosDias} meio-dia)` : ''}
                                {p.chavePix ? ` · PIX: ${p.chavePix}` : ''}
                              </p>
                            </div>
                            <p className="font-semibold text-stone-800 whitespace-nowrap">{formatBRL(p.valorTotal)}</p>
                          </div>
                          {p.tarefas.length > 0 && (
                            <div className="mt-1 pl-2 space-y-0.5">
                              {p.tarefas.map((t, i) => (
                                <div key={i} className="flex justify-between text-xs text-stone-500">
                                  <span className="truncate pr-2">
                                    {formatDatePt(t.data)} · {t.descricao} ({t.obraNome})
                                  </span>
                                  <span className="whitespace-nowrap">{formatBRL(t.valor)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="text-right text-xs text-stone-500 mt-1">
                      Subtotal {forma === 'pix' ? 'PIX' : 'dinheiro'}:{' '}
                      <span className="font-semibold text-stone-700">{formatBRL(forma === 'pix' ? relatorio.totalPix : relatorio.totalDinheiro)}</span>
                    </p>
                  </div>
                )
              })}
              <div className="flex justify-between pt-2 border-t border-stone-200">
                <p className="font-bold text-stone-800">Total mão de obra</p>
                <p className="font-bold text-stone-800">{formatBRL(relatorio.totalMaoDeObra)}</p>
              </div>
            </div>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="font-bold text-stone-800 mb-3">Materiais</h2>
          {relatorio.materiais.length === 0 ? (
            <p className="text-sm text-stone-400">Nenhuma compra lançada nesse período.</p>
          ) : (
            <div className="space-y-3">
              {relatorio.materiais.map((m) => (
                <div key={m.fornecedorId}>
                  <div className="flex justify-between text-sm font-medium text-stone-700 mb-1">
                    <p>{m.fornecedorNome}</p>
                    <p>{formatBRL(m.totalFornecedor)}</p>
                  </div>
                  <div className="space-y-1">
                    {m.itens.map((item, i) => (
                      <div key={i} className="flex justify-between text-xs text-stone-500 pl-2">
                        <span className="truncate pr-2">
                          {formatDatePt(item.data)} · {item.descricao} ({item.obraNome})
                          {item.numeroNota ? ` · NF ${item.numeroNota}` : ''}
                        </span>
                        <span className="whitespace-nowrap">{formatBRL(item.valor)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div className="flex justify-between pt-2 border-t border-stone-200">
                <p className="font-bold text-stone-800">Total materiais</p>
                <p className="font-bold text-stone-800">{formatBRL(relatorio.totalMateriais)}</p>
              </div>
            </div>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="font-bold text-stone-800 mb-3">Despesas</h2>
          {relatorio.despesas.length === 0 ? (
            <p className="text-sm text-stone-400">Nenhuma despesa lançada nesse período.</p>
          ) : (
            <div className="space-y-2">
              {relatorio.despesas.map((d, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <div>
                    <p className="text-stone-800">{d.descricao}</p>
                    <p className="text-xs text-stone-500">
                      {formatDatePt(d.data)}
                      {d.obraNome ? ` · ${d.obraNome}` : ''}
                    </p>
                  </div>
                  <p className="font-semibold text-stone-800 whitespace-nowrap">{formatBRL(d.valor)}</p>
                </div>
              ))}
              <div className="flex justify-between pt-2 border-t border-stone-200">
                <p className="font-bold text-stone-800">Total despesas</p>
                <p className="font-bold text-stone-800">{formatBRL(relatorio.totalDespesas)}</p>
              </div>
            </div>
          )}
        </Card>

        <Card className="p-4 bg-amber-800 text-white border-amber-800">
          <div className="flex justify-between items-center">
            <p className="font-bold text-lg">TOTAL GERAL</p>
            <p className="font-bold text-lg">{formatBRL(relatorio.totalGeral)}</p>
          </div>
          <div className="flex gap-2 mt-2 flex-wrap">
            <Badge tone="default">Mão de obra {formatBRL(relatorio.totalMaoDeObra)}</Badge>
            <Badge tone="default">Materiais {formatBRL(relatorio.totalMateriais)}</Badge>
            <Badge tone="default">Despesas {formatBRL(relatorio.totalDespesas)}</Badge>
          </div>
        </Card>
      </div>
    </div>
  )
}
