import type { Category } from '@/domain/categories'

/** Lowercase, no accents, no-break spaces turned into plain spaces. */
export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[  ]/g, ' ')
    .toLowerCase()
}

/** Keywords before the amount to pay, most reliable first. */
export const AMOUNT_KEYWORDS = ['net a payer', 'total ttc', 'montant ttc', 'total a payer', 'a payer', 'total']

/** "1 234,56", "1234.56", "1234,56": integer part, then cents. */
export const AMOUNT_RE = /(?<![\d.,])(\d{1,3}(?:[ .]\d{3})+|\d+)[,.](\d{2})(?![\d])/g

export const NUMERIC_DATE_RE = /(?<!\d)(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})(?!\d)/g
export const WORD_DATE_RE =
  /(?<!\d)(\d{1,2})(?:er)? (janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre) (\d{4})(?!\d)/g
export const MONTHS = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre']
/** Words that, just before a date, mark it as the invoice date. */
export const DATE_HINT_RE = /\b(date|facture|le)\b/

/** The mileage follows these words ("Kilométrage : 87 412")… */
export const ODOMETER_LABEL_RE = /\b(kilometrage|compteur)\b/g
/** …and precedes this unit ("87 412 km"). */
export const ODOMETER_UNIT_RE = /\bkms?\b/g
/** A whole number, with optional space or dot thousands separators, not part of a date or a decimal. */
export const INTEGER_RE = /(?<![\d.,/])(\d{1,3}(?:[ .]\d{3})+|\d+)(?![\d,/]|\.\d)/g

export const LITERS_RE = /(?<![\d.,])(\d+(?:[,.]\d+)?) ?(?:l|litres?)\b/
export const LITERS_HINT_RE = /\b(volume|quantite)\b/
export const DECIMAL_RE = /(?<![\d.,])(\d+(?:[,.]\d+)?)(?![\d])/

/** A fuel filter is a garage part, not a fill-up. */
export const FUEL_FILTER_RE = /\bfiltres? (?:a |de )?(?:gazole|gasoil|carburant)\b/g
export const FUEL_WORDS = /\b(carburant|gazole|gasoil|sp ?95|sp ?98|e10|e85|super|station)\b/
/** Words that clearly mean servicing; they win over fuel words ("huile … super") and repair words ("remplacement filtre"). */
export const MAINTENANCE_WORDS = /\b(vidange|revision|entretien|controle technique)\b/
export const REPAIR_WORDS = /\b(reparation|remplacement|diagnostic|carrosserie|sinistre)\b/
export const WEAK_MAINTENANCE_WORDS = /\bfiltres?\b/

/** Checked in order: the first match wins. */
export const CATEGORY_WORDS: [Category, RegExp][] = [
  ['ct', /\bcontrole technique\b/],
  ['oil', /\b(vidange|huile)\b/],
  ['brakes', /\b(plaquettes?|disques?|freins?)\b/],
  ['tires', /\bpneu(s|matiques?)?\b/],
  ['timing_belt', /\bdistribution\b/],
  ['body', /\bcarrosserie\b/],
]

/** Garage and inspection chains, as displayed. Car makes are left out: they also name the vehicle. */
export const KNOWN_GARAGES = [
  'Norauto', 'Feu Vert', 'Speedy', 'Midas', 'Point S', 'Euromaster', 'Carglass', 'Vulco', 'Roady',
  'Leclerc Auto', 'Dekra', 'Autosur', 'Sécuritest', 'Autovision', 'Point Service Auto', 'Euro Repar',
]

/** Header lines with these words are not the garage's name. */
export const NOT_GARAGE_RE = /\b(facture|total|ttc|tva|montant|date|tel|siret)\b/
