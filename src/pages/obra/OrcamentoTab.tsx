import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useStore } from '../../lib/store'
import { calcularBDI, curvaABC, etapasDaObra, formatPercent, itensDaObra, totalItem } from '../../lib/gestao'
import { addDays, toISODate } from '../../lib/dates'
import { formatBRL, formatNumero, numeroParaInput, parseMoneyInput } from '../../lib/money'
import { BDI_PADRAO, CATEGORIA_LABEL } from '../../lib/types'
import type { CategoriaCusto, ComposicaoBDI, ItemOrcamento, Obra } from '../../lib/types'
import { Badge, Button, Card, EmptyState, Field, Input, Select, Tabs } from '../../components/ui'

const CAMPOS_BDI: { id: keyof ComposicaoBDI; label: string }[] = [
  { id: 'administracaoCentral', label: 'Administração central' },
  { id: 'seguroGarantia', label: 'Seguro + garantia' },
  { id: 'risco', label: 'Risco' },
  { id: 'despesasFinanceiras', label: 'Despesas financeiras' },
  { id: 'lucro', label: 'Lucro' },
  { id: 'tributos', label: 'Tributos (PIS, COFINS, ISS, CPRB)' },
]

interface FormItem {
  etapaId: string
  codigo: string
  descricao: string
  unidade: string
  quantidade: string
  custoUnitario: string
  categoria: CategoriaCusto
}

const VISOES = [
  { id: 'planilha', label: 'Planilha' },
  { id: 'abc', label: 'Curva ABC' },
  { id: 'bdi', label: 'BDI' },
] as const

