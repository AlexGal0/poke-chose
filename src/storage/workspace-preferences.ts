export function loadWorkspacePreference<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? 'null')
    return allowed.find(option => option === value) ?? fallback
  } catch { return fallback }
}
export function loadEncounterEquipment(key: string, methods: readonly string[]): Record<string, boolean> {
  let value: Record<string, unknown> | null = null
  try { value = JSON.parse(localStorage.getItem(key) ?? 'null') } catch { /* Default to no equipment, as in Black. */ }
  return Object.fromEntries(methods.map(method => [method, value?.[method] === true]))
}
