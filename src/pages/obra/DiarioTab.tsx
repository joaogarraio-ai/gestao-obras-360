import { useState } from 'react'
import { useStore } from '../../lib/store'
import { formatDatePt, toISODate, weekdayLabel } from '../../lib/dates'
import { CLIMA_LABEL } from '../../lib/types'
import type { Clima, DiarioObra, Obra } from '../../lib/types'
import { Button, Card, EmptyState, Field, Input, Select } from '../../components/ui'

const MAX_FOTOS = 4

/** Reduz a foto para caber no armazenamento do celular (lado maior 800px, JPEG). */
function reduzirFoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const escala = Math.min(1, 800 / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * escala)
      canvas.height = Math.round(img.height * escala)
      canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.6))
    }
    img.onerror = reject
    img.src = url
  })
}

type Form = Omit<DiarioObra, 'id' | 'obraId'> & { id?: string }

export default function DiarioTab({ obra }: { obra: Obra }) {
  const { db, addItem, updateItem, removeItem } = useStore()
  const [form, setForm] = useState<Form | null>(null)

  const diarios = db.diarios.filter((d) => d.obraId === obra.id).sort((a, b) => b.data.localeCompare(a.data))

  function efetivoDoDia(data: string): number {
    return db.registrosDia.filter((r) => r.obraId === obra.id && r.data === data && r.status !== 'falta').length
  }

  function novo() {
    const data = toISODate(new Date())
    setForm({ data, climaManha: 'sol', climaTarde: 'sol', efetivo: efetivoDoDia(data), atividades: '', ocorrencias: '', fotos: [] })
  }

  async function adicionarFotos(files: FileList | null) {
    if (!form || !files) return
    const novas = await Promise.all(Array.from(files).slice(0, MAX_FOTOS - form.fotos.length).map(reduzirFoto))
    setForm({ ...form, fotos: [...form.fotos, ...novas] })
  }

  function salvar() {
    if (!form || !form.atividades.trim()) return
    const { id, ...dados } = form
    const registro = { ...dados, obraId: obra.id, atividades: dados.atividades.trim(), ocorrencias: dados.ocorrencias?.trim() || undefined }
    try {
      if (id) updateItem('diarios', id, registro)
      else addItem('diarios', registro)
      setForm(null)
    } catch {
      alert('Não foi possível salvar. A memória do aparelho pode estar cheia; tente com menos fotos.')
    }
  }

  return (
    <div className="space-y-3">
      {!form && (
        <div className="flex gap-2 no-print">
          <Button className="flex-1" onClick={novo}>
            + Registro do dia (RDO)
          </Button>
          {diarios.length > 0 && (
            <Button variant="secondary" onClick={() => window.print()}>
              🖨️
            </Button>
          )}
        </div>
      )}

      {form && (
        <Card className="p-4 space-y-3 border-amber-400">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Data">
              <Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
            </Field>
            <Field label="Efetivo (pessoas)">
              <Input type="number" min={0} value={form.efetivo} onChange={(e) => setForm({ ...form, efetivo: Number(e.target.value) })} />
            </Field>
            <Field label="Clima manhã">
              <Select value={form.climaManha} onChange={(e) => setForm({ ...form, climaManha: e.target.value as Clima })}>
                {Object.entries(CLIMA_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Clima tarde">
              <Select value={form.climaTarde} onChange={(e) => setForm({ ...form, climaTarde: e.target.value as Clima })}>
                {Object.entries(CLIMA_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          {efetivoDoDia(form.data) > 0 && <p className="text-xs text-stone-500">{efetivoDoDia(form.data)} trabalhador(es) lançados em Dias nesta data.</p>}
          <Field label="Atividades executadas">
            <textarea
              className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-base min-h-24 focus:border-amber-600 focus:outline-none"
              value={form.atividades}
              onChange={(e) => setForm({ ...form, atividades: e.target.value })}
            />
          </Field>
          <Field label="Ocorrências / observações">
            <textarea
              className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-base min-h-16 focus:border-amber-600 focus:outline-none"
              value={form.ocorrencias ?? ''}
              onChange={(e) => setForm({ ...form, ocorrencias: e.target.value })}
            />
          </Field>
          <Field label={`Fotos (até ${MAX_FOTOS})`}>
            <div className="flex flex-wrap gap-2">
              {form.fotos.map((f, i) => (
                <button key={i} className="relative" onClick={() => setForm({ ...form, fotos: form.fotos.filter((_, j) => j !== i) })}>
                  <img src={f} className="h-20 w-20 object-cover rounded-lg" alt="" />
                  <span className="absolute top-0.5 right-1 text-white text-xs drop-shadow">✕</span>
                </button>
              ))}
              {form.fotos.length < MAX_FOTOS && (
                <label className="h-20 w-20 rounded-lg border border-dashed border-stone-300 flex items-center justify-center text-2xl text-stone-400 cursor-pointer">
                  📷
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => adicionarFotos(e.target.files)} />
                </label>
              )}
            </div>
          </Field>
          <div className="flex gap-2">
            <Button onClick={salvar} className="flex-1">
              Salvar
            </Button>
            <Button variant="secondary" onClick={() => setForm(null)}>
              Cancelar
            </Button>
          </div>
        </Card>
      )}

      {diarios.length === 0 && !form && <EmptyState text="Nenhum registro no diário de obra." />}

      {diarios.map((d) => (
        <Card key={d.id} className="p-3 break-inside-avoid">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-stone-800">
                {weekdayLabel(d.data)}, {formatDatePt(d.data)}
              </p>
              <p className="text-xs text-stone-500">
                Manhã {CLIMA_LABEL[d.climaManha]} · Tarde {CLIMA_LABEL[d.climaTarde]} · {d.efetivo} pessoa(s)
              </p>
            </div>
            <div className="flex shrink-0 no-print">
              <Button variant="ghost" className="px-2" onClick={() => setForm({ ...d, ocorrencias: d.ocorrencias ?? '' })}>
                ✏️
              </Button>
              <Button
                variant="ghost"
                className="px-2"
                onClick={() => {
                  if (confirm('Excluir este registro?')) removeItem('diarios', d.id)
                }}
              >
                🗑️
              </Button>
            </div>
          </div>
          <p className="text-sm text-stone-700 mt-2 whitespace-pre-line">{d.atividades}</p>
          {d.ocorrencias && <p className="text-sm text-red-700 mt-1 whitespace-pre-line">⚠️ {d.ocorrencias}</p>}
          {d.fotos.length > 0 && (
            <div className="flex gap-2 mt-2 flex-wrap">
              {d.fotos.map((f, i) => (
                <img key={i} src={f} className="h-24 w-24 object-cover rounded-lg" alt="" />
              ))}
            </div>
          )}
        </Card>
      ))}
    </div>
  )
}
