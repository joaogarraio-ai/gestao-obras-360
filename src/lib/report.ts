import { isBetween } from './dates'
import { STATUS_DIA_FRACAO } from './types'
import type { Database, FormaPagamento } from './types'

export interface LinhaTarefa {
  data: string
  obraNome: string
  descricao: string
  valor: number
}

export interface LinhaPagamentoTrabalhador {
  chave: string
  trabalhadorId?: string
  nome: string
  funcao: string
  formaPagamento: FormaPagamento
  chavePix?: string
  diasCompletos: number
  meiosDias: number
  faltas: number
  totalDias: number
  valorDiaria: number
  valorDias: number
  tarefas: LinhaTarefa[]
  valorTarefas: number
  valorTotal: number
  obras: string[]
}

export interface LinhaMaterial {
  fornecedorId: string
  fornecedorNome: string
  itens: {
    data: string
    obraNome: string
    descricao: string
    valor: number
    numeroNota?: string
  }[]
  totalFornecedor: number
}

export interface LinhaDespesa {
  data: string
  tipo: string
  obraNome?: string
  descricao: string
  valor: number
}

export interface RelatorioSemanal {
  start: string
  end: string
  pagamentos: LinhaPagamentoTrabalhador[]
  totalPix: number
  totalDinheiro: number
  totalMaoDeObra: number
  materiais: LinhaMaterial[]
  totalMateriais: number
  despesas: LinhaDespesa[]
  totalDespesas: number
  totalGeral: number
}

export function gerarRelatorioSemanal(db: Database, start: string, end: string): RelatorioSemanal {
  const obraNome = (id: string) => db.obras.find((o) => o.id === id)?.nome ?? '—'
  const fornecedorNome = (id: string) => db.fornecedores.find((f) => f.id === id)?.nome ?? '—'

  const porChave = new Map<string, LinhaPagamentoTrabalhador>()

  for (const trab of db.trabalhadores) {
    const registros = db.registrosDia.filter((r) => r.trabalhadorId === trab.id && isBetween(r.data, start, end))
    const diasCompletos = registros.filter((r) => r.status === 'dia_completo').length
    const meiosDias = registros.filter((r) => r.status === 'meio_dia').length
    const faltas = registros.filter((r) => r.status === 'falta').length
    const totalDias = registros.reduce((acc, r) => acc + STATUS_DIA_FRACAO[r.status], 0)
    const valorDias = totalDias * trab.valorDiaria
    const obrasSet = new Set(registros.filter((r) => r.status !== 'falta').map((r) => obraNome(r.obraId)))

    porChave.set(trab.id, {
      chave: trab.id,
      trabalhadorId: trab.id,
      nome: trab.nome,
      funcao: trab.funcao,
      formaPagamento: trab.formaPagamento,
      chavePix: trab.chavePix,
      diasCompletos,
      meiosDias,
      faltas,
      totalDias,
      valorDiaria: trab.valorDiaria,
      valorDias,
      tarefas: [],
      valorTarefas: 0,
      valorTotal: valorDias,
      obras: Array.from(obrasSet),
    })
  }

  const tarefasNaSemana = db.pagamentosTarefa.filter((p) => isBetween(p.data, start, end))
  for (const tarefa of tarefasNaSemana) {
    const trab = tarefa.trabalhadorId ? db.trabalhadores.find((t) => t.id === tarefa.trabalhadorId) : undefined
    const chave = tarefa.trabalhadorId ?? `avulso:${tarefa.nomeAvulso ?? '—'}`
    const linhaTarefa: LinhaTarefa = {
      data: tarefa.data,
      obraNome: obraNome(tarefa.obraId),
      descricao: tarefa.descricao,
      valor: tarefa.valor,
    }

    const existente = porChave.get(chave)
    if (existente) {
      existente.tarefas.push(linhaTarefa)
      existente.valorTarefas += tarefa.valor
      existente.valorTotal += tarefa.valor
      existente.obras = Array.from(new Set([...existente.obras, linhaTarefa.obraNome]))
    } else {
      porChave.set(chave, {
        chave,
        trabalhadorId: tarefa.trabalhadorId,
        nome: trab?.nome ?? tarefa.nomeAvulso ?? '—',
        funcao: trab?.funcao ?? 'Avulso (tarefa)',
        formaPagamento: trab?.formaPagamento ?? tarefa.formaPagamento,
        chavePix: trab?.chavePix ?? tarefa.chavePix,
        diasCompletos: 0,
        meiosDias: 0,
        faltas: 0,
        totalDias: 0,
        valorDiaria: trab?.valorDiaria ?? 0,
        valorDias: 0,
        tarefas: [linhaTarefa],
        valorTarefas: tarefa.valor,
        valorTotal: tarefa.valor,
        obras: [linhaTarefa.obraNome],
      })
    }
  }

  const pagamentos: LinhaPagamentoTrabalhador[] = Array.from(porChave.values())
    .filter((linha) => linha.totalDias > 0 || linha.valorTarefas > 0)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))

  const totalPix = pagamentos.filter((p) => p.formaPagamento === 'pix').reduce((acc, p) => acc + p.valorTotal, 0)
  const totalDinheiro = pagamentos
    .filter((p) => p.formaPagamento === 'dinheiro')
    .reduce((acc, p) => acc + p.valorTotal, 0)
  const totalMaoDeObra = totalPix + totalDinheiro

  const comprasNaSemana = db.comprasMaterial.filter((c) => isBetween(c.data, start, end))
  const fornecedorIds = Array.from(new Set(comprasNaSemana.map((c) => c.fornecedorId)))
  const materiais: LinhaMaterial[] = fornecedorIds
    .map((fid) => {
      const itens = comprasNaSemana
        .filter((c) => c.fornecedorId === fid)
        .sort((a, b) => a.data.localeCompare(b.data))
        .map((c) => ({
          data: c.data,
          obraNome: obraNome(c.obraId),
          descricao: c.descricao,
          valor: c.valor,
          numeroNota: c.numeroNota,
        }))
      return {
        fornecedorId: fid,
        fornecedorNome: fornecedorNome(fid),
        itens,
        totalFornecedor: itens.reduce((acc, i) => acc + i.valor, 0),
      }
    })
    .sort((a, b) => a.fornecedorNome.localeCompare(b.fornecedorNome, 'pt-BR'))

  const totalMateriais = materiais.reduce((acc, m) => acc + m.totalFornecedor, 0)

  const despesas: LinhaDespesa[] = db.despesas
    .filter((d) => isBetween(d.data, start, end))
    .sort((a, b) => a.data.localeCompare(b.data))
    .map((d) => ({
      data: d.data,
      tipo: d.tipo,
      obraNome: d.obraId ? obraNome(d.obraId) : undefined,
      descricao: d.descricao,
      valor: d.valor,
    }))

  const totalDespesas = despesas.reduce((acc, d) => acc + d.valor, 0)

  return {
    start,
    end,
    pagamentos,
    totalPix,
    totalDinheiro,
    totalMaoDeObra,
    materiais,
    totalMateriais,
    despesas,
    totalDespesas,
    totalGeral: totalMaoDeObra + totalMateriais + totalDespesas,
  }
}
