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
  for (const timestamp of ['-1', 'null', '"1"', '1e999']) {
    const bad = new WebSocket(url)
    await once(bad, 'open')
    const closed = once(bad, 'close')
    bad.send(JSON.stringify({ role: 'controller' }))
    bad.send(`{"type":"fingers","state":0,"thumb":false,"seq":0,"t":${timestamp}}`)
    assert.equal((await closed)[0], 1008)
  }
})

test('consecutive sequences accept decreasing timestamps without changing event data', async context => {
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
  for (const expected of [
    { type: 'fingers', state: 0, thumb: false, seq: 0, t: 110 },
    { type: 'fingers', state: 8, thumb: false, seq: 1, t: 105 },
    { type: 'fingers', state: 8, thumb: true, seq: 2, t: 100 },
    { type: 'fingers', state: 0, thumb: false, seq: 3, t: 0 },
  ]) {
    const forwarded = message(trainer, value => value.type === 'fingers')
    controller.send(JSON.stringify(expected))
    assert.deepEqual(await forwarded, expected)
  }
})

test('relay preserves actual geometry and multitouch data independently of the MIDI sequence', async context => {
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
  const screen = { width: 390, height: 750,
    centers: [{ x: 0.15, y: 0.8 }, { x: 0.2, y: 0.4 }, { x: 0.4, y: 0.3 }, { x: 0.6, y: 0.35 }, { x: 0.8, y: 0.45 }],
    touches: [] }
  let expected = { type: 'fingers', state: 0, thumb: false, seq: 0, t: 20, screen }
  let received = message(trainer, value => value.type === 'fingers')
  controller.send(JSON.stringify(expected))
  assert.deepEqual(await received, expected)
  const held = { ...screen, touches: [{ id: 11, x: 0.2, y: 0.4, finger: 0 }, { id: 12, x: 0.4, y: 0.3, finger: 1 }] }
  expected = { ...expected, state: 3, seq: 1, t: 19, screen: held }
  received = message(trainer, value => value.type === 'fingers')
  controller.send(JSON.stringify(expected))
  assert.deepEqual(await received, expected)
  const moved = { ...held, touches: [{ ...held.touches[0], x: -0.2, y: 1.1 }, held.touches[1]] }
  received = message(trainer, value => value.type === 'touches')
  controller.send(JSON.stringify({ type: 'touches', screen: moved }))
  assert.deepEqual(await received, { type: 'touches', screen: moved })
  const lateTrainer = new WebSocket(url)
  await once(lateTrainer, 'open')
  received = message(lateTrainer, value => value.type === 'touches')
  lateTrainer.send(JSON.stringify({ role: 'trainer' }))
  assert.deepEqual(await received, { type: 'touches', screen: moved })
  controller.send(JSON.stringify({ type: 'touches', screen: { ...screen, width: 0 } }))
  expected = { ...expected, state: 2, seq: 2, t: 18, screen: { ...screen, touches: [held.touches[1]] } }
  received = message(trainer, value => value.type === 'fingers')
  controller.send(JSON.stringify(expected))
  assert.deepEqual(await received, expected)
  expected = { ...expected, state: 0, seq: 3, t: 17, screen }
  received = message(trainer, value => value.type === 'fingers')
  controller.send(JSON.stringify(expected))
  assert.deepEqual(await received, expected)
  const disconnected = message(trainer, value => value.type === 'status' && !value.controllerConnected)
  controller.close()
  await disconnected
  const replacement = new WebSocket(url)
  await once(replacement, 'open')
  replacement.send(JSON.stringify({ role: 'controller' }))
  received = message(trainer, value => value.type === 'fingers')
  replacement.send(JSON.stringify({ type: 'fingers', state: 0, thumb: false, seq: 0, t: 0 }))
  assert.deepEqual(await received, { type: 'fingers', state: 0, thumb: false, seq: 0, t: 0 })
})

test('Force Microscope forwards phone results and Reset without buffering finger events', async context => {
  const { computeArrivals } = await import('../src/timing.js')
  const server = startRelay(0, '127.0.0.1')
  context.after(async () => {
    for (const socket of server.clients) socket.terminate()
    await new Promise(resolve => server.close(resolve))
  })
  await once(server, 'listening')
  const url = `ws://127.0.0.1:${server.address().port}`
  const trainer = new WebSocket(url)
  await once(trainer, 'open')
  const registered = message(trainer, value => value.type === 'status')
  trainer.send(JSON.stringify({ role: 'trainer' }))
  await registered
  const phone = new WebSocket(url)
  await once(phone, 'open')
  const phoneRegistered = message(phone, value => value.type === 'status')
  phone.send(JSON.stringify({ role: 'controller' }))
  await phoneRegistered
  const first = message(trainer, value => value.type === 'fingers')
  phone.send(JSON.stringify({ type: 'fingers', state: 0, seq: 0, t: 0 }))
  assert.equal((await first).seq, 0)
  // Musical event arrives without waiting for the separate timing result.
  const musical = message(trainer, value => value.type === 'fingers')
  phone.send(JSON.stringify({ type: 'fingers', state: 3, seq: 1, t: 101.2, sentAt: 101.23456789, handlerAt: 101.21234567 }))
  const received = await musical
  assert.equal(received.state, 3)
  assert.equal(received.seq, 1)
  assert.equal(received.sentAt, 101.23456789)
  assert.equal(received.handlerAt, 101.21234567)
  const measurement = computeArrivals([{ finger: 'Middle', timestamp: 101.2 }, { finger: 'Index', timestamp: 100 }])
  const result = message(trainer, value => value.type === 'timing')
  phone.send(JSON.stringify({ type: 'timing', measurement }))
  assert.deepEqual((await result).measurement, measurement)
  const reset = message(phone, value => value.type === 'timing-reset')
  trainer.send(JSON.stringify({ type: 'timing-reset' }))
  await reset
  const cleared = message(trainer, value => value.type === 'timing')
  phone.send(JSON.stringify({ type: 'timing', measurement: computeArrivals([]) }))
  assert.deepEqual((await cleared).measurement, { arrivals: [], totalSpreadMs: 0 })
  const released = message(trainer, value => value.type === 'fingers')
  phone.send(JSON.stringify({ type: 'fingers', state: 0, seq: 2, t: 120 }))
  assert.equal((await released).seq, 2)
})
