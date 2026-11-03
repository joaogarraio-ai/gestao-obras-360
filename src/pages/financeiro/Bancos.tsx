import { Check, EyeOff, FileUp, Landmark, Pencil, Plus, Undo2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { useStore } from '../../lib/store'
import { formatDatePt, toISODate } from '../../lib/dates'
import { formatBRL, numeroParaInput, parseMoneyInput } from '../../lib/money'
import { generateId } from '../../lib/id'
import { lerOfx, saldoConta, saldoExtrato, sugestoes } from '../../lib/conciliacao'
import type { Movimento } from '../../lib/gestao'
import { CATEGORIA_LABEL, TIPO_CONTA_BANCARIA_LABEL, type CategoriaCusto, type LinhaExtrato, type TipoContaBancaria } from '../../lib/types'
import { Badge, Button, Card, EmptyState, Field, Input, Select } from '../../components/ui'

type FormConta = {
  id?: string
  nome: string
  tipo: TipoContaBancaria
  banco: string
  agencia: string
  numero: string
  saldoInicial: string
  dataSaldoInicial: string
}

/** Contas bancárias e caixas, com importação do extrato OFX e conciliação com os lançamentos. */
export default function Bancos({ movs }: { movs: Movimento[] }) {
  const { db, addItem, updateItem, updateDespesa } = useStore()
  const hoje = toISODate(new Date())
  const contas = db.contasBancarias.filter((c) => c.ativo)
  const [contaId, setContaId] = useState(contas[0]?.id ?? '')
  const [form, setForm] = useState<FormConta | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [verConciliadas, setVerConciliadas] = useState(false)
  const [lancar, setLancar] = useState<{ linhaId: string; descricao: string; categoria: string; obraId: string } | null>(null)
  const ofxRef = useRef<HTMLInputElement>(null)
  const conta = contas.find((c) => c.id === contaId) ?? contas[0]

  function salvarConta() {
    if (!form || !form.nome.trim()) return
    const dados = {
      nome: form.nome.trim(),
      tipo: form.tipo,
      banco: form.banco.trim() || undefined,
      agencia: form.agencia.trim() || undefined,
      numero: form.numero.trim() || undefined,
      saldoInicial: parseMoneyInput(form.saldoInicial),
      dataSaldoInicial: form.dataSaldoInicial || hoje,
      ativo: true,
    }
    if (form.id) updateItem('contasBancarias', form.id, dados)
    else setContaId(addItem('contasBancarias', dados).id)
    setForm(null)
  }

  async function importar(file: File | undefined) {
    if (!file || !conta) return
    const lido = lerOfx(await file.text())
    if (ofxRef.current) ofxRef.current.value = ''
    if (!lido) {
      setAviso('Esse arquivo não é um extrato OFX. No site ou app do banco, procure "exportar extrato" no formato OFX ou Money.')
      return
    }
    const existentes = new Set(db.extrato.filter((l) => l.contaId === conta.id).map((l) => l.fitid))
    const novas = lido.transacoes.filter((t) => !existentes.has(t.fitid))
    for (const t of novas) addItem('extrato', { ...t, contaId: conta.id })
    setAviso(
      `${novas.length} transação(ões) nova(s) importada(s)${lido.transacoes.length - novas.length ? `, ${lido.transacoes.length - novas.length} já estavam no sistema` : ''}.`,
    )
  }

  function conciliar(linha: LinhaExtrato, colecao: 'lancamentos' | 'despesas', id: string) {
    if (colecao === 'lancamentos') updateItem('lancamentos', id, { pago: true, dataPagamento: linha.data, contaId: linha.contaId })
    else updateDespesa(id, { pago: true, data: linha.data, contaId: linha.contaId })
    updateItem('extrato', linha.id, { conciliadoCom: { colecao, id }, ignorado: false })
  }

  function desfazer(linha: LinhaExtrato) {
    updateItem('extrato', linha.id, { conciliadoCom: undefined, ignorado: false })
  }

  function criarLancamento() {
    if (!lancar) return
    const linha = db.extrato.find((l) => l.id === lancar.linhaId)
    if (!linha) return
    const id = generateId()
    addItem('lancamentos', {
      id,
      tipo: linha.valor > 0 ? 'receita' : 'despesa',
      descricao: lancar.descricao.trim() || linha.descricao,
      valor: Math.abs(linha.valor),
      vencimento: linha.data,
      pago: true,
      dataPagamento: linha.data,
      obraId: lancar.obraId || undefined,
      categoria: linha.valor < 0 && lancar.categoria ? (lancar.categoria as CategoriaCusto) : undefined,
      contaId: linha.contaId,
    })
    updateItem('extrato', linha.id, { conciliadoCom: { colecao: 'lancamentos', id } })
    setLancar(null)
  }

  if (form) {
    return (
      <Card className="p-4 space-y-3 border-brand-400">
        <p className="font-semibold text-slate-700">{form.id ? 'Editar conta' : 'Nova conta ou caixa'}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Field label="Nome *">
            <Input
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Ex: Banco do Brasil PJ, Caixa da obra"
              autoFocus
            />
          </Field>
          <Field label="Tipo">
            <Select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoContaBancaria })}>
              {Object.entries(TIPO_CONTA_BANCARIA_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        {form.tipo !== 'caixa' && (
          <div className="grid grid-cols-3 gap-2">
            <Field label="Banco">
              <Input value={form.banco} onChange={(e) => setForm({ ...form, banco: e.target.value })} />
            </Field>
            <Field label="Agência">
              <Input value={form.agencia} onChange={(e) => setForm({ ...form, agencia: e.target.value })} />
            </Field>
            <Field label="Conta">
              <Input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} />
            </Field>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Field label="Saldo inicial (R$)">
            <Input value={form.saldoInicial} onChange={(e) => setForm({ ...form, saldoInicial: e.target.value })} inputMode="decimal" placeholder="0,00" />
          </Field>
          <Field label="Saldo na data de">
            <Input type="date" value={form.dataSaldoInicial} onChange={(e) => setForm({ ...form, dataSaldoInicial: e.target.value })} />
          </Field>
        </div>
        <div className="flex gap-2">
          <Button onClick={salvarConta} className="flex-1">
            Salvar conta
          </Button>
          <Button variant="secondary" onClick={() => setForm(null)}>
            Cancelar
          </Button>
        </div>
      </Card>
    )
  }

  const novaConta = () => setForm({ nome: '', tipo: 'corrente', banco: '', agencia: '', numero: '', saldoInicial: '', dataSaldoInicial: hoje })

  if (!conta) {
    return (
      <div className="space-y-3">
        <EmptyState text="Cadastre suas contas bancárias e o caixa para ver o saldo de cada uma e conferir com o extrato do banco." />
        <Button onClick={novaConta} className="w-full sm:w-auto">
          <Plus className="h-4 w-4" /> Cadastrar conta
        </Button>
      </div>
    )
  }

  const linhas = db.extrato.filter((l) => l.contaId === conta.id).sort((a, b) => b.data.localeCompare(a.data))
  const pendentes = linhas.filter((l) => !l.conciliadoCom && !l.ignorado)
  const feitas = linhas.filter((l) => l.conciliadoCom || l.ignorado)
  const sSistema = saldoConta(conta, movs)
  const sExtrato = saldoExtrato(conta, db.extrato)
  const descricaoDe = (l: LinhaExtrato) => {
    if (!l.conciliadoCom) return null
    const { colecao, id } = l.conciliadoCom
    return colecao === 'lancamentos' ? db.lancamentos.find((x) => x.id === id)?.descricao : db.despesas.find((x) => x.id === id)?.descricao
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {contas.map((c) => (
          <button
            key={c.id}
            onClick={() => setContaId(c.id)}
            className={`rounded-xl border p-3 text-left bg-white ${c.id === conta.id ? 'border-brand-500 ring-1 ring-brand-500' : 'border-slate-200'}`}
          >
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Landmark className="h-4 w-4" /> {TIPO_CONTA_BANCARIA_LABEL[c.tipo]}
            </div>
            <p className="font-semibold text-slate-800 truncate">{c.nome}</p>
            <p className={`text-lg font-semibold tabular ${saldoConta(c, movs) < 0 ? 'text-red-600' : 'text-slate-900'}`}>{formatBRL(saldoConta(c, movs))}</p>
          </button>
        ))}
        <button
          onClick={novaConta}
          className="rounded-xl border border-dashed border-slate-300 p-3 text-sm text-slate-500 hover:border-brand-400 hover:text-brand-700"
        >
          <Plus className="h-4 w-4 inline" /> Nova conta ou caixa
        </button>
      </div>

      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-semibold text-slate-800">{conta.nome}</p>
            <p className="text-xs text-slate-500">
              {[conta.banco, conta.agencia && `ag. ${conta.agencia}`, conta.numero && `c/c ${conta.numero}`].filter(Boolean).join(' · ') ||
                TIPO_CONTA_BANCARIA_LABEL[conta.tipo]}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="py-1.5 text-sm"
              onClick={() =>
                setForm({
                  id: conta.id,
                  nome: conta.nome,
                  tipo: conta.tipo,
                  banco: conta.banco ?? '',
                  agencia: conta.agencia ?? '',
                  numero: conta.numero ?? '',
                  saldoInicial: numeroParaInput(conta.saldoInicial),
                  dataSaldoInicial: conta.dataSaldoInicial,
                })
              }
            >
              <Pencil className="h-4 w-4" /> Editar
            </Button>
            {conta.tipo !== 'caixa' && (
              <Button className="py-1.5 text-sm" onClick={() => ofxRef.current?.click()}>
                <FileUp className="h-4 w-4" /> Importar extrato OFX
              </Button>
            )}
            <input
              ref={ofxRef}
              type="file"
              accept=".ofx,.OFX,application/x-ofx,text/plain"
              className="hidden"
              onChange={(e) => importar(e.target.files?.[0])}
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="rounded-lg bg-slate-50 p-2">
            <p className="text-xs text-slate-500">Saldo pelo sistema</p>
            <p className="font-semibold tabular">{formatBRL(sSistema)}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-2">
            <p className="text-xs text-slate-500">Saldo pelo extrato</p>
            <p className="font-semibold tabular">{linhas.length ? formatBRL(sExtrato) : '—'}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-2">
            <p className="text-xs text-slate-500">Diferença</p>
            <p className={`font-semibold tabular ${linhas.length && Math.abs(sExtrato - sSistema) > 0.009 ? 'text-amber-600' : 'text-emerald-700'}`}>
              {linhas.length ? formatBRL(sExtrato - sSistema) : '—'}
            </p>
          </div>
        </div>
        {aviso && <p className="rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-800">{aviso}</p>}
      </Card>

      {linhas.length === 0 && conta.tipo !== 'caixa' && (
        <EmptyState text='Baixe o extrato no site ou app do banco no formato OFX e clique em "Importar extrato OFX". O sistema mostra cada transação e sugere o lançamento que bate com ela.' />
      )}

      {pendentes.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-700">A conciliar ({pendentes.length})</p>
          {pendentes.map((l) => {
            const sug = sugestoes(db, l)
            return (
              <Card key={l.id} className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{l.descricao}</p>
                    <p className="text-xs text-slate-500">{formatDatePt(l.data)}</p>
                  </div>
                  <p className={`font-semibold tabular whitespace-nowrap ${l.valor < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{formatBRL(l.valor)}</p>
                </div>
                {sug.map((s) => (
                  <div key={s.colecao + s.id} className="flex items-center justify-between gap-2 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs">
                    <span className="min-w-0 truncate text-emerald-900">
                      Bate com: <b>{s.descricao}</b> · {formatDatePt(s.data)} {!s.pago && '(em aberto)'}
                    </span>
                    <Button className="py-1 text-xs shrink-0" onClick={() => conciliar(l, s.colecao, s.id)}>
                      <Check className="h-3.5 w-3.5" /> Conciliar
                    </Button>
                  </div>
                ))}
                {lancar?.linhaId === l.id ? (
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_12rem_12rem_auto] gap-2 items-end rounded-lg border border-slate-200 p-2">
                    <Field label="Descrição">
                      <Input value={lancar.descricao} onChange={(e) => setLancar({ ...lancar, descricao: e.target.value })} />
                    </Field>
                    {l.valor < 0 && (
                      <Field label="Categoria">
                        <Select value={lancar.categoria} onChange={(e) => setLancar({ ...lancar, categoria: e.target.value })}>
                          <option value="">Despesas gerais</option>
                          {Object.entries(CATEGORIA_LABEL).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v}
                            </option>
                          ))}
                        </Select>
                      </Field>
                    )}
                    <Field label="Obra">
                      <Select value={lancar.obraId} onChange={(e) => setLancar({ ...lancar, obraId: e.target.value })}>
                        <option value="">Sem obra</option>
                        {db.obras.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.nome}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <div className="flex gap-1">
                      <Button className="py-2 text-xs" onClick={criarLancamento}>
                        Lançar
                      </Button>
                      <Button variant="ghost" className="py-2 text-xs" onClick={() => setLancar(null)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      className="py-1 text-xs"
                      onClick={() => setLancar({ linhaId: l.id, descricao: l.descricao, categoria: '', obraId: '' })}
                    >
                      <Plus className="h-3.5 w-3.5" /> Criar lançamento
                    </Button>
                    <Button variant="ghost" className="py-1 text-xs" onClick={() => updateItem('extrato', l.id, { ignorado: true })}>
                      <EyeOff className="h-3.5 w-3.5" /> Ignorar
                    </Button>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {feitas.length > 0 && (
        <div className="space-y-2">
          <button className="text-sm font-semibold text-slate-700" onClick={() => setVerConciliadas(!verConciliadas)}>
            {verConciliadas ? '▾' : '▸'} Conciliadas e ignoradas ({feitas.length})
          </button>
          {verConciliadas &&
            feitas.map((l) => (
              <Card key={l.id} className="p-2.5 flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate text-slate-700">{l.descricao}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {formatDatePt(l.data)} · {l.ignorado ? 'Ignorada' : `com "${descricaoDe(l) ?? 'lançamento apagado'}"`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`tabular ${l.valor < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{formatBRL(l.valor)}</span>
                  {l.ignorado ? <Badge>Ignorada</Badge> : <Badge tone="green">OK</Badge>}
                  <button className="text-slate-400 hover:text-slate-700" aria-label="Desfazer" onClick={() => desfazer(l)}>
                    <Undo2 className="h-4 w-4" />
                  </button>
                </div>
              </Card>
            ))}
        </div>
      )}
    </div>
  )
}
