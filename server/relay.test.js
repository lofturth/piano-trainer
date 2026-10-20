import test from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { WebSocket } from 'ws'
import { startRelay } from './relay.js'

function message(socket, predicate) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off('message', receive)
      reject(new Error('Timed out waiting for relay message'))
    }, 6500)
    function receive(data) {
      const value = JSON.parse(data.toString())
      if (!predicate(value)) return
      clearTimeout(timer)
      socket.off('message', receive)
      resolve(value)
    }
    socket.on('message', receive)
  })
}

test('relay preserves transitions, rejects takeover, and clears stale held state', async context => {
  const server = startRelay(0, '127.0.0.1')
  context.after(async () => {
    for (const socket of server.clients) socket.terminate()
    await new Promise(resolve => server.close(resolve))
  })
  await once(server, 'listening')
  const url = `ws://127.0.0.1:${server.address().port}`
  const trainer = new WebSocket(url)
  await once(trainer, 'open')
  trainer.send(JSON.stringify({ role: 'trainer' }))
  const controller = new WebSocket(url)
  await once(controller, 'open')
  controller.send(JSON.stringify({ role: 'controller' }))
  for (const [seq, [state, thumb]] of [[0, false], [0, true], [0, false], [1, false], [3, true], [15, true], [7, true]].entries()) {
    const expected = { type: 'fingers', seq, state, thumb, t: 100 + seq * 0.5 }
    const forwarded = message(trainer, value => value.type === 'fingers')
    controller.send(JSON.stringify(expected))
    assert.deepEqual(await forwarded, expected)
  }
  const intruder = new WebSocket(url)
  await once(intruder, 'open')
  const rejected = once(intruder, 'close')
  intruder.send(JSON.stringify({ role: 'controller' }))
  assert.equal((await rejected)[0], 1008)
  const disconnected = message(trainer, value => value.type === 'status' && !value.controllerConnected)
  assert.equal((await disconnected).controllerConnected, false)
  const replacement = new WebSocket(url)
  await once(replacement, 'open')
  replacement.send(JSON.stringify({ role: 'controller' }))
  const initial = message(trainer, value => value.type === 'fingers')
  replacement.send(JSON.stringify({ type: 'fingers', state: 0, seq: 0, t: 1 }))
  assert.deepEqual(await initial, { type: 'fingers', state: 0, thumb: false, seq: 0, t: 1 })
  const invalid = once(replacement, 'close')
  replacement.send(JSON.stringify({ type: 'fingers', state: 1, seq: 2, t: 2 }))
  assert.equal((await invalid)[0], 1008)
  for (const thumb of [true, 'yes', 1, null]) {
    const bad = new WebSocket(url)
    await once(bad, 'open')
    const closed = once(bad, 'close')
    bad.send(JSON.stringify({ role: 'controller' }))
    bad.send(JSON.stringify({ type: 'fingers', state: 0, thumb, seq: 0, t: 1 }))
    assert.equal((await closed)[0], 1008)
  }
})
