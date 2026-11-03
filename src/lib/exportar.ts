/** Gera um arquivo .csv que o Excel brasileiro abre direto (separador ";" e vírgula decimal). */
export function baixarPlanilha(nomeArquivo: string, cabecalho: string[], linhas: (string | number | undefined)[][]) {
  const celula = (v: string | number | undefined) => {
    if (v === undefined) return ''
    const texto = typeof v === 'number' ? v.toFixed(2).replace('.', ',') : v
    return /[;"\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
  }
  const csv = [cabecalho, ...linhas].map((l) => l.map(celula).join(';')).join('\r\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeArquivo.endsWith('.csv') ? nomeArquivo : `${nomeArquivo}.csv`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
