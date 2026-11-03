import { generateId } from './id'
import { supabase } from './supabase'

/**
 * Fotos e PDFs anexados a notas, despesas, compras etc.
 * Ficam na nuvem (tabela registros, coleção "anexos") e numa cópia no aparelho (IndexedDB),
 * fora do banco principal, para não lotar a memória do navegador nem pesar a sincronização.
 */
export interface Anexo {
  id: string
  refColecao: string
  refId: string
  nome: string
  tipo: string // mime
  conteudo: string // data URL
  tamanho: number
  criadoEm: string
}

export const COLECAO_ANEXOS = 'anexos'
const MAX_BYTES_PDF = 3 * 1024 * 1024

// ---------- cópia local (IndexedDB) ----------
const DB_NOME = 'obra360-anexos'
let dbPromise: Promise<IDBDatabase> | null = null

function abrir(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NOME, 1)
      req.onupgradeneeded = () => {
        const s = req.result.createObjectStore('anexos', { keyPath: 'id' })
        s.createIndex('ref', ['refColecao', 'refId'])
        req.result.createObjectStore('pendentes', { keyPath: 'id' })
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }
  return dbPromise
}

async function tx<T>(store: string, modo: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await abrir()
  return new Promise((resolve, reject) => {
    const r = fn(db.transaction(store, modo).objectStore(store))
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
}

const localDaRef = (refColecao: string, refId: string) =>
  tx<Anexo[]>('anexos', 'readonly', (s) => s.index('ref').getAll([refColecao, refId])).catch(() => [] as Anexo[])
const guardarLocal = (a: Anexo) => tx('anexos', 'readwrite', (s) => s.put(a)).catch(() => undefined)
const apagarLocal = (id: string) => tx('anexos', 'readwrite', (s) => s.delete(id)).catch(() => undefined)
const marcarPendente = (id: string, acao: 'enviar' | 'excluir') => tx('pendentes', 'readwrite', (s) => s.put({ id, acao })).catch(() => undefined)
const tirarPendente = (id: string) => tx('pendentes', 'readwrite', (s) => s.delete(id)).catch(() => undefined)

// ---------- nuvem ----------
let empresaAtual: string | null = null
export function definirEmpresaAnexos(id: string | null) {
  empresaAtual = id
  if (id) void enviarPendentes()
}

async function subir(a: Anexo): Promise<boolean> {
  if (!supabase || !empresaAtual) return false
  const { error } = await supabase.from('registros').upsert({
    empresa_id: empresaAtual,
    colecao: COLECAO_ANEXOS,
    id: a.id,
    dados: a,
    excluido: false,
  })
  return !error
}

async function excluirNuvem(id: string): Promise<boolean> {
  if (!supabase || !empresaAtual) return false
  const { error } = await supabase
    .from('registros')
    .update({ excluido: true, dados: {} })
    .eq('empresa_id', empresaAtual)
    .eq('colecao', COLECAO_ANEXOS)
    .eq('id', id)
  return !error
}

export async function enviarPendentes() {
  const pend = await tx<{ id: string; acao: 'enviar' | 'excluir' }[]>('pendentes', 'readonly', (s) => s.getAll()).catch(() => [])
  for (const p of pend) {
    if (p.acao === 'excluir') {
      if (await excluirNuvem(p.id)) await tirarPendente(p.id)
    } else {
      const a = await tx<Anexo | undefined>('anexos', 'readonly', (s) => s.get(p.id)).catch(() => undefined)
      if (!a || (await subir(a))) await tirarPendente(p.id)
    }
  }
}

/** Anexos de um registro: mostra na hora o que está no aparelho e completa com a nuvem. */
export async function listarAnexos(refColecao: string, refId: string, aoAtualizar: (lista: Anexo[]) => void) {
  const locais = await localDaRef(refColecao, refId)
  aoAtualizar(ordenar(locais))
  if (!supabase || !empresaAtual) return
  const { data, error } = await supabase
    .from('registros')
    .select('id,dados,excluido')
    .eq('empresa_id', empresaAtual)
    .eq('colecao', COLECAO_ANEXOS)
    .eq('dados->>refColecao', refColecao)
    .eq('dados->>refId', refId)
  if (error || !data) return
  const daNuvem = data.filter((l) => !l.excluido && l.dados).map((l) => l.dados as Anexo)
  for (const a of daNuvem) await guardarLocal(a)
  const pend = new Set((await tx<{ id: string }[]>('pendentes', 'readonly', (s) => s.getAll()).catch(() => [])).map((p) => p.id))
  // o que só existe no aparelho e não está pendente foi apagado por outra pessoa
  for (const a of locais) if (!pend.has(a.id) && !daNuvem.some((n) => n.id === a.id)) await apagarLocal(a.id)
  aoAtualizar(ordenar(await localDaRef(refColecao, refId)))
}

const ordenar = (l: Anexo[]) => [...l].sort((a, b) => a.criadoEm.localeCompare(b.criadoEm))

export async function adicionarAnexo(refColecao: string, refId: string, arquivo: File): Promise<Anexo> {
  const conteudo = arquivo.type.startsWith('image/') ? await reduzirImagem(arquivo) : await lerComoDataUrl(arquivo)
  const a: Anexo = {
    id: generateId(),
    refColecao,
    refId,
    nome: arquivo.name || 'arquivo',
    tipo: arquivo.type.startsWith('image/') ? 'image/jpeg' : arquivo.type || 'application/octet-stream',
    conteudo,
    tamanho: Math.round((conteudo.length * 3) / 4),
    criadoEm: new Date().toISOString(),
  }
  await guardarLocal(a)
  if (!(await subir(a))) await marcarPendente(a.id, 'enviar')
  return a
}

export async function removerAnexo(id: string) {
  await apagarLocal(id)
  await tirarPendente(id)
  if (!(await excluirNuvem(id))) await marcarPendente(id, 'excluir')
}

/** Quando um registro é apagado, os anexos dele vão junto. */
export async function removerAnexosDe(refColecao: string, refId: string) {
  const locais = await localDaRef(refColecao, refId)
  for (const a of locais) await removerAnexo(a.id)
  if (!supabase || !empresaAtual) return
  await supabase
    .from('registros')
    .update({ excluido: true, dados: {} })
    .eq('empresa_id', empresaAtual)
    .eq('colecao', COLECAO_ANEXOS)
    .eq('dados->>refColecao', refColecao)
    .eq('dados->>refId', refId)
}

export function validarArquivo(f: File): string | null {
  if (f.type.startsWith('image/')) return null
  if (f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf') || f.name.toLowerCase().endsWith('.xml')) {
    return f.size > MAX_BYTES_PDF ? `"${f.name}" passa de 3 MB. Envie uma foto ou um PDF menor.` : null
  }
  return `"${f.name}": envie foto, PDF ou XML da nota.`
}

function lerComoDataUrl(f: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(r.error)
    r.readAsDataURL(f)
  })
}

/** Foto de nota precisa dar para ler: lado maior até 1600px, JPEG 0.75 (~200 KB). */
async function reduzirImagem(f: File): Promise<string> {
  const url = await lerComoDataUrl(f)
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image()
    i.onload = () => resolve(i)
    i.onerror = () => reject(new Error('imagem inválida'))
    i.src = url
  })
  const escala = Math.min(1, 1600 / Math.max(img.width, img.height))
  const c = document.createElement('canvas')
  c.width = Math.round(img.width * escala)
  c.height = Math.round(img.height * escala)
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
  return c.toDataURL('image/jpeg', 0.75)
}
