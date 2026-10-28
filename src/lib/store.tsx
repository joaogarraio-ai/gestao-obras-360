import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { generateId } from './id'
import { removerObraCompleta } from './gestao'
import { loadDatabase, saveDatabase } from './storage'
import type {
  ColecaoGenerica,
  CompraMaterial,
  Database,
  Despesa,
  Fornecedor,
  Obra,
  PagamentoTarefa,
  RegistroDia,
  Trabalhador,
} from './types'

interface StoreValue {
  db: Database
  addTrabalhador: (t: Omit<Trabalhador, 'id'>) => Trabalhador
  updateTrabalhador: (id: string, patch: Partial<Omit<Trabalhador, 'id'>>) => void
  removeTrabalhador: (id: string) => void

  addObra: (o: Omit<Obra, 'id'>) => Obra
  updateObra: (id: string, patch: Partial<Omit<Obra, 'id'>>) => void
  removeObra: (id: string) => void

  addFornecedor: (f: Omit<Fornecedor, 'id'>) => Fornecedor
  updateFornecedor: (id: string, patch: Partial<Omit<Fornecedor, 'id'>>) => void
  removeFornecedor: (id: string) => void

  setRegistroDia: (r: Omit<RegistroDia, 'id'>) => void
  removeRegistroDia: (id: string) => void

  addCompraMaterial: (c: Omit<CompraMaterial, 'id'>) => CompraMaterial
  updateCompraMaterial: (id: string, patch: Partial<Omit<CompraMaterial, 'id'>>) => void
  removeCompraMaterial: (id: string) => void

  addDespesa: (d: Omit<Despesa, 'id'>) => Despesa
  updateDespesa: (id: string, patch: Partial<Omit<Despesa, 'id'>>) => void
  removeDespesa: (id: string) => void

  addPagamentoTarefa: (p: Omit<PagamentoTarefa, 'id'>) => PagamentoTarefa
  updatePagamentoTarefa: (id: string, patch: Partial<Omit<PagamentoTarefa, 'id'>>) => void
  removePagamentoTarefa: (id: string) => void

  /** CRUD genérico para os módulos de gestão (orçamento, cronograma, compras, medições, financeiro, diário). */
  addItem: <K extends ColecaoGenerica>(col: K, item: Omit<Database[K][number], 'id'>) => Database[K][number]
  updateItem: <K extends ColecaoGenerica>(col: K, id: string, patch: Partial<Omit<Database[K][number], 'id'>>) => void
  removeItem: (col: ColecaoGenerica, id: string) => void
  /** Substitui o banco inteiro (usado pela obra de exemplo e importação de backup). */
  replaceDatabase: (updater: (prev: Database) => Database) => void
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<Database>(() => loadDatabase())

  useEffect(() => {
    try {
      saveDatabase(db)
    } catch {
      alert('Não foi possível salvar: a memória do navegador está cheia. Apague fotos antigas do diário de obra.')
    }
  }, [db])

  const addTrabalhador = useCallback((t: Omit<Trabalhador, 'id'>) => {
    const novo: Trabalhador = { ...t, id: generateId() }
    setDb((prev) => ({ ...prev, trabalhadores: [...prev.trabalhadores, novo] }))
    return novo
  }, [])

  const updateTrabalhador = useCallback((id: string, patch: Partial<Omit<Trabalhador, 'id'>>) => {
    setDb((prev) => ({
      ...prev,
      trabalhadores: prev.trabalhadores.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }))
  }, [])

  const removeTrabalhador = useCallback((id: string) => {
    setDb((prev) => ({ ...prev, trabalhadores: prev.trabalhadores.filter((t) => t.id !== id) }))
  }, [])

  const addObra = useCallback((o: Omit<Obra, 'id'>) => {
    const nova: Obra = { ...o, id: generateId() }
    setDb((prev) => ({ ...prev, obras: [...prev.obras, nova] }))
    return nova
  }, [])

  const updateObra = useCallback((id: string, patch: Partial<Omit<Obra, 'id'>>) => {
    setDb((prev) => ({ ...prev, obras: prev.obras.map((o) => (o.id === id ? { ...o, ...patch } : o)) }))
  }, [])

  const removeObra = useCallback((id: string) => {
    setDb((prev) => removerObraCompleta(prev, id))
  }, [])

  const addFornecedor = useCallback((f: Omit<Fornecedor, 'id'>) => {
    const novo: Fornecedor = { ...f, id: generateId() }
    setDb((prev) => ({ ...prev, fornecedores: [...prev.fornecedores, novo] }))
    return novo
  }, [])

  const updateFornecedor = useCallback((id: string, patch: Partial<Omit<Fornecedor, 'id'>>) => {
    setDb((prev) => ({
      ...prev,
      fornecedores: prev.fornecedores.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    }))
  }, [])

  const removeFornecedor = useCallback((id: string) => {
    setDb((prev) => ({ ...prev, fornecedores: prev.fornecedores.filter((f) => f.id !== id) }))
  }, [])

