import { Camera, FileText, Paperclip, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { adicionarAnexo, listarAnexos, removerAnexo, validarArquivo, type Anexo } from '../lib/anexos'

/** Abre um anexo numa aba nova (data URL direto é bloqueado pelos navegadores). */
function abrirAnexo(a: Anexo) {
  const [cab, base64] = a.conteudo.split(',')
  const mime = cab.match(/data:([^;]+)/)?.[1] ?? a.tipo
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }))
  window.open(url, '_blank', 'noopener')
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/** Fotos, PDFs e XMLs ligados a um registro (nota, despesa, compra...). */
export default function Anexos({
  refColecao,
  refId,
  editavel = true,
  titulo = 'Fotos e arquivos',
  compacto = false,
  onContagem,
}: {
  refColecao: string
  refId: string
  editavel?: boolean
  titulo?: string
  compacto?: boolean
  onContagem?: (n: number) => void
}) {
  const [lista, setLista] = useState<Anexo[]>([])
  const [enviando, setEnviando] = useState(0)
  const [erro, setErro] = useState<string | null>(null)
  const [ampliada, setAmpliada] = useState<Anexo | null>(null)
  const arquivoRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let vivo = true
    void listarAnexos(refColecao, refId, (l) => {
      if (vivo) setLista(l)
    })
    return () => {
      vivo = false
    }
  }, [refColecao, refId])

  useEffect(() => onContagem?.(lista.length), [lista.length, onContagem])

  async function aoEscolher(files: FileList | null) {
    if (!files?.length) return
    setErro(null)
    const validos: File[] = []
    for (const f of Array.from(files)) {
      const e = validarArquivo(f)
      if (e) setErro(e)
      else validos.push(f)
    }
    setEnviando((n) => n + validos.length)
    for (const f of validos) {
      try {
        const a = await adicionarAnexo(refColecao, refId, f)
        setLista((l) => [...l, a])
      } catch {
        setErro(`Não foi possível ler "${f.name}".`)
      }
      setEnviando((n) => n - 1)
    }
    if (arquivoRef.current) arquivoRef.current.value = ''
    if (cameraRef.current) cameraRef.current.value = ''
  }

  async function remover(a: Anexo) {
    if (!confirm(`Remover "${a.nome}"?`)) return
    setLista((l) => l.filter((x) => x.id !== a.id))
    await removerAnexo(a.id)
  }

  if (!editavel && lista.length === 0) return null

  return (
    <div className="space-y-2">
      {!compacto && <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{titulo}</p>}
      <div className="flex flex-wrap gap-2">
        {lista.map((a) => (
          <div key={a.id} className="relative group">
            <button
              type="button"
              onClick={() => (a.tipo.startsWith('image/') ? setAmpliada(a) : abrirAnexo(a))}
              className="block h-20 w-20 overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
              title={a.nome}
            >
              {a.tipo.startsWith('image/') ? (
                <img src={a.conteudo} alt={a.nome} className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full flex-col items-center justify-center gap-1 p-1 text-[10px] text-slate-600">
                  <FileText className="h-6 w-6 text-red-500" />
                  <span className="w-full truncate text-center">{a.nome}</span>
                </span>
              )}
            </button>
            {editavel && (
              <button
                type="button"
                onClick={() => remover(a)}
                className="absolute -right-1.5 -top-1.5 rounded-full bg-white p-0.5 text-slate-500 shadow ring-1 ring-slate-200 hover:text-red-600"
                aria-label={`Remover ${a.nome}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
        {Array.from({ length: enviando }).map((_, i) => (
          <div key={`env${i}`} className="h-20 w-20 animate-pulse rounded-lg bg-slate-100" />
        ))}
        {editavel && (
          <>
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 text-[11px] text-slate-500 hover:border-brand-400 hover:text-brand-700"
            >
              <Camera className="h-5 w-5" /> Tirar foto
            </button>
            <button
              type="button"
              onClick={() => arquivoRef.current?.click()}
              className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 text-[11px] text-slate-500 hover:border-brand-400 hover:text-brand-700"
            >
              <Paperclip className="h-5 w-5" /> Arquivo
            </button>
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => aoEscolher(e.target.files)} />
            <input
              ref={arquivoRef}
              type="file"
              accept="image/*,application/pdf,.pdf,.xml,text/xml,application/xml"
              multiple
              className="hidden"
              onChange={(e) => aoEscolher(e.target.files)}
            />
          </>
        )}
      </div>
      {erro && <p className="text-xs text-red-600">{erro}</p>}

      {ampliada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setAmpliada(null)}>
          <img src={ampliada.conteudo} alt={ampliada.nome} className="max-h-full max-w-full rounded-lg" />
          <button className="absolute right-4 top-4 rounded-full bg-white/90 p-2" aria-label="Fechar" onClick={() => setAmpliada(null)}>
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  )
}
