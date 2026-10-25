import sprites from './battle-sprites.json' with { type: 'json' }

// Static and animated assets share PokéAPI variety IDs, not national species IDs.
export function animatedBattleSprite(staticSprite: string | null): string | null {
  const id = staticSprite?.match(/\/(\d+)\.png$/)?.[1]
  return id ? (sprites as Record<string, string>)[id] ?? null : null
}
