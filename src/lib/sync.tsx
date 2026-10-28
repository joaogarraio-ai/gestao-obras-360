import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { RealtimeChannel, Session } from '@supabase/supabase-js'
import { supabase, type Empresa } from './supabase'
import { useStore } from './store'
import type { Database } from './types'

/** Todas as listas do banco local; cada item vira uma linha em `registros` no Supabase. */
const COLECOES = [
  'trabalhadores',
  'obras',
  'fornecedores',
  'registrosDia',
  'comprasMaterial',
  'despesas',
  'pagamentosTarefa',
  'etapas',
  'itensOrcamento',
  'solicitacoesCompra',
  'contratos',
  'medicoes',
  'lancamentos',
  'diarios',
  'materiaisEstoque',
  'movimentosEstoque',
] as const satisfies readonly (keyof Database)[]

type Colecao = (typeof COLECOES)[number]
type Item = { id: string }

const EMPRESA_KEY = 'obra360:empresa'
const BASE_KEY = 'obra360:sync-base'
const BACKUP_KEY = 'obra360:backup-antes-da-empresa'

export type StatusSync = 'local' | 'carregando' | 'sincronizado' | 'enviando' | 'offline' | 'erro'

interface Operacao {
  colecao: Colecao
  id: string
  dados: Item | null // null = excluído
}

/** Hash curto do JSON de um item, para saber o que mudou desde a última sincronização. */
function hash(item: unknown): string {
  const s = JSON.stringify(item)
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 2654435761)
    h2 = Math.imul(h2 ^ c, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (h2 >>> 0).toString(36) + (h1 >>> 0).toString(36)
}

const chave = (colecao: string, id: string) => `${colecao}:${id}`

/** O que mudou no banco local em relação ao que o servidor já tem (base). */
function diferencas(db: Database, base: Record<string, string>): Operacao[] {
  const ops: Operacao[] = []
  const vistos = new Set<string>()
  for (const colecao of COLECOES) {
    for (const item of db[colecao] as Item[]) {
      const k = chave(colecao, item.id)
      vistos.add(k)
      if (base[k] !== hash(item)) ops.push({ colecao, id: item.id, dados: item })
    }
  }
  for (const k of Object.keys(base)) {
    if (vistos.has(k)) continue
    const i = k.indexOf(':')
    ops.push({ colecao: k.slice(0, i) as Colecao, id: k.slice(i + 1), dados: null })
  }
  return ops
}

function bancoVazio(): Database {
  return Object.fromEntries(COLECOES.map((c) => [c, []])) as unknown as Database
}

function lerBase(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(BASE_KEY) ?? '{}') as Record<string, string>
  } catch {
    return {}
  }
}

function salvarBase(base: Record<string, string>) {
  try {
    localStorage.setItem(BASE_KEY, JSON.stringify(base))
  } catch {
    // sem espaço: a base é refeita na próxima carga completa
  }
}

interface SyncValue {
  configurado: boolean
  session: Session | null
  carregandoSessao: boolean
  empresa: Empresa | null
  /** Dados da empresa já carregados neste aparelho. */
  pronto: boolean
  status: StatusSync
  pendentes: number
  ultimoErro: string | null
  escolherEmpresa: (e: Empresa) => Promise<void>
  trocarEmpresa: () => void
  sair: () => Promise<void>
  sincronizarAgora: () => void
}

const SyncContext = createContext<SyncValue | null>(null)

