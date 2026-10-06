import { parseSave, parseStoredPk5 } from '../parser.ts'
import { parsePokedexBlock, POKEDEX_LENGTH, POKEDEX_OFFSET } from '../pokedex.ts'

export function locateStorage(ram, ramStart, save) {
  const reference = parseSave(save)
  const base = reference.backup ? 0x24000 : 0
  const anchors = []
  const layouts = new Map()
  for (const member of reference.boxes) {
    const bytes = save.subarray(base + 0x400 + member.box * 0x1000 + member.slot * 136, base + 0x400 + member.box * 0x1000 + (member.slot + 1) * 136)
    let offset = -1
    while ((offset = ram.indexOf(bytes, offset + 1)) !== -1) {
      anchors.push({ address: ramStart + offset, box: member.box, slot: member.slot, speciesId: member.speciesId })
      for (const boxStride of [4080, 4096]) {
        const start = offset - member.box * boxStride - member.slot * 136
        if (start < 0 || start + 23 * boxStride + 4080 > ram.length) continue
        const key = `${start}-${boxStride}`
        if (layouts.has(key)) continue
        try {
          const boxes = parseBoxes(ram.subarray(start, start + 23 * boxStride + 4080), boxStride)
          const matches = reference.boxes.filter(expected => boxes.some(actual => actual.box === expected.box && actual.slot === expected.slot && actual.personality === expected.personality && actual.trainerId === expected.trainerId && actual.speciesId === expected.speciesId)).length
          if (matches) layouts.set(key, { boxesAddress: ramStart + start, boxStride, matches, count: boxes.length, confirmedLive: false })
        } catch { /* Reject unsupported layouts and incomplete copies. */ }
      }
    }
  }
  const dex = save.subarray(base + POKEDEX_OFFSET, base + POKEDEX_OFFSET + POKEDEX_LENGTH)
  const pokedex = []
  // Match owned + seen regions, avoiding headers that may differ in RAM.
  const signature = dex.subarray(8, 0x5c)
  if (signature.some(byte => byte !== 0)) {
    let offset = -1
    while ((offset = ram.indexOf(signature, offset + 1)) !== -1) {
      const start = offset - 8
      if (start >= 0 && start + POKEDEX_LENGTH <= ram.length) {
        const current = parsePokedexBlock(ram.subarray(start, start + POKEDEX_LENGTH))
        pokedex.push({ pokedexAddress: ramStart + start, caught: current.caughtSpeciesIds.size, seen: current.seenSpeciesIds.size, matched: 'caught-only', confirmedLive: false })
      }
    }
  }
  return { reference: { boxes: reference.boxes.length, caught: reference.pokedex.caughtSpeciesIds.size, seen: reference.pokedex.seenSpeciesIds.size }, anchors, layouts: [...layouts.values()], pokedex }
}

export function parseBoxes(bytes, boxStride) {
  if (![4080, 4096].includes(boxStride) || bytes.length !== 23 * boxStride + 4080) throw new Error('Estructura de 24 cajas incompleta.')
  const boxes = []
  for (let box = 0; box < 24; box++) {
    for (let slot = 0; slot < 30; slot++) {
      const start = box * boxStride + slot * 136
      const member = parseStoredPk5(bytes.subarray(start, start + 136))
      if (member) boxes.push({ ...member, box, slot })
    }
  }
  return boxes
}

async function stableRead(reader, address, length) {
  const first = await reader.readMemory(Number(address), length)
  const second = await reader.readMemory(Number(address), length)
  if (!first.equals(second)) throw new Error('Los datos cambiaron durante la lectura; muestra descartada.')
  return first
}

export async function readBoxes(reader, config) {
  if (![4080, 4096].includes(config.boxStride)) throw new Error('Separación de cajas no validada.')
  return parseBoxes(await stableRead(reader, config.boxesAddress, 23 * config.boxStride + 4080), config.boxStride)
}

export async function readPokedex(reader, config) {
  const bytes = await stableRead(reader, config.pokedexAddress, POKEDEX_LENGTH)
  const state = parsePokedexBlock(bytes)
  return { caughtSpeciesIds: [...state.caughtSpeciesIds], seenSpeciesIds: [...state.seenSpeciesIds] }
}
