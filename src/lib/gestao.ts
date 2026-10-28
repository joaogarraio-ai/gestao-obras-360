import { fromISODate, toISODate } from './dates'
import { STATUS_DIA_FRACAO } from './types'
import type { CategoriaCusto, ComposicaoBDI, ContratoEmpreiteiro, Database, Etapa, ItemOrcamento, Medicao, MaterialEstoque, MovimentoEstoque, Obra } from './types'
import { BDI_PADRAO } from './types'

// ---------- BDI e orçamento ----------

/** BDI em fração (0.25 = 25%), pela fórmula do TCU: ((1+AC+S+R)(1+DF)(1+L)/(1-I)) - 1 */
export function calcularBDI(b: ComposicaoBDI = BDI_PADRAO): number {
  const p = (v: number) => (Number.isFinite(v) ? v : 0) / 100
  const denominador = 1 - p(b.tributos)
  if (denominador <= 0) return 0
  return ((1 + p(b.administracaoCentral) + p(b.seguroGarantia) + p(b.risco)) * (1 + p(b.despesasFinanceiras)) * (1 + p(b.lucro))) / denominador - 1
}

export function bdiDaObra(obra: Obra | undefined): number {
  return calcularBDI(obra?.bdi ?? BDI_PADRAO)
}

export function totalItem(item: ItemOrcamento): number {
  return item.quantidade * item.custoUnitario
}

export function itensDaObra(db: Database, obraId: string): ItemOrcamento[] {
  return db.itensOrcamento.filter((i) => i.obraId === obraId)
}

export function etapasDaObra(db: Database, obraId: string): Etapa[] {
  return db.etapas.filter((e) => e.obraId === obraId).sort((a, b) => a.ordem - b.ordem)
}

export function custoDiretoEtapa(db: Database, etapaId: string): number {
  return db.itensOrcamento.filter((i) => i.etapaId === etapaId).reduce((acc, i) => acc + totalItem(i), 0)
}

export function custoDiretoObra(db: Database, obraId: string): number {
  return itensDaObra(db, obraId).reduce((acc, i) => acc + totalItem(i), 0)
}

export interface LinhaABC {
  item: ItemOrcamento
  total: number
  percentual: number
  acumulado: number
  classe: 'A' | 'B' | 'C'
}

/** Curva ABC: itens ordenados por valor; A até 80% do custo acumulado, B até 95%, C o restante. */
export function curvaABC(itens: ItemOrcamento[]): LinhaABC[] {
  const total = itens.reduce((acc, i) => acc + totalItem(i), 0)
  if (total <= 0) return []
  let acumulado = 0
  return [...itens]
    .sort((a, b) => totalItem(b) - totalItem(a))
    .map((item) => {
      const t = totalItem(item)
      const anterior = acumulado
      acumulado += t / total
      const classe = anterior < 0.8 ? 'A' : anterior < 0.95 ? 'B' : 'C'
      return { item, total: t, percentual: t / total, acumulado, classe }
    })
}

// ---------- Cronograma físico-financeiro ----------

export interface Mes {
  chave: string // yyyy-mm
  label: string // mmm/aa
  inicio: string
  fim: string
}

export function mesesEntre(inicio: string, fim: string): Mes[] {
  const meses: Mes[] = []
  if (!inicio || !fim || fim < inicio) return meses
  const d = fromISODate(inicio)
  d.setDate(1)
  const limite = fim.slice(0, 7)
  while (toISODate(d).slice(0, 7) <= limite && meses.length < 120) {
    const ini = toISODate(d)
    const ult = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    meses.push({
      chave: ini.slice(0, 7),
      label: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('. de ', '/').replace(' de ', '/'),
      inicio: ini,
      fim: toISODate(ult),
    })
    d.setMonth(d.getMonth() + 1)
  }
  return meses
}

export function diasEntre(inicio: string, fim: string): number {
  return Math.round((fromISODate(fim).getTime() - fromISODate(inicio).getTime()) / 86_400_000) + 1
}

