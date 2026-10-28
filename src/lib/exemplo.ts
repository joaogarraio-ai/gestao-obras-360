import { addDays, toISODate } from './dates'
import { generateId } from './id'
import { BDI_PADRAO } from './types'
import type { CategoriaCusto, Database, Etapa, ItemOrcamento } from './types'

/** Cria uma obra completa de demonstração (orçamento, cronograma, compras, medições, financeiro e diário). */
export function adicionarObraExemplo(db: Database): Database {
  const hoje = toISODate(new Date())
  const inicio = addDays(hoje, -60)
  const obraId = generateId()

  const etapasBase: [string, number, number, number][] = [
    // nome, início (dias após o início da obra), duração em dias, % concluído
    ['Serviços preliminares', 0, 10, 100],
    ['Fundação', 8, 25, 100],
    ['Estrutura', 30, 45, 70],
    ['Alvenaria', 55, 40, 30],
    ['Cobertura', 90, 20, 0],
    ['Instalações elétricas e hidráulicas', 80, 45, 0],
    ['Revestimentos e acabamento', 115, 45, 0],
    ['Pintura e limpeza final', 150, 20, 0],
  ]
  const etapas: Etapa[] = etapasBase.map(([nome, offset, duracao, pct], ordem) => ({
    id: generateId(),
    obraId,
    nome,
    ordem,
    dataInicio: addDays(inicio, offset),
    dataFim: addDays(inicio, offset + duracao - 1),
    percentualConcluido: pct,
  }))

  const itensBase: [number, string, string, string, number, number, CategoriaCusto][] = [
    [0, '98459', 'Tapume de chapa de madeira compensada', 'm²', 60, 78.5, 'material'],
    [0, '99059', 'Locação de obra com gabarito de madeira', 'm', 48, 32.4, 'mao_de_obra'],
    [1, '96522', 'Escavação manual de vala', 'm³', 35, 68.9, 'mao_de_obra'],
    [1, '94965', 'Concreto fck 25 MPa (fundação)', 'm³', 18, 545.0, 'material'],
    [1, '92775', 'Armação de aço CA-50 (fundação)', 'kg', 950, 13.2, 'material'],
    [2, '94971', 'Concreto fck 25 MPa (estrutura)', 'm³', 32, 560.0, 'material'],
    [2, '92778', 'Armação de aço CA-50 (estrutura)', 'kg', 2200, 12.8, 'material'],
    [2, '92413', 'Forma de madeira para pilares e vigas', 'm²', 280, 96.0, 'material'],
    [2, '', 'Empreitada de estrutura (mão de obra)', 'vb', 1, 38000, 'servico'],
    [3, '103328', 'Alvenaria de bloco cerâmico 14 cm', 'm²', 420, 74.6, 'material'],
    [3, '', 'Mão de obra de alvenaria', 'm²', 420, 38.0, 'mao_de_obra'],
    [4, '92543', 'Estrutura de madeira para telhado', 'm²', 140, 118.0, 'material'],
    [4, '94207', 'Telha cerâmica', 'm²', 140, 62.0, 'material'],
    [5, '', 'Instalações elétricas completas', 'vb', 1, 24500, 'servico'],
    [5, '', 'Instalações hidrossanitárias completas', 'vb', 1, 21800, 'servico'],
    [6, '87879', 'Chapisco e reboco interno', 'm²', 900, 28.5, 'mao_de_obra'],
    [6, '87263', 'Piso porcelanato 60x60', 'm²', 160, 135.0, 'material'],
    [6, '', 'Locação de betoneira e andaimes', 'mês', 4, 1200, 'equipamento'],
    [7, '88489', 'Pintura látex acrílica 2 demãos', 'm²', 1100, 18.9, 'servico'],
    [7, '', 'Limpeza final da obra', 'm²', 160, 6.5, 'mao_de_obra'],
  ]
  const itensOrcamento: ItemOrcamento[] = itensBase.map(([e, codigo, descricao, unidade, quantidade, custoUnitario, categoria]) => ({
    id: generateId(),
    obraId,
    etapaId: etapas[e].id,
    codigo: codigo || undefined,
    descricao,
    unidade,
    quantidade,
    custoUnitario,
    categoria,
  }))

  const fornecedorId = db.fornecedores[0]?.id
  const compra1 = generateId()
  const compra2 = generateId()
  const solicitacao1 = generateId()

  const contratoEstrutura = generateId()
  const contratoEletrica = generateId()

  return {
    ...db,
    obras: [
      ...db.obras,
      {
        id: obraId,
        nome: 'Residência Exemplo (demonstração)',
        ativo: true,
        cliente: 'Cliente Exemplo',
        endereco: 'Rua das Palmeiras, 100',
        dataInicio: inicio,
        dataFim: addDays(inicio, 169),
        valorContrato: 520000,
        bdi: BDI_PADRAO,
      },
    ],
    etapas: [...db.etapas, ...etapas],
    itensOrcamento: [...db.itensOrcamento, ...itensOrcamento],
    comprasMaterial: [
      ...db.comprasMaterial,
      { id: compra1, data: addDays(inicio, 9), fornecedorId: fornecedorId ?? '', obraId, descricao: 'Concreto usinado fundação 18 m³', valor: 10250, numeroNota: '4521', etapaId: etapas[1].id },
      { id: compra2, data: addDays(inicio, 32), fornecedorId: fornecedorId ?? '', obraId, descricao: 'Aço CA-50 2.200 kg', valor: 29400, numeroNota: '4610', etapaId: etapas[2].id, solicitacaoId: solicitacao1 },
    ],
    solicitacoesCompra: [
      ...db.solicitacoesCompra,
      { id: solicitacao1, obraId, etapaId: etapas[2].id, data: addDays(inicio, 28), solicitante: 'Mestre de obra', descricao: 'Aço CA-50 para estrutura', quantidade: 2200, unidade: 'kg', valorEstimado: 28160, fornecedorId, status: 'comprada', aprovadoPor: 'Engenheiro', dataDecisao: addDays(inicio, 29), compraId: compra2 },
      { id: generateId(), obraId, etapaId: etapas[3].id, data: addDays(hoje, -3), solicitante: 'Mestre de obra', descricao: 'Bloco cerâmico 14x19x29', quantidade: 6000, unidade: 'un', valorEstimado: 9600, fornecedorId, status: 'aprovada', aprovadoPor: 'Engenheiro', dataDecisao: addDays(hoje, -2) },
      { id: generateId(), obraId, etapaId: etapas[4].id, data: addDays(hoje, -1), solicitante: 'Mestre de obra', descricao: 'Telha cerâmica portuguesa', quantidade: 2300, unidade: 'un', valorEstimado: 8050, status: 'pendente' },
    ],
    contratos: [
      ...db.contratos,
      { id: contratoEstrutura, obraId, etapaId: etapas[2].id, empreiteiro: 'Empreiteira Silva', descricao: 'Mão de obra da estrutura de concreto', valorTotal: 38000, retencaoPercentual: 5 },
      { id: contratoEletrica, obraId, etapaId: etapas[5].id, empreiteiro: 'Eletro Instalações', descricao: 'Instalações elétricas completas', valorTotal: 24500, retencaoPercentual: 5 },
    ],
    medicoes: [
      ...db.medicoes,
      { id: generateId(), contratoId: contratoEstrutura, data: addDays(inicio, 45), percentualPeriodo: 30, status: 'paga', dataPagamento: addDays(inicio, 48) },
      { id: generateId(), contratoId: contratoEstrutura, data: addDays(hoje, -5), percentualPeriodo: 40, status: 'aprovada' },
    ],
    lancamentos: [
      ...db.lancamentos,
      { id: generateId(), obraId, tipo: 'receita', descricao: 'Entrada do cliente (20%)', valor: 104000, vencimento: inicio, pago: true, dataPagamento: inicio },
      { id: generateId(), obraId, tipo: 'receita', descricao: 'Parcela 1 do cliente', valor: 104000, vencimento: addDays(inicio, 45), pago: true, dataPagamento: addDays(inicio, 46) },
      { id: generateId(), obraId, tipo: 'receita', descricao: 'Parcela 2 do cliente', valor: 104000, vencimento: addDays(hoje, 15), pago: false },
      { id: generateId(), obraId, tipo: 'receita', descricao: 'Parcela 3 do cliente', valor: 104000, vencimento: addDays(hoje, 60), pago: false },
      { id: generateId(), obraId, tipo: 'receita', descricao: 'Parcela final do cliente', valor: 104000, vencimento: addDays(hoje, 110), pago: false },
      { id: generateId(), obraId, tipo: 'despesa', descricao: 'Aluguel de betoneira', valor: 1200, vencimento: addDays(hoje, 5), pago: false, categoria: 'equipamento' },
      { id: generateId(), obraId, tipo: 'despesa', descricao: 'Aluguel de andaimes', valor: 1800, vencimento: addDays(hoje, -20), pago: true, dataPagamento: addDays(hoje, -20), categoria: 'equipamento' },
    ],
    diarios: [
      ...db.diarios,
      { id: generateId(), obraId, data: addDays(hoje, -2), climaManha: 'sol', climaTarde: 'nublado', efetivo: 9, atividades: 'Concretagem da laje do térreo. Início da alvenaria da fachada norte.', ocorrencias: 'Atraso de 2 horas na entrega do concreto usinado.', fotos: [] },
      { id: generateId(), obraId, data: addDays(hoje, -1), climaManha: 'chuva', climaTarde: 'nublado', efetivo: 6, atividades: 'Alvenaria interna dos quartos. Cura da laje.', ocorrencias: 'Chuva pela manhã paralisou os serviços externos.', fotos: [] },
    ],
  }
}
