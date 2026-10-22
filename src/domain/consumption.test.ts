import { fuel, makeEntry } from '@/test/factories'
import { averageConsumption, consumptionIntervals } from './consumption'

test('two full tanks give one interval', () => {
  const r = consumptionIntervals([fuel('2026-01-01', 10000, 40, true), fuel('2026-01-15', 10500, 35, true)])
  expect(r).toEqual([{ fromKm: 10000, toKm: 10500, liters: 35, lPer100: expect.closeTo(7) }])
})

test('partial fills are added to the next full tank', () => {
  const r = consumptionIntervals([
    fuel('2026-01-01', 10000, 40, true),
    fuel('2026-01-10', 10300, 20, false),
    fuel('2026-01-15', 10500, 15, true),
  ])
  expect(r).toEqual([{ fromKm: 10000, toKm: 10500, liters: 35, lPer100: expect.closeTo(7) }])
})

test('a single full tank is not enough', () => {
  const entries = [fuel('2026-01-01', 10000, 40, true)]
  expect(consumptionIntervals(entries)).toEqual([])
  expect(averageConsumption(entries)).toBeNull()
})

test('a full tank without odometer resets the anchor', () => {
  const r = consumptionIntervals([
    fuel('2026-01-01', 10000, 40, true),
    fuel('2026-01-10', null, 30, true),
    fuel('2026-01-20', 11000, 30, true),
  ])
  expect(r).toEqual([])
})

test('a decreasing odometer is ignored, without NaN or Infinity', () => {
  const entries = [fuel('2026-01-01', 10000, 40, true), fuel('2026-01-10', 9800, 30, true)]
  expect(consumptionIntervals(entries)).toEqual([])
  expect(averageConsumption(entries)).toBeNull()
})

test('the average is weighted by distance', () => {
  const entries = [
    fuel('2026-01-01', 10000, 40, true),
    fuel('2026-01-10', 10500, 35, true),
    fuel('2026-01-20', 11500, 40, true),
  ]
  expect(averageConsumption(entries)).toBeCloseTo(5)
})

test('non-fuel entries and input order are ignored', () => {
  const entries = [
    fuel('2026-01-15', 10500, 35, true),
    makeEntry({ kind: 'maintenance', date: '2026-01-05', odometer: 10200 }),
    fuel('2026-01-01', 10000, 40, true),
  ]
  expect(consumptionIntervals(entries)).toEqual([{ fromKm: 10000, toKm: 10500, liters: 35, lPer100: expect.closeTo(7) }])
})
