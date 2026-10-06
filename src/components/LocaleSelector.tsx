import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { loadLocale, saveLocale, LOCALES } from '../storage/locale.ts'
import type { Locale } from '../storage/locale.ts'
import './LocaleSelector.css'

export function LocaleSelector() {
  const { t, i18n } = useTranslation()
  const [locale, setLocale] = useState(loadLocale)
  const [saveFailed, setSaveFailed] = useState(false)

  function changeLocale(next: Locale) {
    void i18n.changeLanguage(next)
    setLocale(next)
    setSaveFailed(!saveLocale(next))
  }

  return (
    <div className="locale-control">
      <label className="locale-selector">
        <span>{t('locale.label')}</span>
        <select value={locale} onChange={event => changeLocale(event.target.value as Locale)}>
          {LOCALES.map(option => (
            <option key={option} value={option}>{t(`locale.options.${option}`)}</option>
          ))}
        </select>
      </label>
      {saveFailed && <small role="status">{t('locale.saveFailed')}</small>}
    </div>
  )
}
