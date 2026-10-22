import { fingeringMappings, pitchForState } from './pitch-mapping.js'

const chromaticNotes = ['C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4']

export function midiNoteForPitch(pitch) {
  if (typeof pitch !== 'string') return null
  const match = /^([A-G]#?)(-?\d+)$/.exec(pitch)
  if (!match) return null
  const index = chromaticNotes.indexOf(`${match[1]}4`)
  const note = 12 * (Number(match[2]) + 1) + index
  return index >= 0 && Number.isInteger(note) && note >= 0 && note <= 127 ? note : null
}

export function midiNoteForState(state, thumb = false, baseOctave = 4, mapping = 'Candidate 1') {
  if (!Number.isInteger(baseOctave) || baseOctave < 1 || baseOctave > 7) return null
  return midiNoteForPitch(pitchForState(state, thumb, baseOctave, mapping))
}

export class MidiOutput {
  constructor(onNoteOn = () => {}, onMidiEvent) {
    this.onNoteOn = onNoteOn
    this.onMidiEvent = onMidiEvent
    this.sourceSeq = undefined
    this.output = null
    this.activeNote = null
    this.previousState = 0
    this.previousThumb = false
    this.baseOctave = 4
    this.mapping = 'Candidate 1'
  }

  reportMidiEvent(type, midi) {
    if (!this.onMidiEvent) return
    const event = { type, midi, timestamp: performance.now(), seq: this.sourceSeq }
    // Observe after send; defer display work until the immediate MIDI transition finishes.
    queueMicrotask(() => this.onMidiEvent(event))
  }

  stop() {
    const note = this.activeNote
    this.activeNote = null
    if (note !== null && this.output) {
      this.output.send([0x80, note, 0])
      this.reportMidiEvent('Off', note)
    }
  }

  setOutput(output) {
    if (this.output === output) return
    try { this.stop() } finally { this.output = output }
  }

  setBaseOctave(octave) {
    if (!Number.isInteger(octave) || octave < 1 || octave > 7) return
    if (this.activeNote !== null) this.play(this.previousState, this.previousThumb, octave)
    else this.baseOctave = octave
  }

  setMapping(mapping, playHeld = true) {
    if (!Object.hasOwn(fingeringMappings, mapping) || mapping === this.mapping) return
    if (playHeld) this.play(this.previousState, this.previousThumb, this.baseOctave, mapping)
    else this.mapping = mapping
  }

  play(state, thumb = false, baseOctave = this.baseOctave, mapping = this.mapping) {
    const changed = state !== this.previousState || thumb !== this.previousThumb || baseOctave !== this.baseOctave || mapping !== this.mapping
    this.mapping = mapping
    this.baseOctave = baseOctave
    this.previousState = state
    this.previousThumb = thumb
    const note = midiNoteForState(state, thumb, baseOctave, mapping)
    if (note === null) {
      this.stop()
      return
    }
    if (!changed || !this.output || note === this.activeNote) return
    this.stop()
    this.activeNote = note
    this.output.send([0x90, note, 100])
    this.reportMidiEvent('On', note)
    this.onNoteOn(pitchForState(state, thumb, baseOctave, mapping), note)
  }
}
