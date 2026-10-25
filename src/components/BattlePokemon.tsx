import type { CombatParticipant, CombatSpecies, CombatService } from '../models/combat'
import { pokemonDisplayName } from '../domain/pokemon-names'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { BattleHealth } from '../domain/enemy-prototype'
import { updateBattleHealthDisplay } from '../domain/battle-health-display'
import { DiscoveryContext } from './discovery-context'
import { PokemonCardFrame } from './PokemonCardFrame'
import { BattleSprite } from './BattleSprite'
import { BattleHealthBar } from './BattleHealthBar'
import { BattleStatStages } from './BattleStatStages'
import type { BattleStatStages as StatStages } from '../domain/battle-stat-stages'
import { updateStatStagesDisplay } from '../domain/battle-stat-stages'

export function BattlePokemon({ candidate, pokemon = null, error = false, own = false, health = null, stages = null, service }: { service: CombatService; candidate: CombatParticipant; pokemon?: CombatSpecies | null; error?: boolean; own?: boolean; health?: BattleHealth | null; stages?: StatStages | null }) {
  const { t } = useTranslation()
  const { speciesId } = candidate
  const identity = `${candidate.identity}:${candidate.form}`
  const [display, setDisplay] = useState(() => ({ identity, health, hit: 0, damageFraction: 0 }))
  const nextDisplay = updateBattleHealthDisplay(display, identity, health)
  if (nextDisplay !== display) setDisplay(nextDisplay)
  const shownHealth = nextDisplay.health
  const [statsDisplay, setStatsDisplay] = useState(() => ({ identity, stages }))
  const nextStatsDisplay = updateStatStagesDisplay(statsDisplay, identity, stages)
  if (nextStatsDisplay !== statsDisplay) setStatsDisplay(nextStatsDisplay)
  const cardRef = useRef<HTMLDivElement>(null)
  const { hit, damageFraction } = nextDisplay
  useEffect(() => {
    if (!hit || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const movement = 2 + Math.min(damageFraction, 1) * 18
    const animation = cardRef.current?.animate([
      { transform: 'translateX(0)' },
      { transform: `translateX(-${movement}px) rotate(-1deg)`, offset: 0.2 },
      { transform: `translateX(${movement}px) rotate(1deg)`, offset: 0.4 },
      { transform: `translateX(-${movement / 2}px)`, offset: 0.6 },
      { transform: `translateX(${movement / 3}px)`, offset: 0.8 },
      { transform: 'translateX(0)' },
    ], { duration: 260 + Math.min(damageFraction, 1) * 240, easing: 'ease-out' })
    return () => animation?.cancel()
  }, [hit, damageFraction, identity])
  return <div className={`battle-participant ${own ? 'own-participant' : 'enemy-participant'}`}>
    <h3 className="battle-participant-title">{own ? t('enemyPrototype.ownTitle') : t('battlePokemon.enemyTitle')}</h3>
    <div className="enemy-prototype-card" ref={cardRef}>
      {pokemon ? <DiscoveryContext.Provider value={new Set([pokemon.id])}>
        <PokemonCardFrame sprite={<BattleSprite pokemon={pokemon} fainted={shownHealth?.currentHp === 0} />} pokemon={{ ...pokemon, nickname: own ? candidate.nickname : undefined }} tools={service.onStatistics ? <button type="button" className="stats-icon" onClick={() => service.onStatistics?.(candidate, pokemon)} aria-label={t('statistics.buttonAria', { name: pokemonDisplayName(pokemon.name) })} title={t('statistics.button')}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M5 20V10h3v10M11 20V4h3v16M17 20v-7h3v7M3 20h19" /></svg></button> : undefined} fainted={shownHealth?.currentHp === 0} footer={<BattleStatStages stages={nextStatsDisplay.stages} />}>
          <p className="hint">{candidate.level === null ? t('battleAdapter.levelUnavailable') : t('app.team.level', { level: candidate.level })}</p>
          <BattleHealthBar health={shownHealth} />
        </PokemonCardFrame>
      </DiscoveryContext.Provider> : <div className="battle-participant-empty"><strong>{t('battlePokemon.speciesPlaceholder', { id: speciesId, level: candidate.level })}</strong><p className="hint">{error ? t('battlePokemon.loadError') : t('battlePokemon.loading')}</p></div>}
    </div>
  </div>
}
