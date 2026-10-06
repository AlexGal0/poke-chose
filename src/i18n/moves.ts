import type { MoveCategory } from '../domain/moves.ts'

type T = (key: string, params?: Record<string, unknown>) => string

export function categoryLabel(t: T, categoryId: MoveCategory): string {
  return t(`moves.category.${categoryId}`)
}

export function moveDescription(t: T, move: { description: string | null; descriptionLanguage: string | null }): string {
  if (!move.description) return t('moves.noDescription')
  return move.descriptionLanguage ? `(${move.descriptionLanguage.toUpperCase()}) ${move.description}` : move.description
}

export function moveDescriptionSource(t: T, descriptionVersionGroup: string | null): string | null {
  if (!descriptionVersionGroup) return null
  return t('moves.descriptionSource', { version: t(`moves.versionGroup.${descriptionVersionGroup}`, { defaultValue: descriptionVersionGroup }) })
}
