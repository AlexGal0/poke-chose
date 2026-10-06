import { parsePk5 } from '../../bridge/parser.ts'

// Discovery only: a valid PK5 may be a stale copy, not the active opponent.
export function locateEnemyCandidates(ram, ramStart, speciesId, ownParty = []) {
  if (!Number.isInteger(speciesId) || speciesId < 1 || speciesId > 649) throw new Error('Especie inválida (1–649).')
  const candidates = []
  for (let offset = 0; offset <= ram.length - 220; offset += 4) {
    if (ram.readUInt16LE(offset + 4) !== 0 || ram.readUInt32LE(offset) === 0) continue
    try {
      const member = parsePk5(ram.subarray(offset, offset + 220))
      if (member.speciesId !== speciesId || member.isEgg || !member.maxHp || member.currentHp > member.maxHp) continue
      if (ownParty.some(own => own.personality === member.personality && own.trainerId === member.trainerId)) continue
      candidates.push({ address: `0x${(ramStart + offset).toString(16)}`, speciesId: member.speciesId, form: member.form, level: member.level, personality: member.personality, trainerId: member.trainerId, confirmedOpponent: false })
    } catch { /* Unrelated memory, decrypted structures and incomplete samples are rejected. */ }
  }
  return candidates
}
