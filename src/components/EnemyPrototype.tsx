import { useContext, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { generationVRules } from '../domain/type-rules'
import { getSavePokemon } from '../api/pokeapi'
import { TYPES } from '../models/pokemon'
import type { PokemonType } from '../models/pokemon'
import type { CombatService } from '../models/combat'
import type { BattleConnection } from '../models/combat'
import { StatsContext } from './stats-context'
import { BattleScreen } from './BattleScreen'
import { readBlackBattle, normalizeBlackBattle } from '../games/black/battle-source'
import type { BlackBattleSnapshot } from '../games/black/battle-source'
import { animatedBattleSprite } from '../sources/battle-sprites'

export type { BattleConnection } from '../models/combat'

// Black's composition boundary: the shared screen never accesses its endpoint or APIs.
export function EnemyPrototype({ onConnectionChange }: { onConnectionChange?: (connection: BattleConnection) => void }) {
  const { t } = useTranslation()
  const openStats = useContext(StatsContext)
  const [state, setState] = useState<{ snapshot: BlackBattleSnapshot | null; error: string | null }>({ snapshot: null, error: null })
  useEffect(() => {
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout>
    async function poll() {
      try {
        const snapshot = await readBlackBattle(controller.signal)
        if (!controller.signal.aborted) setState({ snapshot, error: null })
      } catch (cause) {
        if (!controller.signal.aborted) setState({ snapshot: null, error: cause instanceof Error && ['prototypeUnavailable', 'invalidResponse'].includes(cause.message) ? cause.message : 'readFailed' })
      }
      if (!controller.signal.aborted) timer = setTimeout(poll, 2000)
    }
    void poll()
    return () => { controller.abort(); clearTimeout(timer) }
  }, [])
  const reading = useMemo(() => ({ ...(state.snapshot ? normalizeBlackBattle(state.snapshot) : { status: state.error ? 'error' : 'waiting', active: null, own: null, enemy: null, team: null }),
    message: state.error ? t(`enemyPrototype.errors.${state.error}`) : state.snapshot ? t(`enemyPrototype.messages.${state.snapshot.message}`, { defaultValue: state.snapshot.message }) : t('app.battleWaitingMessage') }), [state, t])
  const service = useMemo<CombatService>(() => ({ resolve: async (speciesId, form, signal) => {
    const pokemon = await getSavePokemon(speciesId, form, signal)
    return { ...pokemon, animatedSprite: animatedBattleSprite(pokemon.sprite) }
  }, onStatistics: openStats ? (member, pokemon) => openStats({ ...pokemon,
    types: pokemon.types.filter((type): type is PokemonType => TYPES.some(t => t === type)), form: member.form }) : undefined }), [openStats])
  return <BattleScreen reading={reading} service={service} rules={generationVRules} onConnectionChange={onConnectionChange} />
}
