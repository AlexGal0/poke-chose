import { pokemonDisplayName } from '../domain/pokemon-names'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ReorderGrid } from './ReorderGrid'
import type { CombatParticipant, CombatSpecies, CombatService } from '../models/combat'
import type { TypeRules } from '../domain/type-analysis'
import { updateBattleHealthDisplay } from '../domain/battle-health-display'
import { useBattlePokemon } from '../hooks/useBattlePokemon'
import { BattleHealthBar } from './BattleHealthBar'
import { battleAdvantage } from '../domain/battle-engine'
import './BattleTeam.css'

function BattleTeamCard({ member, active, enemy, service, rules }: { member: CombatParticipant; active: boolean; enemy: CombatSpecies | null; service: CombatService; rules: TypeRules }) {
  const { t } = useTranslation()
  const { pokemon, error } = useBattlePokemon(member.isEgg ? null : member, service)
  const identity = `${member.identity}:${member.form}`
  const health = member.isEgg ? null : member.health
  const [display, setDisplay] = useState(() => ({ identity, health, hit: 0, damageFraction: 0 }))
  const next = updateBattleHealthDisplay(display, identity, health)
  if (next !== display) setDisplay(next)
  const fainted = next.health?.currentHp === 0 && !member.isEgg
  const name = member.nickname || (pokemon ? pokemonDisplayName(pokemon.name) : null) || t('battleTeam.speciesPlaceholder', { id: member.speciesId })
  const matchup = pokemon && enemy && !member.isEgg ? battleAdvantage(rules, pokemon.types, enemy.types) : null
  const matchupLabel = matchup ? { advantage: t('battleTeam.matchup.advantage'), disadvantage: t('battleTeam.matchup.disadvantage'), neutral: t('battleTeam.matchup.neutral'), mutual: t('battleTeam.matchup.mutual') }[matchup.status] : t('battleTeam.matchup.waiting')
  const matchupDetail = matchup ? t('battleTeam.matchupDetail', { label: matchupLabel, outgoing: matchup.outgoing, incoming: matchup.incoming }) : matchupLabel
  return <article className={`battle-team-member ${active ? 'active' : ''} ${fainted ? 'fainted' : ''}`} aria-label={t('battleTeam.memberAria', { slot: (member.slot ?? 0) + 1, name })}>
    <div className="battle-team-member-heading"><span>#{(member.slot ?? 0) + 1}</span><strong>{member.isEgg ? t('app.team.eggLabel') : fainted ? t('pokemonCard.fainted') : active ? t('battleTeam.inBattle') : t('battleTeam.reserve')}</strong></div>
    <div className="battle-team-sprite">{member.isEgg ? <span aria-label={t('app.team.eggLabel')}>○</span> : pokemon?.sprite ? <img src={pokemon.sprite} width="72" height="72" alt={pokemonDisplayName(pokemon.name)} /> : <span aria-hidden="true">?</span>}</div>
    <div className="battle-team-identity"><h4 className={!member.nickname ? 'battle-team-species' : undefined}>{name}</h4><small className={member.nickname && pokemon ? 'battle-team-species' : undefined}>{member.nickname && pokemon ? pokemonDisplayName(pokemon.name) : error ? t('battleTeam.speciesUnavailable') : ' '}</small></div>
    <p className="hint battle-team-level">{member.isEgg ? t('battleTeam.notInBattle') : <><span>{t('app.team.level', { level: member.level })}</span><span className={`battle-team-matchup ${matchup?.status ?? 'pending'}`} role="img" tabIndex={0} title={matchupDetail} aria-label={matchupDetail}>
      {matchup ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={matchup.status === 'mutual' ? 'M7 20V4m-4 4 4-4 4 4M17 4v16m-4-4 4 4 4-4' : matchup.status === 'neutral' ? 'M5 9h14M5 15h14' : 'M12 20V4m-6 6 6-6 6 6'} />
      </svg> : <span aria-hidden="true">?</span>}
    </span></>}</p>
    {!member.isEgg && <BattleHealthBar health={next.health} label={t('battleTeam.healthAria', { name })} />}
  </article>
}

export function BattleTeam({ members, active, enemy = null, service, rules }: { members: CombatParticipant[] | null; active: CombatParticipant | null; enemy?: CombatSpecies | null; service: CombatService; rules: TypeRules }) {
  const { t } = useTranslation()
  return <section className="battle-team" aria-labelledby="battle-team-title">
    <div className="battle-team-heading"><h3 id="battle-team-title">{t('battleTeam.heading')}</h3>{members && <span className="count">{members.length} / 6</span>}</div>
    {members ? <ReorderGrid className="battle-team-grid" itemKeys={members.map(member => member.identity)}>{members.map(member => <BattleTeamCard key={member.identity} member={member} enemy={enemy} service={service} rules={rules} active={Boolean(active && active.identity === member.identity)} />)}</ReorderGrid>
      : <p className="hint">{t('battleTeam.waitingReading')}</p>}
    {members && <p className="battle-team-matchup-legend">{t('battleTeam.legend', { generation: rules.generation })}</p>}
  </section>
}
