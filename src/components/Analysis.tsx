import { useContext, useState } from 'react'
import { DiscoveryContext } from './discovery-context'
import { analysisMembers, isAnalysisFainted } from '../domain/team-options'
import { AnalysisAlternatives } from './AnalysisAlternatives'
import { useTranslation } from 'react-i18next'
import { pokemonDisplayName } from '../domain/pokemon-names'
import { typeCoverage, typeDefense } from '../domain/type-analysis'
import type { AnalysisPokemon, TypeRules } from '../domain/type-analysis'
import { typeLabel } from '../i18n/types.ts'

import { TypeBadge } from './TypeBadge'
import './Analysis.css'

function Portrait({ pokemon, discovered }: { pokemon: AnalysisPokemon; discovered: ReadonlySet<number> }) {
  return <span className="balance-portrait" aria-hidden="true">{discovered.has(pokemon.id) && pokemon.sprite ? <img src={pokemon.sprite} alt="" width="48" height="48" loading="lazy" /> : '?'}</span>
}

function multiplierClass(value: number) { return value === 0 ? 'immune' : value > 1 ? 'weak' : value < 1 ? 'resist' : '' }

export function Analysis({ team: sourceTeam, rules, collection, stale, collectionStale }: { team: readonly AnalysisPokemon[]; rules: TypeRules; collection?: readonly AnalysisPokemon[] | null; stale?: boolean; collectionStale?: boolean }) {
  const { t } = useTranslation()
  const discovered = useContext(DiscoveryContext)
  const [includeFainted, setIncludeFainted] = useState(true)
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [onlyGaps, setOnlyGaps] = useState(false)
  const team = analysisMembers(sourceTeam, includeFainted)
  const excludedEggs = sourceTeam.filter(pokemon => pokemon.isEgg).length
  const faintedCount = sourceTeam.filter(isAnalysisFainted).length
  const defense = typeDefense(rules, team)
  const coverage = typeCoverage(rules, team.flatMap(pokemon => pokemon.types))
  const shared = defense.filter(row => row.weak >= 2).sort((a, b) => b.weak - a.weak)
  const covered = coverage.filter(row => row.attackers.length > 0)
  const gaps = coverage.filter(row => !row.attackers.length)
  const inspected = defense.find(row => row.type === selectedType) ?? shared[0] ?? defense[0]
  return <section className="balance-screen" aria-labelledby="analysis-title">
    <header className="balance-hero"><div className="section-heading"><div><span className="eyebrow">{t('analysis.eyebrow')}</span><h2 id="analysis-title">{t('app.tabs.analysis')}</h2></div><span className="count">{t('games.generation', { number: rules.generation })}</span></div>
    <p className="hint">{t('analysis.onlyTypesHint')}</p></header>
    {stale && <p className="notice" role="status">{t('teamAnalysis.stale')}</p>}
    <div className="analysis-options-bar"><span role="status">{t('teamAnalysis.memberCount', { count: team.length })}</span>
      {sourceTeam.some(pokemon => pokemon.currentHp !== undefined) && <label><input type="checkbox" checked={includeFainted} onChange={event => setIncludeFainted(event.target.checked)} />{t('teamAnalysis.includeFainted')}</label>}
      {faintedCount > 0 && <small>{t(includeFainted ? 'teamAnalysis.faintedIncluded' : 'teamAnalysis.faintedExcluded', { count: faintedCount })}</small>}
      {excludedEggs > 0 && <small>{t('teamAnalysis.eggsExcluded', { count: excludedEggs })}</small>}
    </div>
    {team.length === 0 ? <p className="empty">{t(sourceTeam.length ? 'teamAnalysis.emptySelection' : 'analysis.emptyHint')}</p> : <>
      <div className="balance-overview">
        <div><span>{t('balanceRefresh.members')}</span><strong>{team.length}</strong><small>{t('balanceRefresh.membersNote')}</small></div>
        <div className={shared.length ? 'has-risk' : ''}><span>{t('analysis.insight.sharedWeaknesses')}</span><strong>{shared.length}</strong><small>{t('balanceRefresh.sharedNote')}</small></div>
        <div><span>{t('analysis.coverageHeading')}</span><strong>{covered.length}<small> / {rules.types.length}</small></strong><small>STAB · {t('balanceRefresh.gaps', { count: gaps.length })}</small></div>
      </div>
      <nav className="balance-jump" aria-label={t('balanceRefresh.sections')}><a href="#balance-risks">{t('balanceRefresh.risks')}</a><a href="#balance-defense">{t('analysis.defenseHeading')}</a><a href="#balance-coverage">{t('analysis.coverageHeading')}</a>{collection !== undefined && <a href="#analysis-alternatives-title">{t('teamAnalysis.alternatives')}</a>}</nav>
      <section className="balance-section" id="balance-risks" aria-labelledby="balance-risks-title">
        <div className="balance-section-heading"><div><span className="balance-kicker">01</span><h3 id="balance-risks-title">{t('balanceRefresh.risks')}</h3></div><p>{t('balanceRefresh.riskHint')}</p></div>
        {shared.length ? <div className="balance-risk-grid">{shared.map(row => <button className="balance-risk" key={row.type} aria-pressed={inspected.type === row.type} onClick={() => setSelectedType(row.type)}><TypeBadge type={row.type} /><strong>{row.weak}<small> / {team.length}</small></strong><span className="balance-risk-track" aria-hidden="true"><span style={{ width: `${row.weak / team.length * 100}%` }} /></span><small>{t('balanceRefresh.weakMembers')}</small></button>)}</div> : <div className="insight"><strong>{t('analysis.insight.noSharedWeaknesses')}</strong><p>{t('analysis.insight.noneSuperEffective')}</p></div>}
        <div className="balance-inspector">
          <label>{t('balanceRefresh.inspect')}<select value={inspected.type} onChange={event => setSelectedType(event.target.value)}>{rules.types.map(type => <option value={type} key={type}>{typeLabel(t, type)}</option>)}</select></label>
          <div className="balance-member-grid">{inspected.members.map(({ pokemon, multiplier }) => <div className={`balance-member ${multiplierClass(multiplier)}`} key={pokemon.instanceKey ?? pokemon.id}><Portrait pokemon={pokemon} discovered={discovered} /><div><strong>{pokemon.nickname || pokemonDisplayName(pokemon.name)}</strong><small>{t(multiplier === 0 ? 'analysis.table.immune' : multiplier > 1 ? 'analysis.table.weak' : multiplier < 1 ? 'analysis.table.resist' : 'analysis.table.neutral')}</small>{isAnalysisFainted(pokemon) && <small className="analysis-fainted">{t('pokemonCard.fainted')}</small>}</div><span className={`multiplier ${multiplierClass(multiplier)}`}>{multiplier}×</span></div>)}</div>
        </div>
      </section>
      <section className="balance-section" id="balance-defense" aria-labelledby="balance-defense-title">
      <div className="balance-section-heading"><div><span className="balance-kicker">02</span><h3 id="balance-defense-title">{t('analysis.defenseHeading')}</h3></div><p>{t('analysis.defenseSubnote')}</p></div>
      <p className="hint">{t('analysis.multiplierLegend')}</p>
      <div className="table-scroll balance-defense-table"><table className="defense-table"><caption className="sr-only">{t('analysis.tableCaption')}</caption><thead><tr><th scope="col">{t('analysis.table.attack')}</th><th scope="col">{t('analysis.table.weak')}</th><th scope="col">{t('analysis.table.neutral')}</th><th scope="col">{t('analysis.table.resist')}</th><th scope="col">{t('analysis.table.immune')}</th>{team.map(p => <th scope="col" key={p.instanceKey ?? p.id} className="member-name"><div className="defense-member"><span className="defense-member-sprite" aria-hidden="true">{discovered.has(p.id) && p.sprite ? <img src={p.sprite} alt="" width="48" height="48" loading="lazy" /> : '?'}</span><span>{p.nickname || pokemonDisplayName(p.name)}{p.nickname && <small>{pokemonDisplayName(p.name)}</small>}{isAnalysisFainted(p) && <small className="analysis-fainted">{t('pokemonCard.fainted')}</small>}</span></div></th>)}</tr></thead><tbody>{defense.map(row => <tr key={row.type} className={row.weak >= 2 ? 'shared-weakness' : ''}><th scope="row"><TypeBadge type={row.type} /></th><td className={row.weak ? 'weak-count' : ''}>{row.weak}</td><td>{row.neutral}</td><td className={row.resistant ? 'resist-count' : ''}>{row.resistant}</td><td className={row.immune ? 'immune-count' : ''}>{row.immune}</td>{row.members.map(member => <td key={member.pokemon.instanceKey ?? member.pokemon.id}><span className={`multiplier ${member.multiplier === 0 ? 'immune' : member.multiplier > 1 ? 'weak' : member.multiplier < 1 ? 'resist' : ''}`}>{member.multiplier}×</span></td>)}</tr>)}</tbody></table></div>
      <div className="balance-defense-mobile">{defense.map(row => <details key={row.type}><summary><TypeBadge type={row.type} /><span>{t('analysis.table.weak')}: <strong>{row.weak}</strong> · {t('analysis.table.resist')}: <strong>{row.resistant}</strong></span></summary><dl className="balance-defense-counts">{[['weak', row.weak], ['neutral', row.neutral], ['resist', row.resistant], ['immune', row.immune]].map(([key, count]) => <div key={key}><dt>{t(`analysis.table.${key}`)}</dt><dd>{count}</dd></div>)}</dl><div className="balance-member-grid">{row.members.map(({ pokemon, multiplier }) => <div className="balance-member" key={pokemon.instanceKey ?? pokemon.id}><Portrait pokemon={pokemon} discovered={discovered} /><strong>{pokemon.nickname || pokemonDisplayName(pokemon.name)}</strong><span className={`multiplier ${multiplierClass(multiplier)}`}>{multiplier}×</span></div>)}</div></details>)}</div>
      </section>
      <section className="balance-section" id="balance-coverage" aria-labelledby="balance-coverage-title">
      <div className="coverage-heading"><h3 className="subheading" id="balance-coverage-title">{t('analysis.coverageHeading')} <span>STAB</span></h3><strong>{t('typeRules.coverage', { count: covered.length, total: rules.types.length })}</strong></div>
      <p className="hint">{t('analysis.coverageHint')}</p>
      <label className="balance-gap-filter"><input type="checkbox" checked={onlyGaps} onChange={event => setOnlyGaps(event.target.checked)} />{t('balanceRefresh.onlyGaps')}</label>
      {onlyGaps && gaps.length === 0 && <p className="insight">{t('balanceRefresh.noGaps')}</p>}
      <div className="coverage-grid">{(onlyGaps ? gaps : coverage).map(row => <div key={row.type} className={`coverage-item ${row.attackers.length ? 'covered' : ''}`}><TypeBadge type={row.type} /><span>{row.attackers.length ? t('analysis.coverage.superEffective') : t('analysis.coverage.noCoverage')}</span><small>{row.attackers.length ? row.attackers.map(type => typeLabel(t, type)).join(' · ') : '—'}</small></div>)}</div>
      </section>
      {collection !== undefined && <AnalysisAlternatives rules={rules} team={sourceTeam} collection={collection} discovered={discovered} includeFainted={includeFainted} stale={collectionStale} />}
    </>}
  </section>
}
