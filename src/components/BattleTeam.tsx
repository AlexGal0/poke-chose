import { pokemonDisplayName } from '../domain/pokemon-names'
import { useState } from 'react'
import type { ActivePokemonCandidate, BattleTeamMember } from '../domain/enemy-prototype'
import { consistentBattleHealth } from '../domain/enemy-prototype'
import { updateBattleHealthDisplay } from '../domain/battle-health-display'
import { useBattlePokemon } from '../hooks/useBattlePokemon'
import { BattleHealthBar } from './BattleHealthBar'
import { battleTypeAdvantage } from '../domain/battle-type-matchup'
import type { Pokemon } from '../models/pokemon'
import './BattleTeam.css'

function BattleTeamCard({ member, active, enemy }: { member: BattleTeamMember; active: boolean; enemy: Pokemon | null }) {
  const { pokemon, error } = useBattlePokemon(member)
  const identity = `${member.personality}:${member.trainerId}:${member.speciesId}:${member.form}`
  const health = member.isEgg ? null : consistentBattleHealth(member, [member, member])
  const [display, setDisplay] = useState(() => ({ identity, health, hit: 0, damageFraction: 0 }))
  const next = updateBattleHealthDisplay(display, identity, health)
  if (next !== display) setDisplay(next)
  const fainted = next.health?.currentHp === 0 && !member.isEgg
  const name = member.nickname || (pokemon ? pokemonDisplayName(pokemon.name) : null) || `Especie #${member.speciesId}`
  const matchup = pokemon && enemy && !member.isEgg ? battleTypeAdvantage(pokemon.types, enemy.types) : null
  const matchupLabel = matchup ? { advantage: 'Ventaja por tipos', disadvantage: 'Desventaja por tipos', neutral: 'Encuentro neutral por tipos', mutual: 'Ambos tienen ataques supereficaces por tipo' }[matchup.status] : 'Esperando tipos'
  const matchupDetail = matchup ? `${matchupLabel}. Mejor multiplicador propio: ${matchup.outgoing}×; del rival: ${matchup.incoming}×. Sin movimientos, habilidades ni objetos.` : matchupLabel
  return <article className={`battle-team-member ${active ? 'active' : ''} ${fainted ? 'fainted' : ''}`} aria-label={`Espacio ${member.slot + 1}: ${name}`}>
    <div className="battle-team-member-heading"><span>#{member.slot + 1}</span><strong>{member.isEgg ? 'Huevo' : fainted ? 'Debilitado' : active ? 'En combate' : 'Reserva'}</strong></div>
    <div className="battle-team-sprite">{member.isEgg ? <span aria-label="Huevo">○</span> : pokemon?.sprite ? <img src={pokemon.sprite} width="72" height="72" alt={pokemonDisplayName(pokemon.name)} /> : <span aria-hidden="true">?</span>}</div>
    <div className="battle-team-identity"><h4 className={!member.nickname ? 'battle-team-species' : undefined}>{name}</h4><small className={member.nickname && pokemon ? 'battle-team-species' : undefined}>{member.nickname && pokemon ? pokemonDisplayName(pokemon.name) : error ? 'Especie no disponible' : '\u00a0'}</small></div>
    <p className="hint battle-team-level">{member.isEgg ? 'No participa en combate' : <><span>Lv. {member.level}</span><span className={`battle-team-matchup ${matchup?.status ?? 'pending'}`} role="img" tabIndex={0} title={matchupDetail} aria-label={matchupDetail}>
      {matchup ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={matchup.status === 'mutual' ? 'M7 20V4m-4 4 4-4 4 4M17 4v16m-4-4 4 4 4-4' : matchup.status === 'neutral' ? 'M5 9h14M5 15h14' : 'M12 20V4m-6 6 6-6 6 6'} />
      </svg> : <span aria-hidden="true">?</span>}
    </span></>}</p>
    {!member.isEgg && <BattleHealthBar health={next.health} label={`Puntos de salud de ${name}`} />}
  </article>
}

export function BattleTeam({ members, active, enemy = null }: { members: BattleTeamMember[] | null; active: ActivePokemonCandidate | null; enemy?: Pokemon | null }) {
  return <section className="battle-team" aria-labelledby="battle-team-title">
    <div className="battle-team-heading"><h3 id="battle-team-title">Salud de tu equipo</h3>{members && <span className="count">{members.length} / 6</span>}</div>
    {members ? <div className="battle-team-grid">{members.map(member => <BattleTeamCard key={`${member.personality}:${member.trainerId}`} member={member} enemy={enemy} active={Boolean(active && active.personality === member.personality && active.trainerId === member.trainerId && active.speciesId === member.speciesId)} />)}</div>
      : <p className="hint">Esperando una lectura del equipo en combate…</p>}
    {members && <p className="battle-team-matchup-legend">↑ Ventaja · ↓ Desventaja · ↕ Ambos supereficaces · = Neutral · Solo tipos, Gen V</p>}
  </section>
}
