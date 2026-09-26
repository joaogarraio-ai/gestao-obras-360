import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { generateId } from './id'
import { loadDatabase, saveDatabase } from './storage'
import type {
  CompraMaterial,
  Database,
  Despesa,
  Fornecedor,
  Obra,
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
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<Database>(() => loadDatabase())

  useEffect(() => {
    saveDatabase(db)
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
    setDb((prev) => ({ ...prev, obras: prev.obras.filter((o) => o.id !== id) }))
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
    ],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore deve ser usado dentro de StoreProvider')
  return ctx
}
