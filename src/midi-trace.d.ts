import type { MidiEvent } from './midi-output.js'
export type FingerTraceRow = {
  seq: number; changes: string[]; phoneTimestamp: number; phoneHandlerAt: number | null; phoneSentAt: number | null; receivedAt: number
  phoneMs: number; phoneHandlerMs: number | null; phoneSentMs: number | null; macMs: number; sameTimestamp: boolean
  midi: (MidiEvent & { relativeMs: number })[]
}
export type MidiTrace = {
  previousState: number | null; phoneOrigin: number | null; macOrigin: number | null; rows: FingerTraceRow[]
}
export function initialMidiTrace(previousState?: number | null): MidiTrace
export function appendFingerTrace(trace: MidiTrace, message: { seq: number; t: number; state: number; thumb?: boolean; sentAt?: number; handlerAt?: number }, receivedAt: number): MidiTrace
export function appendTraceMidi(trace: MidiTrace, event: MidiEvent): MidiTrace
