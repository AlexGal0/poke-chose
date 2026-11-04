// Read-only production-profile check. Logs summaries, never memory dumps or ROM bytes.
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { createYSessionReader } from '../bridge/citra/y-session.ts'
import { ySaveReader } from '../src/games/y/save-pokedex.ts'

const reader = createYSessionReader()
try {
  const config = JSON.parse(await readFile('y-save.config.local.json', 'utf8').catch(error => {
    if (error.code !== 'ENOENT') throw error
    return '{}'
  })) as { savePath?: string }
  const path = process.argv[2] ?? process.env.CITRA_Y_SAVE_PATH?.trim() ?? config.savePath
  const saved = path ? await readFile(path) : null
  const digest = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')
  const before = saved ? digest(saved) : null
  const live = await reader.read(true)
  const savePokemon = saved ? ySaveReader.parsePokemon(saved) : null
  console.log(JSON.stringify({ readOnly: true, edition: 'y', party: live.party.map(p => ({ speciesId: p.speciesId, level: p.level, hp: p.currentHp, maxHp: p.maxHp })),
    boxes: live.boxes?.length ?? null, seen: live.pokedex.seenSpeciesIds.length, caught: live.pokedex.caughtSpeciesIds.length,
    inventoryAvailable: live.inventory !== undefined, daycareAvailable: live.daycare != null, position: live.position,
    battle: live.battle ? { active: live.battle.active, format: live.battle.field?.format, own: live.battle.own?.speciesId, enemy: live.battle.enemy?.speciesId } : null,
    comparison: saved && savePokemon && path ? {
      sameParty: JSON.stringify(savePokemon.party) === JSON.stringify(live.party),
      sameBoxes: JSON.stringify(savePokemon.boxes) === JSON.stringify(live.boxes),
      sameInventory: JSON.stringify(ySaveReader.parseInventory(saved, savePokemon)) === JSON.stringify(live.inventory),
      saveUnchanged: before === digest(await readFile(path)),
    } : null,
  }, null, 2))
} finally { reader.close() }
