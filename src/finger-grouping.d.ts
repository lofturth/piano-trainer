export type GroupingMode = 'fixed' | 'restarting'
export function createFingerGrouping(apply: (state: number, thumb: boolean, seq?: number) => void): {
  push(state: number, thumb?: boolean, seq?: number): void
  cancel(): void
  cancelPending(): void
  reset(): void
  configure(windowMs: number, mode: GroupingMode): void
}
