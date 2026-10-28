import type { GameCombatCapabilities, CombatReaderCapabilities } from '../core/combat-capabilities.ts'

export const blackCombatCapabilities: GameCombatCapabilities = {
  gameId: 'black',
  formats: [
    { kind: 'general', id: 'single' },
    { kind: 'general', id: 'double' },
    { kind: 'special', gameId: 'black', id: 'triple' },
    { kind: 'special', gameId: 'black', id: 'rotation' },
  ],
}

export const blackBattleReaderCapabilities: CombatReaderCapabilities = {
  gameId: 'black',
  readerId: 'black-battle',
  formats: [{ kind: 'general', id: 'single' }],
}
