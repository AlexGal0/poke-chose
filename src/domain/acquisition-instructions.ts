export interface AcquisitionInstruction { key: string; source: string }
const eventSource = 'https://bulbapedia.bulbagarden.net/wiki/List_of_in-game_event_Pok%C3%A9mon_(Black_and_White)'
const fossils = new Set([138, 140, 142, 345, 347, 408, 410])
export function blackAcquisitionInstructions(speciesId: number): AcquisitionInstruction[] {
  if (fossils.has(speciesId)) return [{ key: 'olderFossil', source: 'https://bulbapedia.bulbagarden.net/wiki/Fossil' }]
  const instructions: Record<number, AcquisitionInstruction> = {
    494: { key: 'victini', source: 'https://bulbapedia.bulbagarden.net/wiki/Liberty_Pass' },
    518: { key: 'musharna', source: eventSource },
    555: { key: 'darmanitan', source: 'https://bulbapedia.bulbagarden.net/wiki/Desert_Resort' },
    564: { key: 'tirtouga', source: 'https://bulbapedia.bulbagarden.net/wiki/Fossil' },
    566: { key: 'archen', source: 'https://bulbapedia.bulbagarden.net/wiki/Fossil' },
    570: { key: 'zorua', source: eventSource },
    571: { key: 'zoroark', source: eventSource },
    636: { key: 'larvesta', source: 'https://bulbapedia.bulbagarden.net/wiki/Walkthrough:Pok%C3%A9mon_Black_and_White/Part_8' },
    637: { key: 'volcarona', source: 'https://bulbapedia.bulbagarden.net/wiki/Walkthrough:Pok%C3%A9mon_Black_and_White/Part_13' },
    638: { key: 'cobalion', source: 'https://bulbapedia.bulbagarden.net/wiki/Mistralton_Cave' },
    639: { key: 'terrakion', source: 'https://bulbapedia.bulbagarden.net/wiki/Victory_Road_(Black_and_White)' },
    640: { key: 'virizion', source: 'https://bulbapedia.bulbagarden.net/wiki/Pinwheel_Forest' },
    641: { key: 'tornadus', source: 'https://bulbapedia.bulbagarden.net/wiki/Unova_Route_7' },
    645: { key: 'landorus', source: 'https://bulbapedia.bulbagarden.net/wiki/Abundant_Shrine' },
  }
  return instructions[speciesId] ? [instructions[speciesId]] : []
}
