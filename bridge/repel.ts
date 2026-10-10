export function parseRepelSteps(bytes: Uint8Array): number {
  if (bytes.length !== 1 || bytes[0] > 250) throw new Error('Contador de repelente inválido.')
  return bytes[0]
}
