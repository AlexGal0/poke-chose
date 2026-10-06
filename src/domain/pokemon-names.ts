// PokéAPI variety slugs are not species names or WikiDex page titles.
const formSpecies = ['deoxys', 'wormadam', 'giratina', 'shaymin', 'basculin', 'darmanitan', 'frillish', 'jellicent', 'tornadus', 'thundurus', 'landorus', 'keldeo', 'meloetta', 'rotom', 'castform']

export function pokemonSpeciesName(name: string): string {
  return formSpecies.find(species => name.startsWith(`${species}-`)) ?? name
}

export function pokemonDisplayName(name: string): string {
  const species = pokemonSpeciesName(name)
  const special: Record<string, string> = {
    'nidoran-f': 'Nidoran♀', 'nidoran-m': 'Nidoran♂',
    'mr-mime': 'Mr. Mime', 'mime-jr': 'Mime Jr.',
    farfetchd: "Farfetch'd", 'ho-oh': 'Ho-Oh', 'porygon-z': 'Porygon-Z',
  }
  return special[species] ?? species.charAt(0).toUpperCase() + species.slice(1)
}

export function pokemonWikiUrl(name: string): string {
  return `https://www.wikidex.net/wiki/${encodeURIComponent(pokemonDisplayName(name))}`
}
