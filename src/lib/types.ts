export type FormaPagamento = 'pix' | 'dinheiro'

export interface Trabalhador {
  id: string
  nome: string
  funcao: string
  valorDiaria: number
  formaPagamento: FormaPagamento
  chavePix?: string
  ativo: boolean
  observacao?: string
}

export interface Obra {
  id: string
  nome: string
  ativo: boolean
}

export interface Fornecedor {
  id: string
  nome: string
  cidade?: string
  ativo: boolean
}

export type StatusDia = 'dia_completo' | 'meio_dia' | 'falta'

export interface RegistroDia {
  id: string
  trabalhadorId: string
  obraId: string
  data: string // yyyy-mm-dd
  status: StatusDia
  observacao?: string
}

export type TipoDespesa = 'gasolina' | 'frete' | 'outro'

export interface CompraMaterial {
  id: string
  data: string // yyyy-mm-dd
  fornecedorId: string
  obraId: string
  descricao: string
  valor: number
  numeroNota?: string
}

export interface Despesa {
  id: string
  data: string // yyyy-mm-dd
  tipo: TipoDespesa
  obraId?: string
  descricao: string
  valor: number
}

/** Pagamento fixo por serviço/tarefa (empreitada), diferente da diária por dia trabalhado. */
export interface PagamentoTarefa {
  id: string
  data: string // yyyy-mm-dd
  trabalhadorId?: string // preenchido se for alguém já cadastrado
  nomeAvulso?: string // preenchido se for alguém não cadastrado (ajudante avulso)
  obraId: string
  descricao: string
  valor: number
  formaPagamento: FormaPagamento
  chavePix?: string
}

export interface Database {
  trabalhadores: Trabalhador[]
  obras: Obra[]
  fornecedores: Fornecedor[]
  registrosDia: RegistroDia[]
  comprasMaterial: CompraMaterial[]
  despesas: Despesa[]
  pagamentosTarefa: PagamentoTarefa[]
}

export const FUNCOES_SUGERIDAS = [
  'Mestre de obra',
  'Pedreiro',
  'Servente',
  'Ajudante',
  'Carpinteiro',
  'Eletricista',
  'Pintor',
  'Encanador',
] as const

export const STATUS_DIA_LABEL: Record<StatusDia, string> = {
  dia_completo: 'Dia completo',
  meio_dia: 'Meio dia',
  falta: 'Falta',
}

export const STATUS_DIA_FRACAO: Record<StatusDia, number> = {
  dia_completo: 1,
  meio_dia: 0.5,
  falta: 0,
}

export const TIPO_DESPESA_LABEL: Record<TipoDespesa, string> = {
  gasolina: 'Gasolina',
  frete: 'Frete',
  outro: 'Outro',
}
