import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { KnowledgeContext, KNOWLEDGE_ACTIONS } from './knowledge-context'
import type { KnowledgeView } from './knowledge-context'
import type { KnowledgeService } from './knowledge'
import type { ManualPokemon } from './catalog'
import type { GameProfile } from '../profiles'
import { STATS, totalBaseStats, highestBaseStats } from '../../domain/stats'
import type { BaseStats, Stat } from '../../domain/stats'
import type { KnowledgeMove } from '../../domain/species-knowledge'
import { knowledgeVersionLabel } from '../../i18n/species-knowledge'
import { pokemonDisplayName } from '../../domain/pokemon-names'
import { statLabel } from '../../i18n/stats'
import { categoryLabel, moveDescription } from '../../i18n/moves'
import { TypeBadge } from '../../components/TypeBadge'
import { StatsRadar } from '../../components/StatsRadar'
import '../../components/Stats.css'
import '../../components/Moves.css'
import './Knowledge.css'
import { IndividualStats, IndividualMoves } from './IndividualKnowledge'
import { findRosterIndividual } from './saved-roster'
import type { RosterIndividual, SavedRosterPokemon } from './saved-roster'
import { EvolutionFamily } from './EvolutionFamily'

type Result = { kind: 'stats'; value: BaseStats } | { kind: 'moves'; value: KnowledgeMove[] } |
  { kind: 'evolution'; value: Awaited<ReturnType<KnowledgeService['evolution']>> }

function KnowledgeContent({ service, pokemon, view, locale, individual }: { individual?: RosterIndividual; service: KnowledgeService; pokemon: ManualPokemon; view: KnowledgeView; locale: string }) {
  const { t } = useTranslation()
  const version = knowledgeVersionLabel(t, service.rules.versionGroup)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [activeStat, setActiveStat] = useState<Stat | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    const task: Promise<Result> = view === 'stats' ? (individual?.pokemon.baseStats ? Promise.resolve(individual.pokemon.baseStats) : service.stats(pokemon, controller.signal)).then(value => ({ kind: 'stats', value }))
      : view === 'moves' ? service.moves(pokemon, locale, controller.signal).then(value => ({ kind: 'moves', value }))
        : service.evolution(pokemon, locale, controller.signal).then(value => ({ kind: 'evolution', value }))
    task.then(value => { if (!controller.signal.aborted) setResult(value) })
      .catch(() => { if (!controller.signal.aborted) setError(true) })
    return () => controller.abort()
  }, [service, pokemon, view, locale, attempt, individual?.pokemon.baseStats])

  if (error) return <p className="notice" role="alert">{t('speciesKnowledge.loadError')} <button onClick={() => { setError(false); setAttempt(value => value + 1) }}>{t('common.retry')}</button></p>
  if (!result) return <p className="empty" role="status">{t('speciesKnowledge.loading')}</p>
  if (result.kind === 'stats' && individual) return <IndividualStats individual={individual} base={result.value} />
  if (result.kind === 'stats') return <>
    <div className="knowledge-stats-summary"><strong>{t('statistics.total')}: {totalBaseStats(result.value)}</strong><p className="hint">{t('statistics.strengthsHeading')}: {highestBaseStats(result.value).map(stat => statLabel(t, stat)).join(' · ')}</p></div>
    <div className="knowledge-stats-layout"><StatsRadar base={result.value} individual={false} max={255} activeStat={activeStat} onHoverStat={setActiveStat} onFocusStat={setActiveStat} />
      <dl className="knowledge-stats">{STATS.map(stat => <div key={stat} onMouseEnter={() => setActiveStat(stat)} onMouseLeave={() => setActiveStat(null)}>
        <dt>{statLabel(t, stat)}</dt><dd><meter min="0" max="255" value={result.value[stat]} aria-label={statLabel(t, stat)} /><strong>{result.value[stat]}</strong></dd>
      </div>)}</dl></div>
  </>
  if (result.kind === 'moves') return result.value.length ? <div className="table-scroll"><table className="moves-table">
    <caption className="sr-only">{t('speciesKnowledge.movesCaption', { name: pokemonDisplayName(pokemon.name), version })}</caption><thead><tr>{['level', 'move', 'type', 'category', 'pp', 'description'].map(key => <th scope="col" key={key}>{t(`movesDialog.table.${key}`)}</th>)}</tr></thead>
    <tbody>{result.value.map(move => <tr key={`${move.slug}-${move.level}`}><td>{move.level === 0 ? t('movesDialog.initialLevel') : move.level}</td><th scope="row">{move.name}</th>
      <td>{move.type ? <TypeBadge type={move.type} /> : t('movesDialog.typeUnconfirmed')}</td><td>{categoryLabel(t, move.categoryId)}</td><td>{move.pp}</td><td>{moveDescription(t, move)}</td></tr>)}</tbody>
  </table></div> : <p className="empty">{t('movesDialog.noMoves')}</p>
  return <>
    <div className="family-tree-scroll" tabIndex={0} role="region" aria-label={t('evolutionDialog.heading')}><ul className="family-tree"><EvolutionFamily node={result.value.root} selectedId={pokemon.id} labels={result.value.labels} pokemon={result.value.pokemon} /></ul></div>
    {result.value.root.children.length === 0 && <p className="hint">{t('speciesKnowledge.noBranches')}</p>}
    <p className="hint">{t('speciesKnowledge.evolutionLimit')}</p>
  </>
}

