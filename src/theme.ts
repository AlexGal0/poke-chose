import type { Theme } from './storage/theme'

const palettes: Record<Theme, readonly [string, string, string, string]> = {
  base: ['#10151c', '#10151c', '#83dcb8', '#10151c'],
  halo: ['#72864b', '#111d20', '#88d6ef', '#dcb76b'],
  pokemon: ['#d51c36', '#ffffff', '#18181b', '#ffffff'],
  'pokemon-dark': ['#d51c36', '#ffffff', '#e9eef3', '#ffffff'],
  fiesta: ['#ff78d0', '#ffd861', '#5af8ef', '#fff6ff'],
  'gameboy-color': ['#83729b', '#e1e6be', '#493469', '#e1e6be'],
  'aqua-2000': ['#82dcff', '#caedff', '#156ba3', '#ecfaff'],
  'classic-html': ['#ffffff', '#ffffff', '#000000', '#ffffff'],
  neon: ['#ff81e8', '#101323', '#56f4ff', '#101323'],
  terminal: ['#070d09', '#070d09', '#9bf5a5', '#070d09'],
  'windows-xp': ['#ec6744', '#3187e7', '#ffffff', '#1764d3'],
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  const [top, bottom, border, center] = palettes[theme]
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><defs><clipPath id="ball"><circle cx="16" cy="16" r="14"/></clipPath></defs><circle cx="16" cy="16" r="14" fill="${bottom}"/><path d="M2 2h28v14H2z" fill="${top}" clip-path="url(#ball)"/><circle cx="16" cy="16" r="14" fill="none" stroke="${border}" stroke-width="3"/><path d="M2 16h28" stroke="${border}" stroke-width="3"/><circle cx="16" cy="16" r="5" fill="${center}" stroke="${border}" stroke-width="3"/></svg>`
  const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (icon) icon.href = `data:image/svg+xml,${encodeURIComponent(svg)}`
}
