// P10 confirmation only: MIDI playback remains immediate.
export function createPracticeHold(now = () => performance.now()) {
  let activeKey
  let confirmed = false
  let startedAt
  let duration = 500
  let timer
  const cancel = () => {
    clearTimeout(timer)
    timer = undefined
    startedAt = undefined
  }
  return {
    cancel,
    progress() {
      return startedAt === undefined ? null : Math.min(1, Math.max(0, (now() - startedAt) / duration))
    },
    update(key, midi, target, confirm, holdDuration = 500) {
      cancel()
      if (key !== activeKey) {
        activeKey = key
        confirmed = false
      }
      if (confirmed || midi === null || midi !== target) return
      duration = holdDuration
      startedAt = now()
      timer = setTimeout(() => {
        timer = undefined
        confirmed = true
        confirm(midi)
      }, duration)
    },
  }
}
