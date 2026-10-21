import type { Progression } from './progression.js'
export type Practice = { selected: string[]; sequence: string[]; presentations: ('letter' | 'staff')[]; progress: Progression }
export const practiceNotes: readonly string[]
export const sequenceLength: number
export function generateSequence(selected: readonly string[], random?: () => number, previous?: readonly string[]): string[]
export function generatePresentations(random?: () => number): ('letter' | 'staff')[]
export function initialPractice(selected?: readonly string[], random?: () => number): Practice
export function newPracticeSequence(state: Practice, random?: () => number): Practice
export function togglePracticeNote(state: Practice, note: string, random?: () => number): Practice
export function resetPractice(state: Practice): Practice
export function simulatePracticeNote(state: Practice): Practice
export function playPracticeNote(state: Practice, midi: number, baseOctave: number): Practice
