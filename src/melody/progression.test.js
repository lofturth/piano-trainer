import test from 'node:test'
import assert from 'node:assert/strict'
import { demoMelody } from './demo-melody.js'
import { initialProgression, advanceProgression, rowContents } from './progression.js'

const melody = Array.from({ length: 50 }, (_, index) => `note ${index + 1}`)
const advance = (state, count) => {
  for (let step = 0; step < count; step++) state = advanceProgression(state, melody.length)
  return state
}

test('initial rows contain exactly notes 1–10 and 11–20', () => {
  const state = initialProgression()
  assert.equal(state.position, 0)
  assert.deepEqual(state.rowStarts, [0, 10])
  assert.deepEqual(rowContents(melody, state.rowStarts[0]), melody.slice(0, 10))
  assert.deepEqual(rowContents(melody, state.rowStarts[1]), melody.slice(10, 20))
})

test('each simulated note advances one position without changing either row within a block', () => {
  const initial = initialProgression()
  let state = initial
  for (let position = 1; position < 10; position++) {
    const previous = state
    state = advanceProgression(state, melody.length)
    assert.equal(state.position, position)
    assert.equal(state.rowStarts, previous.rowStarts)
    assert.deepEqual(state.rowStarts, [0, 10])
  }
  assert.deepEqual(initial, { position: 0, rowStarts: [0, 10] })
})

test('10→11 activates the existing second row and replaces only the first with 21–30', () => {
  const before = advance(initialProgression(), 9)
  const after = advanceProgression(before, melody.length)
  assert.equal(after.position, 10)
  assert.deepEqual(after.rowStarts, [20, 10])
  assert.deepEqual(rowContents(melody, after.rowStarts[1]), rowContents(melody, before.rowStarts[1]))
  assert.deepEqual(rowContents(melody, after.rowStarts[0]), melody.slice(20, 30))
  assert.deepEqual(before.rowStarts, [0, 10])
})

test('20→21 activates the existing first row and replaces only the second with 31–40', () => {
  const before = advance(initialProgression(), 19)
  const after = advanceProgression(before, melody.length)
  assert.equal(after.position, 20)
  assert.deepEqual(after.rowStarts, [20, 30])
  assert.deepEqual(rowContents(melody, after.rowStarts[0]), rowContents(melody, before.rowStarts[0]))
  assert.deepEqual(rowContents(melody, after.rowStarts[1]), melody.slice(30, 40))
})

test('row slots stay fixed throughout the melody; only a finished inactive row is replaced', () => {
  let state = initialProgression()
  while (state.position < melody.length) {
    const previous = state
    state = advanceProgression(state, melody.length)
    const crossing = state.position % 10 === 0 && state.position < melody.length
    const nextActive = Math.floor(state.position / 10) % 2
    for (let row = 0; row < 2; row++) {
      if (!crossing || row === nextActive) assert.equal(state.rowStarts[row], previous.rowStarts[row])
      assert.equal(rowContents(melody, state.rowStarts[row]).length, 10)
    }
  }
})

test('final note completes once without going past the end or replacing its active row', () => {
  const finalNote = advance(initialProgression(), 49)
  assert.equal(finalNote.position, 49)
  const completed = advanceProgression(finalNote, melody.length)
  assert.equal(completed.position, melody.length)
  assert.equal(completed.rowStarts, finalNote.rowStarts)
  assert.equal(advanceProgression(completed, melody.length), completed)
  assert.deepEqual(rowContents(melody, completed.rowStarts[1]), Array(10).fill(null))
})

test('reset constructs a fresh initial state after advancement or completion', () => {
  const completed = advance(initialProgression(), 50)
  const reset = initialProgression()
  assert.deepEqual(reset, { position: 0, rowStarts: [0, 10] })
  assert.notEqual(reset.rowStarts, completed.rowStarts)
  assert.equal(advanceProgression(reset, 50).position, 1)
})

test('an exact forty-note melody completes on note 40 without an extra row swap', () => {
  let state = initialProgression()
  for (let step = 0; step < 39; step++) state = advanceProgression(state, 40)
  assert.deepEqual(state.rowStarts, [40, 30])
  assert.equal(rowContents(melody, state.rowStarts[1])[9], 'note 40')
  const completed = advanceProgression(state, 40)
  assert.equal(completed.position, 40)
  assert.equal(completed.rowStarts, state.rowStarts)
  assert.equal(advanceProgression(completed, 40), completed)
})

test('partial final blocks retain ten slots and complete without overrunning', () => {
  let state = initialProgression()
  for (let step = 0; step < 23; step++) state = advanceProgression(state, 23)
  assert.equal(state.position, 23)
  assert.equal(advanceProgression(state, 23), state)
  assert.deepEqual(rowContents(melody.slice(0, 23), 20), [...melody.slice(20, 23), ...Array(7).fill(null)])
})

test('demonstration includes 40+ notes, every chromatic pitch class, repetitions and ledger-line range', () => {
  assert.ok(demoMelody.length >= 40)
  assert.equal(new Set(demoMelody.map(note => note.slice(0, -1))).size, 12)
  assert.ok(demoMelody.some((note, index) => note === demoMelody[index + 1]))
  assert.ok(demoMelody.includes('G3'))
  assert.ok(demoMelody.includes('C6'))
})