  const setRegistroDia = useCallback((r: Omit<RegistroDia, 'id'>) => {
    setDb((prev) => {
      const existenteIdx = prev.registrosDia.findIndex(
        (reg) => reg.trabalhadorId === r.trabalhadorId && reg.obraId === r.obraId && reg.data === r.data,
      )
      const registrosDia = [...prev.registrosDia]
      if (existenteIdx >= 0) {
        registrosDia[existenteIdx] = { ...registrosDia[existenteIdx], ...r }
      } else {
        registrosDia.push({ ...r, id: generateId() })
      }
      return { ...prev, registrosDia }
    })
  }, [])

  const removeRegistroDia = useCallback((id: string) => {
    setDb((prev) => ({ ...prev, registrosDia: prev.registrosDia.filter((r) => r.id !== id) }))
  }, [])

  const addCompraMaterial = useCallback((c: Omit<CompraMaterial, 'id'>) => {
    const nova: CompraMaterial = { ...c, id: generateId() }
    setDb((prev) => ({ ...prev, comprasMaterial: [...prev.comprasMaterial, nova] }))
    return nova
  }, [])

  const updateCompraMaterial = useCallback((id: string, patch: Partial<Omit<CompraMaterial, 'id'>>) => {
    setDb((prev) => ({
      ...prev,
      comprasMaterial: prev.comprasMaterial.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }))
  }, [])

  const removeCompraMaterial = useCallback((id: string) => {
    setDb((prev) => ({ ...prev, comprasMaterial: prev.comprasMaterial.filter((c) => c.id !== id) }))
  }, [])

  const addDespesa = useCallback((d: Omit<Despesa, 'id'>) => {
    const nova: Despesa = { ...d, id: generateId() }
    setDb((prev) => ({ ...prev, despesas: [...prev.despesas, nova] }))
    return nova
  }, [])

  const updateDespesa = useCallback((id: string, patch: Partial<Omit<Despesa, 'id'>>) => {
    setDb((prev) => ({
      ...prev,
      despesas: prev.despesas.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    }))
  }, [])

  const removeDespesa = useCallback((id: string) => {
    setDb((prev) => ({ ...prev, despesas: prev.despesas.filter((d) => d.id !== id) }))
  }, [])

  const addPagamentoTarefa = useCallback((p: Omit<PagamentoTarefa, 'id'>) => {
    const novo: PagamentoTarefa = { ...p, id: generateId() }
    setDb((prev) => ({ ...prev, pagamentosTarefa: [...prev.pagamentosTarefa, novo] }))
    return novo
  }, [])

  const updatePagamentoTarefa = useCallback((id: string, patch: Partial<Omit<PagamentoTarefa, 'id'>>) => {
    setDb((prev) => ({
      ...prev,
      pagamentosTarefa: prev.pagamentosTarefa.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }))
  }, [])

  const removePagamentoTarefa = useCallback((id: string) => {
    setDb((prev) => ({ ...prev, pagamentosTarefa: prev.pagamentosTarefa.filter((p) => p.id !== id) }))
  }, [])

  const addItem = useCallback(<K extends ColecaoGenerica>(col: K, item: Omit<Database[K][number], 'id'>) => {
    const novo = { ...item, id: generateId() } as Database[K][number]
    setDb((prev) => ({ ...prev, [col]: [...prev[col], novo] }))
    return novo
  }, [])

  const updateItem = useCallback(
    <K extends ColecaoGenerica>(col: K, id: string, patch: Partial<Omit<Database[K][number], 'id'>>) => {
      setDb((prev) => ({
        ...prev,
        [col]: (prev[col] as { id: string }[]).map((x) => (x.id === id ? { ...x, ...patch } : x)),
      }))
    },
    [],
  )

  const removeItem = useCallback((col: ColecaoGenerica, id: string) => {
    setDb((prev) => ({ ...prev, [col]: (prev[col] as { id: string }[]).filter((x) => x.id !== id) }))
  }, [])

  const replaceDatabase = useCallback((updater: (prev: Database) => Database) => {
    setDb((prev) => updater(prev))
  }, [])

  const value = useMemo<StoreValue>(
    () => ({
      db,
      addTrabalhador,
      updateTrabalhador,
      removeTrabalhador,
      addObra,
      updateObra,
      removeObra,
      addFornecedor,
      updateFornecedor,
      removeFornecedor,
      setRegistroDia,
      removeRegistroDia,
      addCompraMaterial,
      updateCompraMaterial,
      removeCompraMaterial,
      addDespesa,
      updateDespesa,
      removeDespesa,
      addPagamentoTarefa,
      updatePagamentoTarefa,
      removePagamentoTarefa,
      addItem,
      updateItem,
      removeItem,
      replaceDatabase,
    }),
    [
      db,
      addTrabalhador,
      updateTrabalhador,
      removeTrabalhador,
      addObra,
      updateObra,
      removeObra,
      addFornecedor,
      updateFornecedor,
      removeFornecedor,
      setRegistroDia,
      removeRegistroDia,
      addCompraMaterial,
      updateCompraMaterial,
      removeCompraMaterial,
      addDespesa,
      updateDespesa,
      removeDespesa,
      addPagamentoTarefa,
      updatePagamentoTarefa,
      removePagamentoTarefa,
      addItem,
      updateItem,
      removeItem,
      replaceDatabase,
    ],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore deve ser usado dentro de StoreProvider')
  return ctx
}
