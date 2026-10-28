import { generateId } from './id'
import type { Database } from './types'

const STORAGE_KEY = 'obra360:db:v1'

function seedDatabase(): Database {
  const obraNomes = ['Fazenda Paraíso', 'Fazenda Alto do Cruzeiro', 'Casa', 'Fazenda de Seu Jorge']
  const fornecedorNomes: { nome: string; cidade: string }[] = [
    { nome: 'Canteiro de Obras', cidade: 'Coração de Maria' },
    { nome: 'Gabriel Material de Construção', cidade: '' },
    { nome: 'Outlet das Tintas', cidade: 'Conceição do Jacuípe' },
    { nome: 'Cerqueira Alves', cidade: 'Coração de Maria' },
  ]

  return {
    trabalhadores: [],
    obras: obraNomes.map((nome) => ({ id: generateId(), nome, ativo: true })),
    fornecedores: fornecedorNomes.map((f) => ({
      id: generateId(),
      nome: f.nome,
      cidade: f.cidade || undefined,
      ativo: true,
    })),
    registrosDia: [],
    comprasMaterial: [],
    despesas: [],
    pagamentosTarefa: [],
    etapas: [],
    itensOrcamento: [],
    solicitacoesCompra: [],
    contratos: [],
    medicoes: [],
    lancamentos: [],
    diarios: [],
  }
}

export function loadDatabase(): Database {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const seeded = seedDatabase()
      saveDatabase(seeded)
      return seeded
    }
    const parsed = JSON.parse(raw) as Partial<Database>
    return {
      trabalhadores: parsed.trabalhadores ?? [],
      obras: parsed.obras ?? [],
      fornecedores: parsed.fornecedores ?? [],
      registrosDia: parsed.registrosDia ?? [],
      comprasMaterial: parsed.comprasMaterial ?? [],
      despesas: parsed.despesas ?? [],
      pagamentosTarefa: parsed.pagamentosTarefa ?? [],
      etapas: parsed.etapas ?? [],
      itensOrcamento: parsed.itensOrcamento ?? [],
      solicitacoesCompra: parsed.solicitacoesCompra ?? [],
      contratos: parsed.contratos ?? [],
      medicoes: parsed.medicoes ?? [],
      lancamentos: parsed.lancamentos ?? [],
      diarios: parsed.diarios ?? [],
    }
  } catch {
    return seedDatabase()
  }
}

export function saveDatabase(db: Database): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
}

export function exportDatabaseJSON(db: Database): string {
  return JSON.stringify(db, null, 2)
}
