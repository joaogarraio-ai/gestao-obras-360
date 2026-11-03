import type { Endereco } from './types'

const digitos = (v: string) => v.replace(/\D/g, '')

/** Formata CPF (11 dígitos) ou CNPJ (14 dígitos) enquanto a pessoa digita. */
export function mascaraDocumento(v: string): string {
  const d = digitos(v).slice(0, 14)
  if (d.length <= 11) {
    return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  }
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

export function mascaraTelefone(v: string): string {
  const d = digitos(v).slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export function mascaraCep(v: string): string {
  const d = digitos(v).slice(0, 8)
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
}

/** Busca o endereço pelo CEP na ViaCEP. Devolve null se não achar ou sem internet. */
export async function buscarCep(cep: string): Promise<Partial<Endereco> | null> {
  const d = digitos(cep)
  if (d.length !== 8) return null
  try {
    const r = await fetch(`https://viacep.com.br/ws/${d}/json/`)
    const j = (await r.json()) as { erro?: boolean; logradouro?: string; bairro?: string; localidade?: string; uf?: string }
    if (j.erro) return null
    return { logradouro: j.logradouro || undefined, bairro: j.bairro || undefined, cidade: j.localidade || undefined, uf: j.uf || undefined }
  } catch {
    return null
  }
}

/** "Rua X, 10 · Centro · Cidade/UF" (só o que estiver preenchido). */
export function enderecoResumido(e: Endereco & { endereco?: string }): string {
  const rua = [e.logradouro, e.numero].filter(Boolean).join(', ')
  const cidade = [e.cidade, e.uf].filter(Boolean).join('/')
  const partes = [rua || e.endereco, e.bairro, cidade].filter(Boolean)
  return partes.join(' · ')
}

/** Copia só os campos de endereço, limpando os vazios. */
export function limparEndereco(e: Endereco): Endereco {
  const campos: (keyof Endereco)[] = ['cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf']
  const r: Endereco = {}
  for (const c of campos) {
    const v = e[c]?.trim()
    if (v) r[c] = v
  }
  return r
}
