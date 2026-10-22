import test from 'node:test'
import assert from 'node:assert/strict'
import { createFingerGrouping } from './finger-grouping.js'
import { MidiOutput } from './midi-output.js'

test('fixed window applies only the latest changed state at the original deadline', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const applied = []
  const grouping = createFingerGrouping((...args) => applied.push(args))
  grouping.configure(8, 'fixed')
  grouping.push(1, false, 1)
  t.mock.timers.tick(4)
  grouping.push(5, true, 2)
  t.mock.timers.tick(3)
  assert.deepEqual(applied, [])
  t.mock.timers.tick(1)
  assert.deepEqual(applied, [[5, true, 2]])
})

test('restarting window waits for quiet; duplicate states do not restart it', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const applied = []
  const grouping = createFingerGrouping((...args) => applied.push(args))
  grouping.configure(8, 'restarting')
  grouping.push(1, false, 1)
  t.mock.timers.tick(4)
  grouping.push(5, false, 2)
  t.mock.timers.tick(4)
  grouping.push(5, false, 3)
  assert.deepEqual(applied, [])
  t.mock.timers.tick(4)
  assert.deepEqual(applied, [[5, false, 2]])
})

test('zero bypass, immediate A/B, releases, and reset/cancellation preserve MIDI safety', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const bytes = []
  const player = new MidiOutput()
  player.setMapping('Finger Roll')
  player.setOutput({ send: data => bytes.push(data) })
  const grouping = createFingerGrouping((state, thumb) => player.play(state, thumb))
  grouping.push(1)
  grouping.cancelPending() // At 0 ms, Reset does not change the existing MIDI behavior.
  assert.deepEqual(bytes, [[0x90, 60, 100]])
  grouping.configure(16, 'fixed')
  grouping.push(5)
  t.mock.timers.tick(8)
  assert.equal(bytes.length, 1)
  grouping.configure(0, 'fixed')
  assert.deepEqual(bytes.slice(-2), [[0x80, 60, 0], [0x90, 61, 100]])
  grouping.configure(8, 'fixed')
  grouping.push(0)
  t.mock.timers.tick(8)
  assert.deepEqual(bytes.at(-1), [0x80, 61, 0])
  grouping.push(1)
  grouping.cancelPending()
  grouping.reset()
  const count = bytes.length
  t.mock.timers.tick(100)
  assert.equal(bytes.length, count)
  assert.equal(player.activeNote, null)
  grouping.push(5)
  grouping.cancel()
  t.mock.timers.tick(100)
  assert.equal(bytes.length, count)
})
