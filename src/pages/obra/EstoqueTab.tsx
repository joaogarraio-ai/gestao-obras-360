import { useState } from 'react'
import { useStore } from '../../lib/store'
import { etapasDaObra, saldoMaterial, saldosEstoque } from '../../lib/gestao'
import { formatDatePt, toISODate } from '../../lib/dates'
import { formatBRL, formatNumero, numeroParaInput, parseMoneyInput } from '../../lib/money'
import { TIPO_MOVIMENTO_LABEL } from '../../lib/types'
import type { MaterialEstoque, Obra, TipoMovimentoEstoque } from '../../lib/types'
import { Badge, Button, Card, EmptyState, Field, Input, Select, Tabs } from '../../components/ui'

const VISOES = [
  { id: 'saldo', label: 'Saldo' },
  { id: 'movimentos', label: 'Movimentações' },
] as const

interface FormMov {
  tipo: TipoMovimentoEstoque
  materialId: string // '' = material novo
  novoNome: string
  novaUnidade: string
  quantidade: string
  valorUnitario: string
  obraDestinoId: string
  etapaId: string
  data: string
  responsavel: string
  observacao: string
}

export default function EstoqueTab({ obra }: { obra: Obra }) {
  const { db, addItem, updateItem, removeItem } = useStore()
  const [visao, setVisao] = useState<(typeof VISOES)[number]['id']>('saldo')
  const [form, setForm] = useState<FormMov | null>(null)
  const [editandoMinimo, setEditandoMinimo] = useState<{ material: MaterialEstoque; valor: string } | null>(null)

  const saldos = saldosEstoque(db, obra.id)
  const etapas = etapasDaObra(db, obra.id)
  const outrasObras = db.obras.filter((o) => o.id !== obra.id)
  const valorTotal = saldos.reduce((a, s) => a + Math.max(0, s.saldo) * s.custoMedio, 0)
  const alertas = saldos.filter((s) => s.abaixoDoMinimo)
  const nomeMaterial = (id: string) => db.materiaisEstoque.find((m) => m.id === id)

  const movimentos = db.movimentosEstoque
    .filter((m) => m.obraId === obra.id || m.obraDestinoId === obra.id)
    .sort((a, b) => b.data.localeCompare(a.data))

  function abrir(tipo: TipoMovimentoEstoque, materialId = '') {
    setForm({
      tipo,
      materialId: materialId || (tipo === 'entrada' ? '' : (saldos.find((s) => s.saldo > 0)?.material.id ?? '')),
      novoNome: '',
      novaUnidade: 'un',
      quantidade: '',
      valorUnitario: '',
      obraDestinoId: outrasObras[0]?.id ?? '',
      etapaId: '',
      data: toISODate(new Date()),
      responsavel: '',
      observacao: '',
    })
  }

  function salvar() {
    if (!form) return
    const quantidade = parseMoneyInput(form.quantidade)
    if (quantidade <= 0) return alert('Informe a quantidade.')
    let materialId = form.materialId
    if (!materialId) {
      if (form.tipo !== 'entrada' || !form.novoNome.trim()) return alert('Escolha o material.')
      const existente = db.materiaisEstoque.find((m) => m.nome.toLowerCase() === form.novoNome.trim().toLowerCase())
      materialId = existente?.id ?? addItem('materiaisEstoque', { nome: form.novoNome.trim(), unidade: form.novaUnidade.trim() || 'un' }).id
    }
    if (form.tipo !== 'entrada') {
      const saldo = saldoMaterial(db, obra.id, materialId)
      if (quantidade > saldo + 1e-9 && !confirm(`O saldo é ${formatNumero(saldo)}. Lançar mesmo assim (estoque fica negativo)?`)) return
      if (form.tipo === 'transferencia' && !form.obraDestinoId) return alert('Escolha a obra de destino.')
    }
    addItem('movimentosEstoque', {
      materialId,
      obraId: obra.id,
      obraDestinoId: form.tipo === 'transferencia' ? form.obraDestinoId : undefined,
      data: form.data,
      tipo: form.tipo,
      quantidade,
      valorUnitario: form.tipo === 'entrada' && form.valorUnitario ? parseMoneyInput(form.valorUnitario) : undefined,
      etapaId: form.tipo === 'saida' ? form.etapaId || undefined : undefined,
      responsavel: form.responsavel.trim() || undefined,
      observacao: form.observacao.trim() || undefined,
    })
    setForm(null)
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 no-print">
        <Button onClick={() => abrir('entrada')}>+ Entrada</Button>
        <Button variant="secondary" onClick={() => abrir('saida')} disabled={saldos.length === 0}>
          − Saída
        </Button>
        <Button variant="secondary" onClick={() => abrir('transferencia')} disabled={saldos.length === 0 || outrasObras.length === 0}>
          ⇄ Transferir
        </Button>
      </div>

      {form && (
        <Card className="p-4 space-y-3 border-amber-400">
          <p className="font-semibold text-stone-700">{TIPO_MOVIMENTO_LABEL[form.tipo]}</p>
          <Field label="Material">
            <Select value={form.materialId} onChange={(e) => setForm({ ...form, materialId: e.target.value })}>
              {form.tipo === 'entrada' && <option value="">+ Material novo</option>}
              {(form.tipo === 'entrada' ? db.materiaisEstoque : saldos.map((s) => s.material)).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome} ({m.unidade}) · saldo {formatNumero(saldoMaterial(db, obra.id, m.id))}
                </option>
              ))}
            </Select>
          </Field>
          {form.tipo === 'entrada' && !form.materialId && (
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <Field label="Nome do material">
                  <Input value={form.novoNome} onChange={(e) => setForm({ ...form, novoNome: e.target.value })} placeholder="Ex: Cimento CP-II 50 kg" />
                </Field>
              </div>
              <Field label="Unidade">
                <Input value={form.novaUnidade} onChange={(e) => setForm({ ...form, novaUnidade: e.target.value })} placeholder="saco" />
              </Field>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Field label="Quantidade">
              <Input value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: e.target.value })} inputMode="decimal" />
            </Field>
            <Field label="Data">
              <Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
            </Field>
          </div>
          {form.tipo === 'entrada' && (
            <Field label="Custo unitário (R$, opcional)">
              <Input value={form.valorUnitario} onChange={(e) => setForm({ ...form, valorUnitario: e.target.value })} inputMode="decimal" />
            </Field>
          )}
          {form.tipo === 'saida' && etapas.length > 0 && (
            <Field label="Aplicado na etapa">
              <Select value={form.etapaId} onChange={(e) => setForm({ ...form, etapaId: e.target.value })}>
                <option value="">—</option>
                {etapas.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nome}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          {form.tipo === 'transferencia' && (
            <Field label="Para a obra">
              <Select value={form.obraDestinoId} onChange={(e) => setForm({ ...form, obraDestinoId: e.target.value })}>
                {outrasObras.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nome}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Field label="Responsável">
              <Input value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} />
            </Field>
            <Field label="Observação">
              <Input value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} />
            </Field>
          </div>
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

      {editandoMinimo && (
        <Card className="p-4 space-y-3 border-amber-400">
          <Field label={`Estoque mínimo de ${editandoMinimo.material.nome} (${editandoMinimo.material.unidade})`}>
            <Input value={editandoMinimo.valor} onChange={(e) => setEditandoMinimo({ ...editandoMinimo, valor: e.target.value })} inputMode="decimal" autoFocus />
          </Field>
          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={() => {
                updateItem('materiaisEstoque', editandoMinimo.material.id, {
                  estoqueMinimo: editandoMinimo.valor.trim() ? parseMoneyInput(editandoMinimo.valor) : undefined,
                })
                setEditandoMinimo(null)
              }}
            >
              Salvar
            </Button>
            <Button variant="secondary" onClick={() => setEditandoMinimo(null)}>
              Cancelar
            </Button>
          </div>
        </Card>
      )}

      {alertas.length > 0 && (
        <Card className="p-3 bg-red-50 border-red-200">
          <p className="text-sm font-semibold text-red-700">Abaixo do estoque mínimo</p>
          <p className="text-sm text-red-700">{alertas.map((a) => `${a.material.nome} (${formatNumero(a.saldo)} ${a.material.unidade})`).join(', ')}</p>
          <p className="text-xs text-red-600 mt-1">Peça a compra na aba Compras.</p>
        </Card>
      )}

      <Tabs abas={VISOES} ativa={visao} onChange={setVisao} />

      {visao === 'saldo' &&
        (saldos.length === 0 ? (
          <EmptyState text="Nenhum material no almoxarifado desta obra. Lance uma entrada." />
        ) : (
          <>
            <p className="text-sm text-stone-500">
              Valor estimado em estoque: <span className="font-semibold text-stone-800">{formatBRL(valorTotal)}</span>
            </p>
            <div className="space-y-2">
              {saldos.map((s) => (
                <Card key={s.material.id} className="p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-stone-800 truncate">{s.material.nome}</p>
                    <p className="text-xs text-stone-500">
                      Consumido {formatNumero(s.consumido)} {s.material.unidade}
                      {s.custoMedio > 0 ? ` · custo médio ${formatBRL(s.custoMedio)}` : ''}
                      {' · '}
                      <button className="underline" onClick={() => setEditandoMinimo({ material: s.material, valor: numeroParaInput(s.material.estoqueMinimo) })}>
                        mínimo {s.material.estoqueMinimo !== undefined ? formatNumero(s.material.estoqueMinimo) : 'não definido'}
                      </button>
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-lg font-bold ${s.saldo < 0 || s.abaixoDoMinimo ? 'text-red-600' : 'text-stone-800'}`}>
                      {formatNumero(s.saldo)} <span className="text-xs font-normal text-stone-500">{s.material.unidade}</span>
                    </p>
                    {s.abaixoDoMinimo && <Badge tone="red">repor</Badge>}
                  </div>
                </Card>
              ))}
            </div>
          </>
        ))}

      {visao === 'movimentos' &&
        (movimentos.length === 0 ? (
          <EmptyState text="Nenhuma movimentação." />
        ) : (
          <div className="space-y-2">
            {movimentos.map((m) => {
              const material = nomeMaterial(m.materialId)
              const sinal = m.tipo === 'entrada' || m.obraDestinoId === obra.id ? '+' : '−'
              const detalhe =
                m.tipo === 'transferencia'
                  ? m.obraDestinoId === obra.id
                    ? `Recebido de ${db.obras.find((o) => o.id === m.obraId)?.nome ?? '—'}`
                    : `Enviado para ${db.obras.find((o) => o.id === m.obraDestinoId)?.nome ?? '—'}`
                  : TIPO_MOVIMENTO_LABEL[m.tipo]
              return (
                <Card key={m.id} className="p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-stone-800 truncate">{material?.nome ?? '—'}</p>
                    <p className="text-xs text-stone-500 truncate">
                      {formatDatePt(m.data)} · {detalhe}
                      {m.etapaId ? ` · ${etapas.find((e) => e.id === m.etapaId)?.nome ?? ''}` : ''}
                      {m.responsavel ? ` · ${m.responsavel}` : ''}
                      {m.observacao ? ` · ${m.observacao}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className={`font-semibold whitespace-nowrap ${sinal === '+' ? 'text-green-700' : 'text-red-600'}`}>
                      {sinal}
                      {formatNumero(m.quantidade)} {material?.unidade}
                    </span>
                    <Button
                      variant="ghost"
                      className="px-2"
                      onClick={() => {
                        if (confirm('Excluir esta movimentação?')) removeItem('movimentosEstoque', m.id)
                      }}
                    >
                      🗑️
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        ))}
    </div>
  )
}
