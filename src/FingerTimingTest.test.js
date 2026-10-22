import test from 'node:test'
import assert from 'node:assert/strict'
import { computeArrivals } from './timing.js'

test('computeArrivals calculates finger order, relative arrival times, and total spread', () => {
  const records = [
    { finger: 'Middle', timestamp: 108.333333 },
    { finger: 'Index', timestamp: 100.0 },
    { finger: 'Ring', timestamp: 116.666667 },
  ]

  const { arrivals, totalSpreadMs } = computeArrivals(records)

  assert.equal(arrivals.length, 3)

  // 1st arrived: Index (+0.0 ms)
  assert.equal(arrivals[0].finger, 'Index')
  assert.equal(arrivals[0].order, 1)
  assert.equal(arrivals[0].relativeMs, 0.0)

  // Preserve raw floating-point differences; format only for display.
  assert.equal(arrivals[1].finger, 'Middle')
  assert.equal(arrivals[1].order, 2)
  assert.equal(arrivals[1].relativeMs, records[0].timestamp - 100)
  assert.equal(arrivals[1].relativeMs.toFixed(3), '8.333')

  // 3rd arrived: Ring
  assert.equal(arrivals[2].finger, 'Ring')
  assert.equal(arrivals[2].order, 3)
  assert.equal(arrivals[2].relativeMs, records[2].timestamp - 100)

  // Total spread between first and last finger
  assert.equal(totalSpreadMs, records[2].timestamp - 100)
  assert.equal(totalSpreadMs.toFixed(3), '16.667')
  const measurement = { arrivals, totalSpreadMs }
  assert.deepEqual(JSON.parse(JSON.stringify(measurement)), measurement)
})
