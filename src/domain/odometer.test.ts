import { currentOdometer } from './odometer'

test('without entries returns the initial odometer', () => {
  expect(currentOdometer({ initialOdometer: 48000 }, [])).toBe(48000)
})

test('returns the highest known odometer', () => {
  const entries = [{ odometer: 50000 }, { odometer: null }, { odometer: 52000 }]
  expect(currentOdometer({ initialOdometer: 48000 }, entries)).toBe(52000)
})

test('never goes below the initial odometer', () => {
  expect(currentOdometer({ initialOdometer: 48000 }, [{ odometer: 40000 }])).toBe(48000)
})
