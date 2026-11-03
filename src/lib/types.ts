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
  cpf?: string
  telefone?: string
  cidade?: string
  dataAdmissao?: string // yyyy-mm-dd
}

/** Endereço no padrão brasileiro (preenchido pelo CEP quando possível). */
export interface Endereco {
  cep?: string
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade?: string
  uf?: string
}

export type TipoPessoa = 'pf' | 'pj'

export interface Cliente extends Endereco {
  id: string
  nome: string
  tipoPessoa: TipoPessoa
  /** CPF ou CNPJ. */
  documento?: string
  telefone?: string
  email?: string
  contato?: string
  observacao?: string
  ativo: boolean
}

export type TipoObra = 'residencial' | 'comercial' | 'industrial' | 'reforma' | 'infraestrutura' | 'rural' | 'outra'
export type StatusObra = 'orcamento' | 'andamento' | 'paralisada' | 'concluida'

export interface Obra extends Endereco {
  id: string
  nome: string
  ativo: boolean
  codigo?: string
  clienteId?: string
  /** Nome do cliente digitado antes do cadastro de clientes existir. */
  cliente?: string
  /** Endereço livre antigo; os campos novos (logradouro, cidade...) vêm do tipo Endereco. */
  endereco?: string
  tipo?: TipoObra
  status?: StatusObra
  areaConstruida?: number // m²
  responsavelTecnico?: string
  registroProfissional?: string // CREA / CAU
  art?: string // ART / RRT
  alvara?: string
  observacao?: string
  dataInicio?: string // yyyy-mm-dd
  dataFim?: string // yyyy-mm-dd
  /** Valor do contrato com o cliente (receita prevista). */
  valorContrato?: number
  bdi?: ComposicaoBDI
}

/** Percentuais (ex: 4 = 4%) usados na fórmula do BDI do TCU (Acórdão 2622/2013). */
export interface ComposicaoBDI {
  administracaoCentral: number
  seguroGarantia: number
  risco: number
  despesasFinanceiras: number
  lucro: number
  /** PIS + COFINS + ISS + CPRB, sobre o preço de venda. */
  tributos: number
}

export type CategoriaFornecedor = 'material' | 'servico' | 'equipamento' | 'outro'

