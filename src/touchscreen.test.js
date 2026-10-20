import test from 'node:test'
import assert from 'node:assert/strict'
import { touchLocation, touchStatus, TouchTracker, validScreen } from './touchscreen.js'

const centers = [{ x: 0.15, y: 0.8 }, { x: 0.2, y: 0.4 }, { x: 0.4, y: 0.3 }, { x: 0.6, y: 0.35 }, { x: 0.8, y: 0.45 }]
const screen = { width: 390, height: 750, centers, touches: [] }

test('touch coordinates are surface-relative and preserve outside positions without clamping', () => {
  const rect = { left: 10, top: 20, width: 400, height: 800 }
  assert.deepEqual(touchLocation(110, 220, rect), { x: 0.25, y: 0.25 })
  assert.deepEqual(touchLocation(-30, 900, rect), { x: -0.1, y: 1.1 })
})

test('independent simultaneous touches keep assignments while moving across and outside regions', () => {
  const tracker = new TouchTracker()
  tracker.start(11, centers[1], 0)
  tracker.start(12, centers[2], 1)
  tracker.start(13, centers[0], 4)
  const original = tracker.snapshot()
  assert.equal(tracker.move(11, centers[1]), false)
  assert.equal(tracker.move(99, centers[1]), false)
  assert.equal(original.length, 3)
  assert.equal(touchStatus(original[0], screen), 'assigned')
  assert.equal(touchStatus(original[2], screen), 'assigned')
  tracker.move(11, centers[2])
  tracker.move(12, { x: -0.1, y: 1.1 })
  const moved = tracker.snapshot()
  assert.equal(moved[0].finger, 0)
  assert.equal(touchStatus(moved[0], screen), 'crossed')
  assert.equal(touchStatus(moved[1], screen), 'outside')
  assert.deepEqual(original[0], { id: 11, ...centers[1], finger: 0 })
  assert.ok(validScreen({ ...screen, touches: moved }))
})

test('end and cancellation remove only the matching marker; reset clears every touch', () => {
  const tracker = new TouchTracker()
  tracker.start(1, centers[1], 0)
  tracker.start(2, centers[0], 4)
  assert.equal(tracker.end(1), true)
  assert.equal(tracker.end(1), false)
  tracker.move(1, centers[2])
  assert.deepEqual(tracker.snapshot(), [{ id: 2, ...centers[0], finger: 4 }])
  tracker.end(2)
  assert.deepEqual(tracker.snapshot(), [])
  tracker.start(3, centers[1], null)
  assert.equal(touchStatus(tracker.snapshot()[0], { ...screen, centers: null }), 'outside')
  tracker.clear()
  assert.deepEqual(tracker.snapshot(), [])
})

test('screen validation rejects invalid geometry, coordinates, duplicate IDs, and assignments', () => {
  assert.ok(validScreen(screen))
  const touch = { id: 1, ...centers[1], finger: 0 }
  for (const invalid of [null, { ...screen, width: 0 }, { ...screen, centers: [] },
    { ...screen, touches: [touch, touch] }, { ...screen, touches: [{ ...touch, x: NaN }] },
    { ...screen, touches: [{ ...touch, finger: 5 }] }]) assert.equal(validScreen(invalid), false)
})
