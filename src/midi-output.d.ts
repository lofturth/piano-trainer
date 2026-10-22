type Output = { send(data: number[]): void }
export function midiNoteForPitch(pitch: string): number | null
export function midiNoteForState(state: number, thumb?: boolean, baseOctave?: number, mapping?: MappingName): number | null
export type MidiEvent = { type: 'On' | 'Off'; midi: number; timestamp: number; seq?: number }
export class MidiOutput {
  constructor(onNoteOn?: (note: string, midi: number) => void, onMidiEvent?: (event: MidiEvent) => void)
  activeNote: number | null
  sourceSeq?: number
  stop(): void
  setOutput(output: Output | null): void
  setBaseOctave(octave: number): void
  setMapping(mapping: MappingName, playHeld?: boolean): void
  play(state: number, thumb?: boolean): void
}
import type { MappingName } from './pitch-mapping.js'
