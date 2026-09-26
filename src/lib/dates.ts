export const DIAS_SEMANA_LABEL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
export const DIAS_SEMANA_CURTO = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(iso: string, days: number): string {
  const date = fromISODate(iso)
  date.setDate(date.getDate() + days)
  return toISODate(date)
}

/** Retorna a segunda-feira da semana que contém a data informada (ou hoje). */
export function getMondayOfWeek(iso?: string): string {
  const date = iso ? fromISODate(iso) : new Date()
  const dayOfWeek = date.getDay() // 0=domingo
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  date.setDate(date.getDate() + diffToMonday)
  return toISODate(date)
}

/** Segunda a sábado (6 dias) a partir da segunda-feira informada. */
export function getWeekRange(mondayIso: string): { start: string; end: string; days: string[] } {
  const days: string[] = []
  for (let i = 0; i < 6; i++) {
    days.push(addDays(mondayIso, i))
  }
  return { start: days[0], end: days[days.length - 1], days }
}

export function formatDatePt(iso: string): string {
  const date = fromISODate(iso)
  return date.toLocaleDateString('pt-BR')
}

export function formatDateShortPt(iso: string): string {
  const date = fromISODate(iso)
  const dia = String(date.getDate()).padStart(2, '0')
  const mes = String(date.getMonth() + 1).padStart(2, '0')
  return `${dia}/${mes}`
}

export function weekdayLabel(iso: string, short = false): string {
  const date = fromISODate(iso)
  return (short ? DIAS_SEMANA_CURTO : DIAS_SEMANA_LABEL)[date.getDay()]
}

export function isBetween(iso: string, start: string, end: string): boolean {
  return iso >= start && iso <= end
}
