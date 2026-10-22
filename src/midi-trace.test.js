import test from 'node:test'
import assert from 'node:assert/strict'
import { initialMidiTrace, appendFingerTrace, appendTraceMidi } from './midi-trace.js'

test('trace matches by seq, preserves clocks and grouped changes, resets and renders compactly', async () => {
  let trace = initialMidiTrace(0)
  trace = appendFingerTrace(trace, { seq: 10, state: 1, t: 100.123456, sentAt: 100.223456, handlerAt: 100.173456 }, 900.456789)
  trace = appendFingerTrace(trace, { seq: 11, state: 7, t: 100.123456, sentAt: 108.654321, handlerAt: 100.323456 }, 924.789123)
  trace = appendFingerTrace(trace, { seq: 12, state: 6, t: 108.456789 }, 925.123456)
  assert.equal(trace.rows[0].phoneHandlerAt, 100.173456)
  assert.equal(trace.rows[0].phoneHandlerMs, 100.173456 - 100.123456)
  assert.equal(trace.rows[1].phoneHandlerMs, 100.323456 - 100.123456)
  assert.equal(trace.rows[2].phoneHandlerMs, null)
  assert.equal(trace.rows[0].phoneSentAt, 100.223456)
  assert.equal(trace.rows[0].phoneSentMs, 100.223456 - 100.123456)
  assert.equal(trace.rows[1].phoneSentMs, 108.654321 - 100.123456)
  assert.equal(trace.rows[2].phoneSentMs, null) // Older controllers do not invent send times.
  assert.deepEqual(trace.rows[1].changes, ['Middle press', 'Ring press'])
  assert.equal(trace.rows[1].sameTimestamp, true)
  assert.deepEqual(trace.rows[2].changes, ['Index release'])
  assert.equal(trace.rows[2].phoneMs, 108.456789 - 100.123456)
  assert.equal(trace.rows[1].macMs, 924.789123 - 900.456789)
  // Deliberately misleading time: association must follow seq, never timestamp proximity.
  trace = appendTraceMidi(trace, { seq: 11, midi: 60, type: 'Off', timestamp: 925.5 })
  trace = appendTraceMidi(trace, { seq: 11, midi: 62, type: 'On', timestamp: 925.6 })
  assert.equal(trace.rows[0].midi.length, 0)
  assert.equal(trace.rows[1].midi.length, 2)
  assert.equal(trace.rows[2].midi.length, 0)
  assert.equal(trace.rows[1].midi[0].relativeMs, 925.5 - 900.456789)
  assert.equal(appendTraceMidi(trace, { midi: 64, type: 'On', timestamp: 930 }), trace)

  const { createServer } = await import('vite')
  const { createElement } = await import('react')
  const { renderToStaticMarkup } = await import('react-dom/server')
  const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, ws: false, watch: null } })
  try {
    const Component = (await server.ssrLoadModule('/src/FingerTimingTest.tsx')).default
    const html = renderToStaticMarkup(createElement(Component, { measurement: { arrivals: [], totalSpreadMs: 0 }, fingerState: 6, onReset() {}, traceRows: trace.rows }))
    for (const text of ['Finger → MIDI', 'Middle press, Ring press', 'shared timestamp', 'C4', 'Off', 'D4', 'On', 'None', 'Copy results', 'iPhone sent (ms)', 'iPhone handler entry (ms)', '+0.050', '+8.531']) assert.ok(html.includes(text), text)
  } finally { await server.close() }

  for (let seq = 13; seq < 40; seq++) trace = appendFingerTrace(trace, { seq, state: 6, t: 200 + seq }, 1000 + seq)
  assert.equal(trace.rows.length, 20)
  assert.equal(trace.rows[0].seq, 20)
  trace = initialMidiTrace(trace.previousState)
  assert.equal(trace.rows.length, 0)
  trace = appendFingerTrace(trace, { seq: 40, state: 0, t: 500.123456 }, 1500.234567)
  assert.deepEqual(trace.rows[0].changes, ['Middle release', 'Ring release'])
  assert.equal(trace.rows[0].phoneMs, 0)
  assert.equal(trace.rows[0].macMs, 0)
})

test('send and release timestamps stay attached to their own sequence and attempt origin', () => {
  let trace = initialMidiTrace(0)
  trace = appendFingerTrace(trace, { seq: 21, state: 1, t: 100.123456, sentAt: 100.987654 }, 900)
  trace = appendFingerTrace(trace, { seq: 22, state: 0, t: 750.654321, sentAt: 751.876543 }, 1552)
  const release = trace.rows[1]
  assert.equal(release.seq, 22)
  assert.deepEqual(release.changes, ['Index release'])
  assert.equal(release.phoneMs, 750.654321 - 100.123456)
  assert.equal(release.phoneSentMs, 751.876543 - 100.123456)
  assert.equal(release.sameTimestamp, false)
  assert.notEqual(release.phoneMs, 0)
  assert.deepEqual(JSON.parse(JSON.stringify(release)), release)
  // Reset while a finger is held makes its release the first event in the new attempt.
  trace = initialMidiTrace(1)
  trace = appendFingerTrace(trace, { seq: 23, state: 0, t: 1000.123456, sentAt: 1001.987654 }, 1900)
  assert.equal(trace.rows[0].phoneMs, 0)
  assert.equal(trace.rows[0].phoneSentMs, 1001.987654 - 1000.123456)
  assert.deepEqual(trace.rows[0].changes, ['Index release'])
})
