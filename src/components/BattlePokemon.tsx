import type { Pokemon } from '../models/pokemon'
import { useEffect, useRef, useState } from 'react'
import type { ActivePokemonCandidate, BattleHealth } from '../domain/enemy-prototype'
import { updateBattleHealthDisplay } from '../domain/battle-health-display'
import { DiscoveryContext } from './discovery-context'
import { PokemonCard } from './PokemonCard'
import { BattleHealthBar } from './BattleHealthBar'
import { BattleStatStages } from './BattleStatStages'
import type { BattleStatStages as StatStages } from '../domain/battle-stat-stages'
import { updateStatStagesDisplay } from '../domain/battle-stat-stages'

export function BattlePokemon({ candidate, pokemon = null, error = false, own = false, health = null, stages = null }: { candidate: ActivePokemonCandidate; pokemon?: Pokemon | null; error?: boolean; own?: boolean; health?: BattleHealth | null; stages?: StatStages | null }) {
  const { speciesId } = candidate
  const identity = `${candidate.personality}:${candidate.trainerId}:${speciesId}:${candidate.form}`
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
    <h3 className="battle-participant-title">{own ? 'Tu Pokémon activo' : 'Pokémon enemigo'}</h3>
    <div className="enemy-prototype-card" ref={cardRef}>
      {pokemon ? <DiscoveryContext.Provider value={new Set([pokemon.id])}>
        <PokemonCard pokemon={{ ...pokemon, nickname: own ? candidate.nickname : undefined }} showEvolution={false} fainted={shownHealth?.currentHp === 0} footer={<BattleStatStages stages={nextStatsDisplay.stages} />}>
          <p className="hint">Lv. {candidate.level}</p>
          <BattleHealthBar health={shownHealth} />
        </PokemonCard>
      </DiscoveryContext.Provider> : <div className="battle-participant-empty"><strong>Especie #{speciesId} · Lv. {candidate.level}</strong><p className="hint">{error ? 'No se pudo cargar la información de la especie.' : 'Cargando información de la especie…'}</p></div>}
    </div>
  </div>
}
