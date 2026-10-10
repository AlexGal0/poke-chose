import { parseRepelSteps } from '../repel.ts'

// Opt-in: configure only an address validated on the user's ROM and session.
export async function readRepel(reader, config) {
  if (config.repelStepsAddress == null) return null
  const address = Number(config.repelStepsAddress)
  if (!Number.isSafeInteger(address) || address < 0x02000000 || address >= 0x02400000) throw new Error('Dirección de repelente fuera de RAM.')
  const first = await reader.readMemory(address, 1)
  const second = await reader.readMemory(address, 1)
  const steps = parseRepelSteps(second)
  if (parseRepelSteps(first) !== steps) throw new Error('El contador cambió durante la lectura; muestra descartada.')
  return { steps, updatedAt: new Date().toISOString() }
}
