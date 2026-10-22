import { addMonths, format, parseISO } from 'date-fns'

const NUMBER = /^\d+(?:[.,]\d+)?$/

function normalize(input: string): string {
  return input.replace(/[\s  €]/g, '')
}

/** Parses a user-typed decimal ("45,3", "1 234,5", "45.3"). */
export function parseDecimalFr(input: string): number | null {
  const s = normalize(input)
  if (!NUMBER.test(s)) return null
  return Number(s.replace(',', '.'))
}

/** Parses a euro amount into integer cents, working on the string to avoid float errors. */
export function parseEurosToCents(input: string): number | null {
  const s = normalize(input)
  if (!NUMBER.test(s)) return null
  const [int, frac = ''] = s.split(/[.,]/)
  const padded = frac.padEnd(3, '0')
  const roundUp = Number(padded[2]) >= 5 ? 1 : 0
  return Number(int) * 100 + Number(padded.slice(0, 2)) + roundUp
}

const euros = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
const integers = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })

export function formatEuros(cents: number): string {
  return euros.format(cents / 100)
}

export function formatKm(km: number): string {
  return `${integers.format(km)} km`
}

/** Today's date in the device's local calendar, as YYYY-MM-DD. */
export function todayLocal(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function addMonthsIso(date: string, months: number): string {
  return format(addMonths(parseISO(date), months), 'yyyy-MM-dd')
}
