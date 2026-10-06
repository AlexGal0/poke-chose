import type { BlackEncounterDetail } from '../models/encounters.ts'

interface EncounterMethod { label: string; icon: string; description: string }

// PokéAPI uses walk for ordinary grass and cave floors alike.
const methods: Record<string, EncounterMethod> = {
  walk: { label: 'Caminar · hierba / suelo', icon: '👣', description: 'Caminar por hierba normal o por el suelo de una cueva o interior.' },
  'dark-grass': { label: 'Hierba oscura', icon: '🌿', description: 'Caminar por hierba oscura; pueden aparecer dos Pokémon a la vez.' },
  'grass-spots': { label: 'Hierba que se mueve', icon: '🍃', description: 'Entrar en un punto de hierba que se está moviendo.' },
  'cave-spots': { label: 'Nube de polvo', icon: '🌫️', description: 'Entrar en una nube de polvo en una cueva.' },
  'bridge-spots': { label: 'Sombra en un puente', icon: '🌉', description: 'Acercarse a una sombra que aparece sobre un puente.' },
  surf: { label: 'Surf', icon: '🌊', description: 'Desplazarse por el agua usando Surf.' },
  'surf-spots': { label: 'Surf · agua que se mueve', icon: '🌀', description: 'Usar Surf en un punto de agua que se está moviendo.' },
  'old-rod': { label: 'Pesca · Caña Vieja', icon: '🎣', description: 'Pescar con la Caña Vieja.' },
  'good-rod': { label: 'Pesca · Caña Buena', icon: '🎣', description: 'Pescar con la Caña Buena.' },
  'super-rod': { label: 'Pesca · Supercaña', icon: '🎣', description: 'Pescar con la Supercaña en agua normal.' },
  'super-rod-spots': { label: 'Pesca · agua que se mueve', icon: '🐟', description: 'Pescar con la Supercaña en un punto de agua que se está moviendo.' },
  gift: { label: 'Regalo', icon: '🎁', description: 'Recibir un Pokémon como regalo.' },
  'gift-egg': { label: 'Huevo de regalo', icon: '🥚', description: 'Recibir un huevo como regalo.' },
  static: { label: 'Encuentro fijo', icon: '📍', description: 'Un Pokémon situado en un lugar concreto, en vez de un encuentro aleatorio.' },
  'npc-trade': { label: 'Intercambio con personaje', icon: '🔄', description: 'Obtener un Pokémon mediante un intercambio con un personaje del juego.' },
  'roaming-grass': { label: 'Errante · hierba', icon: '🐾', description: 'Encontrar en la hierba un Pokémon que se desplaza entre zonas.' },
  'roaming-water': { label: 'Errante · agua', icon: '🐾', description: 'Encontrar en el agua un Pokémon que se desplaza entre zonas.' },
  'rock-smash': { label: 'Golpe Roca', icon: '🪨', description: 'Romper una roca usando Golpe Roca.' },
  headbutt: { label: 'Golpe Cabeza', icon: '🌳', description: 'Golpear un árbol usando Golpe Cabeza.' },
}

export function encounterMethod(method: string): EncounterMethod {
  return Object.hasOwn(methods, method) ? methods[method] : {
    label: method.replace(/[-_]+/g, ' '), icon: '🔎', description: `Método registrado por PokéAPI: ${method}.`,
  }
}

export function encounterMethods(details: readonly BlackEncounterDetail[]) {
  return [...new Set(details.map(detail => detail.method))].map(method => ({ method, ...encounterMethod(method) }))
}
