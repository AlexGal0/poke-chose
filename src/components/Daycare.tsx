import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ExperienceLevel } from '../api/experience'
import { experienceProgress, levelFromExperience } from '../domain/experience'
import type { DaycarePokemon, DaycareReading, DaycareService } from '../games/core/daycare'
import './Daycare.css'
import { DaycareEvolution } from './DaycareEvolution'
import { GenderBadge } from '../games/core/GenderBadge'

function OccupiedSlot({ member, service, onOpenEvolution }: { member: DaycarePokemon; service: DaycareService; onOpenEvolution: (speciesId: number) => void }) {
  const { t, i18n } = useTranslation()
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ service: DaycareService; key: string; pokemon: { name: string; sprite: string | null } | null; levels: ExperienceLevel[] | null } | null>(null)
  const key = `${member.speciesId}-${member.form}`
  useEffect(() => {
    const controller = new AbortController()
    void Promise.allSettled([
      service.resolve(member.speciesId, member.form, controller.signal),
      service.experienceLevels(member.speciesId, controller.signal),
    ]).then(([pokemon, levels]) => {
      if (controller.signal.aborted) return
      setResult({ service, key, pokemon: pokemon.status === 'fulfilled' ? pokemon.value : null,
        levels: levels.status === 'fulfilled' ? levels.value : null })
    })
    return () => controller.abort()
  }, [key, member.speciesId, member.form, attempt, service])
  const current = result?.key === key && result.service === service ? result : null
  const totalExperience = member.experience
  const level = current?.levels ? levelFromExperience(totalExperience, current.levels) : null
  const progress = level != null && current?.levels ? experienceProgress(level, totalExperience, current.levels) : null
  return <>
    <DaycareEvolution service={service} onOpenEvolution={onOpenEvolution} speciesId={member.speciesId} level={level} stepsRemaining={progress?.remaining ?? null} />
    {current?.pokemon?.sprite && <img className="daycare-sprite" src={current.pokemon.sprite} alt="" />}
    <div className="daycare-name"><h3>{member.nickname ?? current?.pokemon?.name ?? t('daycare.species', { id: member.speciesId })}</h3><GenderBadge kind={member.gender} /></div>
    {member.nickname && current?.pokemon && <p>{current.pokemon.name}</p>}
    <strong className="daycare-level">{level != null ? t('daycare.level', { level }) : t(current ? 'daycare.levelUnavailable' : 'daycare.loading')}</strong>
    {progress && <div className="daycare-experience">
      <div className="daycare-exp-label"><span>EXP</span><span>{level === 100 ? t('daycare.maxLevel') : t('daycare.nextLevel', { level: level! + 1 })}</span></div>
      <progress className="daycare-exp-bar" aria-label={t('daycare.expAria')} aria-valuetext={level === 100 ? t('daycare.maxLevel') : t('daycare.expValue', { current: progress.value, max: progress.max })} value={progress.value} max={progress.max} />
      <p className="daycare-steps">{level === 100 ? t('daycare.maxLevel') : t('daycare.stepsRemaining', { steps: progress.remaining.toLocaleString(i18n.language) })}</p>
    </div>}
    {current && (!current.pokemon || level == null) && <button onClick={() => setAttempt(value => value + 1)}>{t('daycare.retry')}</button>}
  </>
}

export function Daycare({ reading, service, hint, onOpenEvolution }: { reading: DaycareReading; service: DaycareService; hint: string; onOpenEvolution: (speciesId: number) => void }) {
  const { t } = useTranslation()
  const data = reading.available ? reading.data : null
  return <section className="daycare" aria-labelledby="daycare-title">
    <header className="daycare-header">
      <div><h2 id="daycare-title">{t('daycare.title')}</h2><p>{hint}</p></div>
      <span className={`daycare-egg ${data?.eggAvailable ? 'daycare-egg-ready' : ''}`}>
        <span aria-hidden="true">🥚</span> {t(data ? data.eggAvailable ? 'daycare.eggReady' : 'daycare.noEgg' : 'daycare.eggUnknown')}
      </span>
    </header>
    {reading.available && reading.stale && <p role="status" className="daycare-notice">{t(data ? 'daycare.stale' : 'daycare.unavailable')}</p>}
    <div className="daycare-slots">
      {[0, 1].map(slot => <article className="daycare-slot" key={slot} aria-label={t('daycare.slot', { number: slot + 1 })}>
        <span className="daycare-slot-label">{t('daycare.slot', { number: slot + 1 })}</span>
        {!data ? <p className="daycare-empty">{t('daycare.unknown')}</p> : data.slots[slot] ? <OccupiedSlot member={data.slots[slot]} service={service} onOpenEvolution={onOpenEvolution} /> : <p className="daycare-empty">{t('daycare.empty')}</p>}
      </article>)}
    </div>
  </section>
}
