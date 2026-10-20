import test from 'node:test'
import assert from 'node:assert/strict'
import { MidiOutput, midiNoteForState } from './midi-output.js'

function setup() {
  const events = []
  const output = { send: data => events.push(data) }
  const player = new MidiOutput()
  player.setOutput(output)
  return { events, output, player }
}

test('major-scale mapping produces MIDI 60, 62, 64, 65, 67, 69, 71', () => {
  for (const [state, note] of [[3, 60], [5, 62], [9, 64], [12, 65], [4, 67], [6, 69], [1, 71]]) {
    assert.equal(midiNoteForState(state), note)
    assert.equal(midiNoteForState(state, true), note + 12)
  }
  for (const state of [0, 2, 7, 8, 10, 11, 13, 14, 15, -1, 16]) assert.equal(midiNoteForState(state), null)
})

test('state changes send Note Off before Note On, including mapped partial releases', () => {
  const { events, player } = setup()
  player.play(3)
  player.play(5)
  player.play(1)
  player.play(12)
  assert.deepEqual(events, [[0x90, 60, 100], [0x80, 60, 0], [0x90, 62, 100], [0x80, 62, 0],
    [0x90, 71, 100], [0x80, 71, 0], [0x90, 65, 100]])
})

test('duplicate states with unchanged effective pitches do not retrigger', () => {
  const { events, player } = setup()
  for (const thumb of [false, false, false]) {
    const message = { state: 3, thumb }
    player.play(message.state, message.thumb)
  }
  assert.deepEqual(events, [[0x90, 60, 100]])
})

test('thumb press and release transpose a sounding note immediately and update played names', () => {
  const events = []
  const played = []
  const player = new MidiOutput(note => played.push(note))
  player.setOutput({ send: data => events.push(data) })
  player.play(3, false)
  player.play(3, true)
  player.play(3, true)
  player.play(3, false)
  assert.deepEqual(events, [[0x90, 60, 100], [0x80, 60, 0], [0x90, 72, 100], [0x80, 72, 0], [0x90, 60, 100]])
  assert.deepEqual(played, ['C4', 'C5', 'C4'])
})

test('thumb-only states stay silent and a later mapped fingering starts in the upper octave', () => {
  const { events, player } = setup()
  player.play(0, true)
  player.play(0, false)
  player.play(0, true)
  assert.deepEqual(events, [])
  player.play(5, true)
  assert.deepEqual(events, [[0x90, 74, 100]])
  player.play(0, true)
  assert.deepEqual(events, [[0x90, 74, 100], [0x80, 74, 0]])
})

test('all unmapped combinations remain silent with thumb held', () => {
  for (const state of [0, 2, 7, 8, 10, 11, 13, 14, 15]) {
    const { events, player } = setup()
    assert.equal(midiNoteForState(state, true), null)
    player.play(3, true)
    player.play(state, true)
    player.play(state, false)
    assert.deepEqual(events, [[0x90, 72, 100], [0x80, 72, 0]])
  }
})

test('safety stop and output disable release the transposed note', () => {
  const { events, player } = setup()
  player.play(3, true)
  player.stop()
  player.play(5, true)
  player.setOutput(null)
  assert.deepEqual(events, [[0x90, 72, 100], [0x80, 72, 0], [0x90, 74, 100], [0x80, 74, 0]])
})

test('every unmapped combination stops the previous note and remains silent', () => {
  for (const state of [2, 7, 8, 10, 11, 13, 14, 15]) {
    const { events, player } = setup()
    player.play(3)
    player.play(state)
    player.play(state)
    assert.deepEqual(events, [[0x90, 60, 100], [0x80, 60, 0]])
    assert.equal(player.activeNote, null)
    player.play(0)
    assert.deepEqual(events, [[0x90, 60, 100], [0x80, 60, 0]])
    assert.equal(player.activeNote, null)
    player.play(state)
    assert.equal(events.length, 2)
  }
})

test('output switching and disabling release only the tracked note on the old port', () => {
  const { events, output, player } = setup()
  const second = []
  player.play(3)
  player.setOutput(output)
  player.setOutput({ send: data => second.push(data) })
  assert.deepEqual(events, [[0x90, 60, 100], [0x80, 60, 0]])
  assert.deepEqual(second, [])
  player.play(3)
  assert.deepEqual(second, [])
  player.play(5)
  player.setOutput(null)
  player.play(3)
  assert.deepEqual(second, [[0x90, 62, 100], [0x80, 62, 0]])
})

test('lifecycle stop is idempotent; controller disconnection silences the note', () => {
  const { events, player } = setup()
  player.play(3)
  player.stop()
  player.stop()
  player.play(3)
  assert.deepEqual(events, [[0x90, 60, 100], [0x80, 60, 0]])
  player.play(9)
  player.play(0)
  assert.deepEqual(events, [[0x90, 60, 100], [0x80, 60, 0], [0x90, 64, 100], [0x80, 64, 0]])
})

test('partial releases follow mapped pitches and silence unmapped states', () => {
  const { events, player } = setup()
  for (const state of [3, 7, 6, 2, 2]) player.play(state)
  assert.deepEqual(events, [[0x90, 60, 100], [0x80, 60, 0], [0x90, 69, 100], [0x80, 69, 0]])
  player.play(0)
  player.play(0)
  assert.deepEqual(events, [[0x90, 60, 100], [0x80, 60, 0], [0x90, 69, 100], [0x80, 69, 0]])
})

test('releasing and pressing back follows each mapped pitch without duplicate retriggers', () => {
  const { events, player } = setup()
  for (const state of [3, 1, 1, 3, 3]) player.play(state)
  assert.deepEqual(events, [[0x90, 60, 100], [0x80, 60, 0], [0x90, 71, 100], [0x80, 71, 0], [0x90, 60, 100]])
})

test('a transition with both a release and a new press triggers the new mapped pitch', () => {
  const { events, player } = setup()
  player.play(3)
  player.play(5)
  assert.deepEqual(events, [[0x90, 60, 100], [0x80, 60, 0], [0x90, 62, 100]])
})

test('presses while no output is selected cannot become delayed attacks on output selection', () => {
  const player = new MidiOutput()
  const events = []
  player.play(3)
  player.setOutput({ send: data => events.push(data) })
  player.play(3)
  assert.deepEqual(events, [])
  player.play(5)
  assert.deepEqual(events, [[0x90, 62, 100]])
})

test('a failed port is detached even if Note Off throws', () => {
  const player = new MidiOutput()
  let sends = 0
  player.setOutput({ send: () => { if (++sends > 1) throw new Error('Port lost') } })
  player.play(3)
  assert.throws(() => player.setOutput(null), /Port lost/)
  assert.equal(player.activeNote, null)
  player.play(9)
  assert.equal(sends, 2)
})
