type T = (key: string) => string

export function typeLabel(t: T, type: string): string {
  return t(`types.${type}`)
}
