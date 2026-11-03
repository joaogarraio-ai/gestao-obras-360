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
import { formatBRL, formatNumero } from '../../lib/money'
import { formatDatePt } from '../../lib/dates'
import { enderecoResumido } from '../../lib/formatos'
import FormObra from '../../components/FormObra'
import { STATUS_OBRA_LABEL, TIPO_OBRA_LABEL, type Obra } from '../../lib/types'
import { Button, Card, ProgressBar, Stat } from '../../components/ui'

export default function ResumoTab({ obra }: { obra: Obra }) {
  const { db, updateObra } = useStore()
  const [editando, setEditando] = useState(false)

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
  const cliente = db.clientes.find((c) => c.id === obra.clienteId)

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

      {editando ? (
        <FormObra
          obra={obra}
          onCancelar={() => setEditando(false)}
          onSalvar={(dados) => {
            updateObra(obra.id, dados)
            setEditando(false)
          }}
        />
      ) : (
        <Card className="p-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <p className="font-semibold text-slate-700">Dados da obra</p>
            <Button variant="secondary" className="py-1.5" onClick={() => setEditando(true)}>
              Editar
            </Button>
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {[
              ['Código', obra.codigo],
              ['Situação', obra.status && STATUS_OBRA_LABEL[obra.status]],
              ['Tipo', obra.tipo && TIPO_OBRA_LABEL[obra.tipo]],
              ['Cliente', cliente?.nome ?? obra.cliente],
              ['Contato do cliente', cliente && [cliente.telefone, cliente.email].filter(Boolean).join(' · ')],
              ['Endereço', [enderecoResumido(obra), obra.complemento, obra.cep && `CEP ${obra.cep}`].filter(Boolean).join(' · ')],
              ['Prazo', `${obra.dataInicio ? formatDatePt(obra.dataInicio) : 'sem início'} até ${obra.dataFim ? formatDatePt(obra.dataFim) : 'sem término'}`],
              ['Área construída', obra.areaConstruida ? `${formatNumero(obra.areaConstruida)} m²` : undefined],
              ['Custo orçado por m²', obra.areaConstruida && precoVenda > 0 ? formatBRL(precoVenda / obra.areaConstruida) : undefined],
              ['Responsável técnico', [obra.responsavelTecnico, obra.registroProfissional].filter(Boolean).join(' · ')],
              ['ART / RRT', obra.art],
              ['Alvará', obra.alvara],
              ['Observações', obra.observacao],
            ]
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="min-w-0">
                  <dt className="text-xs text-slate-500">{k}</dt>
                  <dd className="text-slate-800 break-words">{v}</dd>
                </div>
              ))}
          </dl>
          {!obra.cidade && !obra.clienteId && (
            <p className="mt-3 text-xs text-amber-600">Complete o cadastro: cliente, endereço com cidade, prazo e responsável técnico.</p>
          )}
        </Card>
      )}
    </div>
  )
}
