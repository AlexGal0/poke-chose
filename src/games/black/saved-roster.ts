import { blackSpeciesScope } from './catalog.ts'
import type { SavedRosterService, KnownRosterMove } from '../core/saved-roster.ts'
import { getSavePokemon, localizedName, request } from '../../api/pokeapi.ts'
import { getBaseStats } from '../../api/stats.ts'
import { getExperienceLevels } from '../../api/experience.ts'
import { getHeldItemName } from '../../api/items.ts'
import { blackWhiteMove } from '../../domain/moves.ts'
import type { MoveResponse } from '../../domain/moves.ts'
import { statsForm, statsResource } from '../../domain/stats.ts'
import { readCache, writeCache } from '../../storage/local.ts'

export const blackSavedRosterService: SavedRosterService = {
  async resolve(member, signal) {
    const [pokemon, experienceLevels, baseStats] = await Promise.all([
      getSavePokemon(member.speciesId, member.form, signal),
      getExperienceLevels(member.speciesId, signal).catch(() => undefined), getBaseStats(member.speciesId, member.form, signal).catch(() => undefined),
    ])
    signal?.throwIfAborted()
    const resource = statsResource(member.speciesId, member.form)
    return { ...pokemon, scope: blackSpeciesScope(pokemon.id), formLabelKey: statsForm(member.speciesId, member.form) ? `statistics.forms.${statsForm(member.speciesId, member.form)}` : undefined, form: member.form, resourceName: /^\d+$/.test(String(resource)) ? pokemon.name : String(resource), experienceLevels, baseStats }
  },
  async describe(member, locale, signal) {
    async function cached<T>(path: string): Promise<T> {
      signal?.throwIfAborted()
      const key = `black-roster-v1-${path}`
      const saved = readCache<T>(key)
      if (saved) return saved
      const data = await request<T>(path, signal)
      writeCache(key, data)
      return data
    }
    const [item, ability, knownMoves] = await Promise.allSettled([
      getHeldItemName(member.heldItemId, locale),
      member.abilityId ? cached<{ name: string; names: { name: string; language: { name: string } }[] }>(`ability/${member.abilityId}`).then(data => localizedName(data.names, locale) ?? data.name) : '',
      Promise.all(member.moveIds.flatMap((id, slot) => id ? [cached<Omit<MoveResponse, 'past_values'> & { power: number | null; accuracy: number | null; past_values: (MoveResponse['past_values'][number] & { power?: number | null; accuracy?: number | null })[] }>(`move/${id}`).then(data => {
        const past = data.past_values.filter(row => Number(row.version_group.url?.split('/').filter(Boolean).at(-1)) > 11).sort((a, b) => Number(a.version_group.url?.split('/').filter(Boolean).at(-1)) - Number(b.version_group.url?.split('/').filter(Boolean).at(-1)))
        return { ...blackWhiteMove(data, locale), slug: data.name, id, slot, power: past.find(row => row.power != null)?.power ?? data.power, accuracy: past.find(row => row.accuracy != null)?.accuracy ?? data.accuracy } as KnownRosterMove
      })] : [])),
    ])
    signal?.throwIfAborted()
    const moves = knownMoves.status === 'fulfilled' ? knownMoves.value : undefined
    return { item: item.status === 'fulfilled' ? item.value : '', ability: ability.status === 'fulfilled' ? ability.value : '', knownMoves: moves, moves: moves?.map(move => move.name) ?? [],
      itemError: item.status === 'rejected', abilityError: ability.status === 'rejected', knownMovesError: knownMoves.status === 'rejected' }
  },
}
