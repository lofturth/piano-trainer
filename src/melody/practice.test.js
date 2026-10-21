import test from 'node:test'
import assert from 'node:assert/strict'
import { generateSequence, initialPractice, newPracticeSequence, playPracticeNote, practiceNotes,
  resetPractice, simulatePracticeNote, togglePracticeNote } from './practice.js'
import { MidiOutput } from '../midi-output.js'

function random(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 2 ** 32
  }
}

test('default C-only practice has exactly fifty C notes and cannot deselect its last note', () => {
  const practice = initialPractice()
  assert.deepEqual(practice.selected, ['C'])
  assert.deepEqual(practice.sequence, Array(50).fill('C'))
  assert.equal(togglePracticeNote(practice, 'C'), practice)
  assert.equal(togglePracticeNote(practice, 'Invalid'), practice)
  assert.throws(() => generateSequence([]))
})

test('randomized sequences contain only selected notes, cover them all, and remain balanced', () => {
  for (const selected of [['C', 'D'], ['C', 'D', 'E'], ['C#', 'F#', 'A#'], practiceNotes]) {
    const first = generateSequence(selected, random(1))
    const second = generateSequence(selected, random(999))
    assert.equal(first.length, 50)
    assert.ok(first.every(note => selected.includes(note)))
    assert.deepEqual(new Set(first), new Set(selected))
    assert.notDeepEqual(first, second)
    const counts = selected.map(note => first.filter(pitch => pitch === note).length)
    assert.ok(Math.max(...counts) - Math.min(...counts) <= 1)
    assert.notDeepEqual(first.slice(0, 24), first.slice(24, 48))
  }
})

test('selection changes create a fresh vocabulary and reset progression atomically', () => {
  let practice = simulatePracticeNote(initialPractice())
  practice = togglePracticeNote(practice, 'D', random(1))
  assert.deepEqual(practice.selected, ['C', 'D'])
  assert.deepEqual(practice.progress, { position: 0, rowStarts: [0, 10] })
  assert.ok(practice.sequence.every(note => ['C', 'D'].includes(note)))
  practice = togglePracticeNote(practice, 'C')
  assert.deepEqual(practice.sequence, Array(50).fill('D'))
})

test('Reset preserves sequence identity/order; New Sequence changes order and resets progress', () => {
  const practice = simulatePracticeNote(initialPractice(['C', 'D', 'E'], random(1)))
  const original = [...practice.sequence]
  const reset = resetPractice(practice)
  assert.equal(reset.sequence, practice.sequence)
  assert.equal(reset.selected, practice.selected)
  assert.equal(reset.progress.position, 0)
  const next = newPracticeSequence(practice, random(2))
  assert.notDeepEqual(next.sequence, practice.sequence)
  assert.equal(next.progress.position, 0)
  assert.equal(next.selected, practice.selected)
  assert.deepEqual(practice.sequence, original)
  const identicalRandom = initialPractice(['C', 'D'], () => 0.5)
  assert.notDeepEqual(newPracticeSequence(identicalRandom, () => 0.5).sequence, identicalRandom.sequence)
})

test('generated practice retains row handoffs, fixed active rows and completion', () => {
  let practice = initialPractice()
  for (let index = 0; index < 50; index++) {
    const previous = practice
    practice = playPracticeNote(practice, 60, 4)
    assert.equal(practice.sequence, previous.sequence)
    assert.equal(practice.progress.position, index + 1)
    if ((index + 1) % 10 !== 0 || index === 49) assert.equal(practice.progress.rowStarts, previous.progress.rowStarts)
    if (index === 9) assert.deepEqual(practice.progress.rowStarts, [20, 10])
    if (index === 19) assert.deepEqual(practice.progress.rowStarts, [20, 30])
  }
  assert.equal(playPracticeNote(practice, 60, 4), practice)
})

test('selection and octave changes match only the newly selected exact MIDI pitches', () => {
  let practice = initialPractice()
  assert.equal(playPracticeNote(practice, 72, 4), practice)
  practice = togglePracticeNote(togglePracticeNote(practice, 'D'), 'C')
  assert.equal(playPracticeNote(practice, 60, 4), practice)
  assert.equal(playPracticeNote(practice, 74, 4), practice)
  assert.equal(playPracticeNote(practice, 62, 4).progress.position, 1)
  assert.equal(playPracticeNote(practice, 62, 5), practice)
  assert.equal(playPracticeNote(practice, 74, 5).progress.position, 1)
  for (let octave = 1; octave <= 7; octave++) assert.equal(playPracticeNote(initialPractice(), 12 * (octave + 1), octave).progress.position, 1)
})

test('generated repeated notes still require distinct real MIDI attacks', () => {
  let practice = initialPractice()
  const player = new MidiOutput((_, midi) => { practice = playPracticeNote(practice, midi, 4) })
  player.setMapping('Finger Roll')
  player.setOutput({ send() {} })
  player.play(1)
  player.play(1)
  assert.equal(practice.progress.position, 1)
  player.play(0)
  assert.equal(practice.progress.position, 1)
  player.play(1)
  assert.equal(practice.progress.position, 2)
  player.play(3)
  assert.equal(practice.progress.position, 2)
})
