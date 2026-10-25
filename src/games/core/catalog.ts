export interface SpeciesEntry { id: number; name: string; resourceName?: string; types?: string[] }
export interface ManualPokemon extends SpeciesEntry { types: string[]; sprite: string | null }
export interface CatalogRules {
  id: string
  generation: number
  maxSpecies: number
  introducedFrom: number
  regionalSpeciesIds?: readonly number[]
  types: readonly string[]
  spriteGeneration: string
  spriteVersion: string
}

interface TypeSlot { slot: number; type: { name: string } }
export interface SpeciesResponse {
  id: number
  name: string
  types: TypeSlot[]
  past_types: { generation: { name: string }; types: TypeSlot[] }[]
  sprites: { versions: Record<string, Record<string, { front_default: string | null }>> }
}

const generations = ['generation-i', 'generation-ii', 'generation-iii', 'generation-iv', 'generation-v', 'generation-vi', 'generation-vii', 'generation-viii', 'generation-ix']

export function isManualPokemon(value: unknown, rules: CatalogRules): value is ManualPokemon {
  if (!value || typeof value !== 'object') return false
  const p = value as ManualPokemon
  return Number.isInteger(p.id) && p.id >= 1 && p.id <= rules.maxSpecies &&
    typeof p.name === 'string' && /^[a-z0-9-]+$/.test(p.name) &&
    Array.isArray(p.types) && p.types.length >= 1 && p.types.length <= 2 &&
    new Set(p.types).size === p.types.length && p.types.every(type => rules.types.includes(type)) &&
    (p.sprite === null || (typeof p.sprite === 'string' && p.sprite.startsWith('https://raw.githubusercontent.com/PokeAPI/sprites/')))
}

export function adaptSpecies(data: SpeciesResponse, entry: SpeciesEntry, rules: CatalogRules): ManualPokemon {
  // Each historical entry describes types through that generation (inclusive).
  const past = data.past_types.filter(row => generations.indexOf(row.generation.name) + 1 >= rules.generation)
    .sort((a, b) => generations.indexOf(a.generation.name) - generations.indexOf(b.generation.name))[0]
  const pokemon = {
    ...entry,
    types: [...(past?.types ?? data.types)].sort((a, b) => a.slot - b.slot).map(row => row.type.name),
    sprite: data.sprites.versions[rules.spriteGeneration]?.[rules.spriteVersion]?.front_default ?? null,
  }
  if (!isManualPokemon(pokemon, rules)) throw new Error('Invalid species data')
  return pokemon
}

export interface CatalogService {
  rules: CatalogRules
  list(signal?: AbortSignal): Promise<SpeciesEntry[]>
  get(entry: SpeciesEntry, signal?: AbortSignal): Promise<ManualPokemon>
}

// The service owns game-scoped caches; no imports from Black's API or storage.
export function createCatalogService(rules: CatalogRules, fetcher: typeof fetch = fetch): CatalogService {
  const read = (key: string): unknown => {
    try { return JSON.parse(localStorage.getItem(`poke-chose:cache:${rules.id}:catalog-v1:${key}`) ?? 'null') } catch { return null }
  }
  const write = (key: string, value: unknown) => {
    try { localStorage.setItem(`poke-chose:cache:${rules.id}:catalog-v1:${key}`, JSON.stringify(value)) } catch { /* Optional cache. */ }
  }
  async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
    const timeout = AbortSignal.timeout(15000)
    const response = await fetcher(`https://pokeapi.co/api/v2/${path}`, { signal: signal ? AbortSignal.any([signal, timeout]) : timeout })
    if (!response.ok) throw new Error('Catalog request failed')
    return response.json() as Promise<T>
  }
  const validList = (value: unknown): value is SpeciesEntry[] => Array.isArray(value) && value.length === rules.maxSpecies &&
    value.every((entry, index) => entry && entry.id === index + 1 && typeof entry.name === 'string' && /^[a-z0-9-]+$/.test(entry.name))
  return {
    rules,
    async list(signal) {
      const cached = read('index')
      if (validList(cached)) return cached
      const data = await request<{ results: { name: string; url: string }[] }>(`pokemon-species?limit=${rules.maxSpecies}`, signal)
      const entries = data.results.map(row => ({ id: Number(row.url.split('/').filter(Boolean).at(-1)), name: row.name }))
      if (!validList(entries)) throw new Error('Invalid catalog')
      write('index', entries)
      return entries
    },
    async get(entry, signal) {
      if (!Number.isInteger(entry.id) || entry.id < 1 || entry.id > rules.maxSpecies) throw new Error('Invalid species id')
      const cached = read(String(entry.id))
      if (isManualPokemon(cached, rules) && cached.id === entry.id && cached.name === entry.name) return cached
      // Species IDs are not guaranteed to be default-variety Pokémon IDs.
      const species = await request<{ varieties: { is_default: boolean; pokemon: { name: string } }[] }>(`pokemon-species/${entry.id}`, signal)
      const variety = species.varieties.find(row => row.is_default)?.pokemon.name
      if (!variety || !/^[a-z0-9-]+$/.test(variety)) throw new Error('Missing default variety')
      const pokemon = adaptSpecies(await request<SpeciesResponse>(`pokemon/${variety}`, signal), entry, rules)
      write(String(entry.id), pokemon)
      return pokemon
    },
  }
}
