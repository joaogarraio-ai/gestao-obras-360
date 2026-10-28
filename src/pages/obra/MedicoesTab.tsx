import { Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useStore } from '../../lib/store'
import { etapasDaObra, formatPercent, percentualMedidoContrato, valorMedicao } from '../../lib/gestao'
import { formatDatePt, toISODate } from '../../lib/dates'
import { formatBRL, numeroParaInput, parseMoneyInput } from '../../lib/money'
import { STATUS_MEDICAO_LABEL } from '../../lib/types'
import type { ContratoEmpreiteiro, Obra, StatusMedicao } from '../../lib/types'
import { Badge, Button, Card, EmptyState, Field, Input, ProgressBar, Select } from '../../components/ui'

const TONE: Record<StatusMedicao, 'amber' | 'green' | 'default'> = { aberta: 'amber', aprovada: 'green', paga: 'default' }

export default function MedicoesTab({ obra }: { obra: Obra }) {
  const { db, addItem, updateItem, removeItem } = useStore()
  const etapas = etapasDaObra(db, obra.id)
  const contratos = db.contratos.filter((c) => c.obraId === obra.id)
  const [formContrato, setFormContrato] = useState<null | { id?: string; empreiteiro: string; descricao: string; valorTotal: string; retencao: string; etapaId: string }>(null)
  const [medindo, setMedindo] = useState<null | { contrato: ContratoEmpreiteiro; percentual: string; data: string; observacao: string }>(null)

  function salvarContrato() {
    if (!formContrato || !formContrato.empreiteiro.trim()) return
    const dados = {
      obraId: obra.id,
      empreiteiro: formContrato.empreiteiro.trim(),
      descricao: formContrato.descricao.trim(),
      valorTotal: parseMoneyInput(formContrato.valorTotal),
      retencaoPercentual: parseMoneyInput(formContrato.retencao),
      etapaId: formContrato.etapaId || undefined,
    }
    if (formContrato.id) updateItem('contratos', formContrato.id, dados)
    else addItem('contratos', dados)
    setFormContrato(null)
  }

  function salvarMedicao() {
    if (!medindo) return
    const pct = parseMoneyInput(medindo.percentual)
    const jaMedido = percentualMedidoContrato(db, medindo.contrato.id)
    if (pct <= 0) return
    if (jaMedido + pct > 100.0001) {
      alert(`Esta medição passa de 100% do contrato (já medido ${jaMedido}%).`)
      return
    }
    addItem('medicoes', {
      contratoId: medindo.contrato.id,
      data: medindo.data,
      percentualPeriodo: pct,
      status: 'aberta',
      observacao: medindo.observacao.trim() || undefined,
    })
    setMedindo(null)
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">
        Cadastre os contratos de empreitada e meça o avanço de cada um. Medições aprovadas entram como contas a pagar; pagas entram no realizado.
      </p>

      {!formContrato && (
        <Button className="w-full sm:w-auto" onClick={() => setFormContrato({ empreiteiro: '', descricao: '', valorTotal: '', retencao: '5', etapaId: '' })}>
          + Novo contrato de empreiteiro
        </Button>
      )}

      {formContrato && (
        <Card className="p-4 space-y-3 border-brand-400">
          <Field label="Empreiteiro">
            <Input value={formContrato.empreiteiro} onChange={(e) => setFormContrato({ ...formContrato, empreiteiro: e.target.value })} />
          </Field>
          <Field label="Serviço contratado">
            <Input value={formContrato.descricao} onChange={(e) => setFormContrato({ ...formContrato, descricao: e.target.value })} placeholder="Ex: Mão de obra de alvenaria" />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Valor do contrato (R$)">
              <Input value={formContrato.valorTotal} onChange={(e) => setFormContrato({ ...formContrato, valorTotal: e.target.value })} inputMode="decimal" />
            </Field>
            <Field label="Retenção (%)">
              <Input value={formContrato.retencao} onChange={(e) => setFormContrato({ ...formContrato, retencao: e.target.value })} inputMode="decimal" />
            </Field>
          </div>
          <Field label="Etapa (opcional)">
            <Select value={formContrato.etapaId} onChange={(e) => setFormContrato({ ...formContrato, etapaId: e.target.value })}>
              <option value="">—</option>
              {etapas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex gap-2">
            <Button onClick={salvarContrato} className="flex-1">
              Salvar
            </Button>
            <Button variant="secondary" onClick={() => setFormContrato(null)}>
              Cancelar
            </Button>
          </div>
        </Card>
      )}

      {medindo && (
        <Card className="p-4 space-y-3 border-green-400">
          <p className="font-semibold text-slate-700">Nova medição: {medindo.contrato.empreiteiro}</p>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Data">
              <Input type="date" value={medindo.data} onChange={(e) => setMedindo({ ...medindo, data: e.target.value })} />
            </Field>
            <Field label="% executado no período">
              <Input value={medindo.percentual} onChange={(e) => setMedindo({ ...medindo, percentual: e.target.value })} inputMode="decimal" />
            </Field>
          </div>
          <p className="text-sm text-slate-600">
            Valor bruto {formatBRL((medindo.contrato.valorTotal * parseMoneyInput(medindo.percentual)) / 100)} · já medido{' '}
            {percentualMedidoContrato(db, medindo.contrato.id)}%
          </p>
          <Field label="Observação">
            <Input value={medindo.observacao} onChange={(e) => setMedindo({ ...medindo, observacao: e.target.value })} />
          </Field>
          <div className="flex gap-2">
            <Button onClick={salvarMedicao} className="flex-1">
              Registrar medição
            </Button>
            <Button variant="secondary" onClick={() => setMedindo(null)}>
              Cancelar
            </Button>
          </div>
        </Card>
      )}

      {contratos.length === 0 && !formContrato && <EmptyState text="Nenhum contrato de empreiteiro nesta obra." />}

      {contratos.map((c) => {
        const medicoes = db.medicoes.filter((m) => m.contratoId === c.id).sort((a, b) => a.data.localeCompare(b.data))
        const medido = percentualMedidoContrato(db, c.id)
        const pago = medicoes.filter((m) => m.status === 'paga').reduce((a, m) => a + valorMedicao(m, c).liquido, 0)
        const retido = medicoes.filter((m) => m.status !== 'aberta').reduce((a, m) => a + valorMedicao(m, c).retencao, 0)
        return (
          <Card key={c.id} className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-slate-800">{c.empreiteiro}</p>
                <p className="text-xs text-slate-500">
                  {c.descricao}
                  {etapas.find((e) => e.id === c.etapaId) ? ` · ${etapas.find((e) => e.id === c.etapaId)?.nome}` : ''}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-semibold text-slate-800 whitespace-nowrap">{formatBRL(c.valorTotal)}</p>
                <p className="text-xs text-slate-500">Retenção {c.retencaoPercentual}%</p>
              </div>
            </div>
            <div className="mt-2">
              <div className="flex justify-between text-xs text-slate-600 mb-1">
                <span>Medido {formatPercent(medido / 100, 0)}</span>
                <span>
                  Pago {formatBRL(pago)} · Retido {formatBRL(retido)}
                </span>
              </div>
              <ProgressBar value={medido / 100} />
            </div>

            {medicoes.length > 0 && (
              <div className="mt-3 divide-y divide-slate-100">
                {medicoes.map((m, i) => {
                  const v = valorMedicao(m, c)
                  return (
                    <div key={m.id} className="py-2 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-slate-800">
                            {i + 1}ª medição · {formatDatePt(m.data)} · {m.percentualPeriodo}%
                          </p>
                          <p className="text-xs text-slate-500">
                            Bruto {formatBRL(v.bruto)} − retenção {formatBRL(v.retencao)} = <b>{formatBRL(v.liquido)}</b>
                            {m.observacao ? ` · ${m.observacao}` : ''}
                          </p>
                        </div>
                        <Badge tone={TONE[m.status]}>{STATUS_MEDICAO_LABEL[m.status]}</Badge>
                      </div>
                      <div className="flex gap-2 mt-1">
                        {m.status === 'aberta' && (
                          <Button variant="secondary" className="py-1.5" onClick={() => updateItem('medicoes', m.id, { status: 'aprovada' })}>
                            Aprovar
                          </Button>
                        )}
                        {m.status === 'aprovada' && (
                          <Button
                            variant="secondary"
                            className="py-1.5"
                            onClick={() => updateItem('medicoes', m.id, { status: 'paga', dataPagamento: toISODate(new Date()) })}
                          >
                            Marcar como paga
                          </Button>
                        )}
                        {m.status !== 'paga' && (
                          <Button
                            variant="ghost"
                            className="py-1.5"
                            onClick={() => {
                              if (confirm('Excluir esta medição?')) removeItem('medicoes', m.id)
                            }}
                          >
                            Excluir
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="flex gap-2 mt-2">
              {medido < 100 && (
                <Button
                  className="flex-1"
                  onClick={() => setMedindo({ contrato: c, percentual: '', data: toISODate(new Date()), observacao: '' })}
                >
                  + Medição
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={() =>
                  setFormContrato({
                    id: c.id,
                    empreiteiro: c.empreiteiro,
                    descricao: c.descricao,
                    valorTotal: numeroParaInput(c.valorTotal),
                    retencao: numeroParaInput(c.retencaoPercentual),
                    etapaId: c.etapaId ?? '',
                  })
                }
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  if (!confirm(`Excluir o contrato de ${c.empreiteiro} e suas medições?`)) return
                  medicoes.forEach((m) => removeItem('medicoes', m.id))
                  removeItem('contratos', c.id)
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
