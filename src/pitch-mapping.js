export const majorScaleMapping = [
  { state: 0b0011, note: 'C4' },
  { state: 0b0101, note: 'D4' },
  { state: 0b1001, note: 'E4' },
  { state: 0b1100, note: 'F4' },
  { state: 0b0100, note: 'G4' },
  { state: 0b0110, note: 'A4' },
  { state: 0b0001, note: 'B4' },
]

export const fingeringMappings = {
  'Candidate 1': majorScaleMapping,
  'Finger Roll': [
    { state: 0b0001, note: 'C4' },
    { state: 0b0101, note: 'C#4' },
    { state: 0b0011, note: 'D4' },
    { state: 0b0010, note: 'D#4' },
    { state: 0b0111, note: 'E4' },
    { state: 0b1111, note: 'F4' },
    { state: 0b0110, note: 'F#4' },
    { state: 0b1110, note: 'G4' },
    { state: 0b0100, note: 'G#4' },
    { state: 0b1100, note: 'A4' },
    { state: 0b1001, note: 'A#4' },
    { state: 0b1000, note: 'B4' },
  ],
}

export function pitchForState(state, thumb = false, baseOctave = 4, mapping = 'Candidate 1') {
  if (!Number.isInteger(baseOctave) || baseOctave < 1 || baseOctave > 7) return 'Silence'
  if (!Number.isInteger(state) || state < 0 || state > 15) return 'Silence'
  const note = fingeringMappings[mapping]?.find(entry => entry.state === state)?.note
  return note ? note.replace('4', String(baseOctave + (thumb ? 1 : 0))) : 'Silence'
}
