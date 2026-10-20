import test from 'node:test'
import assert from 'node:assert/strict'
import { fingeringMappings, majorScaleMapping, pitchForState } from './pitch-mapping.js'

test('chromatic assignments minimize total neighboring-natural finger changes', () => {
  const naturals = ['1000', '1100', '1110', '1111', '0111', '0011', '0001']
  const neighbors = [[0, 1], [1, 2], [3, 4], [4, 5], [5, 6]]
  const distance = (first, second) => [...first].filter((bit, index) => bit !== second[index]).length
  const cost = patterns => patterns.reduce((sum, pattern, index) => sum + neighbors[index]
    .reduce((subtotal, neighbor) => subtotal + distance(pattern, naturals[neighbor]), 0), 0)
  const permutations = patterns => patterns.length ? patterns.flatMap(pattern =>
    permutations(patterns.filter(other => other !== pattern)).map(rest => [pattern, ...rest])) : [[]]
  const patterns = ['0100', '0110', '0010', '1010', '1001']
  const selected = fingeringMappings['Finger Roll'].filter(({ note }) => note.includes('#'))
    .map(({ state }) => [0, 1, 2, 3].map(bit => (state & (1 << bit)) ? '1' : '0').join(''))
  assert.deepEqual(selected, ['1010', '0100', '0110', '0010', '1001'])
  assert.equal(cost(selected), 15)
  assert.equal(cost(selected), Math.min(...permutations(patterns).map(cost)))
  for (const state of [0b1101, 0b1011, 0b1010]) assert.equal(pitchForState(state, false, 4, 'Finger Roll'), 'Silence')
})

test('Finger Roll follows anatomical order without changing raw bit order', () => {
  const mapped = new Map([[1, 'C4'], [5, 'C#4'], [3, 'D4'], [2, 'D#4'], [7, 'E4'], [15, 'F4'],
    [6, 'F#4'], [14, 'G4'], [4, 'G#4'], [12, 'A4'], [9, 'A#4'], [8, 'B4']])
  for (let state = 0; state < 16; state++) {
    const note = mapped.get(state) || 'Silence'
    assert.equal(pitchForState(state, false, 4, 'Finger Roll'), note)
    assert.equal(pitchForState(state, true, 6, 'Finger Roll'), note.replace('4', '7'))
  }
})

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
