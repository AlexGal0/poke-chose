import { useEffect, useState } from 'react'

export function AlbumArtwork({ sprite, animatedSprite }: { id: number; sprite: string | null; animatedSprite: string | null }) {
  const [failed, setFailed] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  const src = reducedMotion || failed ? sprite : animatedSprite ?? sprite
  return src ? <img src={src} alt="" width="192" height="192" onError={() => setFailed(true)} /> : null
}
