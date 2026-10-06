import { pokemonDisplayName } from '../domain/pokemon-names'
import { analyzeCoverage, analyzeDefense, stabTypes } from '../domain/effectiveness'
import { TYPE_LABELS } from '../models/pokemon'
import type { Pokemon } from '../models/pokemon'
import { TypeBadge } from './TypeBadge'

export function Analysis({ team }: { team: Pokemon[] }) {
  const defense = analyzeDefense(team)
  const coverage = analyzeCoverage(stabTypes(team))
  const shared = defense.filter(row => row.weak >= 2).sort((a, b) => b.weak - a.weak)
  const covered = coverage.filter(row => row.attackers.length > 0)
  return <section className="panel" aria-labelledby="analysis-title">
    <div className="section-heading"><div><span className="eyebrow">04 / CONOCE TU EQUIPO</span><h2 id="analysis-title">Balance de tipos</h2></div><span className="count">Gen V</span></div>
    <p className="hint">Solo tipos: no incluye habilidades, objetos ni efectos de movimientos.</p>
    {team.length === 0 ? <p className="empty">Añade tu primer miembro para ver el análisis del equipo.</p> : <>
      <div className={`insight ${shared.length ? 'warning' : ''}`}><strong>{shared.length ? 'Debilidades compartidas' : 'Sin debilidades compartidas'}</strong><p>{shared.length ? shared.map(row => `${TYPE_LABELS[row.type]} (${row.weak}/${team.length})`).join(' · ') : 'Ningún tipo de ataque es supereficaz contra dos o más miembros.'}</p></div>
      <h3 className="subheading">Defensa <span>según el tipo de ataque</span></h3>
      <p className="hint">Débil: 2× / 4× · Neutral: 1× · Resiste: ½× / ¼× · Inmune: 0×</p>
      <div className="table-scroll"><table className="defense-table"><caption className="sr-only">Efectividad defensiva y multiplicadores de cada miembro</caption><thead><tr><th scope="col">Ataque</th><th scope="col">Débil</th><th scope="col">Neutral</th><th scope="col">Resiste</th><th scope="col">Inmune</th>{team.map(p => <th scope="col" key={p.instanceKey ?? p.id} className="member-name">{pokemonDisplayName(p.name)}</th>)}</tr></thead><tbody>{defense.map(row => <tr key={row.type} className={row.weak >= 2 ? 'shared-weakness' : ''}><th scope="row"><TypeBadge type={row.type} /></th><td className={row.weak ? 'weak-count' : ''}>{row.weak}</td><td>{row.neutral}</td><td className={row.resistant ? 'resist-count' : ''}>{row.resistant}</td><td className={row.immune ? 'immune-count' : ''}>{row.immune}</td>{row.members.map(member => <td key={member.pokemon.instanceKey ?? member.pokemon.id}><span className={`multiplier ${member.multiplier === 0 ? 'immune' : member.multiplier > 1 ? 'weak' : member.multiplier < 1 ? 'resist' : ''}`}>{member.multiplier}×</span></td>)}</tr>)}</tbody></table></div>
      <div className="coverage-heading"><h3 className="subheading">Cobertura ofensiva <span>STAB</span></h3><strong>{covered.length} / 17 tipos</strong></div>
      <p className="hint">Tipos rivales individuales que puedes golpear de forma supereficaz con tus tipos propios. No garantiza que conozcas un movimiento de ese tipo.</p>
      <div className="coverage-grid">{coverage.map(row => <div key={row.type} className={`coverage-item ${row.attackers.length ? 'covered' : ''}`}><TypeBadge type={row.type} /><span>{row.attackers.length ? '✓ Supereficaz' : 'Sin cobertura'}</span><small>{row.attackers.length ? row.attackers.map(type => TYPE_LABELS[type]).join(' · ') : '—'}</small></div>)}</div>
    </>}
  </section>
}
