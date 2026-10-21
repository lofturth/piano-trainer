import type { Progression } from './progression.js'
export const demoMidiNotes: readonly (number | null)[]
export function advanceForNote(state: Progression, midi: number, melody?: readonly (number | null)[]): Progression
