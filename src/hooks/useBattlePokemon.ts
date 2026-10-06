import { useEffect, useState } from 'react'
import { getSavePokemon } from '../api/pokeapi'
import type { Pokemon } from '../models/pokemon'
import type { EnemyCandidate } from '../domain/enemy-prototype'

export function useBattlePokemon(candidate: EnemyCandidate | null) {
  const [data, setData] = useState<{ pokemon: Pokemon; form: number } | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const speciesId = candidate?.speciesId
  const form = candidate?.form
  const key = `${speciesId}-${form}`
  useEffect(() => {
    if (speciesId === undefined || form === undefined) return
    const controller = new AbortController()
    void getSavePokemon(speciesId, form, controller.signal).then(pokemon => {
      if (!controller.signal.aborted) {
        setData({ pokemon, form })
        setFailed(null)
      }
    }).catch(() => {
      if (!controller.signal.aborted) setFailed(`${speciesId}-${form}`)
    })
    return () => controller.abort()
  }, [speciesId, form])
  return { pokemon: data && data.pokemon.id === speciesId && data.form === form && failed !== key ? data.pokemon : null, error: failed === key }
}
