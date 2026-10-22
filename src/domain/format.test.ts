import { addMonthsIso, formatKm, parseDecimalFr, parseEurosToCents, todayLocal } from './format'

const norm = (s: string) => s.replace(/\s/g, ' ')

describe('parseDecimalFr', () => {
  test('accepts a French decimal comma', () => expect(parseDecimalFr('45,3')).toBe(45.3))
  test('accepts a dot and surrounding spaces', () => expect(parseDecimalFr(' 45.3 ')).toBe(45.3))
  test('accepts thousands separators', () => expect(parseDecimalFr('1 234,5')).toBe(1234.5))
  test('rejects text', () => expect(parseDecimalFr('abc')).toBeNull())
  test('rejects empty input', () => expect(parseDecimalFr('')).toBeNull())
})

describe('parseEurosToCents', () => {
  test('converts euros with comma', () => expect(parseEurosToCents('12,50')).toBe(1250))
  test('avoids float errors', () => expect(parseEurosToCents('0,1')).toBe(10))
  test('ignores the euro sign', () => expect(parseEurosToCents('19,99 €')).toBe(1999))
  test('rounds to the cent', () => expect(parseEurosToCents('1,005')).toBe(101))
  test('rejects negative amounts', () => expect(parseEurosToCents('-3')).toBeNull())
})

test('formatKm groups thousands', () => {
  expect(norm(formatKm(123456))).toBe('123 456 km')
})

describe('addMonthsIso', () => {
  test('clamps to the end of a shorter month', () => expect(addMonthsIso('2026-01-31', 1)).toBe('2026-02-28'))
  test('adds a year', () => expect(addMonthsIso('2026-10-22', 12)).toBe('2027-10-22'))
})

test('todayLocal uses the local calendar date', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 22, 23, 30))
  expect(todayLocal()).toBe('2026-10-22')
  vi.useRealTimers()
})
