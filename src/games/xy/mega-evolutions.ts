import type { MegaEvolutionService } from '../core/mega-evolutions.ts'

export const xyMegaEvolutions: MegaEvolutionService = {
  async load(locale, signal) {
    signal?.throwIfAborted()
    const { default: data } = await import('./mega-evolution-data.ts')
    signal?.throwIfAborted()
    return data.entries.map(({ stoneNames, ...entry }) => ({ ...entry, stoneName: locale === 'es' ? stoneNames.es : stoneNames.en }))
  },
}
