import { useTranslation } from 'react-i18next'
import { GAME_PROFILES } from '../games/profiles'
import type { GameProfile } from '../games/profiles'
import { LocaleSelector } from './LocaleSelector'
import { ThemeSelector } from './ThemeSelector'
import blackCover from '../assets/games/pokemon-black-cover.png'
import xCover from '../assets/games/pokemon-x-cover.png'

const gameCovers: Partial<Record<GameProfile['id'], string>> = { black: blackCover, x: xCover }

export function GameSelection({ onSelect }: { onSelect: (game: GameProfile) => void }) {
  const { t } = useTranslation()
  return <main className="game-selection" aria-labelledby="game-selection-title">
    <div className="game-selection-controls"><LocaleSelector /><ThemeSelector /></div>
    <div className="game-selection-intro">
      <span className="eyebrow">PokéChose</span>
      <h1 id="game-selection-title">{t('games.choose')}</h1>
      <p>{t('games.description')}</p>
    </div>
    <div className="game-choices">
      {GAME_PROFILES.map(game => <button key={game.id} className={`game-choice game-choice-${game.id}`} onClick={() => onSelect(game)}>
        {gameCovers[game.id] && <img className="game-choice-cover" src={gameCovers[game.id]} alt="" decoding="async" />}
        <span className="game-choice-region">{t(`games.regions.${game.region}`)} · {t('games.generation', { number: game.generation })}</span>
        {!gameCovers[game.id] && <span className="game-choice-symbol" aria-hidden="true">{game.symbol}</span>}
        <span className="game-choice-caption">
          <strong>{t(`games.names.${game.id}`)}</strong>
          <span className="game-choice-enter">{t('games.enter')} <span aria-hidden="true">↗</span></span>
        </span>
      </button>)}
    </div>
    <p className="game-selection-note">{t('games.isolationHint')}</p>
  </main>
}
