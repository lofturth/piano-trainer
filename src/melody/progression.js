export const notesPerRow = 10

export function initialProgression() {
  return { position: 0, rowStarts: [0, notesPerRow] }
}

export function advanceProgression(state, total) {
  if (state.position >= total) return state
  const position = state.position + 1
  if (position < total && position % notesPerRow === 0) {
    const rowStarts = [...state.rowStarts]
    const finishedRow = Math.floor(state.position / notesPerRow) % 2
    rowStarts[finishedRow] = position + notesPerRow
    return { position, rowStarts }
  }
  return { ...state, position }
}

export function rowContents(melody, start) {
  return Array.from({ length: notesPerRow }, (_, slot) => melody[start + slot] ?? null)
}
