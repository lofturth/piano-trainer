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
  for (const [state, note] of [[3, 60], [5, 62], [9, 64], [12, 65], [10, 67], [6, 69], [1, 71]]) {
    assert.equal(midiNoteForState(state), note)
  }
  for (const state of [0, 2, 4, 7, 8, 11, 13, 14, 15, -1, 16]) assert.equal(midiNoteForState(state), null)
})

test('new presses send Note Off before Note On; partial releases leave the sounding note unchanged', () => {
  const { events, player } = setup()
  player.play(3)
  player.play(5)
  player.play(1)
  player.play(12)
  assert.deepEqual(events, [[0x90, 60, 100], [0x80, 60, 0], [0x90, 62, 100], [0x80, 62, 0], [0x90, 65, 100]])
})

test('duplicate pitches and thumb-only messages do not retrigger', () => {
  const { events, player } = setup()
  for (const thumb of [false, true, true, false]) {
    const message = { state: 3, thumb }
    player.play(message.state)
  }
  assert.deepEqual(events, [[0x90, 60, 100]])
})

test('unmapped combinations neither start nor stop notes; all released fingers stop the held note', () => {
  for (const state of [2, 4, 7, 8, 11, 13, 14, 15]) {
    const { events, player } = setup()
    player.play(3)
    player.play(state)
    player.play(state)
    assert.deepEqual(events, [[0x90, 60, 100]])
    assert.equal(player.activeNote, 60)
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

test('several partial releases preserve the original note until all fingers are up', () => {
  const { events, player } = setup()
  for (const state of [3, 7, 6, 2, 2]) player.play(state)
  assert.deepEqual(events, [[0x90, 60, 100]])
  player.play(0)
  player.play(0)
  assert.deepEqual(events, [[0x90, 60, 100], [0x80, 60, 0]])
})

test('a new press can retrigger the sounding pitch after a partial release', () => {
  const { events, player } = setup()
  for (const state of [3, 1, 3]) player.play(state)
  assert.deepEqual(events, [[0x90, 60, 100], [0x80, 60, 0], [0x90, 60, 100]])
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
