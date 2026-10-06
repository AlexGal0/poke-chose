import { useEffect, useState } from 'react'
import type { SavedPartyMember } from '../models/party'
import { getExperienceLevels } from '../api/experience'
import type { ExperienceLevel } from '../api/experience'
import { experienceProgress } from '../domain/experience'
import './TeamVitals.css'

export function TeamVitals({ speciesId, member }: { speciesId: number; member?: SavedPartyMember }) {
  const [table, setTable] = useState<{ speciesId: number; levels: ExperienceLevel[] } | null>(null)
  const needsExperience = member?.experience !== undefined && !member.isEgg
  useEffect(() => {
    if (!needsExperience) return
    const controller = new AbortController()
    void getExperienceLevels(speciesId, controller.signal).then(levels => {
      if (!controller.signal.aborted) setTable({ speciesId, levels })
    }).catch(() => { /* Keep the bar unavailable when the growth table cannot be loaded. */ })
    return () => controller.abort()
  }, [speciesId, needsExperience])
  if (member?.isEgg) return null
  const hpKnown = member?.currentHp !== undefined && member.maxHp !== undefined && member.maxHp > 0
  const hpRatio = hpKnown ? member.currentHp! / member.maxHp! : 0
  const exp = member?.experience !== undefined && table?.speciesId === speciesId
    ? experienceProgress(member.level, member.experience, table.levels) : null
  return <div className="team-vitals">
    <div className="vital-label"><span>PS</span><span>{hpKnown ? `${member.currentHp} / ${member.maxHp}` : 'Sin datos'}</span></div>
    <progress className={`vital-bar hp-bar ${hpRatio <= 0.2 ? 'low' : hpRatio <= 0.5 ? 'medium' : ''} ${hpKnown ? '' : 'unavailable'}`} aria-label="Puntos de salud" aria-valuetext={hpKnown ? `${member.currentHp} de ${member.maxHp}` : 'Sin datos de salud'} value={hpKnown ? member.currentHp : 0} max={hpKnown ? member.maxHp : 1} />
    <div className="vital-label"><span>EXP</span><span>{exp ? member?.level === 100 ? 'Nivel máximo' : `${exp.remaining.toLocaleString('es')} para subir` : 'Sin datos'}</span></div>
    <progress className={`vital-bar exp-bar ${exp ? '' : 'unavailable'}`} aria-label="Experiencia hacia el siguiente nivel" aria-valuetext={exp ? member?.level === 100 ? 'Nivel máximo' : `${exp.value} de ${exp.max}` : 'Sin datos de experiencia'} value={exp?.value ?? 0} max={exp?.max ?? 1} />
  </div>
}
