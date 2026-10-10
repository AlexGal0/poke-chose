import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getSavePokemon } from '../api/pokeapi'
import { getExperienceLevels } from '../api/experience'
import { levelFromExperience } from '../domain/experience'
import type { SavedDaycarePokemon } from '../models/party'
import type { Pokemon } from '../models/pokemon'
import type { TeamSourceState } from '../sources/team'
import './Daycare.css'

function OccupiedSlot({ member }: { member: SavedDaycarePokemon }) {
  const { t } = useTranslation()
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ key: string; pokemon: Pokemon | null; level: number | null } | null>(null)
  const key = `${member.speciesId}-${member.form}-${member.experience}-${member.gainedExperience}`
  useEffect(() => {
    const controller = new AbortController()
    void Promise.allSettled([
      getSavePokemon(member.speciesId, member.form, controller.signal),
      getExperienceLevels(member.speciesId, controller.signal),
    ]).then(([pokemon, levels]) => {
      if (controller.signal.aborted) return
      setResult({ key, pokemon: pokemon.status === 'fulfilled' ? pokemon.value : null,
        level: levels.status === 'fulfilled' ? levelFromExperience(member.experience + member.gainedExperience, levels.value) : null })
    })
    return () => controller.abort()
  }, [key, member.speciesId, member.form, member.experience, member.gainedExperience, attempt])
  const current = result?.key === key ? result : null
  return <>
    {current?.pokemon?.sprite && <img className="daycare-sprite" src={current.pokemon.sprite} alt="" />}
    <h3>{member.nickname ?? current?.pokemon?.name ?? t('daycare.species', { id: member.speciesId })}</h3>
    {member.nickname && current?.pokemon && <p>{current.pokemon.name}</p>}
    <strong className="daycare-level">{current?.level != null ? t('daycare.level', { level: current.level }) : t(current ? 'daycare.levelUnavailable' : 'daycare.loading')}</strong>
    {current && (!current.pokemon || current.level == null) && <button onClick={() => setAttempt(value => value + 1)}>{t('daycare.retry')}</button>}
  </>
}

export function Daycare({ state, source }: { state: TeamSourceState; source: 'manual' | 'save' | 'live' }) {
  const { t } = useTranslation()
  const data = source === 'manual' ? null : state.daycare
  return <section className="daycare" aria-labelledby="daycare-title">
    <header className="daycare-header">
      <div><h2 id="daycare-title">{t('daycare.title')}</h2><p>{t(source === 'manual' ? 'daycare.manual' : source === 'save' ? 'daycare.saveHint' : 'daycare.liveHint')}</p></div>
      <span className={`daycare-egg ${data?.eggAvailable ? 'daycare-egg-ready' : ''}`}>
        <span aria-hidden="true">🥚</span> {t(data ? data.eggAvailable ? 'daycare.eggReady' : 'daycare.noEgg' : 'daycare.eggUnknown')}
      </span>
    </header>
    {source !== 'manual' && state.daycareStale && <p role="status" className="daycare-notice">{t(data ? 'daycare.stale' : 'daycare.unavailable')}</p>}
    <div className="daycare-slots">
      {[0, 1].map(slot => <article className="daycare-slot" key={slot} aria-label={t('daycare.slot', { number: slot + 1 })}>
        <span className="daycare-slot-label">{t('daycare.slot', { number: slot + 1 })}</span>
        {!data ? <p className="daycare-empty">{t('daycare.unknown')}</p> : data.slots[slot] ? <OccupiedSlot member={data.slots[slot]} /> : <p className="daycare-empty">{t('daycare.empty')}</p>}
      </article>)}
    </div>
  </section>
}
