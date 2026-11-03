import { loadEncounterAccess, saveEncounterAccess } from '../../storage/encounter-access.ts'
import { blackSpeciesScope } from './catalog.ts'
import type { EncounterAtlasData, EncounterAtlasService, EncounterZone } from '../core/encounters.ts'
import type { ZoneEncounters } from '../../domain/encounter-opportunities.ts'
import { getBlackEncounterIndex } from '../../api/encounter-opportunities.ts'
import { getPokemon } from '../../api/pokeapi.ts'
import { getSpeciesGender } from '../../api/gender.ts'
import { zoneSlug, zoneStage } from '../../domain/black-zones.ts'
import { areaLabel } from '../../i18n/zones.ts'
import i18n from '../../i18n/index.ts'

export function blackEncounterZones(index: readonly ZoneEncounters[]): EncounterZone[] {
  return index.map(({ location, rows }) => ({
    ...location, names: {}, labelKey: zoneSlug(location) ? `zones.list.${zoneSlug(location)}` : 'zones.noNameVerified',
    stage: { name: zoneStage(location), names: {}, labelKey: `zones.stage.${zoneStage(location)}` },
    areas: [...new Set(rows.flatMap(row => row.details.map(detail => detail.area)))].map(area => ({
      name: area, labelIsComplete: true, names: { es: areaLabel(i18n.getFixedT('es'), area), en: areaLabel(i18n.getFixedT('en'), area) },
      rows: rows.flatMap(row => {
        const details = row.details.filter(detail => detail.area === area).map(detail => ({ ...detail, trade: detail.trade ? { ...detail.trade, instructionsKey: `npcTrades.instructions.${detail.trade.instructionsKey}` } : undefined }))
        return details.length ? [{ ...row, variety: row.name, details }] : []
      }),
    })),
  }))
}
let cached: EncounterAtlasData | undefined
export const blackEncounters: EncounterAtlasService = {
  async load(signal) {
    if (cached) return cached
    const index = await getBlackEncounterIndex()
    const ids = [...new Set(index.flatMap(zone => zone.rows.map(row => row.speciesId)))]
    const species: EncounterAtlasData['species'] = []
    let next = 0
    const workers = await Promise.allSettled(Array.from({ length: 4 }, async () => {
      while (next < ids.length) {
        signal?.throwIfAborted()
        const id = ids[next++]
        const [pokemon, gender] = await Promise.all([getPokemon(id, signal), getSpeciesGender(id)])
        species.push({ ...pokemon, scope: blackSpeciesScope(pokemon.id), speciesGender: gender?.kind, genderDistribution: gender?.distribution })
      }
    }))
    const failure = workers.find(worker => worker.status === 'rejected')
    if (failure?.status === 'rejected') throw failure.reason
    signal?.throwIfAborted()
    cached = {
      version: 'black', retrieved: null,
      equipmentMethods: ['surf', 'surf-spots', 'super-rod', 'super-rod-spots'],
      equipmentGroups: [
        { method: 'surf', members: ['surf', 'surf-spots'] },
        { method: 'super-rod', members: ['super-rod', 'super-rod-spots'] },
      ],
      equipmentStorage: {
        load: () => {
          const access = loadEncounterAccess()
          return { surf: access.surf, 'surf-spots': access.surf, 'super-rod': access.superRod, 'super-rod-spots': access.superRod }
        },
        save: value => saveEncounterAccess({ surf: value.surf, superRod: value['super-rod'] }),
      },
      locations: blackEncounterZones(index), species,
    }
    return cached
  },
}
