import type { AcquisitionText } from '../games/core/acquisition.ts'

type T = (key: string, params?: Record<string, unknown>) => string

export function acquisitionText(t: T, value: AcquisitionText, params?: Record<string, unknown>): string {
  if ('text' in value) return value.text
  const values = Object.fromEntries(Object.entries(value.params ?? {}).map(([key, item]) => [key, typeof item === 'object' ? acquisitionText(t, item) : item]))
  return t(value.key, { ...values, ...params })
}
