import { EMPTY_GUESS, parseInvoice } from './parseInvoice'

const TODAY = '2026-10-23'

test('garage invoice: kind, date, total, odometer, brand and category', () => {
  const text = [
    'NORAUTO Bayonne',
    'Facture n° 2024-118',
    'Date : 14/03/2026',
    'Vidange huile 5W30 5 L',
    'Filtre à huile',
    'Kilométrage : 87 412 km',
    'Total TTC 189,90 €',
    'Net à payer 189,90 €',
  ].join('\n')
  expect(parseInvoice(text, TODAY)).toEqual({
    kind: 'maintenance',
    date: '2026-03-14',
    amountCents: 18990,
    odometer: 87412,
    garage: 'Norauto',
    category: 'oil',
    liters: null,
  })
})

test('fuel station receipt: liters and amount', () => {
  const text = 'TOTAL ENERGIES Relais\n03.10.2026\nGAZOLE\nVolume 42,35 L\nMontant TTC 76,23 EUR'
  const guess = parseInvoice(text, TODAY)
  expect(guess.kind).toBe('fuel')
  expect(guess.liters).toBe(42.35)
  expect(guess.amountCents).toBe(7623)
  expect(guess.date).toBe('2026-10-03')
})

test('technical inspection with a date in words', () => {
  const text = 'DEKRA Automotive\nProcès-verbal de contrôle technique\nEffectué le 2 février 2026\nA payer 78,00'
  const guess = parseInvoice(text, TODAY)
  expect(guess.kind).toBe('maintenance')
  expect(guess.category).toBe('ct')
  expect(guess.date).toBe('2026-02-02')
  expect(guess.garage).toBe('Dekra')
  expect(guess.amountCents).toBe(7800)
})

test('tyres with a non-breaking thousands separator', () => {
  const text = 'Garage Martin\n2 pneumatiques Michelin\nTotal TTC 1 234,56'
  const guess = parseInvoice(text, TODAY)
  expect(guess.category).toBe('tires')
  expect(guess.amountCents).toBe(123456)
})

test('narrow no-break space is also a thousands separator', () => {
  expect(parseInvoice('Net à payer 2 050,00 €', TODAY).amountCents).toBe(205000)
})

test('repair with brakes', () => {
  const guess = parseInvoice('Garage du Port\nRemplacement plaquettes et disques AV\nTotal TTC 320,00', TODAY)
  expect(guess.kind).toBe('repair')
  expect(guess.category).toBe('brakes')
})

test('"net à payer" wins over other totals', () => {
  const text = 'Total HT 100,00\nTVA 20,00\nTotal TTC 120,00\nAcompte 50,00\nNet à payer 70,00'
  expect(parseInvoice(text, TODAY).amountCents).toBe(7000)
})

test('amount on the line after its keyword', () => {
  expect(parseInvoice('Net à payer\n64,50 €', TODAY).amountCents).toBe(6450)
})

test('no amount keyword, no amount', () => {
  expect(parseInvoice('45,00', TODAY).amountCents).toBeNull()
})

test('future dates are ignored', () => {
  expect(parseInvoice('Echéance 01/01/2030\nFacture du 12/10/2026', TODAY).date).toBe('2026-10-12')
})

test('dates before 1990 are ignored', () => {
  expect(parseInvoice('Né le 01/01/1980', TODAY).date).toBeNull()
})

test('two-digit years', () => {
  expect(parseInvoice('Date 05/06/25', TODAY).date).toBe('2025-06-05')
})

test('a long number near "km" is not an odometer', () => {
  expect(parseInvoice('Tél 0559123456 km', TODAY).odometer).toBeNull()
})

test('odometer with dots as thousands separators', () => {
  expect(parseInvoice('Compteur : 123.456', TODAY).odometer).toBe(123456)
})

test('garage taken from the header when no known brand', () => {
  const guess = parseInvoice('FACTURE\nGarage Dupont & Fils\n12 rue X\nTotal TTC 50,00', TODAY)
  expect(guess.garage).toBe('Garage Dupont & Fils')
})

test('garage name is cut to 60 characters', () => {
  const guess = parseInvoice(`${'Garage '.repeat(15)}\nTotal 10,00`, TODAY)
  expect(guess.garage!.length).toBeLessThanOrEqual(60)
})

test('oil liters alone do not make a fuel receipt', () => {
  const guess = parseInvoice('Garage Dupont\nHuile moteur 5 L\nTotal TTC 60,00', TODAY)
  expect(guess.kind).not.toBe('fuel')
  expect(guess.liters).toBeNull()
})

test('empty text gives an empty guess', () => {
  expect(parseInvoice('', TODAY)).toEqual(EMPTY_GUESS)
})

test('noisy OCR text does not throw', () => {
  const guess = parseInvoice('T0tal TTC : 89,9O €\n|||~~ ', TODAY)
  expect([null, 8990]).toContain(guess.amountCents)
})

test('odometer after its keyword wins over a model number before it', () => {
  expect(parseInvoice('Véhicule : Peugeot 208 — Kilométrage : 87 412 km', TODAY).odometer).toBe(87412)
})

test('odometer written before "km"', () => {
  expect(parseInvoice('Relevé 54 300 km', TODAY).odometer).toBe(54300)
})
