import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { SavedPartyMember } from '../models/party'
import { getExperienceLevels } from '../api/experience'
import type { ExperienceLevel } from '../api/experience'
import { experienceProgress } from '../domain/experience'
import './TeamVitals.css'

export function TeamVitals({ speciesId, member }: { speciesId: number; member?: SavedPartyMember }) {
  const { t, i18n } = useTranslation()
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
    <div className="vital-label"><span>{t('common.hpAbbr')}</span><span>{hpKnown ? `${member.currentHp} / ${member.maxHp}` : t('teamVitals.noData')}</span></div>
    <progress className={`vital-bar hp-bar ${hpRatio <= 0.2 ? 'low' : hpRatio <= 0.5 ? 'medium' : ''} ${hpKnown ? '' : 'unavailable'}`} aria-label={t('common.hpAria')} aria-valuetext={hpKnown ? t('teamVitals.valueOfMax', { current: member.currentHp, max: member.maxHp }) : t('teamVitals.noHpData')} value={hpKnown ? member.currentHp : 0} max={hpKnown ? member.maxHp : 1} />
    <div className="vital-label"><span>EXP</span><span>{exp ? member?.level === 100 ? t('teamVitals.maxLevel') : t('teamVitals.remainingToLevelUp', { count: exp.remaining.toLocaleString(i18n.language) }) : t('teamVitals.noData')}</span></div>
    <progress className={`vital-bar exp-bar ${exp ? '' : 'unavailable'}`} aria-label={t('teamVitals.expAria')} aria-valuetext={exp ? member?.level === 100 ? t('teamVitals.maxLevel') : t('teamVitals.valueOfMax', { current: exp.value, max: exp.max }) : t('teamVitals.noExpData')} value={exp?.value ?? 0} max={exp?.max ?? 1} />
  </div>
}
