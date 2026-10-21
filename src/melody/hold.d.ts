export function createPracticeHold(now?: () => number): {
  cancel(): void
  progress(): number | null
  update(key: string, midi: number | null, target: number | null, confirm: (midi: number) => void, duration?: number): void
}