/** Fração da etapa que cai dentro do mês (distribuição linear pelos dias corridos). */
export function fracaoNoMes(etapa: Etapa, mes: Mes): number {
  const ini = etapa.dataInicio > mes.inicio ? etapa.dataInicio : mes.inicio
  const fim = etapa.dataFim < mes.fim ? etapa.dataFim : mes.fim
  if (fim < ini) return 0
  return diasEntre(ini, fim) / diasEntre(etapa.dataInicio, etapa.dataFim)
}

export function periodoDaObra(db: Database, obra: Obra): { inicio: string; fim: string } | null {
  const etapas = etapasDaObra(db, obra.id).filter((e) => e.dataInicio && e.dataFim)
  const inicios = [obra.dataInicio, ...etapas.map((e) => e.dataInicio)].filter(Boolean) as string[]
  const fins = [obra.dataFim, ...etapas.map((e) => e.dataFim)].filter(Boolean) as string[]
  if (inicios.length === 0 || fins.length === 0) return null
  return { inicio: inicios.sort()[0], fim: fins.sort().reverse()[0] }
}

/** Avanço físico da obra: média do % concluído das etapas ponderada pelo custo. */
export function avancoFisicoObra(db: Database, obraId: string): number {
  const etapas = etapasDaObra(db, obraId)
  const pesos = etapas.map((e) => custoDiretoEtapa(db, e.id))
  const total = pesos.reduce((a, b) => a + b, 0)
  if (etapas.length === 0) return 0
  if (total <= 0) return etapas.reduce((acc, e) => acc + e.percentualConcluido, 0) / etapas.length / 100
  return etapas.reduce((acc, e, i) => acc + (e.percentualConcluido / 100) * pesos[i], 0) / total
}

/** Avanço físico previsto para hoje segundo o cronograma, ponderado pelo custo. */
export function avancoPrevistoObra(db: Database, obraId: string, hoje = toISODate(new Date())): number {
  const etapas = etapasDaObra(db, obraId).filter((e) => e.dataInicio && e.dataFim)
  const pesos = etapas.map((e) => custoDiretoEtapa(db, e.id) || 1)
  const total = pesos.reduce((a, b) => a + b, 0)
  if (total <= 0) return 0
  return (
    etapas.reduce((acc, e, i) => {
      if (hoje < e.dataInicio) return acc
      if (hoje >= e.dataFim) return acc + pesos[i]
      return acc + pesos[i] * (diasEntre(e.dataInicio, hoje) / diasEntre(e.dataInicio, e.dataFim))
    }, 0) / total
  )
}

// ---------- Medições ----------

export function valorMedicao(m: Medicao, contrato: ContratoEmpreiteiro | undefined) {
  const bruto = ((contrato?.valorTotal ?? 0) * m.percentualPeriodo) / 100
  const retencao = (bruto * (contrato?.retencaoPercentual ?? 0)) / 100
  return { bruto, retencao, liquido: bruto - retencao }
}

export function percentualMedidoContrato(db: Database, contratoId: string, excetoMedicaoId?: string): number {
  return db.medicoes
    .filter((m) => m.contratoId === contratoId && m.id !== excetoMedicaoId)
    .reduce((acc, m) => acc + m.percentualPeriodo, 0)
}

// ---------- Movimentos financeiros (realizado e previsto) ----------

export type CategoriaRealizado = CategoriaCusto | 'outros'

export const CATEGORIA_REALIZADO_LABEL: Record<CategoriaRealizado, string> = {
  material: 'Material',
  mao_de_obra: 'Mão de obra',
  equipamento: 'Equipamento',
  servico: 'Serviço / empreitada',
  outros: 'Despesas gerais',
}

export interface Movimento {
  data: string
  obraId?: string
  etapaId?: string
  tipo: 'entrada' | 'saida'
  categoria: CategoriaRealizado
  descricao: string
  valor: number
  realizado: boolean
  origem: string
}

