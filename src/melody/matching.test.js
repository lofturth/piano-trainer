import test from 'node:test'
import assert from 'node:assert/strict'
import { advanceForNote, demoMidiNotes } from './matching.js'
import { initialProgression } from './progression.js'
import { MidiOutput, midiNoteForPitch } from '../midi-output.js'
import { createNoteEvents } from '../note-events.js'

test('melody targets use shared MIDI conversion, including chromatic pitches and exact octaves', () => {
  assert.equal(demoMidiNotes.length, 50)
  assert.deepEqual(demoMidiNotes.slice(0, 4), [60, 60, 61, 62])
  assert.equal(midiNoteForPitch('F#4'), 66)
  assert.equal(midiNoteForPitch('C5'), 72)
  assert.equal(midiNoteForPitch('C-1'), 0)
  assert.equal(midiNoteForPitch('G9'), 127)
  for (const pitch of ['G#9', 'C-2', 'Silence', null]) assert.equal(midiNoteForPitch(pitch), null)
  assert.ok(demoMidiNotes.every(Number.isInteger))
})

test('only the exact current pitch advances once; octave mismatches and non-note values do not', () => {
  const state = initialProgression()
  for (const midi of [72, 59, 61, null, undefined, '60', { type: 'status' }, -1, 128]) {
    assert.equal(advanceForNote(state, midi), state)
  }
  assert.equal(advanceForNote(state, 60).position, 1)
  assert.equal(state.position, 0)
})

test('repeated notes require separate genuine Note Ons; holds, releases and duplicate states cannot advance', () => {
  const events = createNoteEvents()
  let state = initialProgression()
  const targets = [60, 60, 62]
  const unsubscribe = events.subscribe(midi => { state = advanceForNote(state, midi, targets) })
  const player = new MidiOutput((_, midi) => events.emit(midi))
  player.setMapping('Finger Roll')
  player.setOutput({ send() {} })
  player.play(1)
  assert.equal(state.position, 1)
  player.play(1)
  player.play(1)
  assert.equal(state.position, 1)
  player.play(0)
  assert.equal(state.position, 1)
  player.play(1)
  assert.equal(state.position, 2)
  player.play(1, true)
  assert.equal(state.position, 2)
  player.play(3)
  assert.equal(state.position, 3)
  const completed = state
  player.play(1)
  player.play(3)
  assert.equal(state, completed)
  state = initialProgression()
  player.play(3)
  assert.equal(state.position, 0)
  player.play(1)
  assert.equal(state.position, 1)
  unsubscribe()
})

test('matching Note Ons retain the same row handoffs and completion as simulation', () => {
  let state = initialProgression()
  for (let index = 0; index < demoMidiNotes.length; index++) {
    state = advanceForNote(state, demoMidiNotes[index])
    assert.equal(state.position, index + 1)
    if (index === 9) assert.deepEqual(state.rowStarts, [20, 10])
    if (index === 19) assert.deepEqual(state.rowStarts, [20, 30])
  }
  assert.equal(advanceForNote(state, demoMidiNotes.at(-1)), state)
})

test('no selected output or failed MIDI send produces a training event; cleanup sends no training events', () => {
  const notes = []
  const player = new MidiOutput((_, midi) => notes.push(midi))
  player.play(3)
  assert.deepEqual(notes, [])
  player.setOutput({ send() { throw new Error('Unavailable') } })
  assert.throws(() => player.play(5), /Unavailable/)
  assert.deepEqual(notes, [])
  assert.throws(() => player.setOutput({ send() {} }), /Unavailable/)
  player.play(9)
  assert.deepEqual(notes, [64])
  player.stop()
  player.play(0)
  player.setOutput(null)
  assert.deepEqual(notes, [64])
})

test('subscription cleanup and resubscription deliver each fresh event once without replay', () => {
  const events = createNoteEvents()
  const received = []
  for (let cycle = 0; cycle < 5; cycle++) {
    const unsubscribe = events.subscribe(midi => received.push(midi))
    events.emit(60)
    unsubscribe()
    events.emit(72)
  }
  assert.deepEqual(received, [60, 60, 60, 60, 60])
})
