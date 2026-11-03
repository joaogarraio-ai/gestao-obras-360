import { Ban, ChevronDown, ChevronUp, Download, Pencil, Search, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useStore } from '../lib/store'
import { formatDatePt, toISODate } from '../lib/dates'
import { baixarPlanilha } from '../lib/exportar'
import { formatBRL, formatNumero } from '../lib/money'
import { removerAnexosDe } from '../lib/anexos'
import { MODELO_NOTA_CURTO, type NotaFiscal, type TipoNota } from '../lib/types'
import FormNota from '../components/FormNota'
import Anexos from '../components/Anexos'
import { Badge, Button, Card, EmptyState, Input, PageTitle, Select, Stat, Tabs } from '../components/ui'

type Periodo = 'mes' | 'mes_anterior' | 'ano' | 'tudo'
const PERIODO_LABEL: Record<Periodo, string> = {
  mes: 'Este mês',
  mes_anterior: 'Mês passado',
  ano: 'Este ano',
  tudo: 'Todo o período',
}

function intervalo(p: Periodo): [string, string] {
  const h = new Date()
  const y = h.getFullYear()
  const m = h.getMonth()
  if (p === 'mes') return [toISODate(new Date(y, m, 1)), toISODate(new Date(y, m + 1, 0))]
  if (p === 'mes_anterior') return [toISODate(new Date(y, m - 1, 1)), toISODate(new Date(y, m, 0))]
  if (p === 'ano') return [`${y}-01-01`, `${y}-12-31`]
  return ['0000-01-01', '9999-12-31']
}

const ABAS = [
  { id: 'entrada', label: 'Notas de compra' },
  { id: 'saida', label: 'Notas de venda / serviço' },
] as const

