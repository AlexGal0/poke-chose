import { useEffect, useState } from 'react'
import type { CombatParticipant, CombatSpecies, CombatService } from '../models/combat'

export function useBattlePokemon(candidate: CombatParticipant | null, service: CombatService) {
  const [data, setData] = useState<{ pokemon: CombatSpecies; form: number } | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const speciesId = candidate?.speciesId
  const form = candidate?.form
  const key = `${speciesId}-${form}`
  useEffect(() => {
    if (speciesId === undefined || form === undefined) return
    const controller = new AbortController()
    void service.resolve(speciesId, form, controller.signal).then(pokemon => {
      if (!controller.signal.aborted) {
        setData({ pokemon, form })
        setFailed(null)
      }
    }).catch(() => {
      if (!controller.signal.aborted) setFailed(`${speciesId}-${form}`)
    })
    return () => controller.abort()
  }, [speciesId, form, service])
  return { pokemon: data && data.pokemon.id === speciesId && data.form === form && failed !== key ? data.pokemon : null, error: failed === key }
}
