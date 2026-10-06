import type { AcquisitionKind } from '../domain/acquisition.ts'

type T = (key: string, params?: Record<string, unknown>) => string

export function acquisitionLabel(t: T, kind: AcquisitionKind): string {
  return t(`acquisition.label.${kind}`)
}