/** Junta todos os lançamentos do app num único extrato de entradas e saídas. */
export function movimentos(db: Database): Movimento[] {
  const lista: Movimento[] = []
  const trabalhador = (id?: string) => db.trabalhadores.find((t) => t.id === id)

  for (const c of db.comprasMaterial) {
    lista.push({ data: c.data, obraId: c.obraId, etapaId: c.etapaId, tipo: 'saida', categoria: 'material', descricao: c.descricao, valor: c.valor, realizado: true, origem: 'Materiais' })
  }
  for (const d of db.despesas) {
    lista.push({ data: d.data, obraId: d.obraId, tipo: 'saida', categoria: 'outros', descricao: d.descricao || d.tipo, valor: d.valor, realizado: true, origem: 'Despesas' })
  }
  for (const r of db.registrosDia) {
    const t = trabalhador(r.trabalhadorId)
    const valor = (t?.valorDiaria ?? 0) * STATUS_DIA_FRACAO[r.status]
    if (valor > 0) {
      lista.push({ data: r.data, obraId: r.obraId, tipo: 'saida', categoria: 'mao_de_obra', descricao: `Diária ${t?.nome ?? ''}`.trim(), valor, realizado: true, origem: 'Diárias' })
    }
  }
  for (const p of db.pagamentosTarefa) {
    lista.push({ data: p.data, obraId: p.obraId, tipo: 'saida', categoria: 'mao_de_obra', descricao: p.descricao, valor: p.valor, realizado: true, origem: 'Tarefas' })
  }
  for (const m of db.medicoes) {
    const contrato = db.contratos.find((c) => c.id === m.contratoId)
    if (!contrato || m.status === 'aberta') continue
    const { liquido } = valorMedicao(m, contrato)
    lista.push({
      data: m.status === 'paga' ? (m.dataPagamento ?? m.data) : m.data,
      obraId: contrato.obraId,
      etapaId: contrato.etapaId,
      tipo: 'saida',
      categoria: 'servico',
      descricao: `Medição ${contrato.empreiteiro}`,
      valor: liquido,
      realizado: m.status === 'paga',
      origem: 'Medições',
    })
  }
  for (const s of db.solicitacoesCompra) {
    if (s.status !== 'aprovada') continue
    lista.push({ data: s.dataDecisao ?? s.data, obraId: s.obraId, etapaId: s.etapaId, tipo: 'saida', categoria: 'material', descricao: s.descricao, valor: s.valorEstimado, realizado: false, origem: 'Compra aprovada' })
  }
  for (const l of db.lancamentos) {
    lista.push({
      data: l.pago ? (l.dataPagamento ?? l.vencimento) : l.vencimento,
      obraId: l.obraId,
      tipo: l.tipo === 'receita' ? 'entrada' : 'saida',
      categoria: l.categoria ?? 'outros',
      descricao: l.descricao,
      valor: l.valor,
      realizado: l.pago,
      origem: l.tipo === 'receita' ? 'Contas a receber' : 'Contas a pagar',
    })
  }
  return lista.sort((a, b) => a.data.localeCompare(b.data))
}

export interface OrcadoRealizado {
  categoria: CategoriaRealizado
  orcado: number
  realizado: number
}

/** Compara o custo direto orçado com o gasto realizado da obra, por categoria. */
export function orcadoXRealizado(db: Database, obraId: string): OrcadoRealizado[] {
  const cats: CategoriaRealizado[] = ['material', 'mao_de_obra', 'equipamento', 'servico', 'outros']
  const itens = itensDaObra(db, obraId)
  const movs = movimentos(db).filter((m) => m.obraId === obraId && m.tipo === 'saida' && m.realizado)
  return cats.map((categoria) => ({
    categoria,
    orcado: itens.filter((i) => i.categoria === categoria).reduce((acc, i) => acc + totalItem(i), 0),
    realizado: movs.filter((m) => m.categoria === categoria).reduce((acc, m) => acc + m.valor, 0),
  }))
}

