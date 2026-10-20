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

test('chromatic Finger Roll sends immediate semitone transitions including releases and octave shifts', () => {
  const { player, events } = setup()
  player.setMapping('Finger Roll')
  const states = [1, 5, 3, 2, 7, 15, 6, 14, 4, 12, 9, 8]
  for (const state of states) player.play(state)
  assert.deepEqual(events.filter(event => event[0] === 0x90).map(event => event[1]),
    Array.from({ length: 12 }, (_, index) => 60 + index))
  player.play(8, true)
  assert.deepEqual(events.slice(-2), [[0x80, 71, 0], [0x90, 83, 100]])
  player.setBaseOctave(7)
  assert.equal(player.activeNote, 119)
  player.play(10, true)
  assert.equal(player.activeNote, null)
  assert.deepEqual(events.at(-1), [0x80, 119, 0])
})

test('mapping selection immediately follows held fingers, octave and thumb, recording actual attacks', () => {
  const events = []
  const history = []
  const player = new MidiOutput(note => history.push(note))
  player.setOutput({ send: data => events.push(data) })
  player.setBaseOctave(5)
  player.play(3, true)
  player.setMapping('Finger Roll')
  player.setMapping('Finger Roll')
  player.setMapping('Candidate 1')
  assert.deepEqual(events, [[0x90, 84, 100], [0x80, 84, 0], [0x90, 86, 100], [0x80, 86, 0], [0x90, 84, 100]])
  assert.deepEqual(history, ['C6', 'D6', 'C6'])
  player.play(4, true)
  player.setMapping('Finger Roll')
  assert.equal(player.activeNote, 92)
  assert.deepEqual(events.slice(-2), [[0x80, 91, 0], [0x90, 92, 100]])
  player.play(7, true)
  player.setMapping('Candidate 1')
  assert.equal(player.activeNote, null)
  player.setMapping('Finger Roll')
  assert.equal(player.activeNote, 88)
})

test('mapping changes preserve silence and do not play without output or while hidden', () => {
  const { player, events } = setup()
  player.setMapping('Finger Roll')
  assert.deepEqual(events, [])
  player.play(3)
  player.stop()
  player.setMapping('Candidate 1', false)
  assert.equal(player.activeNote, null)
  player.setOutput(null)
  player.setMapping('Finger Roll')
  assert.deepEqual(events, [[0x90, 62, 100], [0x80, 62, 0]])
  player.setOutput({ send: data => events.push(data) })
  player.play(3)
  assert.equal(events.length, 2)
})

test('base octave switches sounding pitches immediately and records actual note names', () => {
  const events = []
  const history = []
  const player = new MidiOutput(note => history.push(note))
  player.setOutput({ send: data => events.push(data) })
  player.play(4)
  player.setBaseOctave(5)
  player.setBaseOctave(5)
  player.play(4, true)
  player.setBaseOctave(1)
  assert.deepEqual(events, [[0x90, 67, 100], [0x80, 67, 0], [0x90, 79, 100],
    [0x80, 79, 0], [0x90, 91, 100], [0x80, 91, 0], [0x90, 43, 100]])
  assert.deepEqual(history, ['G4', 'G5', 'G6', 'G2'])
})

test('base octave respects bounds, silence, and safety stops without restarting held notes', () => {
  const { events, player } = setup()
  player.setBaseOctave(7)
  player.play(0, true)
  player.play(10, true)
  assert.deepEqual(events, [])
  player.play(1, true)
  assert.equal(player.activeNote, 119)
  player.setBaseOctave(8)
  assert.equal(player.activeNote, 119)
  player.stop()
  player.setBaseOctave(2)
  player.play(1, true)
  assert.deepEqual(events, [[0x90, 119, 100], [0x80, 119, 0]])
  player.play(3, true)
  assert.equal(player.activeNote, 48)
  for (let octave = 1; octave <= 7; octave++) {
    for (const state of [3, 5, 9, 12, 4, 6, 1]) {
      for (const thumb of [false, true]) {
        const note = midiNoteForState(state, thumb, octave)
        assert.ok(note >= 0 && note <= 127)
      }
    }
  }
  for (const octave of [0, 8, NaN, 1.5]) assert.equal(midiNoteForState(3, false, octave), null)
})

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
