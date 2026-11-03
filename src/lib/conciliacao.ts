import { addDays } from './dates'
import type { Movimento } from './gestao'
import type { ContaBancaria, Database, LinhaExtrato } from './types'

export interface TransacaoOfx {
  fitid: string
  data: string
  valor: number
  descricao: string
}

/** Lê o extrato OFX que todo banco exporta (versão 1 em SGML ou 2 em XML). */
export function lerOfx(texto: string): { transacoes: TransacaoOfx[]; saldoFinal?: number; banco?: string; conta?: string } | null {
  if (!/<OFX>/i.test(texto)) return null
  const campo = (bloco: string, tag: string) => bloco.match(new RegExp(`<${tag}>\\s*([^<\\r\\n]+)`, 'i'))?.[1]?.trim()
  const numero = (v?: string) =>
    v
      ? Number(
          v
            .replace(/\s/g, '')
            .replace(/,(\d{1,2})$/, '.$1')
            .replace(/,/g, ''),
        )
      : NaN
  const dataOfx = (v?: string) => (v && v.length >= 8 ? `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}` : '')
  const transacoes: TransacaoOfx[] = []
  for (const bloco of texto.split(/<STMTTRN>/i).slice(1)) {
    const corpo = bloco.split(/<\/STMTTRN>/i)[0]
    const valor = numero(campo(corpo, 'TRNAMT'))
    const data = dataOfx(campo(corpo, 'DTPOSTED'))
    if (!data || Number.isNaN(valor)) continue
    const descricao = [campo(corpo, 'NAME'), campo(corpo, 'MEMO')].filter(Boolean).join(' · ') || campo(corpo, 'TRNTYPE') || 'Transação'
    transacoes.push({ fitid: campo(corpo, 'FITID') || `${data}|${valor}|${descricao}`, data, valor, descricao })
  }
  const saldo = numero(campo(texto.split(/<LEDGERBAL>/i)[1] ?? '', 'BALAMT'))
  return { transacoes, saldoFinal: Number.isNaN(saldo) ? undefined : saldo, banco: campo(texto, 'BANKID'), conta: campo(texto, 'ACCTID') }
}

/** Saldo da conta pelo sistema: saldo inicial + tudo que foi pago/recebido por ela. */
export function saldoConta(conta: ContaBancaria, movs: Movimento[]): number {
  return movs
    .filter((m) => m.realizado && m.contaId === conta.id && m.data >= conta.dataSaldoInicial)
    .reduce((a, m) => a + (m.tipo === 'entrada' ? m.valor : -m.valor), conta.saldoInicial)
}

/** Saldo pelo extrato importado. */
export function saldoExtrato(conta: ContaBancaria, extrato: LinhaExtrato[]): number {
  return extrato.filter((l) => l.contaId === conta.id && l.data >= conta.dataSaldoInicial).reduce((a, l) => a + l.valor, conta.saldoInicial)
}

export interface Sugestao {
  colecao: 'lancamentos' | 'despesas'
  id: string
  descricao: string
  data: string
  valor: number
  pago: boolean
  pontos: number
}

/** Lançamentos do sistema que podem ser essa linha do extrato: mesmo valor, sentido certo e data próxima. */
export function sugestoes(db: Database, linha: LinhaExtrato): Sugestao[] {
  const jaUsados = new Set(db.extrato.filter((l) => l.conciliadoCom && l.id !== linha.id).map((l) => `${l.conciliadoCom!.colecao}:${l.conciliadoCom!.id}`))
  const valor = Math.abs(linha.valor)
  const perto = (d: string) => d >= addDays(linha.data, -10) && d <= addDays(linha.data, 10)
  const mesmoValor = (v: number) => Math.abs(v - valor) < 0.01
  const lista: Sugestao[] = []
  for (const l of db.lancamentos) {
    if (linha.valor > 0 !== (l.tipo === 'receita')) continue
    if (!mesmoValor(l.valor) || (l.contaId && l.contaId !== linha.contaId)) continue
    const data = l.pago ? (l.dataPagamento ?? l.vencimento) : l.vencimento
    if (!perto(data) || jaUsados.has(`lancamentos:${l.id}`)) continue
    lista.push({ colecao: 'lancamentos', id: l.id, descricao: l.descricao, data, valor: l.valor, pago: l.pago, pontos: data === linha.data ? 2 : 1 })
  }
  if (linha.valor < 0) {
    for (const d of db.despesas) {
      if (!mesmoValor(d.valor) || (d.contaId && d.contaId !== linha.contaId)) continue
      const data = d.pago === false ? (d.vencimento ?? d.data) : d.data
      if (!perto(data) || jaUsados.has(`despesas:${d.id}`)) continue
      lista.push({ colecao: 'despesas', id: d.id, descricao: d.descricao, data, valor: d.valor, pago: d.pago !== false, pontos: data === linha.data ? 2 : 1 })
    }
  }
  return lista.sort((a, b) => b.pontos - a.pontos).slice(0, 3)
}
