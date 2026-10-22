export const CATEGORIES = {
  oil: 'Vidange',
  brakes: 'Freins',
  tires: 'Pneus',
  timing_belt: 'Distribution',
  body: 'Carrosserie',
  ct: 'Contrôle technique',
  other: 'Autre',
} as const

export type Category = keyof typeof CATEGORIES

export function categoryLabel(category: string | null): string | null {
  return category ? (CATEGORIES[category as Category] ?? category) : null
}
