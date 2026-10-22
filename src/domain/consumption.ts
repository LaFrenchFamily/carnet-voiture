import type { Entry } from './types'

export interface ConsumptionInterval {
  fromKm: number
  toKm: number
  liters: number
  lPer100: number
}

/** Full-to-full method: liters poured after a full tank, divided by the distance to the next full tank. */
export function consumptionIntervals(entries: Entry[]): ConsumptionInterval[] {
  const fuels = entries
    .filter((e) => e.kind === 'fuel')
    .sort((a, b) => a.date.localeCompare(b.date) || (a.odometer ?? Infinity) - (b.odometer ?? Infinity))

  const intervals: ConsumptionInterval[] = []
  let anchor: number | null = null
  let liters = 0
  for (const f of fuels) {
    if (anchor !== null) liters += f.liters ?? 0
    if (!f.fullTank) continue
    if (f.odometer === null) {
      anchor = null
    } else {
      if (anchor !== null && f.odometer > anchor) {
        intervals.push({ fromKm: anchor, toKm: f.odometer, liters, lPer100: (liters / (f.odometer - anchor)) * 100 })
      }
      anchor = f.odometer
    }
    liters = 0
  }
  return intervals
}

/** Average L/100 km, weighted by distance; null without at least one interval. */
export function averageConsumption(entries: Entry[]): number | null {
  const intervals = consumptionIntervals(entries)
  if (intervals.length === 0) return null
  const liters = intervals.reduce((s, i) => s + i.liters, 0)
  const km = intervals.reduce((s, i) => s + i.toKm - i.fromKm, 0)
  return (liters / km) * 100
}
