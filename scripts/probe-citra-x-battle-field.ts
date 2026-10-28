// Bounded read-only investigation, not a production multi-battle reader.
// No dumps, saves, writes, plugins or execution control.
import { CitraRpcReader } from '../bridge/citra/rpc-reader.ts'
import { createXSessionReader } from '../bridge/citra/x-session.ts'
import { probeXBattleTables, probeRosterMatches, probeXBattleReferences, probeXBattleIdentity, probeXBattleContext, probeXBattleAliases, probeXBattleSlotContrast, probeXBattleArenaReferences } from '../bridge/citra/x-battle-probe.ts'
import { readXMemoryParty } from '../src/games/x/memory-party.ts'
import { X_BATTLE_ENEMY_PARTY_PROFILES } from '../src/games/x/memory-battle.ts'
import { readXMemoryBattleFormat } from '../src/games/x/memory-battle-format.ts'

const profile = createXSessionReader()
const rpc = new CitraRpcReader()
try {
  await profile.checkProfile()
  const own = await readXMemoryParty(rpc)
  const tables = await probeXBattleTables(rpc)
  const format = await readXMemoryBattleFormat(rpc)
  const arena = process.argv.includes('--arena') ? await probeXBattleArenaReferences(rpc, tables) : null
  const references = await probeXBattleReferences(rpc, tables)
  const aliases = await probeXBattleAliases(rpc, tables)
  const slotContrast = await probeXBattleSlotContrast(rpc, tables, process.argv.includes('--single-own') ? 1 : 2)
  const context = tables.flag === 0x40001 ? await probeXBattleContext(rpc) : []
  const identities = await Promise.all(tables.tables.map(async table => Promise.all(table.slots.map(async slot => {
    if (slot.state !== 'candidate') return null
    try {
      const member = await probeXBattleIdentity(rpc, slot.headerCandidates.word0)
      return { key: `${member.speciesId}:${member.personality}:${member.trainerId}`, details: { speciesId: member.speciesId, form: member.form, level: member.level,
        sameSpecies: member.speciesId === slot.speciesId,
        ownPartySlotByIdentity: table.side === 'own' ? own.filter(p => p.speciesId === member.speciesId && p.personality === member.personality && p.trainerId === member.trainerId).map(p => p.slot) : null } }
    } catch { return null }
  }))))
  const enemies = tables.flag === 0x40001 ? await Promise.all(X_BATTLE_ENEMY_PARTY_PROFILES.map(async candidate => {
    try { return await readXMemoryParty(rpc, candidate) } catch { return null }
  })) : [null, null]
  const after = await probeXBattleTables(rpc)
  if (JSON.stringify(tables) !== JSON.stringify(after)) throw new Error('X battle changed during identity investigation')
  await profile.checkProfile()
  const hex = (value: number) => `0x${value.toString(16).padStart(8, '0')}`
  console.log(JSON.stringify({ readOnly: true, researchOnly: true, profileMatched: true, stable: tables.stable,
    flag: hex(tables.flag), format: format?.format ?? 'unconfirmed', fieldPositions: format?.positions ?? null,
    arenaReferences: arena?.map(reference => ({ ...reference, address: hex(reference.address) })) ?? null,
    contextScalarCandidates: context,
    slotContrastCandidates: slotContrast,
    participantReferences: references.map(reference => ({ ...reference, address: hex(reference.address) })),
    contextAliases: aliases.map(alias => ({ ...alias, address: hex(alias.address) })),
    rivalRosterCounts: enemies.map(roster => roster?.length ?? null),
    distinctLinkedIdentities: identities.map(rows => new Set(rows.flatMap(row => row ? [row.key] : [])).size),
    identityCopiesAgree: [0, 2].map(index => tables.tables[index].slots.some(slot => slot.state === 'candidate') ?
      identities[index].every((identity, slot) => tables.tables[index].slots[slot].state === 'candidate' ?
        identity !== null && identity.key === identities[index + 1][slot]?.key :
        tables.tables[index + 1].slots[slot].state !== 'candidate') : null),
    tables: tables.tables.map((table, tableIndex) => ({ sideCandidate: table.side, copy: table.copy, address: hex(table.address),
      followingWordCandidate: table.followingWordCandidate,
      slots: table.slots.map((slot, slotIndex) => ({ ...slot, pointer: hex(slot.pointer), linkedIdentityCandidate: identities[tableIndex][slotIndex]?.details ?? null,
        rosterSlotCandidates: slot.state === 'candidate' ? probeRosterMatches(slot, table.side === 'own' ? own : enemies[table.copy]) : null })) })),
  }, null, 2))
} catch (error) {
  console.error('[x-battle-field-probe]', error instanceof Error ? error.message : 'Read failed')
  process.exitCode = 1
} finally { rpc.close(); profile.close() }
