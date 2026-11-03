import type { Database } from './types'

const STORAGE_KEY = 'obra360:db:v1'

/** Banco vazio: cada empresa começa sem dados de exemplo de outra. */
function seedDatabase(): Database {
  return {
    clientes: [],
    trabalhadores: [],
    obras: [],
    fornecedores: [],
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
    materiaisEstoque: [],
    movimentosEstoque: [],
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
      clientes: parsed.clientes ?? [],
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
      materiaisEstoque: parsed.materiaisEstoque ?? [],
      movimentosEstoque: parsed.movimentosEstoque ?? [],
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
