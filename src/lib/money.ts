export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function parseMoneyInput(value: string): number {
  const cleaned = value.replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3},)/g, '')
  const normalized = cleaned.replace(',', '.')
  const parsed = parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

export function formatNumero(value: number, casas = 2): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: casas })
}

export function numeroParaInput(value: number | undefined): string {
  return value === undefined || value === 0 ? '' : String(value).replace('.', ',')
}
