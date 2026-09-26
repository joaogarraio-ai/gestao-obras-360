export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function parseMoneyInput(value: string): number {
  const cleaned = value.replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3},)/g, '')
  const normalized = cleaned.replace(',', '.')
  const parsed = parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}