export function realizadoPorEtapa(db: Database, etapaId: string): number {
  return movimentos(db)
    .filter((m) => m.etapaId === etapaId && m.tipo === 'saida' && m.realizado)
    .reduce((acc, m) => acc + m.valor, 0)
}

/** Apaga a obra e tudo que pertence a ela nos módulos de gestão. */
export function removerObraCompleta(db: Database, obraId: string): Database {
  const contratosIds = new Set(db.contratos.filter((c) => c.obraId === obraId).map((c) => c.id))
  return {
    ...db,
    obras: db.obras.filter((o) => o.id !== obraId),
    etapas: db.etapas.filter((x) => x.obraId !== obraId),
    itensOrcamento: db.itensOrcamento.filter((x) => x.obraId !== obraId),
    solicitacoesCompra: db.solicitacoesCompra.filter((x) => x.obraId !== obraId),
    contratos: db.contratos.filter((x) => x.obraId !== obraId),
    medicoes: db.medicoes.filter((x) => !contratosIds.has(x.contratoId)),
    lancamentos: db.lancamentos.filter((x) => x.obraId !== obraId),
    diarios: db.diarios.filter((x) => x.obraId !== obraId),
    movimentosEstoque: db.movimentosEstoque.filter((x) => x.obraId !== obraId && x.obraDestinoId !== obraId),
  }
}

export function formatPercent(fracao: number, casas = 1): string {
  return `${(fracao * 100).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`
}

// ---------- Estoque ----------

export interface SaldoEstoque {
  material: MaterialEstoque
  saldo: number
  /** Custo médio ponderado das entradas nesta obra. */
  custoMedio: number
  consumido: number
  abaixoDoMinimo: boolean
}

/** Quanto o movimento soma (+) ou tira (−) do estoque da obra. */
export function efeitoNoEstoque(m: MovimentoEstoque, obraId: string): number {
  if (m.tipo === 'entrada') return m.obraId === obraId ? m.quantidade : 0
  if (m.tipo === 'saida') return m.obraId === obraId ? -m.quantidade : 0
  if (m.obraId === obraId) return -m.quantidade
  if (m.obraDestinoId === obraId) return m.quantidade
  return 0
}

export function saldoMaterial(db: Database, obraId: string, materialId: string, excetoId?: string): number {
  return db.movimentosEstoque
    .filter((m) => m.materialId === materialId && m.id !== excetoId)
    .reduce((acc, m) => acc + efeitoNoEstoque(m, obraId), 0)
}

export function saldosEstoque(db: Database, obraId: string): SaldoEstoque[] {
  return db.materiaisEstoque
    .map((material) => {
      const movs = db.movimentosEstoque.filter((m) => m.materialId === material.id)
      const saldo = movs.reduce((acc, m) => acc + efeitoNoEstoque(m, obraId), 0)
      const entradas = movs.filter((m) => m.tipo === 'entrada' && m.valorUnitario !== undefined)
      const qtdValorizada = entradas.reduce((a, m) => a + m.quantidade, 0)
      const custoMedio = qtdValorizada > 0 ? entradas.reduce((a, m) => a + m.quantidade * (m.valorUnitario ?? 0), 0) / qtdValorizada : 0
      const consumido = movs.filter((m) => m.tipo === 'saida' && m.obraId === obraId).reduce((a, m) => a + m.quantidade, 0)
      const tocouObra = movs.some((m) => m.obraId === obraId || m.obraDestinoId === obraId)
      return { material, saldo, custoMedio, consumido, abaixoDoMinimo: material.estoqueMinimo !== undefined && saldo < material.estoqueMinimo, tocouObra }
    })
    .filter((s) => s.tocouObra)
    .map(({ tocouObra: _t, ...s }) => s)
    .sort((a, b) => a.material.nome.localeCompare(b.material.nome))
}
