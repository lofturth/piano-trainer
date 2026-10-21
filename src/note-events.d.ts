export type SubscribeNoteOn = (listener: (midi: number) => void) => () => void
export function createNoteEvents(): { subscribe: SubscribeNoteOn; emit(midi: number): void }
