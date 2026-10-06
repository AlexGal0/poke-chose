import { isKnownEncounterMethod } from '../domain/encounter-methods.ts'

type T = (key: string, params?: Record<string, unknown>) => string

export function methodLabel(t: T, method: string): string {
  return isKnownEncounterMethod(method) ? t(`encounterMethods.list.${method}.label`) : t('encounterMethods.unknownLabel', { method: method.replace(/[-_]+/g, ' ') })
}

export function methodDescription(t: T, method: string): string {
  return isKnownEncounterMethod(method) ? t(`encounterMethods.list.${method}.description`) : t('encounterMethods.unknownDescription', { method })
}
