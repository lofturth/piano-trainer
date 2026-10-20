type Output = { send(data: number[]): void }
export function midiNoteForState(state: number, thumb?: boolean): number | null
export class MidiOutput {
  constructor(onNoteOn?: (note: string) => void)
  activeNote: number | null
  stop(): void
  setOutput(output: Output | null): void
  play(state: number, thumb?: boolean): void
}
