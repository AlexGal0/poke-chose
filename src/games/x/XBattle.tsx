import { useContext, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { BattleReading, BattleBattler } from '../../models/battle'
import type { ManualPokemon } from '../core/catalog'
import type { TypeRules } from '../../domain/type-analysis'
import type { SavedRosterPokemon } from '../core/saved-roster'
import type { CombatService, BattleConnection } from '../../models/combat'
import { BattleScreen, FieldBattleScreen } from '../../components/BattleScreen'
import { normalizeXBattle, normalizeXFieldBattle } from './battle-source'
import { KnowledgeContext } from '../core/knowledge-context'
import { animatedBattleSprite } from '../../sources/battle-sprites'

export type BattleSpeciesResolver = (member: Pick<BattleBattler, 'speciesId' | 'form'>) => Promise<ManualPokemon>

// X's composition boundary. All presentation and session behavior live in BattleScreen.
export function XBattle({ reading, status, rules, resolve, party, onConnectionChange }: {
  reading: BattleReading | null | undefined; status: 'ready' | 'waiting' | 'error'; rules: TypeRules; resolve: BattleSpeciesResolver; party: readonly SavedRosterPokemon[]; onConnectionChange?: (connection: BattleConnection) => void
}) {
  const { t } = useTranslation()
  const knowledge = useContext(KnowledgeContext)
  const [fieldProtocol, setFieldProtocol] = useState(false)
  if (reading?.field && !fieldProtocol) setFieldProtocol(true)
  const fieldReading = useMemo(() => normalizeXFieldBattle(reading, status, party), [reading, status, party])
  const observation = useMemo(() => ({ ...normalizeXBattle(reading, status, party), message: status === 'error' ? t('battleAdapter.stale') : status === 'waiting' ? t('app.battleWaitingMessage') : reading == null ? t('battleAdapter.unconfirmed') : '' }), [reading, status, party, t])
  const service = useMemo<CombatService>(() => ({ resolve: async (speciesId, form) => {
    const pokemon = await resolve({ speciesId, form })
    return { ...pokemon, animatedSprite: animatedBattleSprite(pokemon.sprite) }
  }, onStatistics: knowledge ? (_member, pokemon) => knowledge.open({ ...pokemon, types: [...pokemon.types] }, 'stats') : undefined }), [resolve, knowledge])
  return fieldProtocol || reading?.field ? <FieldBattleScreen reading={fieldReading} service={service} rules={rules} hint={t('battleAdapter.multiScope')} onConnectionChange={onConnectionChange} /> : <BattleScreen reading={observation} service={service} rules={rules} hint={t('battleAdapter.scope')} onConnectionChange={onConnectionChange} />
}