/** Central de notas fiscais: compras recebidas e notas emitidas, com fotos, impostos e parcelas. */
export default function Notas() {
  const { db, updateItem, removeItem } = useStore()
  const [tipo, setTipo] = useState<TipoNota>('entrada')
  const [form, setForm] = useState<null | { nota?: NotaFiscal }>(null)
  const [aberta, setAberta] = useState<string | null>(null)
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [obraId, setObraId] = useState('')
  const [busca, setBusca] = useState('')
  const entrada = tipo === 'entrada'

  const parteNome = (n: NotaFiscal) =>
    (n.fornecedorId
      ? db.fornecedores.find((f) => f.id === n.fornecedorId)?.nome
      : n.clienteId
        ? db.clientes.find((c) => c.id === n.clienteId)?.nome
        : n.nomeParte) ?? '—'
  const obraNome = (id?: string) => (id ? (db.obras.find((o) => o.id === id)?.nome ?? '—') : 'Sem obra')

  const [ini, fim] = intervalo(periodo)
  const termo = busca.trim().toLowerCase()
  const lista = db.notasFiscais
    .filter((n) => n.tipo === tipo)
    .filter((n) => n.dataEmissao >= ini && n.dataEmissao <= fim)
    .filter((n) => !obraId || n.obraId === obraId)
    .filter((n) => !termo || [n.numero, n.chaveAcesso, parteNome(n), n.observacao, ...n.itens.map((i) => i.descricao)].join(' ').toLowerCase().includes(termo))
    .sort((a, b) => b.dataEmissao.localeCompare(a.dataEmissao) || b.numero.localeCompare(a.numero))

  const validas = lista.filter((n) => !n.cancelada)
  const total = validas.reduce((a, n) => a + n.valorTotal, 0)
  const impostos = validas.reduce((a, n) => a + (n.valorICMS ?? 0) + (n.valorIPI ?? 0) + (n.valorISS ?? 0) + (n.valorPisCofins ?? 0), 0)
  const parcelasAbertas = db.lancamentos.filter((l) => l.notaId && !l.pago && validas.some((n) => n.id === l.notaId))
  const emAberto = parcelasAbertas.reduce((a, l) => a + l.valor, 0)

  function excluir(n: NotaFiscal) {
    const parcelas = db.lancamentos.filter((l) => l.notaId === n.id)
    const abertas = parcelas.filter((l) => !l.pago)
    const msg = `Excluir a nota ${n.numero}?${abertas.length ? ` As ${abertas.length} parcela(s) em aberto no Financeiro também serão apagadas.` : ''}${parcelas.length - abertas.length ? ' As parcelas já pagas ficam no Financeiro.' : ''}`
    if (!confirm(msg)) return
    for (const l of abertas) removeItem('lancamentos', l.id)
    removeItem('notasFiscais', n.id)
    void removerAnexosDe('notasFiscais', n.id)
  }

  function alternarCancelada(n: NotaFiscal) {
    if (!n.cancelada) {
      const abertas = db.lancamentos.filter((l) => l.notaId === n.id && !l.pago)
      if (
        !confirm(`Marcar a nota ${n.numero} como cancelada?${abertas.length ? ` As ${abertas.length} parcela(s) em aberto serão apagadas do Financeiro.` : ''}`)
      )
        return
      for (const l of abertas) removeItem('lancamentos', l.id)
    }
    updateItem('notasFiscais', n.id, { cancelada: !n.cancelada })
  }

  function exportar() {
    baixarPlanilha(
      `notas-${entrada ? 'compra' : 'venda'}-${ini}-a-${fim}`,
      [
        'Emissão',
        'Modelo',
        'Número',
        'Série',
        'Chave de acesso',
        entrada ? 'Fornecedor' : 'Cliente',
        'Obra',
        'Produtos',
        'Serviços',
        'Frete',
        'Desconto',
        'ICMS',
        'IPI',
        'ISS',
        'PIS/COFINS',
        'Retenções',
        'Total',
        'Situação',
      ],
      lista.map((n) => [
        formatDatePt(n.dataEmissao),
        MODELO_NOTA_CURTO[n.modelo],
        n.numero,
        n.serie,
        n.chaveAcesso,
        parteNome(n),
        obraNome(n.obraId),
        n.valorProdutos,
        n.valorServicos,
        n.frete,
        n.desconto,
        n.valorICMS,
        n.valorIPI,
        n.valorISS,
        n.valorPisCofins,
        n.retencoes,
        n.valorTotal,
        n.cancelada ? 'Cancelada' : 'Ativa',
      ]),
    )
  }

  return (
    <div>
      <PageTitle
        title="Notas fiscais"
        subtitle="Notas de compra e de venda com foto, XML, impostos e parcelas ligadas ao financeiro"
        actions={
          !form && (
            <Button onClick={() => setForm({})} className="w-full sm:w-auto">
              + {entrada ? 'Lançar nota de compra' : 'Lançar nota de venda'}
            </Button>
          )
        }
      />

      <div className="mb-4">
        <Tabs
          abas={ABAS}
          ativa={tipo}
          onChange={(t) => {
            setTipo(t)
            setForm(null)
          }}
        />
      </div>

      {form && (
        <div className="mb-4">
          <FormNota key={form.nota?.id ?? 'nova'} tipo={tipo} nota={form.nota} onFechar={() => setForm(null)} />
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <Stat label={`Total · ${PERIODO_LABEL[periodo].toLowerCase()}`} value={formatBRL(total)} hint={`${validas.length} nota(s)`} />
        <Stat label="Impostos destacados" value={formatBRL(impostos)} hint="ICMS, IPI, ISS, PIS/COFINS" />
        <Stat
          label={entrada ? 'A pagar dessas notas' : 'A receber dessas notas'}
          value={<span className={emAberto > 0 ? 'text-amber-600' : ''}>{formatBRL(emAberto)}</span>}
          hint={`${parcelasAbertas.length} parcela(s)`}
        />
        <Stat label="Canceladas" value={lista.length - validas.length} />
      </div>

      <Card className="p-3 mb-4">
        <div className="grid grid-cols-2 sm:grid-cols-[10rem_14rem_1fr_auto] gap-2">
          <Select value={periodo} onChange={(e) => setPeriodo(e.target.value as Periodo)} aria-label="Período">
            {Object.entries(PERIODO_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
          <Select value={obraId} onChange={(e) => setObraId(e.target.value)} aria-label="Obra">
            <option value="">Todas as obras</option>
            {db.obras.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nome}
              </option>
            ))}
          </Select>
          <div className="relative col-span-2 sm:col-span-1">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Número, chave, fornecedor, produto..." className="pl-9" />
          </div>
          <Button variant="secondary" onClick={exportar} disabled={lista.length === 0} className="col-span-2 sm:col-span-1">
            <Download className="h-4 w-4" /> Excel
          </Button>
        </div>
      </Card>

      {lista.length === 0 && !form && (
        <EmptyState
          text={
            db.notasFiscais.some((n) => n.tipo === tipo)
              ? 'Nenhuma nota com esses filtros.'
              : entrada
                ? 'Nenhuma nota de compra lançada. Lance pela chave de acesso, importe o XML que o fornecedor mandou ou tire uma foto da nota.'
                : 'Nenhuma nota de venda ou serviço lançada.'
          }
        />
      )}

      <div className="space-y-2">
        {lista.map((n) => {
          const parcelas = db.lancamentos.filter((l) => l.notaId === n.id).sort((a, b) => a.vencimento.localeCompare(b.vencimento))
          const pagas = parcelas.filter((p) => p.pago).length
          const exp = aberta === n.id
          return (
            <Card key={n.id} className={`p-3 ${n.cancelada ? 'opacity-60' : ''}`}>
              <button className="w-full text-left" onClick={() => setAberta(exp ? null : n.id)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 truncate">
                      {MODELO_NOTA_CURTO[n.modelo]} {n.numero}
                      {n.serie ? `-${n.serie}` : ''} · {parteNome(n)}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {[formatDatePt(n.dataEmissao), obraNome(n.obraId), n.itens.length ? `${n.itens.length} item(ns)` : null].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`font-semibold whitespace-nowrap tabular ${n.cancelada ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                      {formatBRL(n.valorTotal)}
                    </p>
                    <div className="flex justify-end gap-1 mt-0.5">
                      {n.cancelada ? (
                        <Badge tone="red">Cancelada</Badge>
                      ) : parcelas.length > 0 ? (
                        <Badge tone={pagas === parcelas.length ? 'green' : 'amber'}>
                          {pagas === parcelas.length ? (entrada ? 'Paga' : 'Recebida') : `${pagas}/${parcelas.length} ${entrada ? 'pagas' : 'recebidas'}`}
                        </Badge>
                      ) : null}
                      {exp ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                    </div>
                  </div>
                </div>
              </button>

              {exp && (
                <div className="mt-3 space-y-3 border-t border-slate-100 pt-3 text-sm">
                  {n.chaveAcesso && <p className="text-xs text-slate-500 break-all">Chave: {n.chaveAcesso.replace(/(\d{4})(?=\d)/g, '$1 ')}</p>}
                  {n.itens.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left text-slate-500 border-b border-slate-100">
                            <th className="py-1 pr-2">Produto</th>
                            <th className="py-1 pr-2 text-right">Qtd.</th>
                            <th className="py-1 pr-2 text-right">Unit.</th>
                            <th className="py-1 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {n.itens.map((i) => (
                            <tr key={i.id} className="border-b border-slate-50">
                              <td className="py-1 pr-2">{i.descricao}</td>
                              <td className="py-1 pr-2 text-right whitespace-nowrap">
                                {formatNumero(i.quantidade)} {i.unidade}
                              </td>
                              <td className="py-1 pr-2 text-right whitespace-nowrap">{formatBRL(i.valorUnitario)}</td>
                              <td className="py-1 text-right whitespace-nowrap">{formatBRL(i.quantidade * i.valorUnitario)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                    {n.frete > 0 && <span>Frete {formatBRL(n.frete)}</span>}
                    {n.desconto > 0 && <span>Desconto {formatBRL(n.desconto)}</span>}
                    {n.valorICMS ? <span>ICMS {formatBRL(n.valorICMS)}</span> : null}
                    {n.valorIPI ? <span>IPI {formatBRL(n.valorIPI)}</span> : null}
                    {n.valorISS ? <span>ISS {formatBRL(n.valorISS)}</span> : null}
                    {n.valorPisCofins ? <span>PIS/COFINS {formatBRL(n.valorPisCofins)}</span> : null}
                    {n.retencoes ? <span>Retenções {formatBRL(n.retencoes)}</span> : null}
                  </div>
                  {parcelas.length > 0 && (
                    <div className="rounded-lg border border-slate-200 divide-y divide-slate-100">
                      {parcelas.map((p) => (
                        <div key={p.id} className="flex items-center justify-between gap-2 px-3 py-1.5">
                          <span className="text-slate-600">
                            {p.parcela ?? 'Parcela'} · vence {formatDatePt(p.vencimento)}
                          </span>
                          <span className="flex items-center gap-2">
                            <span className="tabular">{formatBRL(p.valor)}</span>
                            <button
                              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${p.pago ? 'bg-green-50 text-green-700 ring-green-200' : 'bg-amber-50 text-amber-700 ring-amber-200'}`}
                              onClick={() =>
                                updateItem('lancamentos', p.id, {
                                  pago: !p.pago,
                                  dataPagamento: p.pago ? undefined : toISODate(new Date()),
                                })
                              }
                            >
                              {p.pago ? (entrada ? 'Paga' : 'Recebida') : 'Marcar paga'}
                            </button>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <Anexos refColecao="notasFiscais" refId={n.id} titulo="Foto, PDF ou XML da nota" />
                  {n.observacao && <p className="text-xs text-slate-600">{n.observacao}</p>}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      className="py-1 text-xs"
                      onClick={() => {
                        setForm({ nota: n })
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                      }}
                    >
                      <Pencil className="h-4 w-4" /> Editar
                    </Button>
                    <Button variant="secondary" className="py-1 text-xs" onClick={() => alternarCancelada(n)}>
                      <Ban className="h-4 w-4" /> {n.cancelada ? 'Reativar' : 'Cancelar nota'}
                    </Button>
                    <Button variant="ghost" className="py-1 text-xs text-red-600 ml-auto" onClick={() => excluir(n)}>
                      <Trash2 className="h-4 w-4" /> Excluir
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
