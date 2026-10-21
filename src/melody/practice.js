import { fingeringMappings } from '../pitch-mapping.js'
import { midiNoteForPitch } from '../midi-output.js'
import { initialProgression, advanceProgression } from './progression.js'
import { advanceForNote } from './matching.js'

export const practiceNotes = Object.freeze(fingeringMappings['Finger Roll'].map(({ note }) => note.slice(0, -1)))
export const sequenceLength = 50

export function generateSequence(selected, random = Math.random, previous = []) {
  if (!selected.length || new Set(selected).size !== selected.length || selected.some(note => !practiceNotes.includes(note))) {
    throw new Error('Select at least one unique chromatic pitch class')
  }
  const sequence = []
  while (sequence.length < sequenceLength) {
    const bag = [...selected]
    for (let index = bag.length - 1; index > 0; index--) {
      const swap = Math.floor(random() * (index + 1))
      const previousNote = bag[index]
      bag[index] = bag[swap]
      bag[swap] = previousNote
    }
    sequence.push(...bag.slice(0, sequenceLength - sequence.length))
  }
  if (selected.length > 1 && sequence.every((note, index) => note === previous[index])) {
    const different = sequence.findIndex(note => note !== sequence[0])
    const first = sequence[0]
    sequence[0] = sequence[different]
    sequence[different] = first
  }
  return sequence
}

export function initialPractice(selected = ['C'], random = Math.random) {
  return { selected: [...selected], sequence: generateSequence(selected, random), progress: initialProgression() }
}

export function newPracticeSequence(state, random = Math.random) {
  return { ...state, sequence: generateSequence(state.selected, random, state.sequence), progress: initialProgression() }
}

export function togglePracticeNote(state, note, random = Math.random) {
  if (!practiceNotes.includes(note) || (state.selected.length === 1 && state.selected[0] === note)) return state
  const selected = practiceNotes.filter(pitch => pitch === note ? !state.selected.includes(pitch) : state.selected.includes(pitch))
  return initialPractice(selected, random)
}

export function resetPractice(state) {
  return { ...state, progress: initialProgression() }
}

export function simulatePracticeNote(state) {
  return { ...state, progress: advanceProgression(state.progress, state.sequence.length) }
}

export function playPracticeNote(state, midi, baseOctave) {
  const targets = state.sequence.map(note => midiNoteForPitch(`${note}${baseOctave}`))
  const progress = advanceForNote(state.progress, midi, targets)
  return progress === state.progress ? state : { ...state, progress }
}
