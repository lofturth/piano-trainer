export type Progression = { position: number; rowStarts: number[] }
export const notesPerRow: number
export function initialProgression(): Progression
export function advanceProgression(state: Progression, total: number): Progression
export function rowContents(melody: readonly string[], start: number): (string | null)[]
