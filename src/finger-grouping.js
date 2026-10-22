export function createFingerGrouping(apply) {
  let windowMs = 0
  let mode = 'fixed'
  let timer = null
  let pending = null
  let previousState = 0
  let previousThumb = false
  const cancel = () => {
    clearTimeout(timer)
    timer = null
    pending = null
  }
  const push = (state, thumb = false, seq) => {
    if (windowMs === 0) {
      previousState = state
      previousThumb = thumb
      apply(state, thumb, seq)
      return
    }
    if (state === previousState && thumb === previousThumb) return
    previousState = state
    previousThumb = thumb
    pending = { state, thumb, seq }
    if (timer !== null && mode === 'fixed') return
    clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      const latest = pending
      pending = null
      if (latest) apply(latest.state, latest.thumb, latest.seq)
    }, windowMs)
  }
  return {
    push, cancel,
    cancelPending() { if (pending !== null) { cancel(); previousState = 0; previousThumb = false; apply(0, false, undefined) } },
    reset() { cancel(); previousState = 0; previousThumb = false; apply(0, false, undefined) },
    configure(nextWindow, nextMode) {
      if (nextWindow === windowMs && nextMode === mode) return
      const latest = pending
      const state = previousState
      const thumb = previousThumb
      cancel()
      windowMs = nextWindow
      mode = nextMode
      if (latest) {
        // Re-arm the latest pending state under the new setting; 0 ms applies it immediately.
        if (windowMs > 0) { previousState = -1; previousThumb = false }
        push(latest.state, latest.thumb, latest.seq)
      } else {
        previousState = state
        previousThumb = thumb
      }
    },
  }
}
