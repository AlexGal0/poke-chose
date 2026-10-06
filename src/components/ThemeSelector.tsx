import { useState } from 'react'
import { loadTheme, saveTheme } from '../storage/theme'
import type { Theme } from '../storage/theme'
import './ThemeSelector.css'

export function ThemeSelector() {
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
        <span>Tema</span>
        <select value={theme} onChange={event => changeTheme(event.target.value as Theme)}>
          <option value="base">Original</option>
          <option value="pokemon">Pokémon</option>
          <option value="pokemon-dark">Pokémon oscuro</option>
          <option value="fiesta">Fiesta 🎉</option>
        </select>
      </label>
      {saveFailed && <small role="status">No se pudo guardar el tema en este navegador.</small>}
    </div>
  )
}
