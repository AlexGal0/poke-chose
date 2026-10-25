import { useTranslation } from 'react-i18next'
import { GAME_MODULES } from '../games/profiles'
import type { GameProfile } from '../games/profiles'
import { LocaleSelector } from './LocaleSelector'
import { ThemeSelector } from './ThemeSelector'

export function GamePreparation({ game, onChangeGame }: { game: GameProfile; onChangeGame: () => void }) {
  const { t } = useTranslation()
  return <>
    <header className="site-header preparation-header">
      <span className="brand">Poké<span>Chose</span></span>
      <div className="header-controls">
        <button onClick={onChangeGame}>{t('games.change')}</button>
        <LocaleSelector /><ThemeSelector />
      </div>
    </header>
    <main className="game-preparation" aria-labelledby="preparation-title">
      <div className="game-preparation-heading">
        <span className="eyebrow">{t(`games.regions.${game.region}`)} · {t('games.generation', { number: game.generation })}</span>
        <h1 id="preparation-title">{t(`games.names.${game.id}`)}</h1>
        <p>{t('games.preparationDescription')}</p>
      </div>
      <section aria-labelledby="game-modules-title" className="panel">
        <h2 id="game-modules-title">{t('games.modulesHeading')}</h2>
        <p className="hint" id="module-unavailable">{t('games.moduleUnavailable')}</p>
        <div className="game-modules">
          {GAME_MODULES.map(module => <button key={module} disabled={!game.modules[module]} aria-describedby="module-unavailable">
            <strong>{t(`games.modules.${module}`)}</strong>
            <span>{t('games.pending')}</span>
          </button>)}
        </div>
      </section>
    </main>
  </>
}
