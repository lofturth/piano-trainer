import { midiNoteForPitch } from '../midi-output.js'
import { demoMelody } from './demo-melody.js'
import { advanceProgression } from './progression.js'

export const demoMidiNotes = Object.freeze(demoMelody.map(midiNoteForPitch))

export function advanceForNote(state, midi, melody = demoMidiNotes) {
  if (!Number.isInteger(midi) || midi < 0 || midi > 127
    || state.position >= melody.length || midi !== melody[state.position]) return state
  return advanceProgression(state, melody.length)
}
