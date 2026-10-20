import test from 'node:test'
import assert from 'node:assert/strict'
import { majorScaleMapping, pitchForState } from './pitch-mapping.js'

test('Candidate 1 patterns in Index/Middle/Ring/Pinky order map from unchanged raw bits', () => {
  const expected = [
    ['1100', 0b0011, 'C4'], ['1010', 0b0101, 'D4'], ['1001', 0b1001, 'E4'],
    ['0011', 0b1100, 'F4'], ['0010', 0b0100, 'G4'], ['0110', 0b0110, 'A4'],
    ['1000', 0b0001, 'B4'],
  ]
  for (const [pattern, raw, note] of expected) {
    assert.equal(pitchForState(raw), note, pattern)
  }
})

test('playing reference exposes the same major-scale mapping in finger order', () => {
  assert.deepEqual(majorScaleMapping.map(({ state, note }) => [note,
    Array.from({ length: 4 }, (_, bit) => (state & (1 << bit)) ? '1' : '0').join('')]), [
    ['C4', '1100'], ['D4', '1010'], ['E4', '1001'], ['F4', '0011'],
    ['G4', '0010'], ['A4', '0110'], ['B4', '1000'],
  ])
})

test('released fingers and all nine non-scale combinations are silent', () => {
  for (const state of [0, 2, 7, 8, 10, 11, 13, 14, 15]) {
    assert.equal(pitchForState(state), 'Silence')
  }
})

test('invalid inputs never produce a pitch', () => {
  for (const state of [-1, 16, 1.5, NaN, Infinity, '1000', null, undefined]) {
    assert.equal(pitchForState(state), 'Silence')
  }
})

test('thumb changes note names by one octave without changing Candidate 1 assignments', () => {
  for (const { state, note } of majorScaleMapping) {
    assert.equal(pitchForState(state), note)
    assert.equal(pitchForState(state, true), note.replace('4', '5'))
  }
  for (const state of [0, 2, 7, 8, 10, 11, 13, 14, 15]) assert.equal(pitchForState(state, true), 'Silence')
})
