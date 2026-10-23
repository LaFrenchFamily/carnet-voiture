import type { Category } from '@/domain/categories'
import type { EntryKind } from '@/domain/types'
import {
  AMOUNT_KEYWORDS, AMOUNT_RE, FUEL_FILTER_RE, CATEGORY_WORDS, DATE_HINT_RE, DECIMAL_RE, FUEL_WORDS, INTEGER_RE, KNOWN_GARAGES,
  LITERS_HINT_RE, LITERS_RE, MAINTENANCE_WORDS, MONTHS, normalize, NOT_GARAGE_RE, NUMERIC_DATE_RE, ODOMETER_LABEL_RE, ODOMETER_UNIT_RE,
  REPAIR_WORDS, WEAK_MAINTENANCE_WORDS, WORD_DATE_RE,
} from './patterns'

export interface InvoiceGuess {
  kind: EntryKind | null
  date: string | null
  amountCents: number | null
  odometer: number | null
  garage: string | null
  category: Category | null
  liters: number | null
}

export const EMPTY_GUESS: InvoiceGuess = {
  kind: null, date: null, amountCents: null, odometer: null, garage: null, category: null, liters: null,
}

const MAX_GARAGE_LENGTH = 60
const MIN_DATE = '1990-01-01'

const digitsOnly = (s: string) => s.replace(/[ .]/g, '')
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function amountsIn(s: string): number[] {
  return [...s.matchAll(AMOUNT_RE)].map((m) => Number(digitsOnly(m[1])) * 100 + Number(m[2]))
}

/** The largest amount after the most reliable keyword found, on its line or the next one. */
function findAmount(lines: string[]): number | null {
  for (const keyword of AMOUNT_KEYWORDS) {
    const re = new RegExp(`\\b${escapeRe(keyword)}\\b`)
    const found: number[] = []
    lines.forEach((line, i) => {
      const m = re.exec(line)
      if (!m) return
      const after = amountsIn(line.slice(m.index + m[0].length))
      found.push(...(after.length > 0 ? after : amountsIn(lines[i + 1] ?? '')))
    })
    if (found.length > 0) return Math.max(...found)
  }
  return null
}

function isoDate(day: number, month: number, year: number): string | null {
  const d = new Date(Date.UTC(year, month - 1, day))
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null
  return d.toISOString().slice(0, 10)
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** The date next to "date", "facture" or "le", else the latest plausible one. */
function findDate(text: string, today: string): string | null {
  const max = addDays(today, 1)
  const century = Number(today.slice(0, 2)) * 100
  const candidates: { iso: string; hinted: boolean }[] = []
  const push = (iso: string | null, index: number) => {
    if (!iso || iso < MIN_DATE || iso > max) return
    candidates.push({ iso, hinted: DATE_HINT_RE.test(text.slice(Math.max(0, index - 25), index)) })
  }
  for (const m of text.matchAll(NUMERIC_DATE_RE)) {
    let year = Number(m[3])
    if (m[3].length === 2) year += year + century <= Number(max.slice(0, 4)) ? century : century - 100
    push(isoDate(Number(m[1]), Number(m[2]), year), m.index)
  }
  for (const m of text.matchAll(WORD_DATE_RE)) {
    push(isoDate(Number(m[1]), MONTHS.indexOf(m[2]) + 1, Number(m[3])), m.index)
  }
  const hinted = candidates.find((c) => c.hinted)
  if (hinted) return hinted.iso
  return candidates.map((c) => c.iso).sort().at(-1) ?? null
}

/** The whole number right after "kilometrage"/"compteur" or right before "km", on the same line. */
function findOdometer(lines: string[]): number | null {
  let best: { value: number; distance: number } | null = null
  for (const line of lines) {
    const labels = [...line.matchAll(ODOMETER_LABEL_RE)].map((m) => m.index + m[0].length)
    const units = [...line.matchAll(ODOMETER_UNIT_RE)].map((m) => m.index)
    if (labels.length === 0 && units.length === 0) continue
    for (const m of line.matchAll(INTEGER_RE)) {
      const digits = digitsOnly(m[1])
      const value = Number(digits)
      if (digits.length > 7 || value < 1 || value > 2_000_000) continue
      const end = m.index + m[0].length
      const distances = [...labels.map((l) => m.index - l), ...units.map((u) => u - end)].filter((d) => d >= 0)
      if (distances.length === 0) continue
      const distance = Math.min(...distances)
      if (!best || distance < best.distance) best = { value, distance }
    }
  }
  return best?.value ?? null
}

function findLiters(lines: string[]): number | null {
  for (const line of lines) {
    const m = LITERS_RE.exec(line) ?? (LITERS_HINT_RE.test(line) ? DECIMAL_RE.exec(line.replace(/^.*?(volume|quantite)/, '')) : null)
    if (!m) continue
    const value = Number(m[1].replace(',', '.'))
    if (value >= 1 && value <= 200) return value
  }
  return null
}

function findGarage(text: string, rawLines: string[]): string | null {
  const brand = KNOWN_GARAGES.find((g) => new RegExp(`\\b${escapeRe(normalize(g))}\\b`).test(text))
  if (brand) return brand
  const header = rawLines.slice(0, 5).map((l) => l.trim()).find((line) => {
    const n = normalize(line)
    return (n.match(/[a-z]/g)?.length ?? 0) >= 3 && !NOT_GARAGE_RE.test(n) && !new RegExp(NUMERIC_DATE_RE.source).test(n)
      && amountsIn(n).length === 0
  })
  return header ? header.slice(0, MAX_GARAGE_LENGTH).trim() : null
}

function findKind(text: string, garage: string | null): EntryKind | null {
  if (MAINTENANCE_WORDS.test(text)) return 'maintenance'
  if (FUEL_WORDS.test(text.replace(FUEL_FILTER_RE, ' '))) return 'fuel'
  if (REPAIR_WORDS.test(text)) return 'repair'
  if (WEAK_MAINTENANCE_WORDS.test(text) || garage) return 'maintenance'
  return null
}

/** Guesses the fields of a journal entry from an invoice's text. Every field it cannot find is null. */
export function parseInvoice(rawText: string, today: string): InvoiceGuess {
  const rawLines = rawText.split(/\r?\n/).filter((l) => l.trim() !== '')
  const lines = rawLines.map(normalize)
  const text = lines.join('\n')
  const garage = findGarage(text, rawLines)
  const kind = findKind(text, garage)
  return {
    kind,
    date: findDate(text, today),
    amountCents: findAmount(lines),
    odometer: findOdometer(lines),
    garage,
    category: CATEGORY_WORDS.find(([, re]) => re.test(text))?.[0] ?? null,
    liters: kind === 'fuel' ? findLiters(lines) : null,
  }
}
