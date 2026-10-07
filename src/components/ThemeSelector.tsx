import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { loadTheme, saveTheme } from '../storage/theme'
import type { Theme } from '../storage/theme'
import './ThemeSelector.css'

export function ThemeSelector() {
  const { t } = useTranslation()
  const [theme, setTheme] = useState(loadTheme)
  const [saveFailed, setSaveFailed] = useState(false)

  function changeTheme(next: Theme) {
    document.documentElement.dataset.theme = next
    setTheme(next)
    setSaveFailed(!saveTheme(next))
  }

  return (
    <div className="theme-control">
      <label className="theme-selector">
        <span>{t('theme.label')}</span>
        <select value={theme} onChange={event => changeTheme(event.target.value as Theme)}>
          <option value="base">{t('theme.options.base')}</option>
          <option value="pokemon">{t('theme.options.pokemon')}</option>
          <option value="pokemon-dark">{t('theme.options.pokemonDark')}</option>
          <option value="gameboy-color">{t('theme.options.gameboyColor')}</option>
          <option value="aqua-2000">{t('theme.options.aqua2000')}</option>
          <option value="classic-html">{t('theme.options.classicHtml')}</option>
          <option value="fiesta">{t('theme.options.fiesta')}</option>
        </select>
      </label>
      {saveFailed && <small role="status">{t('theme.saveFailed')}</small>}
    </div>
  )
}
