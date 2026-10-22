import { makeEntry } from '@/test/factories'
import { costsByKind, costsByMonth, costsByYear } from './costs'

const entries = [
  makeEntry({ date: '2026-01-05', amountCents: 1000, kind: 'fuel' }),
  makeEntry({ date: '2026-01-20', amountCents: 2500, kind: 'maintenance' }),
  makeEntry({ date: '2025-12-31', amountCents: 500, kind: 'other' }),
  makeEntry({ date: '2026-02-01', amountCents: null, kind: 'repair' }),
]

test('costsByMonth sums non-empty months chronologically', () => {
  expect(costsByMonth(entries)).toEqual([
    { month: '2025-12', totalCents: 500 },
    { month: '2026-01', totalCents: 3500 },
  ])
})

test('costsByYear sums by calendar year', () => {
  expect(costsByYear(entries)).toEqual([
    { year: 2025, totalCents: 500 },
    { year: 2026, totalCents: 3500 },
  ])
})

test('costsByKind has every kind, zero by default', () => {
  expect(costsByKind(entries)).toEqual({ maintenance: 2500, repair: 0, fuel: 1000, other: 500 })
})
