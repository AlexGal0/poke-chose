import { useTranslation } from 'react-i18next'
import { pokemonDisplayName } from '../domain/pokemon-names'
import { analyzeCoverage, analyzeDefense, stabTypes } from '../domain/effectiveness'
import { typeLabel } from '../i18n/types.ts'
import type { Pokemon } from '../models/pokemon'
import { TypeBadge } from './TypeBadge'
import './Analysis.css'

export function Analysis({ team }: { team: Pokemon[] }) {
  const { t } = useTranslation()
  const defense = analyzeDefense(team)
  const coverage = analyzeCoverage(stabTypes(team))
  const shared = defense.filter(row => row.weak >= 2).sort((a, b) => b.weak - a.weak)
  const covered = coverage.filter(row => row.attackers.length > 0)
  return <section className="panel" aria-labelledby="analysis-title">
    <div className="section-heading"><div><span className="eyebrow">{t('analysis.eyebrow')}</span><h2 id="analysis-title">{t('app.tabs.analysis')}</h2></div><span className="count">{t('analysis.genVBadge')}</span></div>
    <p className="hint">{t('analysis.onlyTypesHint')}</p>
    {team.length === 0 ? <p className="empty">{t('analysis.emptyHint')}</p> : <>
      <div className={`insight ${shared.length ? 'warning' : ''}`}><strong>{shared.length ? t('analysis.insight.sharedWeaknesses') : t('analysis.insight.noSharedWeaknesses')}</strong><p>{shared.length ? shared.map(row => `${typeLabel(t, row.type)} (${row.weak}/${team.length})`).join(' · ') : t('analysis.insight.noneSuperEffective')}</p></div>
      <h3 className="subheading">{t('analysis.defenseHeading')} <span>{t('analysis.defenseSubnote')}</span></h3>
      <p className="hint">{t('analysis.multiplierLegend')}</p>
      <div className="table-scroll"><table className="defense-table"><caption className="sr-only">{t('analysis.tableCaption')}</caption><thead><tr><th scope="col">{t('analysis.table.attack')}</th><th scope="col">{t('analysis.table.weak')}</th><th scope="col">{t('analysis.table.neutral')}</th><th scope="col">{t('analysis.table.resist')}</th><th scope="col">{t('analysis.table.immune')}</th>{team.map(p => <th scope="col" key={p.instanceKey ?? p.id} className="member-name"><div className="defense-member"><span className="defense-member-sprite" aria-hidden="true">{p.sprite ? <img src={p.sprite} alt="" width="48" height="48" loading="lazy" /> : '?'}</span><span>{pokemonDisplayName(p.name)}</span></div></th>)}</tr></thead><tbody>{defense.map(row => <tr key={row.type} className={row.weak >= 2 ? 'shared-weakness' : ''}><th scope="row"><TypeBadge type={row.type} /></th><td className={row.weak ? 'weak-count' : ''}>{row.weak}</td><td>{row.neutral}</td><td className={row.resistant ? 'resist-count' : ''}>{row.resistant}</td><td className={row.immune ? 'immune-count' : ''}>{row.immune}</td>{row.members.map(member => <td key={member.pokemon.instanceKey ?? member.pokemon.id}><span className={`multiplier ${member.multiplier === 0 ? 'immune' : member.multiplier > 1 ? 'weak' : member.multiplier < 1 ? 'resist' : ''}`}>{member.multiplier}×</span></td>)}</tr>)}</tbody></table></div>
      <div className="coverage-heading"><h3 className="subheading">{t('analysis.coverageHeading')} <span>STAB</span></h3><strong>{t('analysis.coverageCount', { count: covered.length })}</strong></div>
      <p className="hint">{t('analysis.coverageHint')}</p>
      <div className="coverage-grid">{coverage.map(row => <div key={row.type} className={`coverage-item ${row.attackers.length ? 'covered' : ''}`}><TypeBadge type={row.type} /><span>{row.attackers.length ? t('analysis.coverage.superEffective') : t('analysis.coverage.noCoverage')}</span><small>{row.attackers.length ? row.attackers.map(type => typeLabel(t, type)).join(' · ') : '—'}</small></div>)}</div>
    </>}
  </section>
}
