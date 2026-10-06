import { useEffect, useRef, useState } from 'react'
import { initialSaveTeam, subscribeTeamSource } from '../sources/team'
import type { TeamSourceState } from '../sources/team'
import type { PokemonDataSource } from '../sources/data-source'

export function useTeamSource(source: PokemonDataSource | null) {
  const [current, setCurrent] = useState<{ source: PokemonDataSource | null; state: TeamSourceState }>({ source: null, state: initialSaveTeam })
  const previous = useRef(new Map<PokemonDataSource, TeamSourceState>())
  useEffect(() => {
    if (!source) return
    return subscribeTeamSource(source, state => {
      previous.current.set(source, state)
      setCurrent({ source, state })
    }, previous.current.get(source) ?? initialSaveTeam)
  }, [source])
  return current.source === source ? current.state : initialSaveTeam
}
