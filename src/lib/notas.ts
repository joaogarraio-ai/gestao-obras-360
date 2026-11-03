import { generateId } from './id'
import type { Endereco, ItemNota, ModeloNota, NotaFiscal } from './types'

const digitos = (v: string) => v.replace(/\D/g, '')

export function mascaraChave(v: string): string {
  return digitos(v)
    .slice(0, 44)
    .replace(/(\d{4})(?=\d)/g, '$1 ')
}

/** Confere o dígito verificador (módulo 11) da chave de acesso de 44 números. */
export function chaveValida(chave: string): boolean {
  const d = digitos(chave)
  if (d.length !== 44) return false
  let soma = 0
  let peso = 2
  for (let i = 42; i >= 0; i--) {
    soma += Number(d[i]) * peso
    peso = peso === 9 ? 2 : peso + 1
  }
  const resto = soma % 11
  const dv = resto < 2 ? 0 : 11 - resto
  return dv === Number(d[43])
}

/** Tira da chave de acesso: CNPJ do emitente, modelo, série, número e mês de emissão. */
export function lerChave(chave: string): {
  cnpj: string
  modelo: ModeloNota
  serie: string
  numero: string
  mesEmissao: string
} | null {
  const d = digitos(chave)
  if (d.length !== 44) return null
  const mod = d.slice(20, 22)
  return {
    cnpj: d.slice(6, 20),
    modelo: mod === '65' ? 'nfce' : mod === '57' ? 'cte' : 'nfe',
    serie: String(Number(d.slice(22, 25))),
    numero: String(Number(d.slice(25, 34))),
    mesEmissao: `20${d.slice(2, 4)}-${d.slice(4, 6)}`,
  }
}

export interface ParcelaXml {
  numero: string
  vencimento: string
  valor: number
}

export interface NotaDoXml {
  nota: Partial<NotaFiscal>
  emitente: {
    nome: string
    documento: string
    telefone?: string
    email?: string
  } & Endereco
  destinatario: { nome: string; documento: string }
  parcelas: ParcelaXml[]
}

/** Lê o XML da NF-e (o arquivo que o fornecedor manda por e-mail) e preenche a nota inteira. */
export function lerXmlNfe(texto: string): NotaDoXml | null {
  const doc = new DOMParser().parseFromString(texto, 'text/xml')
  if (doc.getElementsByTagName('parsererror').length) return null
  const inf = doc.getElementsByTagName('infNFe')[0]
  if (!inf) return null
  const um = (pai: Element | Document | undefined, tag: string) => pai?.getElementsByTagName(tag)[0]
  const txt = (pai: Element | Document | undefined, tag: string) => um(pai, tag)?.textContent?.trim() ?? ''
  const num = (pai: Element | Document | undefined, tag: string) => Number(txt(pai, tag)) || 0

  const ide = um(inf, 'ide')
  const emit = um(inf, 'emit')
  const ender = um(emit, 'enderEmit')
  const dest = um(inf, 'dest')
  const tot = um(inf, 'ICMSTot')
  const mod = txt(ide, 'mod')

  const itens: ItemNota[] = Array.from(inf.getElementsByTagName('det')).map((det) => {
    const prod = um(det, 'prod')
    return {
      id: generateId(),
      codigo: txt(prod, 'cProd') || undefined,
      descricao: txt(prod, 'xProd'),
      quantidade: num(prod, 'qCom'),
      unidade: txt(prod, 'uCom') || 'un',
      valorUnitario: num(prod, 'vUnCom'),
      ncm: txt(prod, 'NCM') || undefined,
    }
  })

  const cep = txt(ender, 'CEP')
  const parcelas = Array.from(inf.getElementsByTagName('dup')).map((d) => ({
    numero: txt(d, 'nDup'),
    vencimento: txt(d, 'dVenc'),
    valor: num(d, 'vDup'),
  }))

  const pis = num(tot, 'vPIS') + num(tot, 'vCOFINS')
  return {
    nota: {
      modelo: mod === '65' ? 'nfce' : 'nfe',
      numero: txt(ide, 'nNF'),
      serie: txt(ide, 'serie') || undefined,
      chaveAcesso: digitos(inf.getAttribute('Id') ?? '') || undefined,
      dataEmissao: (txt(ide, 'dhEmi') || txt(ide, 'dEmi')).slice(0, 10),
      naturezaOperacao: txt(ide, 'natOp') || undefined,
      itens,
      valorProdutos: num(tot, 'vProd'),
      valorServicos: 0,
      desconto: num(tot, 'vDesc'),
      frete: num(tot, 'vFrete'),
      outrasDespesas: num(tot, 'vOutro') + num(tot, 'vSeg'),
      valorTotal: num(tot, 'vNF'),
      valorICMS: num(tot, 'vICMS') + num(tot, 'vST') || undefined,
      valorIPI: num(tot, 'vIPI') || undefined,
      valorPisCofins: pis || undefined,
    },
    emitente: {
      nome: txt(emit, 'xNome'),
      documento: txt(emit, 'CNPJ') || txt(emit, 'CPF'),
      telefone: txt(ender, 'fone') || undefined,
      cep: cep ? `${cep.slice(0, 5)}-${cep.slice(5)}` : undefined,
      logradouro: txt(ender, 'xLgr') || undefined,
      numero: txt(ender, 'nro') || undefined,
      complemento: txt(ender, 'xCpl') || undefined,
      bairro: txt(ender, 'xBairro') || undefined,
      cidade: txt(ender, 'xMun') || undefined,
      uf: txt(ender, 'UF') || undefined,
    },
    destinatario: {
      nome: txt(dest, 'xNome'),
      documento: txt(dest, 'CNPJ') || txt(dest, 'CPF'),
    },
    parcelas,
  }
}

export const somaItens = (itens: ItemNota[]) => itens.reduce((a, i) => a + i.quantidade * i.valorUnitario, 0)

/** Divide o total em parcelas, jogando o centavo que sobra na última. */
export function dividirParcelas(total: number, n: number, primeiroVenc: string, intervaloDias: number): ParcelaXml[] {
  const base = Math.floor((total / n) * 100) / 100
  const lista: ParcelaXml[] = []
  const [y, m, d] = primeiroVenc.split('-').map(Number)
  for (let i = 0; i < n; i++) {
    const data = intervaloDias === 30 ? new Date(y, m - 1 + i, d) : new Date(y, m - 1, d + i * intervaloDias)
    const iso = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`
    lista.push({
      numero: `${i + 1}/${n}`,
      vencimento: iso,
      valor: i === n - 1 ? Math.round((total - base * (n - 1)) * 100) / 100 : base,
    })
  }
  return lista
}

export const mesmoDocumento = (a?: string, b?: string) => !!a && !!b && digitos(a) === digitos(b) && digitos(a).length >= 11
