import test from 'node:test'
import assert from 'node:assert/strict'
import { createPracticeHold } from './hold.js'

test('correct fingering confirms only after a continuous 500 ms hold', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const hold = createPracticeHold()
  const notes = []
  hold.update('1', 60, 60, note => notes.push(note))
  t.mock.timers.tick(499)
  assert.deepEqual(notes, [])
  t.mock.timers.tick(1)
  assert.deepEqual(notes, [60])
})

test('changes, releases, and practice cancellation interrupt pending holds', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const hold = createPracticeHold()
  let count = 0
  const confirm = () => count++
  for (const [key, midi] of [['2', 62], ['0', null]]) {
    hold.update('1', 60, 60, confirm)
    t.mock.timers.tick(499)
    hold.update(key, midi, 60, confirm)
    t.mock.timers.tick(500)
    assert.equal(count, 0)
  }
  hold.update('1', 60, 60, confirm)
  t.mock.timers.tick(499)
  hold.cancel()
  t.mock.timers.tick(500)
  assert.equal(count, 0)
  hold.update('1', 60, 60, confirm)
  t.mock.timers.tick(499)
  assert.equal(count, 0)
  t.mock.timers.tick(1)
  assert.equal(count, 1)
})

test('sustained fingering confirms once; repeated targets need a fresh attack', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const hold = createPracticeHold()
  let count = 0
  const confirm = () => count++
  hold.update('1', 60, 60, confirm)
  t.mock.timers.tick(500)
  hold.update('1', 60, 60, confirm)
  t.mock.timers.tick(1000)
  assert.equal(count, 1)
  hold.update('0', null, 60, confirm)
  hold.update('1', 60, 60, confirm)
  t.mock.timers.tick(500)
  assert.equal(count, 2)
})

test('progress shares the confirmation clock and duration changes restart from zero', t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] })
  const hold = createPracticeHold(() => Date.now())
  let count = 0
  const confirm = () => count++
  assert.equal(hold.progress(), null)
  hold.update('1', 60, 60, confirm, 1000)
  t.mock.timers.tick(250)
  assert.equal(hold.progress(), 0.25)
  hold.cancel()
  assert.equal(hold.progress(), null)
  hold.update('1', 60, 60, confirm, 100)
  assert.equal(hold.progress(), 0)
  t.mock.timers.tick(50)
  assert.equal(hold.progress(), 0.5)
  assert.equal(count, 0)
  t.mock.timers.tick(50)
  assert.equal(hold.progress(), 1)
  assert.equal(count, 1)
  t.mock.timers.tick(1000)
  assert.equal(count, 1)
  hold.update('0', null, 60, confirm, 100)
  assert.equal(hold.progress(), null)
})