export default function OrcamentoTab({ obra }: { obra: Obra }) {
  const { db, addItem, updateItem, removeItem, updateObra } = useStore()
  const [visao, setVisao] = useState<(typeof VISOES)[number]['id']>('planilha')
  const [novaEtapa, setNovaEtapa] = useState('')
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [mostrarForm, setMostrarForm] = useState(false)

  const etapas = etapasDaObra(db, obra.id)
  const itens = itensDaObra(db, obra.id)
  const bdiComp = obra.bdi ?? BDI_PADRAO
  const bdi = calcularBDI(bdiComp)
  const custoDireto = itens.reduce((a, i) => a + totalItem(i), 0)

  const formVazio: FormItem = {
    etapaId: etapas[0]?.id ?? '',
    codigo: '',
    descricao: '',
    unidade: 'un',
    quantidade: '',
    custoUnitario: '',
    categoria: 'material',
  }
  const [form, setForm] = useState<FormItem>(formVazio)

  function adicionarEtapa() {
    if (!novaEtapa.trim()) return
    const inicio = etapas.length > 0 ? etapas[etapas.length - 1].dataFim : (obra.dataInicio ?? toISODate(new Date()))
    addItem('etapas', {
      obraId: obra.id,
      nome: novaEtapa.trim(),
      ordem: etapas.length,
      dataInicio: inicio,
      dataFim: addDays(inicio, 29),
      percentualConcluido: 0,
    })
    setNovaEtapa('')
  }

  function novoItem(etapaId: string) {
    setEditandoId(null)
    setForm({ ...formVazio, etapaId })
    setMostrarForm(true)
  }

  function editarItem(i: ItemOrcamento) {
    setEditandoId(i.id)
    setForm({
      etapaId: i.etapaId,
      codigo: i.codigo ?? '',
      descricao: i.descricao,
      unidade: i.unidade,
      quantidade: numeroParaInput(i.quantidade),
      custoUnitario: numeroParaInput(i.custoUnitario),
      categoria: i.categoria,
    })
    setMostrarForm(true)
  }

  function salvarItem() {
    if (!form.etapaId || !form.descricao.trim()) return
    const dados = {
      obraId: obra.id,
      etapaId: form.etapaId,
      codigo: form.codigo.trim() || undefined,
      descricao: form.descricao.trim(),
      unidade: form.unidade.trim() || 'un',
      quantidade: parseMoneyInput(form.quantidade),
      custoUnitario: parseMoneyInput(form.custoUnitario),
      categoria: form.categoria,
    }
    if (editandoId) updateItem('itensOrcamento', editandoId, dados)
    else addItem('itensOrcamento', dados)
    setMostrarForm(false)
    setEditandoId(null)
  }

  function removerEtapa(id: string, nome: string) {
    const qtd = db.itensOrcamento.filter((i) => i.etapaId === id).length
    if (!confirm(`Remover a etapa "${nome}"${qtd ? ` e seus ${qtd} itens` : ''}?`)) return
    db.itensOrcamento.filter((i) => i.etapaId === id).forEach((i) => removeItem('itensOrcamento', i.id))
    removeItem('etapas', id)
  }

  return (
    <div>
      <Card className="p-4 mb-3 bg-brand-800 text-white border-brand-800">
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <p className="text-brand-100 text-xs">Custo direto</p>
            <p className="font-bold">{formatBRL(custoDireto)}</p>
          </div>
          <div>
            <p className="text-brand-100 text-xs">BDI</p>
            <p className="font-bold">{formatPercent(bdi, 2)}</p>
          </div>
          <div>
            <p className="text-brand-100 text-xs">Preço de venda</p>
            <p className="font-bold">{formatBRL(custoDireto * (1 + bdi))}</p>
          </div>
        </div>
      </Card>

      <Tabs abas={VISOES} ativa={visao} onChange={setVisao} />

      {visao === 'bdi' && (
        <Card className="p-4 space-y-3">
          <p className="text-sm text-slate-600">
            Fórmula do TCU: BDI = ((1 + AC + S + R) × (1 + DF) × (1 + L)) ÷ (1 − T) − 1. Valores em %.
          </p>
          <div className="grid grid-cols-2 gap-2" key={JSON.stringify(bdiComp)}>
            {CAMPOS_BDI.map((c) => (
              <Field key={c.id} label={c.label}>
                <Input
                  inputMode="decimal"
                  defaultValue={String(bdiComp[c.id]).replace('.', ',')}
                  onBlur={(e) => updateObra(obra.id, { bdi: { ...bdiComp, [c.id]: parseMoneyInput(e.target.value) } })}
                />
              </Field>
            ))}
          </div>
          <p className="font-semibold text-slate-800">BDI resultante: {formatPercent(bdi, 2)}</p>
          <Button variant="secondary" onClick={() => updateObra(obra.id, { bdi: BDI_PADRAO })}>
            Voltar ao padrão
          </Button>
        </Card>
      )}

      {visao === 'abc' && <CurvaABC itens={itens} bdi={bdi} />}

      {visao === 'planilha' && (
        <div className="space-y-3">
          {mostrarForm && (
            <Card className="p-4 space-y-3 border-brand-400">
              <p className="font-semibold text-slate-700">{editandoId ? 'Editar item' : 'Novo item'}</p>
              <Field label="Etapa">
                <Select value={form.etapaId} onChange={(e) => setForm({ ...form, etapaId: e.target.value })}>
                  {etapas.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nome}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="grid grid-cols-3 gap-2">
                <Field label="Código">
                  <Input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} placeholder="SINAPI" />
                </Field>
                <div className="col-span-2">
                  <Field label="Categoria">
                    <Select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value as CategoriaCusto })}>
                      {Object.entries(CATEGORIA_LABEL).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
              </div>
              <Field label="Descrição">
                <Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Ex: Alvenaria de bloco cerâmico" />
              </Field>
              <div className="grid grid-cols-3 gap-2">
                <Field label="Unidade">
                  <Input value={form.unidade} onChange={(e) => setForm({ ...form, unidade: e.target.value })} />
                </Field>
                <Field label="Quantidade">
                  <Input value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: e.target.value })} inputMode="decimal" />
                </Field>
                <Field label="Custo unit. (R$)">
                  <Input value={form.custoUnitario} onChange={(e) => setForm({ ...form, custoUnitario: e.target.value })} inputMode="decimal" />
                </Field>
              </div>
              <p className="text-sm text-slate-600">
                Total: {formatBRL(parseMoneyInput(form.quantidade) * parseMoneyInput(form.custoUnitario))} · com BDI{' '}
                {formatBRL(parseMoneyInput(form.quantidade) * parseMoneyInput(form.custoUnitario) * (1 + bdi))}
              </p>
              <div className="flex gap-2">
                <Button onClick={salvarItem} className="flex-1">
                  Salvar
                </Button>
                <Button variant="secondary" onClick={() => setMostrarForm(false)}>
                  Cancelar
                </Button>
              </div>
            </Card>
          )}

          {etapas.length === 0 && <EmptyState text="Comece criando as etapas da obra (ex: Fundação, Estrutura, Alvenaria)." />}

          {etapas.map((e, idx) => {
            const itensEtapa = itens.filter((i) => i.etapaId === e.id)
            const totalEtapa = itensEtapa.reduce((a, i) => a + totalItem(i), 0)
            return (
              <Card key={e.id} className="p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="font-semibold text-slate-800">
                    {idx + 1}. {e.nome}
                  </p>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-sm font-semibold text-slate-700">{formatBRL(totalEtapa * (1 + bdi))}</span>
                    <Button variant="ghost" className="px-2" onClick={() => removerEtapa(e.id, e.nome)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="divide-y divide-slate-100">
                  {itensEtapa.map((i, j) => (
                    <div key={i.id} className="py-2 flex items-center justify-between gap-2 text-sm">
                      <button className="min-w-0 text-left" onClick={() => editarItem(i)}>
                        <p className="text-slate-800 truncate">
                          <span className="text-slate-400">
                            {idx + 1}.{j + 1}
                          </span>{' '}
                          {i.descricao}
                        </p>
                        <p className="text-xs text-slate-500">
                          {i.codigo ? `${i.codigo} · ` : ''}
                          {formatNumero(i.quantidade)} {i.unidade} × {formatBRL(i.custoUnitario)} · {CATEGORIA_LABEL[i.categoria]}
                        </p>
                      </button>
                      <div className="flex items-center shrink-0">
                        <span className="whitespace-nowrap text-slate-700">{formatBRL(totalItem(i))}</span>
                        <Button
                          variant="ghost"
                          className="px-2"
                          onClick={() => {
                            if (confirm('Remover este item?')) removeItem('itensOrcamento', i.id)
                          }}
                        >
                          ✕
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="ghost" className="w-full mt-1 text-brand-700" onClick={() => novoItem(e.id)}>
                  + Item
                </Button>
              </Card>
            )
          })}

          <Card className="p-3">
            <div className="flex gap-2">
              <Input value={novaEtapa} onChange={(e) => setNovaEtapa(e.target.value)} placeholder="Nova etapa" onKeyDown={(e) => e.key === 'Enter' && adicionarEtapa()} />
              <Button onClick={adicionarEtapa}>Adicionar</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

function CurvaABC({ itens, bdi }: { itens: ItemOrcamento[]; bdi: number }) {
  const linhas = curvaABC(itens)
  if (linhas.length === 0) return <EmptyState text="Cadastre itens no orçamento para gerar a curva ABC." />
  const resumo = (['A', 'B', 'C'] as const).map((c) => {
    const ls = linhas.filter((l) => l.classe === c)
    return { classe: c, qtd: ls.length, total: ls.reduce((a, l) => a + l.total, 0) }
  })
  const tone = { A: 'red', B: 'amber', C: 'green' } as const
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {resumo.map((r) => (
          <Card key={r.classe} className="p-3">
            <Badge tone={tone[r.classe]}>Classe {r.classe}</Badge>
            <p className="text-sm font-bold text-slate-800 mt-1">{formatBRL(r.total * (1 + bdi))}</p>
            <p className="text-xs text-slate-500">{r.qtd} itens</p>
          </Card>
        ))}
      </div>
      <p className="text-xs text-slate-500">Classe A: itens que somam até 80% do custo, onde vale negociar mais. B: até 95%. C: o restante.</p>
      <Card className="p-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500">
              <th className="py-1 pr-2">Item</th>
              <th className="py-1 pr-2 text-right">Total</th>
              <th className="py-1 pr-2 text-right">%</th>
              <th className="py-1 pr-2 text-right">Acum.</th>
              <th className="py-1 text-center">Classe</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.item.id} className="border-t border-slate-100">
                <td className="py-1.5 pr-2 text-slate-800">{l.item.descricao}</td>
                <td className="py-1.5 pr-2 text-right whitespace-nowrap">{formatBRL(l.total)}</td>
                <td className="py-1.5 pr-2 text-right">{formatPercent(l.percentual)}</td>
                <td className="py-1.5 pr-2 text-right">{formatPercent(l.acumulado)}</td>
                <td className="py-1.5 text-center">
                  <Badge tone={tone[l.classe]}>{l.classe}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
