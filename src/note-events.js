export function createNoteEvents() {
  const listeners = new Set()
  return {
    subscribe(listener) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    emit(midi) {
      for (const listener of listeners) listener(midi)
    },
  }
}
