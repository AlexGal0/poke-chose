import type { Pokemon } from '../models/pokemon'
import { battleWeaknesses, battleResistances } from '../domain/battle-type-matchup'
import { TypeBadge } from './TypeBadge'

export function BattleTypeMatchup({ own, enemy, direction }: { own: Pokemon | null; enemy: Pokemon | null; direction: 'outgoing' | 'incoming' }) {
  const participant = direction === 'outgoing' ? own : enemy
  const opponent = direction === 'outgoing' ? enemy : own
  const weaknesses = participant ? battleWeaknesses(participant.types) : null
  const resistances = participant ? battleResistances(participant.types) : null
  function renderTypes(rows: typeof weaknesses, empty: string) {
    return rows ? rows.length ? rows.map(row => {
      const matched = opponent?.types.includes(row.type) ?? false
      const matchLabel = direction === 'outgoing' ? 'Coincide con un tipo del rival' : 'Coincide con un tipo de tu Pokémon'
      return <div className={`battle-damage-type ${matched ? 'matched' : ''}`} key={row.type} title={row.multiplier === 0 ? 'Inmune por tipo' : matched ? matchLabel : undefined}>
        <TypeBadge type={row.type} /><span className={`multiplier ${row.multiplier > 1 ? 'weak' : 'resistant'}`}>{row.multiplier}×</span>{matched && <span className="battle-weakness-match" aria-label={matchLabel}>★</span>}
      </div>
    }) : <span className="hint">{empty}</span> : <span className="hint">Esperando tipos…</span>
  }
  return <section className={`battle-type-matchup ${direction}`} aria-label={direction === 'outgoing' ? 'Tus debilidades y fortalezas' : 'Debilidades y fortalezas del rival'}>
    <strong className="battle-weakness-heading">{direction === 'outgoing' ? 'Tus debilidades' : 'Debilidades del rival'}</strong>
    <div className="battle-weakness-types">{renderTypes(weaknesses, 'Sin debilidades por tipo')}</div>
    <strong className="battle-weakness-heading">Fortalezas <span className="battle-strength-description">· Resistencias e inmunidades</span></strong>
    <div className="battle-weakness-types battle-resistances">{renderTypes(resistances, 'Sin resistencias ni inmunidades por tipo')}</div>
    <small>★ Coincide con un tipo {direction === 'outgoing' ? 'del rival' : 'de tu Pokémon'}</small>
  </section>
}
