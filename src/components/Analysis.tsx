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

export function Analysis({ team: sourceTeam, rules, collection, stale, collectionStale }: { team: readonly AnalysisPokemon[]; rules: TypeRules; collection?: readonly AnalysisPokemon[] | null; stale?: boolean; collectionStale?: boolean }) {
  const { t } = useTranslation()
  const discovered = useContext(DiscoveryContext)
  const [includeFainted, setIncludeFainted] = useState(true)
  const team = analysisMembers(sourceTeam, includeFainted)
  const excludedEggs = sourceTeam.filter(pokemon => pokemon.isEgg).length
  const faintedCount = sourceTeam.filter(isAnalysisFainted).length
  const defense = typeDefense(rules, team)
  const coverage = typeCoverage(rules, team.flatMap(pokemon => pokemon.types))
  const shared = defense.filter(row => row.weak >= 2).sort((a, b) => b.weak - a.weak)
  const covered = coverage.filter(row => row.attackers.length > 0)
  return <section className="panel" aria-labelledby="analysis-title">
    <div className="section-heading"><div><span className="eyebrow">{t('analysis.eyebrow')}</span><h2 id="analysis-title">{t('app.tabs.analysis')}</h2></div><span className="count">{t('games.generation', { number: rules.generation })}</span></div>
    <p className="hint">{t('analysis.onlyTypesHint')}</p>
    {stale && <p className="notice" role="status">{t('teamAnalysis.stale')}</p>}
    <div className="analysis-options-bar"><span role="status">{t('teamAnalysis.memberCount', { count: team.length })}</span>
      {sourceTeam.some(pokemon => pokemon.currentHp !== undefined) && <label><input type="checkbox" checked={includeFainted} onChange={event => setIncludeFainted(event.target.checked)} />{t('teamAnalysis.includeFainted')}</label>}
      {faintedCount > 0 && <small>{t(includeFainted ? 'teamAnalysis.faintedIncluded' : 'teamAnalysis.faintedExcluded', { count: faintedCount })}</small>}
      {excludedEggs > 0 && <small>{t('teamAnalysis.eggsExcluded', { count: excludedEggs })}</small>}
    </div>
    {team.length === 0 ? <p className="empty">{t(sourceTeam.length ? 'teamAnalysis.emptySelection' : 'analysis.emptyHint')}</p> : <>
      <div className={`insight ${shared.length ? 'warning' : ''}`}><strong>{shared.length ? t('analysis.insight.sharedWeaknesses') : t('analysis.insight.noSharedWeaknesses')}</strong><p>{shared.length ? shared.map(row => `${typeLabel(t, row.type)} (${row.weak}/${team.length})`).join(' · ') : t('analysis.insight.noneSuperEffective')}</p></div>
      <h3 className="subheading">{t('analysis.defenseHeading')} <span>{t('analysis.defenseSubnote')}</span></h3>
      <p className="hint">{t('analysis.multiplierLegend')}</p>
      <div className="table-scroll"><table className="defense-table"><caption className="sr-only">{t('analysis.tableCaption')}</caption><thead><tr><th scope="col">{t('analysis.table.attack')}</th><th scope="col">{t('analysis.table.weak')}</th><th scope="col">{t('analysis.table.neutral')}</th><th scope="col">{t('analysis.table.resist')}</th><th scope="col">{t('analysis.table.immune')}</th>{team.map(p => <th scope="col" key={p.instanceKey ?? p.id} className="member-name"><div className="defense-member"><span className="defense-member-sprite" aria-hidden="true">{discovered.has(p.id) && p.sprite ? <img src={p.sprite} alt="" width="48" height="48" loading="lazy" /> : '?'}</span><span>{p.nickname || pokemonDisplayName(p.name)}{p.nickname && <small>{pokemonDisplayName(p.name)}</small>}{isAnalysisFainted(p) && <small className="analysis-fainted">{t('pokemonCard.fainted')}</small>}</span></div></th>)}</tr></thead><tbody>{defense.map(row => <tr key={row.type} className={row.weak >= 2 ? 'shared-weakness' : ''}><th scope="row"><TypeBadge type={row.type} /></th><td className={row.weak ? 'weak-count' : ''}>{row.weak}</td><td>{row.neutral}</td><td className={row.resistant ? 'resist-count' : ''}>{row.resistant}</td><td className={row.immune ? 'immune-count' : ''}>{row.immune}</td>{row.members.map(member => <td key={member.pokemon.instanceKey ?? member.pokemon.id}><span className={`multiplier ${member.multiplier === 0 ? 'immune' : member.multiplier > 1 ? 'weak' : member.multiplier < 1 ? 'resist' : ''}`}>{member.multiplier}×</span></td>)}</tr>)}</tbody></table></div>
      <div className="coverage-heading"><h3 className="subheading">{t('analysis.coverageHeading')} <span>STAB</span></h3><strong>{t('typeRules.coverage', { count: covered.length, total: rules.types.length })}</strong></div>
      <p className="hint">{t('analysis.coverageHint')}</p>
      <div className="coverage-grid">{coverage.map(row => <div key={row.type} className={`coverage-item ${row.attackers.length ? 'covered' : ''}`}><TypeBadge type={row.type} /><span>{row.attackers.length ? t('analysis.coverage.superEffective') : t('analysis.coverage.noCoverage')}</span><small>{row.attackers.length ? row.attackers.map(type => typeLabel(t, type)).join(' · ') : '—'}</small></div>)}</div>
      {collection !== undefined && <AnalysisAlternatives rules={rules} team={sourceTeam} collection={collection} discovered={discovered} includeFainted={includeFainted} stale={collectionStale} />}
    </>}
  </section>
}
