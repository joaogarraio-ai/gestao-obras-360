import { CheckCircle2, Download, Paperclip, Pencil, Search, Trash2 } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { useStore } from '../lib/store'
import { toISODate, formatDatePt } from '../lib/dates'
import { etapasDaObra } from '../lib/gestao'
import { baixarPlanilha } from '../lib/exportar'
import { generateId } from '../lib/id'
import { removerAnexosDe } from '../lib/anexos'
import Anexos from '../components/Anexos'
import { formatBRL, numeroParaInput, parseMoneyInput } from '../lib/money'
import {
  FORMA_PAGAMENTO_DESPESA_LABEL,
  GRUPOS_DESPESA,
  TIPO_DESPESA_LABEL,
  grupoDaDespesa,
  type Despesa,
  type FormaPagamentoDespesa,
  type TipoDespesa,
} from '../lib/types'
import { Badge, Button, Card, EmptyState, Field, Input, PageTitle, Select, Stat, TextArea } from '../components/ui'

interface FormState {
  data: string
  tipo: TipoDespesa
  obraId: string
  etapaId: string
  descricao: string
  valor: string
  fornecedorId: string
  favorecido: string
  formaPagamento: FormaPagamentoDespesa | ''
  documento: string
  pago: boolean
  vencimento: string
  observacao: string
  contaId: string
}

type Periodo = 'mes' | 'mes_anterior' | '30d' | 'ano' | 'tudo'
const PERIODO_LABEL: Record<Periodo, string> = {
  mes: 'Este mês',
  mes_anterior: 'Mês passado',
  '30d': 'Últimos 30 dias',
  ano: 'Este ano',
  tudo: 'Todo o período',
}
type Situacao = 'todas' | 'pagas' | 'a_pagar'

function intervalo(p: Periodo): [string, string] {
  const hoje = new Date()
  const y = hoje.getFullYear()
  const m = hoje.getMonth()
  const iso = (d: Date) => toISODate(d)
  if (p === 'mes') return [iso(new Date(y, m, 1)), iso(new Date(y, m + 1, 0))]
  if (p === 'mes_anterior') return [iso(new Date(y, m - 1, 1)), iso(new Date(y, m, 0))]
  if (p === '30d') return [iso(new Date(y, m, hoje.getDate() - 30)), iso(hoje)]
  if (p === 'ano') return [`${y}-01-01`, `${y}-12-31`]
  return ['0000-01-01', '9999-12-31']
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{titulo}</p>
      {children}
    </div>
  )
}

/** Data que vale para filtrar: a do pagamento, ou o vencimento de uma conta ainda aberta. */
const dataRef = (d: Despesa) => (d.pago === false ? (d.vencimento ?? d.data) : d.data)

