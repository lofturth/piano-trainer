import test from 'node:test'
import assert from 'node:assert/strict'
import { appendPlayedNote } from './note-history.js'
import { MidiOutput } from './midi-output.js'
import { majorScaleMapping } from './pitch-mapping.js'

test('history retains the last 20 notes chronologically, including repeats, without mutating previous history', () => {
  const played = Array.from({ length: 27 }, (_, index) => ['C4', 'D4', 'D4', 'G4'][index % 4])
  let history = []
  for (const note of played) {
    const previous = history
    const snapshot = [...previous]
    history = appendPlayedNote(history, note)
    assert.deepEqual(previous, snapshot)
    assert.ok(history.length <= 20)
  }
  assert.deepEqual(history, played.slice(-20))
  assert.equal(history.at(-1), played.at(-1))
})

test('history records only sent Note On events and retains the last note after release or stop', () => {
  let history = []
  const events = []
  const player = new MidiOutput(note => { history = appendPlayedNote(history, note) })
  player.play(3)
  player.setOutput({ send: data => events.push(data) })
  for (const state of [3, 0, 5, 1, 5, 13, 5, 5, 0]) player.play(state)
  player.stop()
  player.setOutput(null)
  player.play(3)
  assert.deepEqual(history, ['D4', 'D4'])
  assert.equal(history.length, events.filter(data => data[0] === 0x90).length)
  assert.equal(history.at(-1), 'D4')
  assert.equal(player.activeNote, null)
})

test('failed MIDI sends do not add a played note', () => {
  const history = []
  const player = new MidiOutput(note => history.push(note))
  player.setOutput({ send: () => { throw new Error('Output unavailable') } })
  assert.throws(() => player.play(3), /Output unavailable/)
  assert.deepEqual(history, [])
})

test('live fingering can change on partial release without changing the played note or history', () => {
  let history = []
  const player = new MidiOutput(note => { history = appendPlayedNote(history, note) })
  const events = []
  player.setOutput({ send: data => events.push(data) })
  player.play(3)
  const liveState = 1
  player.play(liveState)
  assert.deepEqual([0, 1, 2, 3].map(bit => Boolean(liveState & (1 << bit))), [true, false, false, false])
  assert.equal(majorScaleMapping.find(({ state }) => state === liveState)?.note, 'B4')
  assert.equal(player.activeNote, 60)
  assert.deepEqual(history, ['C4'])
  assert.deepEqual(events, [[0x90, 60, 100]])
  player.play(0)
  assert.deepEqual(history, ['C4'])
})
