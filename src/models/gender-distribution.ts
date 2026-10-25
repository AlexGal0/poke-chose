// Base probabilities supplied by a game adapter, before encounter modifiers.
// A missing distribution means unknown/not applicable, never a 50/50 default.
export interface GenderDistribution { male: number; female: number }