export interface Fornecedor extends Endereco {
  id: string
  nome: string
  ativo: boolean
  categoria?: CategoriaFornecedor
  tipoPessoa?: TipoPessoa
  documento?: string // CPF ou CNPJ
  telefone?: string
  email?: string
  contato?: string
  chavePix?: string
  observacao?: string
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
  etapaId?: string
  solicitacaoId?: string
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

export type CategoriaCusto = 'material' | 'mao_de_obra' | 'equipamento' | 'servico'

/** Etapa da obra: agrupa itens do orçamento e é a linha do cronograma. */
export interface Etapa {
  id: string
  obraId: string
  nome: string
  ordem: number
  dataInicio: string // yyyy-mm-dd
  dataFim: string // yyyy-mm-dd
  /** Avanço físico real, 0 a 100. */
  percentualConcluido: number
}

export interface ItemOrcamento {
  id: string
  obraId: string
  etapaId: string
  codigo?: string // ex: código SINAPI
  descricao: string
  unidade: string
  quantidade: number
  /** Custo direto unitário, sem BDI. */
  custoUnitario: number
  categoria: CategoriaCusto
}

export type StatusSolicitacao = 'pendente' | 'aprovada' | 'rejeitada' | 'comprada'

export interface SolicitacaoCompra {
  id: string
  obraId: string
  etapaId?: string
  data: string // yyyy-mm-dd
  solicitante: string
  descricao: string
  quantidade: number
  unidade: string
  valorEstimado: number
  fornecedorId?: string
  status: StatusSolicitacao
  aprovadoPor?: string
  dataDecisao?: string
  motivoRejeicao?: string
  compraId?: string
}

/** Contrato de empreitada com um empreiteiro, pago por medições. */
export interface ContratoEmpreiteiro {
  id: string
  obraId: string
  etapaId?: string
  empreiteiro: string
  descricao: string
  valorTotal: number
  /** Retenção técnica (caução) descontada de cada medição, em %. */
  retencaoPercentual: number
}

export type StatusMedicao = 'aberta' | 'aprovada' | 'paga'

export interface Medicao {
  id: string
  contratoId: string
  data: string // yyyy-mm-dd
  /** Percentual do contrato executado neste período. */
  percentualPeriodo: number
  status: StatusMedicao
  dataPagamento?: string
  observacao?: string
}

export type TipoLancamento = 'receita' | 'despesa'

/** Contas a pagar / a receber que não vêm dos outros lançamentos (ex: parcelas do cliente, aluguel de equipamento). */
export interface LancamentoFinanceiro {
  id: string
  obraId?: string
  tipo: TipoLancamento
  descricao: string
  valor: number
  vencimento: string // yyyy-mm-dd
  pago: boolean
  dataPagamento?: string
  categoria?: CategoriaCusto
}

export type Clima = 'sol' | 'nublado' | 'chuva'

export interface DiarioObra {
  id: string
  obraId: string
  data: string // yyyy-mm-dd
  climaManha: Clima
  climaTarde: Clima
  efetivo: number
  atividades: string
  ocorrencias?: string
  /** Fotos reduzidas em data URL (JPEG). */
  fotos: string[]
}

/** Material controlado no almoxarifado (catálogo único para todas as obras). */
export interface MaterialEstoque {
  id: string
  nome: string
  unidade: string
  /** Abaixo disso o app avisa para comprar. */
  estoqueMinimo?: number
}

export type TipoMovimentoEstoque = 'entrada' | 'saida' | 'transferencia'

export interface MovimentoEstoque {
  id: string
  materialId: string
  /** Almoxarifado de onde sai (ou onde entra, na entrada). */
  obraId: string
  /** Só na transferência: obra que recebe. */
  obraDestinoId?: string
  data: string // yyyy-mm-dd
  tipo: TipoMovimentoEstoque
  quantidade: number
  /** Custo unitário na entrada, para valorizar o estoque. */
  valorUnitario?: number
  /** Na saída: em que etapa o material foi aplicado. */
  etapaId?: string
  responsavel?: string
  observacao?: string
  compraId?: string
}

export interface Database {
  clientes: Cliente[]
  trabalhadores: Trabalhador[]
  obras: Obra[]
  fornecedores: Fornecedor[]
  registrosDia: RegistroDia[]
  comprasMaterial: CompraMaterial[]
  despesas: Despesa[]
  pagamentosTarefa: PagamentoTarefa[]
  etapas: Etapa[]
  itensOrcamento: ItemOrcamento[]
  solicitacoesCompra: SolicitacaoCompra[]
  contratos: ContratoEmpreiteiro[]
  medicoes: Medicao[]
  lancamentos: LancamentoFinanceiro[]
  diarios: DiarioObra[]
  materiaisEstoque: MaterialEstoque[]
  movimentosEstoque: MovimentoEstoque[]
}

/** Coleções com CRUD genérico no store. */
export type ColecaoGenerica =
  | 'clientes'
  | 'etapas'
  | 'itensOrcamento'
  | 'solicitacoesCompra'
  | 'contratos'
  | 'medicoes'
  | 'lancamentos'
  | 'diarios'
  | 'materiaisEstoque'
  | 'movimentosEstoque'

export const TIPO_OBRA_LABEL: Record<TipoObra, string> = {
  residencial: 'Residencial',
  comercial: 'Comercial',
  industrial: 'Industrial',
  reforma: 'Reforma',
  infraestrutura: 'Infraestrutura',
  rural: 'Rural',
  outra: 'Outra',
}

export const STATUS_OBRA_LABEL: Record<StatusObra, string> = {
  orcamento: 'Em orçamento',
  andamento: 'Em andamento',
  paralisada: 'Paralisada',
  concluida: 'Concluída',
}

export const CATEGORIA_FORNECEDOR_LABEL: Record<CategoriaFornecedor, string> = {
  material: 'Material de construção',
  servico: 'Serviço / mão de obra',
  equipamento: 'Equipamento / locação',
  outro: 'Outro',
}

export const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'] as const

export const CATEGORIA_LABEL: Record<CategoriaCusto, string> = {
  material: 'Material',
  mao_de_obra: 'Mão de obra',
  equipamento: 'Equipamento',
  servico: 'Serviço / empreitada',
}

export const STATUS_SOLICITACAO_LABEL: Record<StatusSolicitacao, string> = {
  pendente: 'Aguardando aprovação',
  aprovada: 'Aprovada',
  rejeitada: 'Rejeitada',
  comprada: 'Comprada',
}

export const STATUS_MEDICAO_LABEL: Record<StatusMedicao, string> = {
  aberta: 'Em aberto',
  aprovada: 'Aprovada',
  paga: 'Paga',
}

export const TIPO_MOVIMENTO_LABEL: Record<TipoMovimentoEstoque, string> = {
  entrada: 'Entrada',
  saida: 'Saída (consumo)',
  transferencia: 'Transferência',
}

export const CLIMA_LABEL: Record<Clima, string> = {
  sol: '☀️ Sol',
  nublado: '⛅ Nublado',
  chuva: '🌧️ Chuva',
}

export const BDI_PADRAO: ComposicaoBDI = {
  administracaoCentral: 4,
  seguroGarantia: 0.8,
  risco: 1.27,
  despesasFinanceiras: 1.23,
  lucro: 7.4,
  tributos: 8.65,
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