export default function Despesas() {
  const { db, addDespesa, updateDespesa, removeDespesa } = useStore()
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [idForm, setIdForm] = useState(() => generateId())
  const [comprovante, setComprovante] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [filtroObra, setFiltroObra] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [situacao, setSituacao] = useState<Situacao>('todas')
  const [busca, setBusca] = useState('')
  const hoje = toISODate(new Date())

  const formVazio = (): FormState => ({
    data: hoje,
    tipo: 'gasolina',
    obraId: db.obras.length === 1 ? db.obras[0].id : '',
    etapaId: '',
    descricao: '',
    valor: '',
    fornecedorId: '',
    favorecido: '',
    formaPagamento: 'pix',
    documento: '',
    pago: true,
    vencimento: '',
    observacao: '',
    contaId: '',
  })
  const [form, setForm] = useState<FormState>(formVazio)
  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }))

  function iniciarNovo() {
    setEditandoId(null)
    setIdForm(generateId())
    setForm(formVazio())
    setErro(null)
    setMostrarForm(true)
  }

  function iniciarEdicao(d: Despesa) {
    setEditandoId(d.id)
    setIdForm(d.id)
    setErro(null)
    setForm({
      data: d.data,
      tipo: d.tipo in TIPO_DESPESA_LABEL ? d.tipo : 'outro',
      obraId: d.obraId ?? '',
      etapaId: d.etapaId ?? '',
      descricao: d.descricao,
      valor: numeroParaInput(d.valor),
      fornecedorId: d.fornecedorId ?? '',
      favorecido: d.favorecido ?? '',
      formaPagamento: d.formaPagamento ?? '',
      documento: d.documento ?? '',
      pago: d.pago !== false,
      vencimento: d.vencimento ?? '',
      observacao: d.observacao ?? '',
      contaId: d.contaId ?? '',
    })
    setMostrarForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function salvar() {
    const valor = parseMoneyInput(form.valor)
    if (valor <= 0) return setErro('Informe o valor da despesa.')
    if (!form.pago && !form.vencimento) return setErro('Informe o vencimento da conta a pagar.')
    const dados: Omit<Despesa, 'id'> = {
      data: form.data || hoje,
      tipo: form.tipo,
      obraId: form.obraId || undefined,
      etapaId: (form.obraId && form.etapaId) || undefined,
      descricao: form.descricao.trim() || TIPO_DESPESA_LABEL[form.tipo],
      valor,
      fornecedorId: form.fornecedorId || undefined,
      favorecido: form.fornecedorId ? undefined : form.favorecido.trim() || undefined,
      formaPagamento: form.formaPagamento || undefined,
      documento: form.documento.trim() || undefined,
      pago: form.pago,
      vencimento: form.pago ? undefined : form.vencimento,
      observacao: form.observacao.trim() || undefined,
      contaId: form.contaId || undefined,
    }
    if (editandoId) updateDespesa(editandoId, dados)
    else addDespesa({ ...dados, id: idForm })
    setMostrarForm(false)
    setEditandoId(null)
  }

  function marcarPaga(d: Despesa) {
    updateDespesa(d.id, {
      pago: true,
      data: hoje,
      vencimento: d.vencimento ?? d.data,
    })
  }

  const nomeObra = (id?: string) => (id ? (db.obras.find((o) => o.id === id)?.nome ?? '—') : 'Sem obra (geral)')
  const quemRecebeu = (d: Despesa) => (d.fornecedorId ? db.fornecedores.find((f) => f.id === d.fornecedorId)?.nome : d.favorecido)

  const [inicio, fim] = intervalo(periodo)
  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return db.despesas
      .filter((d) => {
        const ref = dataRef(d)
        if (ref < inicio || ref > fim) return false
        if (filtroObra === '__geral' ? d.obraId : filtroObra && d.obraId !== filtroObra) return false
        if (filtroTipo && d.tipo !== filtroTipo) return false
        if (situacao === 'pagas' && d.pago === false) return false
        if (situacao === 'a_pagar' && d.pago !== false) return false
        if (termo) {
          const texto = [d.descricao, d.documento, d.favorecido, d.observacao, quemRecebeu(d), TIPO_DESPESA_LABEL[d.tipo]].join(' ').toLowerCase()
          if (!texto.includes(termo)) return false
        }
        return true
      })
      .sort((a, b) => dataRef(b).localeCompare(dataRef(a)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db.despesas, db.fornecedores, inicio, fim, filtroObra, filtroTipo, situacao, busca])

  const total = filtradas.reduce((a, d) => a + d.valor, 0)
  const pagas = filtradas.filter((d) => d.pago !== false).reduce((a, d) => a + d.valor, 0)
  const aPagar = total - pagas
  const vencidas = filtradas.filter((d) => d.pago === false && (d.vencimento ?? d.data) < hoje)

  const porGrupo = GRUPOS_DESPESA.map((g) => ({
    nome: g.nome,
    valor: filtradas.filter((d) => g.tipos.includes(d.tipo)).reduce((a, d) => a + d.valor, 0),
  }))
    .filter((g) => g.valor > 0)
    .sort((a, b) => b.valor - a.valor)

  function exportar() {
    baixarPlanilha(
      `despesas-${inicio}-a-${fim}`,
      ['Data', 'Vencimento', 'Situação', 'Grupo', 'Categoria', 'Descrição', 'Obra', 'Fornecedor / favorecido', 'Forma de pagamento', 'Documento', 'Valor'],
      filtradas.map((d) => [
        formatDatePt(d.data),
        d.vencimento ? formatDatePt(d.vencimento) : '',
        d.pago === false ? 'A pagar' : 'Paga',
        grupoDaDespesa(d.tipo),
        TIPO_DESPESA_LABEL[d.tipo] ?? d.tipo,
        d.descricao,
        nomeObra(d.obraId),
        quemRecebeu(d) ?? '',
        d.formaPagamento ? FORMA_PAGAMENTO_DESPESA_LABEL[d.formaPagamento] : '',
        d.documento ?? '',
        d.valor,
      ]),
    )
  }

  const etapas = form.obraId ? etapasDaObra(db, form.obraId) : []

  return (
    <div>
      <PageTitle
        title="Despesas"
        subtitle="Todos os gastos da empresa e das obras: combustível, aluguel de equipamento, alimentação, taxas, impostos e mais"
        actions={
          !mostrarForm && (
            <Button onClick={iniciarNovo} className="w-full sm:w-auto">
              + Nova despesa
            </Button>
          )
        }
      />

      {mostrarForm && (
        <Card className="p-4 space-y-5 mb-4 border-brand-300">
          <Secao titulo={editandoId ? 'Editar despesa' : 'Nova despesa'}>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_10rem] gap-2">
              <Field label="Categoria *">
                <Select value={form.tipo} onChange={(e) => set({ tipo: e.target.value as TipoDespesa })}>
                  {GRUPOS_DESPESA.map((g) => (
                    <optgroup key={g.nome} label={g.nome}>
                      {g.tipos.map((t) => (
                        <option key={t} value={t}>
                          {TIPO_DESPESA_LABEL[t]}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </Select>
              </Field>
              <Field label="Valor (R$) *">
                <Input value={form.valor} onChange={(e) => set({ valor: e.target.value })} placeholder="0,00" inputMode="decimal" autoFocus />
              </Field>
            </div>
            <Field label="Descrição">
              <Input
                value={form.descricao}
                onChange={(e) => set({ descricao: e.target.value })}
                placeholder={`Ex: ${TIPO_DESPESA_LABEL[form.tipo]} da semana`}
              />
            </Field>
          </Secao>

          <Secao titulo="Onde entra o custo">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Field label="Obra">
                <Select value={form.obraId} onChange={(e) => set({ obraId: e.target.value, etapaId: '' })}>
                  <option value="">Sem obra (despesa geral da empresa)</option>
                  {db.obras.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.nome}
                    </option>
                  ))}
                </Select>
              </Field>
              {etapas.length > 0 && (
                <Field label="Etapa da obra">
                  <Select value={form.etapaId} onChange={(e) => set({ etapaId: e.target.value })}>
                    <option value="">—</option>
                    {etapas.map((et) => (
                      <option key={et.id} value={et.id}>
                        {et.nome}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
            </div>
          </Secao>

          <Secao titulo="Pagamento">
            <div className="flex gap-2">
              {[
                { v: true, l: 'Já paguei' },
                { v: false, l: 'Conta a pagar' },
              ].map((o) => (
                <button
                  key={o.l}
                  type="button"
                  onClick={() => set({ pago: o.v })}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${form.pago === o.v ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600'}`}
                >
                  {o.l}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <Field label={form.pago ? 'Data do pagamento' : 'Data da compra'}>
                <Input type="date" value={form.data} onChange={(e) => set({ data: e.target.value })} />
              </Field>
              {!form.pago && (
                <Field label="Vencimento *">
                  <Input type="date" value={form.vencimento} onChange={(e) => set({ vencimento: e.target.value })} />
                </Field>
              )}
              <Field label="Forma de pagamento">
                <Select
                  value={form.formaPagamento}
                  onChange={(e) =>
                    set({
                      formaPagamento: e.target.value as FormaPagamentoDespesa | '',
                    })
                  }
                >
                  <option value="">—</option>
                  {Object.entries(FORMA_PAGAMENTO_DESPESA_LABEL).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </Select>
              </Field>
              {db.contasBancarias.some((c) => c.ativo) && (
                <Field label="Conta / caixa">
                  <Select value={form.contaId} onChange={(e) => set({ contaId: e.target.value })}>
                    <option value="">—</option>
                    {db.contasBancarias
                      .filter((c) => c.ativo)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome}
                        </option>
                      ))}
                  </Select>
                </Field>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Field label="Fornecedor">
                <Select value={form.fornecedorId} onChange={(e) => set({ fornecedorId: e.target.value })}>
                  <option value="">Outro (digitar ao lado)</option>
                  {db.fornecedores.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome}
                    </option>
                  ))}
                </Select>
              </Field>
              {!form.fornecedorId && (
                <Field label="Pago a">
                  <Input value={form.favorecido} onChange={(e) => set({ favorecido: e.target.value })} placeholder="Ex: Posto Shell, Restaurante da Maria" />
                </Field>
              )}
              <Field label="Nº da nota / cupom / recibo">
                <Input value={form.documento} onChange={(e) => set({ documento: e.target.value })} />
              </Field>
            </div>
            <Field label="Observações">
              <TextArea value={form.observacao} onChange={(e) => set({ observacao: e.target.value })} />
            </Field>
          </Secao>

          <Secao titulo="Comprovante (foto do cupom, nota ou recibo)">
            <Anexos refColecao="despesas" refId={idForm} compacto />
          </Secao>

          {erro && <p className="text-sm text-red-600">{erro}</p>}
          <div className="flex gap-2">
            <Button onClick={salvar} className="flex-1">
              {editandoId ? 'Salvar alterações' : 'Lançar despesa'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                if (!editandoId) void removerAnexosDe('despesas', idForm)
                setMostrarForm(false)
              }}
            >
              Cancelar
            </Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <Stat label={`Total · ${PERIODO_LABEL[periodo].toLowerCase()}`} value={formatBRL(total)} hint={`${filtradas.length} lançamento(s)`} />
        <Stat label="Pago" value={<span className="text-green-700">{formatBRL(pagas)}</span>} />
        <Stat
          label="A pagar"
          value={<span className={aPagar > 0 ? 'text-amber-600' : ''}>{formatBRL(aPagar)}</span>}
          hint={vencidas.length > 0 ? <span className="text-red-600">{vencidas.length} vencida(s)</span> : undefined}
        />
      </div>

      <Card className="p-3 mb-4 space-y-2">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Select value={periodo} onChange={(e) => setPeriodo(e.target.value as Periodo)} aria-label="Período">
            {Object.entries(PERIODO_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
          <Select value={filtroObra} onChange={(e) => setFiltroObra(e.target.value)} aria-label="Obra">
            <option value="">Todas as obras</option>
            <option value="__geral">Só despesas gerais</option>
            {db.obras.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nome}
              </option>
            ))}
          </Select>
          <Select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} aria-label="Categoria">
            <option value="">Todas as categorias</option>
            {GRUPOS_DESPESA.map((g) => (
              <optgroup key={g.nome} label={g.nome}>
                {g.tipos.map((t) => (
                  <option key={t} value={t}>
                    {TIPO_DESPESA_LABEL[t]}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
          <Select value={situacao} onChange={(e) => setSituacao(e.target.value as Situacao)} aria-label="Situação">
            <option value="todas">Pagas e a pagar</option>
            <option value="pagas">Só pagas</option>
            <option value="a_pagar">Só a pagar</option>
          </Select>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por descrição, fornecedor, nota..." className="pl-9" />
          </div>
          <Button variant="secondary" onClick={exportar} disabled={filtradas.length === 0}>
            <Download className="h-4 w-4" /> Excel
          </Button>
        </div>
      </Card>

      {porGrupo.length > 0 && (
        <Card className="p-4 mb-4">
          <p className="text-sm font-semibold text-slate-700 mb-3">Para onde foi o dinheiro</p>
          <div className="space-y-2">
            {porGrupo.map((g) => (
              <div key={g.nome}>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-700">{g.nome}</span>
                  <span className="font-medium text-slate-900 tabular">
                    {formatBRL(g.valor)} <span className="text-xs text-slate-400">({Math.round((g.valor / total) * 100)}%)</span>
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 mt-1">
                  <div className="h-2 rounded-full bg-brand-500" style={{ width: `${(g.valor / total) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {filtradas.length === 0 && !mostrarForm && (
        <EmptyState text={db.despesas.length === 0 ? 'Nenhuma despesa lançada ainda.' : 'Nenhuma despesa com esses filtros.'} />
      )}

      <div className="space-y-2">
        {filtradas.map((d) => {
          const aberta = d.pago === false
          const vencida = aberta && (d.vencimento ?? d.data) < hoje
          const recebeu = quemRecebeu(d)
          return (
            <Card key={d.id} className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 truncate">{d.descricao}</p>
                  <p className="text-xs text-slate-500">
                    {[
                      aberta ? `vence ${formatDatePt(d.vencimento ?? d.data)}` : formatDatePt(d.data),
                      TIPO_DESPESA_LABEL[d.tipo] ?? d.tipo,
                      nomeObra(d.obraId),
                      recebeu,
                      d.formaPagamento && FORMA_PAGAMENTO_DESPESA_LABEL[d.formaPagamento],
                      d.documento && `doc. ${d.documento}`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold text-slate-900 whitespace-nowrap tabular">{formatBRL(d.valor)}</p>
                  {aberta && <Badge tone={vencida ? 'red' : 'amber'}>{vencida ? 'Vencida' : 'A pagar'}</Badge>}
                </div>
              </div>
              <div className="flex items-center gap-1 mt-1">
                {aberta && (
                  <Button variant="secondary" className="py-1 text-xs" onClick={() => marcarPaga(d)}>
                    <CheckCircle2 className="h-4 w-4" /> Marcar como paga
                  </Button>
                )}
                <div className="ml-auto flex">
                  <Button variant="ghost" onClick={() => setComprovante(comprovante === d.id ? null : d.id)} className="px-2" aria-label="Comprovante">
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" onClick={() => iniciarEdicao(d)} className="px-2" aria-label="Editar">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      if (confirm('Remover esta despesa?')) {
                        removeDespesa(d.id)
                        void removerAnexosDe('despesas', d.id)
                      }
                    }}
                    className="px-2"
                    aria-label="Remover"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {comprovante === d.id && (
                <div className="mt-2 border-t border-slate-100 pt-2">
                  <Anexos refColecao="despesas" refId={d.id} titulo="Comprovante" />
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
