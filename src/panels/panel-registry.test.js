import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createElement, Fragment } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

let server
let registry
let PlayingView
const settings = { mapping: 'Finger Roll', baseOctave: 4, onMapping() {}, onBaseOctave() {} }
const screen = { width: 390, height: 750,
  centers: [{ x: 0.15, y: 0.8 }, { x: 0.2, y: 0.4 }, { x: 0.4, y: 0.3 }, { x: 0.6, y: 0.35 }, { x: 0.8, y: 0.45 }],
  touches: [{ id: 1, x: 0.2, y: 0.4, finger: 0 }] }
const fixtures = {
  P01: settings,
  P02: { note: 'C#5' },
  P03: { fingerState: 1, thumb: true },
  P04: { screen: null, fingerState: 0, thumb: false },
  P05: { history: ['C4', 'C4', 'D4'] },
  P06: { ...settings, fingerState: 5, thumb: false },
  P07: { status: 'Controller connected', lastEvent: { seq: 12, t: 125 } },
  P08: { ...settings, fingerState: 5, thumb: true },
  P09: { ...settings, register() {}, onNoteOn() {} },
  P10: {},
}

before(async () => {
  server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false, ws: false, watch: null } })
  registry = (await server.ssrLoadModule('/src/panels/panel-registry.ts')).panelRegistry
  PlayingView = (await server.ssrLoadModule('/src/PlayingView.tsx')).default
})
after(async () => { await server?.close() })

test('registry panels render independently with stable unique IDs and visible names', () => {
  assert.deepEqual(registry.map(panel => panel.id), ['P01', 'P02', 'P03', 'P04', 'P05', 'P06', 'P07', 'P08', 'P09', 'P10'])
  for (const { id, name, component } of registry) {
    const html = renderToStaticMarkup(createElement(component, fixtures[id]))
    assert.ok(html.includes(`data-panel-id="${id}"`))
    assert.ok(html.includes(`<h2>${name}</h2>`))
    assert.ok(html.includes('class="instrument-panel'))
  }
})

test('Playing View composes existing panels without losing history, live state or mapping reference', () => {
  const html = renderToStaticMarkup(createElement(PlayingView, {
    ...settings, fingerState: 5, thumb: true, screen: null, history: ['C4', 'C4', 'D4'],
  }))
  assert.equal((html.match(/data-panel-id=/g) || []).length, 6)
  assert.ok(html.includes('Index pressed'))
  assert.ok(html.includes('Middle released'))
  assert.ok(html.includes('Thumb: held · octave +12'))
  assert.ok(html.includes('<li>C4</li><li>C4</li><li>D4</li>'))
  assert.ok(html.includes('C#5'))
  assert.ok(html.includes('aria-current="true"'))
})

test('reference respects Candidate 1, and controller state uses the same octave mapping', () => {
  const reference = registry.find(panel => panel.id === 'P06').component
  const html = renderToStaticMarkup(createElement(reference, { ...settings, mapping: 'Candidate 1', fingerState: 4, thumb: false }))
  assert.equal((html.match(/class="fingering-card /g) || []).length, 7)
  assert.ok(!html.includes('class="fingering-card chromatic'))
  const rawState = registry.find(panel => panel.id === 'P08').component
  const stateHtml = renderToStaticMarkup(createElement(rawState, fixtures.P08))
  assert.ok(stateHtml.includes('C#5'))
  assert.ok(stateHtml.includes('>0101</output>'))
})

test('touchscreen panels retain actual geometry and allow multiple instances without SVG ID collisions', () => {
  const component = registry.find(panel => panel.id === 'P04').component
  const props = { screen, fingerState: 1, thumb: false }
  const html = renderToStaticMarkup(createElement(Fragment, null, createElement(component, props), createElement(component, props)))
  const ids = [...html.matchAll(/(?:mask|clipPath) id="([^"]+)"/g)].map(match => match[1])
  assert.equal(ids.length, 4)
  assert.equal(new Set(ids).size, 4)
  assert.ok(html.includes('touch-marker assigned'))
  assert.ok(html.includes('rotate(90)'))
})

test('P10 renders a standalone visual-only demonstration with two fixed ten-note rows', () => {
  const component = registry.find(panel => panel.id === 'P10').component
  const html = renderToStaticMarkup(createElement(component))
  assert.equal((html.match(/class="melody-row"/g) || []).length, 2)
  assert.equal((html.match(/<li(?: |>|\n)/g) || []).length, 20)
  assert.ok(html.includes('1: C4'))
  assert.ok(html.includes('10: G♯4'))
  assert.ok(html.includes('11: A4'))
  assert.ok(html.includes('20: F♯4'))
  assert.ok(html.includes('aria-current="step"'))
  assert.ok(html.includes('Play next note'))
  assert.ok(html.includes('Reset'))
})
