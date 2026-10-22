const fingers = ['Index', 'Middle', 'Ring', 'Pinky', 'Thumb']

export function initialMidiTrace(previousState = null) {
  return { previousState, phoneOrigin: null, macOrigin: null, rows: [] }
}

export function appendFingerTrace(trace, message, receivedAt) {
  const state = message.state | (message.thumb ? 16 : 0)
  const phoneOrigin = trace.phoneOrigin ?? message.t
  const macOrigin = trace.macOrigin ?? receivedAt
  const changes = fingers.flatMap((finger, bit) => (trace.previousState !== null && ((state ^ trace.previousState) & (1 << bit)))
    ? [`${finger} ${state & (1 << bit) ? 'press' : 'release'}`] : [])
  const phoneHandlerAt = Number.isFinite(message.handlerAt) ? message.handlerAt : null
  const phoneSentAt = Number.isFinite(message.sentAt) ? message.sentAt : null
  const row = {
    seq: message.seq, changes, phoneTimestamp: message.t, phoneHandlerAt, phoneSentAt, receivedAt,
    phoneMs: message.t - phoneOrigin,
    phoneHandlerMs: phoneHandlerAt === null ? null : phoneHandlerAt - phoneOrigin,
    phoneSentMs: phoneSentAt === null ? null : phoneSentAt - phoneOrigin, macMs: receivedAt - macOrigin,
    sameTimestamp: trace.rows.some(row => row.phoneTimestamp === message.t), midi: [],
  }
  return { previousState: state, phoneOrigin, macOrigin, rows: [...trace.rows.slice(-19), row] }
}

export function appendTraceMidi(trace, event) {
  if (event.seq === undefined || trace.macOrigin === null) return trace
  return { ...trace, rows: trace.rows.map(row => row.seq === event.seq
    ? { ...row, midi: [...row.midi, { ...event, relativeMs: event.timestamp - trace.macOrigin }] }
    : row) }
}
