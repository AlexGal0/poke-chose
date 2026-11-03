import { getBlackCombatItem } from '../../api/items'
import { statsForm } from '../../domain/stats'
import type { SavedRosterPokemon } from '../core/saved-roster'
import { blackSavedRosterService } from './saved-roster'
import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { generationVRules } from '../../domain/type-rules'
import { getSavePokemon } from '../../api/pokeapi'
import type { CombatService } from '../../models/combat'
import type { BattleConnection } from '../../models/combat'
import { KnowledgeContext } from '../core/knowledge-context'
import { BattleScreen } from '../../components/BattleScreen'
import { readBlackBattle, normalizeBlackBattle } from '../../games/black/battle-source'
import type { BlackBattleSnapshot } from '../../games/black/battle-source'
import { animatedBattleSprite } from '../../sources/battle-sprites'

export type { BattleConnection } from '../../models/combat'

// Black's composition boundary: the shared screen never accesses its endpoint or APIs.
export function BlackBattle({ onConnectionChange, onStatusChange, party }: { party: readonly SavedRosterPokemon[]; onConnectionChange?: (connection: BattleConnection) => void; onStatusChange?: (connection: BattleConnection) => void }) {
  const report = useCallback((connection: BattleConnection) => { onConnectionChange?.(connection); onStatusChange?.(connection) }, [onConnectionChange, onStatusChange])
  const { t } = useTranslation()
  const knowledge = useContext(KnowledgeContext)
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
  const service = useMemo<CombatService>(() => ({ resolveHeldItem: getBlackCombatItem, resolve: async (speciesId, form, signal) => {
    const pokemon = await getSavePokemon(speciesId, form, signal)
    return { ...pokemon, animatedSprite: animatedBattleSprite(pokemon.sprite) }
  }, onStatistics: knowledge ? (member, pokemon) => {
    const matches = party.filter(row => `${row.speciesId}:${row.personality}:${row.trainerId}` === member.identity && row.form === member.form)
    const individual = matches.length === 1 ? { pokemon: matches[0], service: blackSavedRosterService } : undefined
    knowledge.open({ ...pokemon, types: [...pokemon.types], form: member.form, formLabelKey: statsForm(member.speciesId, member.form) ? `statistics.forms.${statsForm(member.speciesId, member.form)}` : undefined }, 'stats', individual)
  } : undefined }), [knowledge, party])
  return <BattleScreen reading={reading} service={service} rules={generationVRules} onConnectionChange={report} />
}
