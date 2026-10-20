export const majorScaleMapping = [
  { state: 0b0011, note: 'C4' },
  { state: 0b0101, note: 'D4' },
  { state: 0b1001, note: 'E4' },
  { state: 0b1100, note: 'F4' },
  { state: 0b0100, note: 'G4' },
  { state: 0b0110, note: 'A4' },
  { state: 0b0001, note: 'B4' },
]

const notes = Object.fromEntries(majorScaleMapping.map(({ state, note }) => [state, note]))

export function pitchForState(state, thumb = false) {
  if (!Number.isInteger(state) || state < 0 || state > 15) return 'Silence'
  const note = notes[state]
  return note ? (thumb ? note.replace('4', '5') : note) : 'Silence'
}
