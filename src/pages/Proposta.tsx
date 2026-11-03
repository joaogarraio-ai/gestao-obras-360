import { ArrowLeft, Printer } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useStore } from '../lib/store'
import { useSync } from '../lib/sync'
import { bdiDaObra, custoDiretoEtapa, diasEntre, etapasDaObra, itensDaObra, totalItem } from '../lib/gestao'
import { formatDatePt, toISODate } from '../lib/dates'
import { enderecoResumido } from '../lib/formatos'
import { formatBRL, formatNumero } from '../lib/money'
import { TIPO_OBRA_LABEL } from '../lib/types'
import { Button, Card, EmptyState, Field, Input, TextArea } from '../components/ui'

/** Proposta comercial da obra para o cliente, pronta para imprimir ou salvar em PDF. */
export default function Proposta() {
  const { id } = useParams()
  const { db } = useStore()
  const { empresa } = useSync()
  const obra = db.obras.find((o) => o.id === id)
  const [detalhar, setDetalhar] = useState(false)
  const [condicoes, setCondicoes] = useState('20% na assinatura do contrato e o restante conforme medições mensais da obra executada.')
  const [validade, setValidade] = useState('15')
  const [observacoes, setObservacoes] = useState('Não inclui projetos, taxas da prefeitura e ligações de concessionárias, salvo indicação acima.')

  if (!obra) return <EmptyState text="Obra não encontrada." />

  const cliente = db.clientes.find((c) => c.id === obra.clienteId)
  const bdi = bdiDaObra(obra)
  const etapas = etapasDaObra(db, obra.id)
  const itens = itensDaObra(db, obra.id)
  const linhas = etapas.map((e) => ({ etapa: e, valor: custoDiretoEtapa(db, e.id) * (1 + bdi) })).filter((l) => l.valor > 0)
  const totalOrcado = linhas.reduce((a, l) => a + l.valor, 0)
  const total = totalOrcado > 0 ? totalOrcado : (obra.valorContrato ?? 0)
  const hoje = toISODate(new Date())
  const numero = obra.codigo || obra.id.slice(0, 6).toUpperCase()

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white py-6 print:py-0">
      <div className="no-print mx-auto max-w-3xl px-4 mb-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Link to={`/obras/${obra.id}`} className="inline-flex items-center gap-1 text-sm text-brand-700">
            <ArrowLeft className="h-4 w-4" /> Voltar para a obra
          </Link>
          <Button onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Imprimir / salvar PDF
          </Button>
        </div>
        <Card className="p-4 space-y-3">
          <p className="text-sm text-slate-600">Ajuste o texto antes de imprimir. Para PDF, escolha "Salvar como PDF" na janela de impressão.</p>
          <Field label="Condições de pagamento">
            <TextArea value={condicoes} onChange={(e) => setCondicoes(e.target.value)} />
          </Field>
          <div className="grid grid-cols-[8rem_1fr] gap-2">
            <Field label="Validade (dias)">
              <Input value={validade} onChange={(e) => setValidade(e.target.value)} inputMode="numeric" />
            </Field>
            <Field label="Observações">
              <Input value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
            </Field>
          </div>
          {itens.length > 0 && (
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" className="accent-brand-700" checked={detalhar} onChange={(e) => setDetalhar(e.target.checked)} />
              Mostrar os itens de cada etapa
            </label>
          )}
        </Card>
      </div>

      <article className="mx-auto max-w-3xl bg-white px-8 py-10 shadow-sm print:shadow-none print:px-0 print:py-0 text-slate-800 text-sm leading-relaxed">
        <header className="flex items-start justify-between gap-4 border-b-2 border-brand-600 pb-4">
          <div>
            <p className="text-xl font-bold text-slate-900">{empresa?.nome ?? 'JotaP Obra 360'}</p>
            <p className="text-xs text-slate-500">Proposta comercial de execução de obra</p>
          </div>
          <div className="text-right text-xs text-slate-600">
            <p className="font-semibold text-slate-900">Proposta nº {numero}</p>
            <p>{formatDatePt(hoje)}</p>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-6 mt-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Cliente</p>
            <p className="font-semibold">{cliente?.nome ?? obra.cliente ?? '—'}</p>
            {cliente?.documento && <p>{cliente.tipoPessoa === 'pj' ? 'CNPJ' : 'CPF'} {cliente.documento}</p>}
            {cliente && enderecoResumido(cliente) && <p>{enderecoResumido(cliente)}</p>}
            {cliente && [cliente.telefone, cliente.email].filter(Boolean).length > 0 && <p>{[cliente.telefone, cliente.email].filter(Boolean).join(' · ')}</p>}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Obra</p>
            <p className="font-semibold">{obra.nome}</p>
            {enderecoResumido(obra) && <p>{enderecoResumido(obra)}</p>}
            <p>{[obra.tipo && TIPO_OBRA_LABEL[obra.tipo], obra.areaConstruida && `${formatNumero(obra.areaConstruida)} m²`].filter(Boolean).join(' · ')}</p>
          </div>
        </section>

        <section className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Escopo e valores</p>
          {linhas.length > 0 ? (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-300 text-left text-xs text-slate-500">
                  <th className="py-1.5 pr-2 w-10">Item</th>
                  <th className="py-1.5 pr-2">Descrição</th>
                  <th className="py-1.5 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((l, i) => (
                  <tr key={l.etapa.id} className="border-b border-slate-100 align-top">
                    <td className="py-1.5 pr-2">{i + 1}</td>
                    <td className="py-1.5 pr-2">
                      <p className="font-medium">{l.etapa.nome}</p>
                      {detalhar && (
                        <ul className="mt-1 text-xs text-slate-500 space-y-0.5">
                          {itens
                            .filter((it) => it.etapaId === l.etapa.id)
                            .map((it) => (
                              <li key={it.id} className="flex justify-between gap-2">
                                <span>
                                  {it.descricao} ({formatNumero(it.quantidade)} {it.unidade})
                                </span>
                                <span className="whitespace-nowrap">{formatBRL(totalItem(it) * (1 + bdi))}</span>
                              </li>
                            ))}
                        </ul>
                      )}
                    </td>
                    <td className="py-1.5 text-right whitespace-nowrap">{formatBRL(l.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-slate-600">Execução completa da obra conforme projeto e memorial descritivo.</p>
          )}
          <div className="mt-3 flex justify-end">
            <div className="rounded-lg bg-slate-50 print:bg-white print:border print:border-slate-300 px-4 py-2 text-right">
              <p className="text-xs text-slate-500">Valor total da proposta</p>
              <p className="text-lg font-bold text-slate-900">{formatBRL(total)}</p>
              {obra.areaConstruida && total > 0 && <p className="text-xs text-slate-500">{formatBRL(total / obra.areaConstruida)} por m²</p>}
            </div>
          </div>
        </section>

        <section className="mt-8 space-y-3">
          {obra.dataInicio && obra.dataFim && (
            <p>
              <b>Prazo:</b> {diasEntre(obra.dataInicio, obra.dataFim)} dias, com início previsto em {formatDatePt(obra.dataInicio)} e término em{' '}
              {formatDatePt(obra.dataFim)}.
            </p>
          )}
          <p>
            <b>Condições de pagamento:</b> {condicoes}
          </p>
          {obra.responsavelTecnico && (
            <p>
              <b>Responsável técnico:</b> {obra.responsavelTecnico}
              {obra.registroProfissional ? ` (${obra.registroProfissional})` : ''}
            </p>
          )}
          {observacoes.trim() && (
            <p>
              <b>Observações:</b> {observacoes}
            </p>
          )}
          <p>
            <b>Validade da proposta:</b> {validade || '15'} dias a partir de {formatDatePt(hoje)}.
          </p>
        </section>

        <section className="mt-16 grid grid-cols-2 gap-10 text-center text-xs text-slate-600">
          <div className="border-t border-slate-400 pt-2">{empresa?.nome ?? 'Contratada'}</div>
          <div className="border-t border-slate-400 pt-2">{cliente?.nome ?? obra.cliente ?? 'Contratante'}</div>
        </section>
      </article>
    </div>
  )
}
