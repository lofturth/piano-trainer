import test from 'node:test'
import assert from 'node:assert/strict'
import { notationPitch } from './notation.js'
import { demoMelody } from './demo-melody.js'

test('notation preserves diatonic spelling and octave for engraved vertical positioning', () => {
  assert.deepEqual(notationPitch('C4'), { key: 'c/4', accidental: 'n', label: 'C4' })
  assert.deepEqual(notationPitch('F#4'), { key: 'f#/4', accidental: '#', label: 'F♯4' })
  assert.deepEqual(notationPitch('Bb5'), { key: 'bb/5', accidental: 'b', label: 'B♭5' })
  assert.equal(notationPitch('G3').key, 'g/3')
  assert.equal(notationPitch('C6').key, 'c/6')
  for (const note of demoMelody) assert.ok(notationPitch(note).key)
})

test('explicit naturals cancel prior accidentals; malformed demonstration pitches are rejected', () => {
  assert.equal(notationPitch('F4').accidental, 'n')
  for (const note of ['H4', 'C#', 'C10', 'Silence']) assert.throws(() => notationPitch(note))
})
