import { useEffect, useState } from 'react'
import { getPokemon } from '../api/pokeapi'

export function CapturedPokemonIcon({ speciesId }: { speciesId: number }) {
  const [image, setImage] = useState<{ id: number; src: string } | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    getPokemon(speciesId, controller.signal).then(pokemon => {
      if (!controller.signal.aborted && pokemon.sprite) setImage({ id: speciesId, src: pokemon.sprite })
    }).catch(() => { /* The capture flag remains visible if the optional sprite cannot load. */ })
    return () => controller.abort()
  }, [speciesId])
  if (!image || image.id !== speciesId) return null
  return <img className="captured-pokemon-icon" src={image.src} width="48" height="48" alt="" loading="lazy" onError={() => setImage(null)} />
}