function IndividualMoveTabs({ individual, children }: { individual?: RosterIndividual; children: ReactNode }) {
  const { t } = useTranslation()
  const [tab, setTab] = useState('known')
  return <><div className="knowledge-switch" role="group" aria-label={t('individualDetails.movesViews')}>
    <button aria-pressed={tab === 'known'} onClick={() => setTab('known')}>{t('individualDetails.knownMoves')}</button>
    <button aria-pressed={tab === 'learnset'} onClick={() => setTab('learnset')}>{t('individualDetails.learnset')}</button>
  </div>{tab === 'known' ? individual ? <IndividualMoves individual={individual} /> : <p className="notice">{t('individualDetails.missing')}</p> : children}</>
}

function KnowledgeDialog({ service, pokemon, initialView, modules, onClose, individual, requestedIndividual, stale }: { individual?: RosterIndividual; requestedIndividual?: boolean; stale?: boolean; service: KnowledgeService; pokemon: ManualPokemon; initialView: KnowledgeView; modules: GameProfile['modules']; onClose: () => void }) {
  const { t, i18n } = useTranslation()
  const version = knowledgeVersionLabel(t, service.rules.versionGroup)
  const [view, setView] = useState(initialView)
  const dialog = useRef<HTMLDialogElement>(null)
  const outsideStart = useRef(false)
  useEffect(() => {
    const element = dialog.current!
    const previous = document.activeElement as HTMLElement | null
    element.showModal()
    return () => { element.close(); previous?.focus() }
  }, [])
  function outside(event: React.PointerEvent<HTMLDialogElement> | React.MouseEvent<HTMLDialogElement>) {
    const bounds = event.currentTarget.getBoundingClientRect()
    return event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom
  }
  return <dialog ref={dialog} className="knowledge-dialog" aria-labelledby="knowledge-title" aria-describedby="knowledge-hint" onCancel={onClose}
    onPointerDown={event => { outsideStart.current = outside(event) }} onClick={event => { if (outsideStart.current && outside(event)) onClose(); outsideStart.current = false }}>
    <div className="knowledge-heading"><div><span className="eyebrow">{t('games.generation', { number: service.rules.generation })} · {version}</span><h2 id="knowledge-title">{individual?.pokemon.nickname || pokemonDisplayName(pokemon.name)}</h2>{individual?.pokemon.nickname && <p className="hint">{pokemonDisplayName(pokemon.name)}</p>}</div>
      <button autoFocus onClick={onClose} aria-label={t('speciesKnowledge.close')}>✕</button></div>
    <div className="knowledge-switch" role="group" aria-label={t('speciesKnowledge.views')}>
      {KNOWLEDGE_ACTIONS.filter(([, module]) => modules[module]).map(([kind]) => <button key={kind} aria-pressed={view === kind} onClick={() => setView(kind)}>{t(`speciesKnowledge.actions.${kind}`)}</button>)}
    </div>
    <p className="hint" id="knowledge-hint">{t(requestedIndividual && (view === 'stats' || view === 'moves') ? `individualDetails.${view}Hint` : `speciesKnowledge.${view}Hint`, { number: service.rules.generation, version })}</p>
    {requestedIndividual && (!individual || stale) && <p className="notice" role="status">{t(individual ? 'individualDetails.stale' : 'individualDetails.missing')}</p>}
    {requestedIndividual && view === 'moves' ? <IndividualMoveTabs key={i18n.language} individual={individual}><KnowledgeContent key={`moves-${i18n.language}`} service={service} pokemon={pokemon} view="moves" locale={i18n.language} /></IndividualMoveTabs>
      : requestedIndividual && view === 'stats' && !individual ? null : <KnowledgeContent key={`${view}-${i18n.language}`} service={service} pokemon={pokemon} view={view} locale={i18n.language} individual={individual} />}
  </dialog>
}

export function KnowledgeProvider({ children, service, game, individuals = [], stale }: { individuals?: SavedRosterPokemon[]; stale?: boolean; children: ReactNode; service: KnowledgeService; game: GameProfile }) {
  const [selection, setSelection] = useState<{ pokemon: ManualPokemon; view: KnowledgeView; individual?: RosterIndividual } | null>(null)
  const current = selection?.individual ? findRosterIndividual(selection.individual.pokemon, individuals) : undefined
  const individual = current && selection?.individual ? { pokemon: current, service: selection.individual.service } : undefined
  return <KnowledgeContext.Provider value={{ open: (pokemon, view, individual) => setSelection({ pokemon, view, individual }), modules: game.modules, service }}>
    {children}
    {selection && <KnowledgeDialog key={selection.individual?.pokemon.instanceKey ?? selection.pokemon.id} individual={individual} requestedIndividual={!!selection.individual} stale={stale} service={service} pokemon={selection.pokemon} initialView={selection.view} modules={game.modules} onClose={() => setSelection(null)} />}
  </KnowledgeContext.Provider>
}
