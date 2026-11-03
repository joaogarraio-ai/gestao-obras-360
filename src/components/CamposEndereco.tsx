import { useState } from 'react'
import { buscarCep, mascaraCep } from '../lib/formatos'
import { UFS, type Endereco } from '../lib/types'
import { Field, Input, Select } from './ui'

/** Campos de endereço com preenchimento automático pelo CEP. */
export default function CamposEndereco({ valor, onChange }: { valor: Endereco; onChange: (e: Endereco) => void }) {
  const [buscando, setBuscando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const set = (patch: Partial<Endereco>) => onChange({ ...valor, ...patch })

  async function aoMudarCep(texto: string) {
    const cep = mascaraCep(texto)
    set({ cep })
    setAviso(null)
    if (cep.replace(/\D/g, '').length !== 8) return
    setBuscando(true)
    const achado = await buscarCep(cep)
    setBuscando(false)
    if (achado) onChange({ ...valor, cep, ...achado })
    else setAviso('CEP não encontrado. Preencha o endereço à mão.')
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[8rem_1fr] gap-2">
        <Field label="CEP">
          <Input value={valor.cep ?? ''} onChange={(e) => aoMudarCep(e.target.value)} inputMode="numeric" placeholder="00000-000" />
        </Field>
        <Field label="Rua / logradouro">
          <Input value={valor.logradouro ?? ''} onChange={(e) => set({ logradouro: e.target.value })} placeholder={buscando ? 'Buscando…' : ''} />
        </Field>
      </div>
      {aviso && <p className="text-xs text-amber-600 -mt-1">{aviso}</p>}
      <div className="grid grid-cols-[6rem_1fr] gap-2">
        <Field label="Número">
          <Input value={valor.numero ?? ''} onChange={(e) => set({ numero: e.target.value })} />
        </Field>
        <Field label="Complemento">
          <Input value={valor.complemento ?? ''} onChange={(e) => set({ complemento: e.target.value })} placeholder="Ex: Lote 4, Quadra B" />
        </Field>
      </div>
      <div className="grid grid-cols-[1fr_1fr_5.5rem] gap-2">
        <Field label="Bairro / localidade">
          <Input value={valor.bairro ?? ''} onChange={(e) => set({ bairro: e.target.value })} />
        </Field>
        <Field label="Cidade">
          <Input value={valor.cidade ?? ''} onChange={(e) => set({ cidade: e.target.value })} />
        </Field>
        <Field label="UF">
          <Select value={valor.uf ?? ''} onChange={(e) => set({ uf: e.target.value || undefined })}>
            <option value="">—</option>
            {UFS.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </div>
  )
}
