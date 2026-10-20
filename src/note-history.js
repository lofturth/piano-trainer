export function appendPlayedNote(history, note) {
  return [...history.slice(-19), note]
}
