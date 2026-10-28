import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useStore } from '../lib/store'
import { mesesEntre, movimentos } from '../lib/gestao'
import type { Movimento } from '../lib/gestao'
import { formatDatePt, toISODate } from '../lib/dates'
import { formatBRL, parseMoneyInput } from '../lib/money'
import { CATEGORIA_LABEL } from '../lib/types'
import type { CategoriaCusto, TipoLancamento } from '../lib/types'
import { Badge, Button, Card, EmptyState, Field, Input, PageTitle, Select, Stat, Tabs } from '../components/ui'

const ABAS = [
  { id: 'fluxo', label: 'Fluxo de caixa' },
  { id: 'contas', label: 'Contas a pagar/receber' },
] as const

export default function Financeiro() {
  const { db, addItem, updateItem, removeItem } = useStore()
  const [aba, setAba] = useState<(typeof ABAS)[number]['id']>('fluxo')
  const [obraId, setObraId] = useState('')
  const [form, setForm] = useState<null | { tipo: TipoLancamento; descricao: string; valor: string; vencimento: string; obraId: string; categoria: string; pago: boolean }>(null)

  const todos = movimentos(db).filter((m) => !obraId || m.obraId === obraId)
  const hoje = toISODate(new Date())

  const entradasReal = todos.filter((m) => m.tipo === 'entrada' && m.realizado).reduce((a, m) => a + m.valor, 0)
  const saidasReal = todos.filter((m) => m.tipo === 'saida' && m.realizado).reduce((a, m) => a + m.valor, 0)
  const aReceber = todos.filter((m) => m.tipo === 'entrada' && !m.realizado).reduce((a, m) => a + m.valor, 0)
  const aPagar = todos.filter((m) => m.tipo === 'saida' && !m.realizado).reduce((a, m) => a + m.valor, 0)

  function salvar() {
    if (!form || !form.descricao.trim()) return
    addItem('lancamentos', {
      tipo: form.tipo,
      descricao: form.descricao.trim(),
      valor: parseMoneyInput(form.valor),
      vencimento: form.vencimento,
      obraId: form.obraId || undefined,
      categoria: form.tipo === 'despesa' && form.categoria ? (form.categoria as CategoriaCusto) : undefined,
      pago: form.pago,
      dataPagamento: form.pago ? form.vencimento : undefined,
    })
    setForm(null)
  }

  return (
    <div>
      <PageTitle title="Financeiro" subtitle="Tudo que entra e sai, por obra: diárias, materiais, despesas, medições e contas" />

      <Select value={obraId} onChange={(e) => setObraId(e.target.value)} className="mb-3">
        <option value="">Todas as obras</option>
        {db.obras.map((o) => (
          <option key={o.id} value={o.id}>
            {o.nome}
          </option>
        ))}
      </Select>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <Stat label="Saldo realizado" value={<span className={entradasReal - saidasReal < 0 ? 'text-red-600' : 'text-green-700'}>{formatBRL(entradasReal - saidasReal)}</span>} hint={`Entrou ${formatBRL(entradasReal)} · saiu ${formatBRL(saidasReal)}`} />
        <Stat label="Saldo projetado" value={formatBRL(entradasReal - saidasReal + aReceber - aPagar)} hint={`A receber ${formatBRL(aReceber)} · a pagar ${formatBRL(aPagar)}`} />
      </div>

      <Tabs abas={ABAS} ativa={aba} onChange={setAba} />

      {aba === 'fluxo' && <FluxoMensal movs={todos} />}

      {aba === 'contas' && (
        <div className="space-y-3">
          {!form && (
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => setForm({ tipo: 'receita', descricao: '', valor: '', vencimento: hoje, obraId, categoria: '', pago: false })}>+ A receber</Button>
              <Button variant="secondary" onClick={() => setForm({ tipo: 'despesa', descricao: '', valor: '', vencimento: hoje, obraId, categoria: 'equipamento', pago: false })}>
                + A pagar
              </Button>
            </div>
          )}

          {form && (
            <Card className="p-4 space-y-3 border-brand-400">
              <p className="font-semibold text-slate-700">{form.tipo === 'receita' ? 'Conta a receber' : 'Conta a pagar'}</p>
              <Field label="Descrição">
                <Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder={form.tipo === 'receita' ? 'Ex: Parcela 2 do cliente' : 'Ex: Aluguel de andaime'} />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Valor (R$)">
                  <Input value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} inputMode="decimal" />
                </Field>
                <Field label="Vencimento">
                  <Input type="date" value={form.vencimento} onChange={(e) => setForm({ ...form, vencimento: e.target.value })} />
                </Field>
              </div>
              <Field label="Obra">
                <Select value={form.obraId} onChange={(e) => setForm({ ...form, obraId: e.target.value })}>
                  <option value="">Sem obra (geral)</option>
                  {db.obras.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.nome}
                    </option>
                  ))}
                </Select>
              </Field>
              {form.tipo === 'despesa' && (
                <Field label="Categoria">
                  <Select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
                    <option value="">Despesas gerais</option>
                    {Object.entries(CATEGORIA_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={form.pago} onChange={(e) => setForm({ ...form, pago: e.target.checked })} className="accent-brand-700" />
                Já foi {form.tipo === 'receita' ? 'recebido' : 'pago'}
              </label>
              <div className="flex gap-2">
                <Button onClick={salvar} className="flex-1">
                  Salvar
                </Button>
                <Button variant="secondary" onClick={() => setForm(null)}>
                  Cancelar
                </Button>
              </div>
            </Card>
          )}

          {listaContas("A receber", db.lancamentos.filter((l) => l.tipo === 'receita' && !l.pago && (!obraId || l.obraId === obraId)))}
          {listaContas("A pagar", db.lancamentos.filter((l) => l.tipo === 'despesa' && !l.pago && (!obraId || l.obraId === obraId)))}

          {todos.some((m) => !m.realizado && (m.origem === 'Medições' || m.origem === 'Compra aprovada')) && (
            <Card className="p-3">
              <p className="text-sm font-semibold text-slate-700 mb-1">Previstos de medições e compras aprovadas</p>
              {todos
                .filter((m) => !m.realizado && (m.origem === 'Medições' || m.origem === 'Compra aprovada'))
                .map((m, i) => (
                  <div key={i} className="flex justify-between text-sm py-1 border-t border-slate-100">
                    <span className="text-slate-700">
                      {m.descricao} <span className="text-xs text-slate-400">({m.origem})</span>
                    </span>
                    <span className="whitespace-nowrap">{formatBRL(m.valor)}</span>
                  </div>
                ))}
              <p className="text-xs text-slate-400 mt-1">Para baixar, marque a medição como paga ou registre a compra na obra.</p>
            </Card>
          )}
        </div>
      )}
    </div>
  )

  function listaContas(titulo: string, itens: typeof db.lancamentos) {
    const ordenados = [...itens].sort((a, b) => a.vencimento.localeCompare(b.vencimento))
    return (
      <div>
        <p className="text-sm font-semibold text-slate-600 mb-1.5">
          {titulo} ({formatBRL(ordenados.reduce((a, l) => a + l.valor, 0))})
        </p>
        {ordenados.length === 0 && <p className="text-sm text-slate-400 mb-2">Nada em aberto.</p>}
        <div className="space-y-2">
          {ordenados.map((l) => {
            const vencido = l.vencimento < hoje
            return (
              <Card key={l.id} className="p-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 truncate">{l.descricao}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {formatDatePt(l.vencimento)} {vencido && <Badge tone="red">vencido</Badge>} · {db.obras.find((o) => o.id === l.obraId)?.nome ?? 'Geral'}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="font-semibold whitespace-nowrap">{formatBRL(l.valor)}</span>
                  <Button variant="secondary" className="px-2 py-1.5" onClick={() => updateItem('lancamentos', l.id, { pago: true, dataPagamento: hoje })}>
                    ✓ Baixar
                  </Button>
                  <Button
                    variant="ghost"
                    className="px-2"
                    onClick={() => {
                      if (confirm('Excluir este lançamento?')) removeItem('lancamentos', l.id)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      </div>
    )
  }
}

function FluxoMensal({ movs }: { movs: Movimento[] }) {
  if (movs.length === 0) return <EmptyState text="Nenhuma movimentação ainda." />
  const meses = mesesEntre(movs[0].data, movs[movs.length - 1].data)
  const hojeMes = toISODate(new Date()).slice(0, 7)
  const base = meses.map((m) => {
    const doMes = movs.filter((x) => x.data.slice(0, 7) === m.chave)
    const entradas = doMes.filter((x) => x.tipo === 'entrada').reduce((a, x) => a + x.valor, 0)
    const saidas = doMes.filter((x) => x.tipo === 'saida').reduce((a, x) => a + x.valor, 0)
    const previsto = doMes.some((x) => !x.realizado)
    return { mes: m, entradas, saidas, saldo: entradas - saidas, previsto }
  })
  const linhas = base.map((l, i) => ({ ...l, acumulado: base.slice(0, i + 1).reduce((a, x) => a + x.saldo, 0) }))
  const max = Math.max(1, ...linhas.map((l) => Math.max(l.entradas, l.saidas)))

  return (
    <div className="space-y-3">
      <Card className="p-3">
        <div className="flex items-end gap-1 h-40 overflow-x-auto">
          {linhas.map((l) => (
            <div key={l.mes.chave} className="flex-1 min-w-10 flex flex-col items-center justify-end h-full">
              <div className="flex items-end gap-0.5 flex-1 w-full justify-center">
                <div className={`w-full max-w-4 rounded-t-md bg-emerald-400 ${l.mes.chave > hojeMes ? 'opacity-40' : ''}`} style={{ height: `${(l.entradas / max) * 100}%` }} title={`Entradas ${formatBRL(l.entradas)}`} />
                <div className={`w-full max-w-4 rounded-t-md bg-slate-300 ${l.mes.chave > hojeMes ? 'opacity-40' : ''}`} style={{ height: `${(l.saidas / max) * 100}%` }} title={`Saídas ${formatBRL(l.saidas)}`} />
              </div>
              <span className="text-[10px] text-slate-500 mt-1 whitespace-nowrap">{l.mes.label}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-3 text-xs text-slate-500 mt-2">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Entradas</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-slate-300" /> Saídas</span>
          <span>Meses futuros mais claros (previsto)</span>
        </div>
      </Card>
      <Card className="p-3 overflow-x-auto">
        <table className="w-full text-xs sm:text-sm">
          <thead>
            <tr className="text-xs text-slate-500 text-right">
              <th className="text-left py-1">Mês</th>
              <th className="py-1 px-1">Entradas</th>
              <th className="py-1 px-1">Saídas</th>
              <th className="py-1 px-1">Saldo</th>
              <th className="py-1 pl-1">Acumulado</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.mes.chave} className="border-t border-slate-100 text-right">
                <td className="text-left py-1.5 whitespace-nowrap">
                  {l.mes.label} {l.previsto && <span className="text-[10px] text-brand-700">prev.</span>}
                </td>
                <td className="py-1.5 px-1 whitespace-nowrap text-green-700">{formatBRL(l.entradas)}</td>
                <td className="py-1.5 px-1 whitespace-nowrap text-red-600">{formatBRL(l.saidas)}</td>
                <td className={`py-1.5 px-1 whitespace-nowrap ${l.saldo < 0 ? 'text-red-600' : ''}`}>{formatBRL(l.saldo)}</td>
                <td className={`py-1.5 pl-1 whitespace-nowrap font-semibold ${l.acumulado < 0 ? 'text-red-600' : ''}`}>{formatBRL(l.acumulado)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-slate-400 mt-2">Inclui diárias, tarefas, materiais, despesas, medições, compras aprovadas e contas lançadas.</p>
      </Card>
    </div>
  )
}
