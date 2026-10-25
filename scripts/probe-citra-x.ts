// Local, bounded prototype: one candidate party member, no dumps or remote services.
import { readFile } from 'node:fs/promises'
import { performance } from 'node:perf_hooks'
import { CitraRpcReader } from '../bridge/citra/rpc-reader.ts'
import { readXMemoryMember, X_MEMORY_PARTY_CANDIDATE } from '../src/games/x/memory-party.ts'
import { readXSavePokemon } from '../src/games/x/save-pokedex.ts'

const reader = new CitraRpcReader()
try {
  const start = performance.now()
  const member = await readXMemoryMember(reader, X_MEMORY_PARTY_CANDIDATE.firstMember, 0)
  const memoryReadMs = performance.now() - start
  let comparison: object = { available: false }
  let config: { savePath?: string } = {}
  try { config = JSON.parse(await readFile('x-save.config.local.json', 'utf8')) }
  catch (error) { if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error }
  const path = process.env.CITRA_X_SAVE_PATH?.trim() || config.savePath
  if (path) {
    const saved = readXSavePokemon(await readFile(path)).party[0]
    comparison = { available: true, sameFirstMember: Boolean(saved && saved.personality === member.personality && saved.trainerId === member.trainerId && saved.speciesId === member.speciesId),
      sameLevel: saved?.level === member.level, sameHp: saved?.currentHp === member.currentHp && saved.maxHp === member.maxHp,
      sameStats: JSON.stringify(saved?.currentStats) === JSON.stringify(member.currentStats), sameNickname: saved?.nickname === member.nickname,
      sameMoves: JSON.stringify(saved?.moveIds) === JSON.stringify(member.moveIds) }
  }
  console.log(JSON.stringify({ readOnly: true, candidate: '0x08CE1CE8', stable: true, speciesId: member.speciesId, level: member.level,
    currentHp: member.currentHp, maxHp: member.maxHp, memoryReadMs: Number(memoryReadMs.toFixed(2)), elapsedMs: Number((performance.now() - start).toFixed(2)), comparison }, null, 2))
} catch (error) {
  console.error('[x-memory-probe]', error instanceof Error ? error.message : 'Read failed')
  process.exitCode = 1
} finally { reader.close() }
