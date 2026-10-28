import { useTranslation } from 'react-i18next'
import type { CombatField, CombatSideId, FieldPokemon } from '../games/core/combat'
import type { CombatPresentation } from '../games/core/combat-presentation'
import type { CombatParticipant, CombatService } from '../models/combat'
import type { TypeRules } from '../domain/type-analysis'
import { useBattlePokemon } from '../hooks/useBattlePokemon'
import { BattlePokemon, type BattlePokemonDensity } from './BattlePokemon'
import { BattleOpponentRoster } from './BattleOpponentRoster'
import { BattleFieldTeam } from './BattleFieldTeam'
import './EnemyPrototype.css'
import './BattleField.css'

function participant(pokemon: FieldPokemon): CombatParticipant {
  return { ...pokemon, slot: pokemon.partySlot }
}

function FieldCard({ pokemon, side, density, service, rules }: { pokemon: FieldPokemon; side: CombatSideId; density: BattlePokemonDensity; service: CombatService; rules: TypeRules }) {
  const candidate = participant(pokemon)
  const data = useBattlePokemon(candidate, service)
  return <BattlePokemon candidate={candidate} pokemon={data.pokemon} error={data.error} health={candidate.health} stages={candidate.stages} own={side === 'player'} density={density} service={service} rules={rules} />
}

export function BattleField({ field, service, rules, presentation, playerTeam = null, stale = false }: { field: CombatField; service: CombatService; rules: TypeRules; presentation?: CombatPresentation; playerTeam?: readonly FieldPokemon[] | null; stale?: boolean }) {
  const { t } = useTranslation()
  if (field.format.state === 'unknown') return <p className="notice" role="status">{t('battleField.unknownFormat')}</p>
  const format = field.format.value
  if (format.kind === 'special') {
    const extension = presentation?.specialFormats.find(entry => entry.format.gameId === format.gameId && entry.format.id === format.id)
    return extension?.renderField ? <>{extension.renderControls?.(field)}{extension.renderField(field)}{extension.renderDetails?.(field)}</> : <p className="notice">{t('battleField.unsupportedFormat')}</p>
  }
  const density = format.id === 'single' ? 'detailed' : format.id === 'double' ? 'semicompact' : 'compact'
  return <div className={`battle-field battle-field-${format.id}`}>
    <h3 className="battle-field-title">{t(`battleField.formats.${format.id}`)}</h3>
    <BattleOpponentRoster total={field.sides[1].rosterTotal.state === 'known' ? field.sides[1].rosterTotal.value : null} stale={stale} />
    <div className="battle-field-sides">
      {field.sides.map(side => <section className={`battle-field-side battle-field-side-${side.id}`} aria-label={t(`battleField.sides.${side.id}`)} key={side.id}>
        <h4>{t(`battleField.sides.${side.id}`)}</h4>
        <div className="battle-field-positions">{side.positions.map((position, index) => <div className="battle-field-position" key={position.id}>
          <p className="battle-field-position-label">{t('battleField.position', { count: index + 1 })}</p>
          {position.state === 'occupied' ? <FieldCard pokemon={position.pokemon} side={side.id} density={density} service={service} rules={rules} />
            : <p className="battle-field-placeholder">{t(position.state === 'unknown' ? 'battleField.unknownPosition' : 'battleField.emptyPosition')}</p>}
        </div>)}</div>
      </section>)}
    </div>
    <BattleFieldTeam field={field} playerTeam={playerTeam} service={service} rules={rules} single={format.id === 'single'} />
  </div>
}