export function SyncProvider({ children }: { children: ReactNode }) {
  const { db, replaceDatabase } = useStore()
  const [session, setSession] = useState<Session | null>(null)
  const [carregandoSessao, setCarregandoSessao] = useState(!!supabase)
  const [empresa, setEmpresa] = useState<Empresa | null>(() => {
    try {
      return JSON.parse(localStorage.getItem(EMPRESA_KEY) ?? 'null') as Empresa | null
    } catch {
      return null
    }
  })
  const [status, setStatus] = useState<StatusSync>(supabase ? 'carregando' : 'local')
  const [pendentes, setPendentes] = useState(0)
  const [ultimoErro, setUltimoErro] = useState<string | null>(null)
  const [pronto, setPronto] = useState(false)

  const dbRef = useRef(db)
  useEffect(() => {
    dbRef.current = db
  }, [db])
  const baseRef = useRef<Record<string, string>>(lerBase())
  const enviandoRef = useRef(false)
  const [tentativa, setTentativa] = useState(0)

  // ---- sessão ----
  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setCarregandoSessao(false)
      // limpa o ?code= que volta do e-mail de confirmação
      if (window.location.search.includes('code=')) {
        window.history.replaceState(null, '', window.location.pathname + window.location.hash)
      }
    })
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  // ---- envio das mudanças locais ----
  const enviar = useCallback(async () => {
    if (!supabase || !empresa || enviandoRef.current) return
    const ops = diferencas(dbRef.current, baseRef.current)
    setPendentes(ops.length)
    if (ops.length === 0) {
      setStatus('sincronizado')
      return
    }
    enviandoRef.current = true
    setStatus('enviando')
    try {
      for (let i = 0; i < ops.length; i += 200) {
        const lote = ops.slice(i, i + 200)
        const { error } = await supabase.from('registros').upsert(
          lote.map((op) => ({
            empresa_id: empresa.id,
            colecao: op.colecao,
            id: op.id,
            dados: op.dados ?? {},
            excluido: op.dados === null,
          })),
        )
        if (error) throw error
        for (const op of lote) {
          const k = chave(op.colecao, op.id)
          if (op.dados) baseRef.current[k] = hash(op.dados)
          else delete baseRef.current[k]
        }
        salvarBase(baseRef.current)
      }
      setUltimoErro(null)
      const restantes = diferencas(dbRef.current, baseRef.current).length
      setPendentes(restantes)
      setStatus(restantes > 0 ? 'enviando' : 'sincronizado')
      if (restantes > 0) setTentativa((t) => t + 1)
    } catch (e) {
      setUltimoErro(e instanceof Error ? e.message : String(e))
      setStatus(navigator.onLine ? 'erro' : 'offline')
    } finally {
      enviandoRef.current = false
    }
  }, [empresa])

  // ---- carga inicial ao entrar na empresa ----
  const userId = session?.user.id
  useEffect(() => {
    if (!supabase || !userId || !empresa) return
    let cancelado = false
    setPronto(false)
    setStatus('carregando')
    ;(async () => {
      const carregada = localStorage.getItem(EMPRESA_KEY + ':carregada')
      const mesmaEmpresaNoAparelho = carregada === empresa.id
      // 1. manda o que ficou pendente offline (só se este aparelho já era desta empresa)
      if (mesmaEmpresaNoAparelho) await enviar()

      // 2. baixa tudo da empresa
      const linhas: { colecao: string; id: string; dados: Item; excluido: boolean }[] = []
      for (let de = 0; ; de += 1000) {
        const { data, error } = await supabase!
          .from('registros')
          .select('colecao,id,dados,excluido')
          .eq('empresa_id', empresa.id)
          .order('colecao')
          .order('id')
          .range(de, de + 999)
        if (error) {
          if (!cancelado) {
            setUltimoErro(error.message)
            setStatus(navigator.onLine ? 'erro' : 'offline')
            // sem rede: segue usando os dados guardados no aparelho
            if (mesmaEmpresaNoAparelho) setPronto(true)
          }
          return
        }
        linhas.push(...(data ?? []))
        if (!data || data.length < 1000) break
      }
      if (cancelado) return

      const ativas = linhas.filter((l) => !l.excluido && (COLECOES as readonly string[]).includes(l.colecao))
      if (ativas.length === 0 && !carregada) {
        // primeira empresa deste aparelho e ela está vazia: os dados que já estavam aqui viram os dados da empresa
        baseRef.current = {}
      } else {
        if (!mesmaEmpresaNoAparelho) {
          try {
            localStorage.setItem(BACKUP_KEY, JSON.stringify(dbRef.current))
          } catch {
            // backup é só por segurança
          }
        }
        const novo = bancoVazio()
        const base: Record<string, string> = {}
        for (const l of ativas) {
          ;(novo[l.colecao as Colecao] as Item[]).push(l.dados)
          base[chave(l.colecao, l.id)] = hash(l.dados)
        }
        baseRef.current = base
        replaceDatabase(() => novo)
        dbRef.current = novo
      }
      salvarBase(baseRef.current)
      localStorage.setItem(EMPRESA_KEY + ':carregada', empresa.id)
      setPronto(true)
      setTentativa((t) => t + 1)
    })()
    return () => {
      cancelado = true
    }
  }, [userId, empresa, enviar, replaceDatabase])

  // ---- envia as mudanças com um pequeno atraso ----
  useEffect(() => {
    if (!pronto) return
    const t = setTimeout(enviar, 800)
    return () => clearTimeout(t)
  }, [db, pronto, enviar, tentativa])

  // tenta de novo quando a internet volta
  useEffect(() => {
    const voltou = () => setTentativa((t) => t + 1)
    window.addEventListener('online', voltou)
    const timer = setInterval(voltou, 60_000)
    return () => {
      window.removeEventListener('online', voltou)
      clearInterval(timer)
    }
  }, [])

  // ---- recebe as mudanças da equipe em tempo real ----
  useEffect(() => {
    if (!supabase || !pronto || !empresa) return
    const canal: RealtimeChannel = supabase
      .channel(`registros-${empresa.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'registros', filter: `empresa_id=eq.${empresa.id}` },
        (payload) => {
          const linha = payload.new as { colecao?: string; id?: string; dados?: Item; excluido?: boolean }
          if (!linha.colecao || !linha.id || !(COLECOES as readonly string[]).includes(linha.colecao)) return
          const colecao = linha.colecao as Colecao
          const k = chave(colecao, linha.id)
          const atual = (dbRef.current[colecao] as Item[]).find((x) => x.id === linha.id)
          // se este aparelho tem uma edição ainda não enviada deste item, ela prevalece
          const semMudancaLocal = atual ? baseRef.current[k] === hash(atual) : baseRef.current[k] === undefined
          if (linha.excluido || !linha.dados) delete baseRef.current[k]
          else baseRef.current[k] = hash(linha.dados)
          salvarBase(baseRef.current)
          if (!semMudancaLocal) return
          const dados = linha.excluido ? null : (linha.dados ?? null)
          replaceDatabase((prev) => {
            const lista = prev[colecao] as Item[]
            let nova: Item[]
            if (!dados) nova = lista.filter((x) => x.id !== linha.id)
            else if (lista.some((x) => x.id === linha.id)) nova = lista.map((x) => (x.id === linha.id ? dados : x))
            else nova = [...lista, dados]
            return { ...prev, [colecao]: nova }
          })
        },
      )
      .subscribe()
    return () => {
      supabase?.removeChannel(canal)
    }
  }, [pronto, empresa, replaceDatabase])

  const escolherEmpresa = useCallback(async (e: Empresa) => {
    localStorage.setItem(EMPRESA_KEY, JSON.stringify(e))
    setEmpresa(e)
  }, [])

  const trocarEmpresa = useCallback(() => {
    localStorage.removeItem(EMPRESA_KEY)
    setPronto(false)
    setEmpresa(null)
  }, [])

  const sair = useCallback(async () => {
    await supabase?.auth.signOut()
    // apaga os dados da empresa deste aparelho
    for (const k of [EMPRESA_KEY, EMPRESA_KEY + ':carregada', BASE_KEY, 'obra360:db:v1']) localStorage.removeItem(k)
    window.location.reload()
  }, [])

  const sincronizarAgora = useCallback(() => setTentativa((t) => t + 1), [])

  const value = useMemo<SyncValue>(
    () => ({
      configurado: !!supabase,
      session,
      carregandoSessao,
      empresa,
      pronto,
      status,
      pendentes,
      ultimoErro,
      escolherEmpresa,
      trocarEmpresa,
      sair,
      sincronizarAgora,
    }),
    [session, carregandoSessao, empresa, pronto, status, pendentes, ultimoErro, escolherEmpresa, trocarEmpresa, sair, sincronizarAgora],
  )

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>
}

export function useSync(): SyncValue {
  const ctx = useContext(SyncContext)
  if (!ctx) throw new Error('useSync deve ser usado dentro de SyncProvider')
  return ctx
}
