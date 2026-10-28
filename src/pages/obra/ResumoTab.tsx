import { useState } from 'react'
import { useStore } from '../../lib/store'
import {
  avancoFisicoObra,
  avancoPrevistoObra,
  bdiDaObra,
  CATEGORIA_REALIZADO_LABEL,
  custoDiretoEtapa,
  custoDiretoObra,
  etapasDaObra,
  formatPercent,
  movimentos,
  orcadoXRealizado,
  realizadoPorEtapa,
} from '../../lib/gestao'
import { formatBRL, numeroParaInput, parseMoneyInput } from '../../lib/money'
import type { Obra } from '../../lib/types'
import { Button, Card, Field, Input, ProgressBar, Stat } from '../../components/ui'

export default function ResumoTab({ obra }: { obra: Obra }) {
  const { db, updateObra } = useStore()
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState({
    nome: obra.nome,
    cliente: obra.cliente ?? '',
    endereco: obra.endereco ?? '',
    dataInicio: obra.dataInicio ?? '',
    dataFim: obra.dataFim ?? '',
    valorContrato: numeroParaInput(obra.valorContrato),
  })

  const bdi = bdiDaObra(obra)
  const custoDireto = custoDiretoObra(db, obra.id)
  const precoVenda = custoDireto * (1 + bdi)
  const movs = movimentos(db).filter((m) => m.obraId === obra.id)
  const gasto = movs.filter((m) => m.tipo === 'saida' && m.realizado).reduce((a, m) => a + m.valor, 0)
  const recebido = movs.filter((m) => m.tipo === 'entrada' && m.realizado).reduce((a, m) => a + m.valor, 0)
  const avanco = avancoFisicoObra(db, obra.id)
  const previsto = avancoPrevistoObra(db, obra.id)
  const comparativo = orcadoXRealizado(db, obra.id)
  const etapas = etapasDaObra(db, obra.id)

  function salvar() {
    if (!form.nome.trim()) return
    updateObra(obra.id, {
      nome: form.nome.trim(),
      cliente: form.cliente.trim() || undefined,
      endereco: form.endereco.trim() || undefined,
      dataInicio: form.dataInicio || undefined,
      dataFim: form.dataFim || undefined,
      valorContrato: parseMoneyInput(form.valorContrato) || undefined,
    })
    setEditando(false)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Valor do contrato" value={obra.valorContrato ? formatBRL(obra.valorContrato) : '—'} hint={`Recebido ${formatBRL(recebido)}`} />
        <Stat label="Orçamento (com BDI)" value={formatBRL(precoVenda)} hint={`Custo direto ${formatBRL(custoDireto)} · BDI ${formatPercent(bdi)}`} />
        <Stat
          label="Gasto realizado"
          value={formatBRL(gasto)}
          hint={custoDireto > 0 ? `${formatPercent(gasto / custoDireto, 0)} do custo direto orçado` : undefined}
        />
        <Stat
          label="Resultado de caixa"
          value={<span className={recebido - gasto < 0 ? 'text-red-600' : 'text-green-700'}>{formatBRL(recebido - gasto)}</span>}
          hint="Recebido − gasto"
        />
      </div>

      <Card className="p-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="font-semibold text-slate-700">Avanço físico</span>
          <span className="text-slate-600">
            Real {formatPercent(avanco, 0)} · Previsto {formatPercent(previsto, 0)}
          </span>
        </div>
        <ProgressBar value={avanco} tone={avanco + 0.05 < previsto ? 'red' : 'green'} />
        <div className="mt-1">
          <ProgressBar value={previsto} tone="stone" />
        </div>
        {avanco + 0.05 < previsto && <p className="text-xs text-red-600 mt-2">A obra está atrasada em relação ao cronograma.</p>}
      </Card>

      <Card className="p-4">
        <p className="font-semibold text-slate-700 mb-3">Orçado x realizado (custo direto)</p>
        <div className="space-y-3">
          {comparativo
            .filter((c) => c.orcado > 0 || c.realizado > 0)
            .map((c) => {
              const estourou = c.orcado > 0 && c.realizado > c.orcado
              return (
                <div key={c.categoria}>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-700">{CATEGORIA_REALIZADO_LABEL[c.categoria]}</span>
                    <span className={estourou ? 'text-red-600 font-semibold' : 'text-slate-600'}>
                      {formatBRL(c.realizado)} / {formatBRL(c.orcado)}
                    </span>
                  </div>
                  <ProgressBar value={c.orcado > 0 ? c.realizado / c.orcado : c.realizado > 0 ? 1 : 0} tone={estourou || c.orcado === 0 ? 'red' : 'amber'} />
                </div>
              )
            })}
          {comparativo.every((c) => c.orcado === 0 && c.realizado === 0) && (
            <p className="text-sm text-slate-400">Monte o orçamento e lance os gastos para ver a comparação.</p>
          )}
        </div>
      </Card>

      {etapas.length > 0 && (
        <Card className="p-4 overflow-x-auto">
          <p className="font-semibold text-slate-700 mb-2">Por etapa</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500">
                <th className="py-1 pr-2">Etapa</th>
                <th className="py-1 pr-2 text-right">Orçado</th>
                <th className="py-1 pr-2 text-right">Realizado*</th>
                <th className="py-1 text-right">Físico</th>
              </tr>
            </thead>
            <tbody>
              {etapas.map((e) => {
                const orc = custoDiretoEtapa(db, e.id)
                const real = realizadoPorEtapa(db, e.id)
                return (
                  <tr key={e.id} className="border-t border-slate-100">
                    <td className="py-1.5 pr-2 text-slate-800">{e.nome}</td>
                    <td className="py-1.5 pr-2 text-right whitespace-nowrap">{formatBRL(orc)}</td>
                    <td className={`py-1.5 pr-2 text-right whitespace-nowrap ${real > orc && orc > 0 ? 'text-red-600' : ''}`}>{formatBRL(real)}</td>
                    <td className="py-1.5 text-right">{e.percentualConcluido}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="text-xs text-slate-400 mt-2">* Somente compras e contratos vinculados à etapa.</p>
        </Card>
      )}

      <Card className="p-4">
        {!editando ? (
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-600">
              <p className="font-semibold text-slate-700">Dados da obra</p>
              <p>
                {obra.dataInicio ? new Date(obra.dataInicio + 'T12:00').toLocaleDateString('pt-BR') : 'Sem início'} até{' '}
                {obra.dataFim ? new Date(obra.dataFim + 'T12:00').toLocaleDateString('pt-BR') : 'sem término'}
              </p>
            </div>
            <Button variant="secondary" onClick={() => setEditando(true)}>
              Editar
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Field label="Nome">
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </Field>
            <Field label="Cliente">
              <Input value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })} />
            </Field>
            <Field label="Endereço">
              <Input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Início">
                <Input type="date" value={form.dataInicio} onChange={(e) => setForm({ ...form, dataInicio: e.target.value })} />
              </Field>
              <Field label="Término previsto">
                <Input type="date" value={form.dataFim} onChange={(e) => setForm({ ...form, dataFim: e.target.value })} />
              </Field>
            </div>
            <Field label="Valor do contrato com o cliente (R$)">
              <Input value={form.valorContrato} onChange={(e) => setForm({ ...form, valorContrato: e.target.value })} inputMode="decimal" />
            </Field>
            <div className="flex gap-2">
              <Button onClick={salvar} className="flex-1">
                Salvar
              </Button>
              <Button variant="secondary" onClick={() => setEditando(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
