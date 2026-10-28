import type { CombatField, FieldPokemon } from '../games/core/combat'
import type { CombatService } from '../models/combat'
import type { TypeRules } from '../domain/type-analysis'
import { fieldComparisonOptions } from '../domain/field-combat-comparison'
import { useBattlePokemon } from '../hooks/useBattlePokemon'
import { BattleTypeMatchup } from './BattleTypeMatchup'
import { BattleTeam } from './BattleTeam'

export function BattleFieldTeam({ field, service, rules, playerTeam, single }: { field: CombatField; service: CombatService; rules: TypeRules; playerTeam: readonly FieldPokemon[] | null; single: boolean }) {
  const ownOptions = fieldComparisonOptions(field, 'player')
  const own = single ? ownOptions[0] : null
  const enemy = single ? fieldComparisonOptions(field, 'opponent')[0] : null
  const ownData = useBattlePokemon(own ? { ...own.pokemon, slot: own.pokemon.partySlot } : null, service)
  const enemyData = useBattlePokemon(enemy ? { ...enemy.pokemon, slot: enemy.pokemon.partySlot } : null, service)
  return <>
    {single && <div className="battle-field-matchups">
      <BattleTypeMatchup own={ownData.pokemon} enemy={enemyData.pokemon} direction="outgoing" rules={rules} />
      <BattleTypeMatchup own={ownData.pokemon} enemy={enemyData.pokemon} direction="incoming" rules={rules} />
    </div>}
    <BattleTeam members={playerTeam?.map(pokemon => ({ ...pokemon, slot: pokemon.partySlot })) ?? null} active={null} activeParticipants={ownOptions.map(option => ({ ...option.pokemon, slot: option.pokemon.partySlot }))} enemy={enemyData.pokemon} showMatchup={single} service={service} rules={rules} />
  </>
}
