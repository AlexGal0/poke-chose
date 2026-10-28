import type { ReactNode } from 'react'
import type { CombatField, CombatFormat } from './combat.ts'

export interface SpecialCombatPresentation {
  format: Extract<CombatFormat, { kind: 'special' }>
  // Supplied at the workspace boundary; shared UI need not import a game.
  renderField?: (field: CombatField) => ReactNode
  renderControls?: (field: CombatField) => ReactNode
  renderDetails?: (field: CombatField) => ReactNode
}

// Registering presentation never grants reader support. Workspaces can supply
// a special field, controls and details without changing the shared screen.
export interface CombatPresentation {
  specialFormats: readonly SpecialCombatPresentation[]
}
