/** Search by the displayed item name so redirects and title variants remain usable. */
export function itemWikiLink(name: string, locale: string) {
  const spanish = locale.split('-')[0] === 'es'
  const base = spanish ? 'https://www.wikidex.net/wiki/Especial:Buscar' : 'https://bulbapedia.bulbagarden.net/wiki/Special:Search'
  return { site: spanish ? 'WikiDex' : 'Bulbapedia', href: `${base}?search=${encodeURIComponent(name)}` }
}
