import { pitchForState } from './pitch-mapping.js'

const chromaticNotes = ['C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4']

export function midiNoteForState(state) {
  const index = chromaticNotes.indexOf(pitchForState(state))
  return index < 0 ? null : 60 + index
}

export class MidiOutput {
  constructor(onNoteOn = () => {}) {
    this.onNoteOn = onNoteOn
    this.output = null
    this.activeNote = null
    this.previousState = 0
  }

  stop() {
    const note = this.activeNote
    this.activeNote = null
    if (note !== null && this.output) this.output.send([0x80, note, 0])
  }

  setOutput(output) {
    if (this.output === output) return
    try { this.stop() } finally { this.output = output }
  }

  play(state) {
    const changed = state !== this.previousState
    this.previousState = state
    const note = midiNoteForState(state)
    if (note === null) {
      this.stop()
      return
    }
    if (!changed || !this.output || note === this.activeNote) return
    this.stop()
    this.activeNote = note
    this.output.send([0x90, note, 100])
    this.onNoteOn(pitchForState(state))
  }
}
