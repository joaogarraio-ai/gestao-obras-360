import { useRef, useState } from 'react'
import { useStore } from '../lib/store'
import { toISODate } from '../lib/dates'
import type { Database } from '../lib/types'
import { Button, Card } from './ui'

/** Exporta todos os dados num arquivo .json e importa de volta (substitui os dados atuais). */
export default function Backup() {
  const { db, replaceDatabase } = useStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<string | null>(null)

  function exportar() {
    const blob = new Blob([JSON.stringify({ app: 'obra360', versao: 1, exportadoEm: new Date().toISOString(), dados: db }, null, 2)], {
      type: 'application/json',
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `obra360-backup-${toISODate(new Date())}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  async function importar(file: File | undefined) {
    if (!file) return
    try {
      const json = JSON.parse(await file.text()) as { app?: string; dados?: Partial<Database> } & Partial<Database>
      const dados = json.app === 'obra360' ? json.dados : json
      if (!dados || !Array.isArray(dados.obras)) throw new Error('arquivo inválido')
      if (!confirm('Substituir TODOS os dados atuais pelos do backup? Isso não pode ser desfeito.')) return
      replaceDatabase((prev) => {
        const novo = { ...prev }
        for (const k of Object.keys(prev) as (keyof Database)[]) {
          ;(novo as Record<string, unknown>)[k] = Array.isArray(dados[k]) ? dados[k] : []
        }
        return novo
      })
      setMsg('Backup importado.')
    } catch {
      setMsg('Não foi possível ler este arquivo. Use um backup exportado pelo Obra 360.')
    } finally {
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <Card className="p-4 space-y-2">
      <p className="font-semibold text-stone-700">Backup</p>
      <p className="text-xs text-stone-500">Guarde uma cópia de todos os dados num arquivo, ou restaure de um arquivo salvo antes.</p>
      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={exportar}>
          ⬇️ Exportar
        </Button>
        <Button variant="secondary" className="flex-1" onClick={() => inputRef.current?.click()}>
          ⬆️ Importar
        </Button>
        <input ref={inputRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => importar(e.target.files?.[0])} />
      </div>
      {msg && <p className="text-xs text-stone-600">{msg}</p>}
    </Card>
  )
}
