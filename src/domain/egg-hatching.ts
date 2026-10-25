// The source provides the remaining cycles; game rules provide cycle length.
// The within-cycle counter and hatching bonuses are not part of this estimate.
export function eggHatching(cycles: number | undefined, stepsPerCycle: number | undefined) {
  if (cycles === undefined || !Number.isInteger(cycles) || cycles < 0 || cycles > 255) return null
  const knownLength = stepsPerCycle !== undefined && Number.isInteger(stepsPerCycle) && stepsPerCycle > 0
  return { cycles, steps: cycles > 0 && knownLength ? { min: (cycles - 1) * stepsPerCycle! + 1, max: cycles * stepsPerCycle! } : null }
}

export function eggHatchingProgress(remaining: number | undefined, initial: number | undefined) {
  if (remaining === undefined || initial === undefined || !Number.isInteger(remaining) || !Number.isInteger(initial) ||
    initial < 1 || initial > 255 || remaining < 0 || remaining > initial) return null
  return { value: initial - remaining, max: initial, percent: Math.round((initial - remaining) / initial * 100) }
}
