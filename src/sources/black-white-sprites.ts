// Preserve the PokéAPI variety ID so alternate forms keep their own artwork.
export function animatedBlackWhiteSprite(sprite: string | null): string | null {
  return sprite?.match(/\/versions\/generation-v\/black-white\/\d+\.png$/)
    ? sprite.replace('/black-white/', '/black-white/animated/').replace(/\.png$/, '.gif')
    : null
}
