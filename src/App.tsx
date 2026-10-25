import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import type { ComponentType } from 'react'
import { useTranslation } from 'react-i18next'
import { GameSelection } from './components/GameSelection'
import { GamePreparation } from './components/GamePreparation'
import type { GameId, GameProfile } from './games/profiles'
import { loadSelectedGame, saveSelectedGame } from './storage/selected-game'
import { GameGenerationContext } from './games/core/game-generation-context'
import './App.css'
import './games/GameSelection.css'

// Only this registry knows which workspace implements each game.
// Loading the selector or X never mounts Black's providers, storage or readers.
const workspaces: Partial<Record<GameId, ComponentType<{ onChangeGame: () => void }>>> = {
  black: lazy(() => import('./games/black/BlackWorkspace')),
  x: lazy(() => import('./games/x/XWorkspace')),
}

function App() {
  const { t } = useTranslation()
  const [game, setGame] = useState<GameProfile | null>(loadSelectedGame)
  const focusPending = useRef(false)
  useEffect(() => {
    document.title = game ? `PokéChose · ${t(`games.names.${game.id}`)}` : 'PokéChose'
  }, [game, t])
  useEffect(() => {
    if (!focusPending.current) return
    focusPending.current = false
    window.scrollTo(0, 0)
    const heading = document.querySelector<HTMLElement>('h1')
    heading?.setAttribute('tabindex', '-1')
    heading?.focus()
  }, [game])

  function selectGame(next: GameProfile | null) {
    saveSelectedGame(next?.id ?? null)
    focusPending.current = true
    setGame(next)
  }

  if (!game) return <GameSelection onSelect={selectGame} />
  const Workspace = workspaces[game.id]
  return <GameGenerationContext value={game.generation}>{Workspace
    ? <Suspense fallback={<main><p role="status">{t('games.loading')}</p></main>}><Workspace onChangeGame={() => selectGame(null)} /></Suspense>
    : <GamePreparation game={game} onChangeGame={() => selectGame(null)} />}</GameGenerationContext>
}

export default App
