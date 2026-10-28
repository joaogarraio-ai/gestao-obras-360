import { Link } from 'react-router-dom'
import {
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  CalendarCheck,
  ChevronRight,
  ClipboardCheck,
  HardHat,
  Package,
  PackageX,
  Plus,
  Receipt,
  Ruler,
  Truck,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { useStore } from '../lib/store'
import { addDays, formatDatePt, getMondayOfWeek, getWeekRange, toISODate } from '../lib/dates'
import { formatBRL } from '../lib/money'
import { gerarRelatorioSemanal } from '../lib/report'
import { avancoFisicoObra, avancoPrevistoObra, formatPercent, mesesEntre, movimentos, saldosEstoque } from '../lib/gestao'
import { Card, EmptyState, PageTitle, ProgressBar, SectionTitle, Stat } from '../components/ui'

function Atalho({ to, icon: Icon, label }: { to: string; icon: LucideIcon; label: string }) {
  return (
    <Link to={to} className="group">
      <Card className="flex items-center gap-3 p-3.5 hover:border-brand-300 hover:shadow-md">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 group-hover:bg-brand-600 group-hover:text-white transition-colors">
          <Icon className="h-5 w-5" />
        </span>
        <span className="text-sm font-medium text-slate-800">{label}</span>
      </Card>
    </Link>
  )
}

function Pendencia({ to, icon: Icon, tom, titulo, detalhe }: { to: string; icon: LucideIcon; tom: string; titulo: string; detalhe: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-slate-50">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tom}`}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-slate-800 truncate">{titulo}</span>
        <span className="block text-xs text-slate-500 truncate">{detalhe}</span>
      </span>
      <ChevronRight className="h-4 w-4 text-slate-300" />
    </Link>
  )
}

export default function Home() {
  const { db } = useStore()
  const { start, end } = getWeekRange(getMondayOfWeek())
  const relatorio = gerarRelatorioSemanal(db, start, end)
  const hoje = toISODate(new Date())
  const movs = movimentos(db)

  const entradas = movs.filter((m) => m.tipo === 'entrada' && m.realizado).reduce((a, m) => a + m.valor, 0)
  const saidas = movs.filter((m) => m.tipo === 'saida' && m.realizado).reduce((a, m) => a + m.valor, 0)
  const limite30 = addDays(hoje, 30)
  const aPagar30 = movs.filter((m) => m.tipo === 'saida' && !m.realizado && m.data <= limite30).reduce((a, m) => a + m.valor, 0)
  const aReceber30 = movs.filter((m) => m.tipo === 'entrada' && !m.realizado && m.data <= limite30).reduce((a, m) => a + m.valor, 0)

  const obrasAtivas = db.obras.filter((o) => o.ativo)

  // pendências
  const comprasPendentes = db.solicitacoesCompra.filter((s) => s.status === 'pendente')
  const medicoesAbertas = db.medicoes.filter((m) => m.status === 'aberta')
  const contasVencidas = db.lancamentos.filter((l) => !l.pago && l.vencimento < hoje)
  const estoqueBaixo = db.obras.flatMap((o) => saldosEstoque(db, o.id).filter((s) => s.abaixoDoMinimo).map((s) => ({ obra: o, s })))
  const obraDe = (id: string) => db.obras.find((o) => o.id === id)

  // fluxo dos últimos 6 meses
  const meses = mesesEntre(addDays(hoje, -150), hoje).slice(-6)
  const barras = meses.map((m) => {
    const doMes = movs.filter((x) => x.realizado && x.data.slice(0, 7) === m.chave)
    return {
      m,
      e: doMes.filter((x) => x.tipo === 'entrada').reduce((a, x) => a + x.valor, 0),
      s: doMes.filter((x) => x.tipo === 'saida').reduce((a, x) => a + x.valor, 0),
    }
  })
  const max = Math.max(1, ...barras.map((b) => Math.max(b.e, b.s)))

  const h = new Date().getHours()
  const saudacao = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'

  return (
    <div className="space-y-6">
      <PageTitle title={saudacao} subtitle={new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Gastos da semana"
          icon={<HardHat className="h-4 w-4" />}
          value={formatBRL(relatorio.totalGeral)}
          hint={`${formatDatePt(start).slice(0, 5)} a ${formatDatePt(end).slice(0, 5)}`}
        />
        <Stat
          label="Saldo em caixa"
          icon={<Wallet className="h-4 w-4" />}
          value={<span className={entradas - saidas < 0 ? 'text-red-600' : ''}>{formatBRL(entradas - saidas)}</span>}
          hint="Recebido − gasto"
        />
        <Stat
          label="Próximos 30 dias"
          icon={<Receipt className="h-4 w-4" />}
          value={<span className="text-red-600">−{formatBRL(aPagar30)}</span>}
          hint={<span className="text-emerald-600">+{formatBRL(aReceber30)} a receber</span>}
        />
        <Stat label="Obras ativas" icon={<Building2 className="h-4 w-4" />} value={obrasAtivas.length} hint={`${db.trabalhadores.filter((t) => t.ativo).length} trabalhadores`} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Atalho to="/lancar-dias" icon={CalendarCheck} label="Lançar diárias" />
        <Atalho to="/materiais" icon={Package} label="Lançar material" />
        <Atalho to="/despesas" icon={Truck} label="Lançar despesa" />
        <Atalho to="/obras" icon={Plus} label="Nova obra" />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="min-w-0 lg:col-span-3 space-y-6">
          <Card className="p-5">
            <SectionTitle
              action={
                <Link to="/obras" className="text-xs font-medium text-brand-600 hover:underline">
                  Ver todas
                </Link>
              }
            >
              Obras em andamento
            </SectionTitle>
            {obrasAtivas.length === 0 ? (
              <EmptyState text="Nenhuma obra cadastrada." />
            ) : (
              <div className="divide-y divide-slate-100">
                {obrasAtivas.slice(0, 6).map((o) => {
                  const real = avancoFisicoObra(db, o.id)
                  const prev = avancoPrevistoObra(db, o.id)
                  const atrasada = real + 0.05 < prev
                  const gasto = movs.filter((m) => m.obraId === o.id && m.tipo === 'saida' && m.realizado).reduce((a, m) => a + m.valor, 0)
                  return (
                    <Link key={o.id} to={`/obras/${o.id}`} className="flex items-center gap-4 py-3 group">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                        <Building2 className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium text-slate-900 group-hover:text-brand-600">{o.nome}</p>
                          <p className="shrink-0 text-xs text-slate-500 tabular">{formatBRL(gasto)}</p>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <ProgressBar value={real} tone={atrasada ? 'red' : 'amber'} />
                          <span className={`w-9 shrink-0 text-right text-xs font-medium tabular ${atrasada ? 'text-red-600' : 'text-slate-600'}`}>
                            {formatPercent(real, 0)}
                          </span>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <SectionTitle
              action={
                <Link to="/financeiro" className="text-xs font-medium text-brand-600 hover:underline">
                  Financeiro
                </Link>
              }
            >
              Entradas e saídas
            </SectionTitle>
            <div className="flex h-44 items-end gap-3">
              {barras.map((b) => (
                <div key={b.m.chave} className="flex h-full flex-1 flex-col items-center justify-end">
                  <div className="flex w-full flex-1 items-end justify-center gap-1">
                    <div className="w-full max-w-4 rounded-t-md bg-emerald-400" style={{ height: `${(b.e / max) * 100}%` }} title={`Entradas ${formatBRL(b.e)}`} />
                    <div className="w-full max-w-4 rounded-t-md bg-slate-300" style={{ height: `${(b.s / max) * 100}%` }} title={`Saídas ${formatBRL(b.s)}`} />
                  </div>
                  <span className="mt-2 text-[11px] text-slate-500">{b.m.label}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" /> Entradas
              </span>
              <span className="flex items-center gap-1.5">
                <ArrowDownRight className="h-3.5 w-3.5 text-slate-400" /> Saídas
              </span>
            </div>
          </Card>
        </div>

        <div className="min-w-0 lg:col-span-2 space-y-6">
          <Card className="p-5">
            <SectionTitle>Pendências</SectionTitle>
            {comprasPendentes.length + medicoesAbertas.length + contasVencidas.length + estoqueBaixo.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">Nada pendente por aqui.</p>
            ) : (
              <div className="-mx-2">
                {comprasPendentes.slice(0, 3).map((s) => (
                  <Pendencia
                    key={s.id}
                    to={`/obras/${s.obraId}`}
                    icon={ClipboardCheck}
                    tom="bg-amber-50 text-amber-600"
                    titulo={`Aprovar compra: ${s.descricao}`}
                    detalhe={`${obraDe(s.obraId)?.nome ?? ''} · ${formatBRL(s.valorEstimado)}`}
                  />
                ))}
                {medicoesAbertas.slice(0, 3).map((m) => {
                  const c = db.contratos.find((x) => x.id === m.contratoId)
                  return (
                    <Pendencia
                      key={m.id}
                      to={`/obras/${c?.obraId ?? ''}`}
                      icon={Ruler}
                      tom="bg-brand-50 text-brand-600"
                      titulo={`Aprovar medição: ${c?.empreiteiro ?? ''}`}
                      detalhe={`${m.percentualPeriodo}% · ${obraDe(c?.obraId ?? '')?.nome ?? ''}`}
                    />
                  )
                })}
                {contasVencidas.slice(0, 3).map((l) => (
                  <Pendencia
                    key={l.id}
                    to="/financeiro"
                    icon={Receipt}
                    tom="bg-red-50 text-red-600"
                    titulo={`Vencida: ${l.descricao}`}
                    detalhe={`${formatDatePt(l.vencimento)} · ${formatBRL(l.valor)}`}
                  />
                ))}
                {estoqueBaixo.slice(0, 3).map(({ obra, s }) => (
                  <Pendencia
                    key={obra.id + s.material.id}
                    to={`/obras/${obra.id}`}
                    icon={PackageX}
                    tom="bg-orange-50 text-orange-600"
                    titulo={`Estoque baixo: ${s.material.nome}`}
                    detalhe={`${obra.nome} · restam ${s.saldo} ${s.material.unidade}`}
                  />
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <SectionTitle
              action={
                <Link to="/relatorio" className="text-xs font-medium text-brand-600 hover:underline">
                  Relatório
                </Link>
              }
            >
              Semana atual
            </SectionTitle>
            <div className="space-y-3">
              {[
                { label: 'Mão de obra', v: relatorio.totalMaoDeObra, cor: 'bg-brand-500' },
                { label: 'Materiais', v: relatorio.totalMateriais, cor: 'bg-emerald-500' },
                { label: 'Despesas', v: relatorio.totalDespesas, cor: 'bg-orange-400' },
              ].map((x) => (
                <div key={x.label}>
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-2 text-slate-600">
                      <span className={`h-2 w-2 rounded-full ${x.cor}`} />
                      {x.label}
                    </span>
                    <span className="font-medium text-slate-900 tabular">{formatBRL(x.v)}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${x.cor}`} style={{ width: `${relatorio.totalGeral > 0 ? (x.v / relatorio.totalGeral) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
              <div className="flex justify-between border-t border-slate-100 pt-3 text-sm">
                <span className="text-slate-500">PIX {formatBRL(relatorio.totalPix)} · Dinheiro {formatBRL(relatorio.totalDinheiro)}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
