import { useCallback, useEffect, useRef, useState } from 'react'
import ControllerSurface from './ControllerSurface.tsx'
import FingerTimingTest from './FingerTimingTest.tsx'
import { computeArrivals, validTimingMeasurement } from './timing.js'
import type { Finger, TimingMeasurement } from './timing.js'
import type { MappingName } from './pitch-mapping.js'
import MidiPanel from './MidiPanel.tsx'
import type { MidiEvent } from './midi-output.js'
import type { GroupingMode } from './finger-grouping.js'
import { initialMidiTrace, appendFingerTrace, appendTraceMidi } from './midi-trace.js'
import PlayingView from './PlayingView.tsx'
import { appendPlayedNote } from './note-history.js'
import { validScreen } from './touchscreen.js'
import type { Touchscreen } from './touchscreen.js'
import './FingerPage.css'
import ConnectionPanel from './panels/ConnectionPanel.tsx'
import ControllerStatePanel from './panels/ControllerStatePanel.tsx'
import MelodyTrainerSurface from './MelodyTrainerSurface.tsx'
import { createNoteEvents } from './note-events.js'

export default function FingerPage({ controller }: { controller: boolean }) {
  const [state, setState] = useState(0)
  const [status, setStatus] = useState('Connecting to relay…')
  const [lastEvent, setLastEvent] = useState<{ seq: number; t: number } | null>(null)
  const [surface, setSurface] = useState<'trainer' | 'playing' | 'melody' | 'force'>(() =>
    location.pathname === '/force-microscope' ? 'force' : location.pathname === '/melody-trainer' ? 'melody' : 'trainer')
  const [melodyMounted, setMelodyMounted] = useState(() => location.pathname === '/melody-trainer')
  const [noteEvents] = useState(createNoteEvents)
  const [history, setHistory] = useState<string[]>([])
  const [baseOctave, setBaseOctave] = useState(4)
  const [groupingWindow, setGroupingWindow] = useState(0)
  const [groupingMode, setGroupingMode] = useState<GroupingMode>('fixed')
  const cancelPendingMidi = useRef<() => void>(() => {})
  const registerMidiCancel = useCallback((cancel: () => void) => { cancelPendingMidi.current = cancel }, [])
  const [mapping, setMapping] = useState<MappingName>('Finger Roll')
  const [screen, setScreen] = useState<Touchscreen | null>(null)
  const screenRef = useRef<Touchscreen | null>(null)
  const screenTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sendScreen = useRef<() => void>(() => {})
  const clearTouches = useRef<() => void>(() => {})
  const registerTouchReset = useCallback((clear: () => void) => { clearTouches.current = clear }, [])
  const onScreen = useCallback((value: Touchscreen) => {
    screenRef.current = value
    if (screenTimer.current === null) screenTimer.current = setTimeout(() => {
      screenTimer.current = null
      sendScreen.current()
    }, 34)
  }, [])
  const recordNote = useCallback((note: string, midi: number) => {
    setHistory(previous => appendPlayedNote(previous, note))
    noteEvents.emit(midi)
  }, [noteEvents])
  const [timing, setTiming] = useState<TimingMeasurement>(() => computeArrivals([]))
  const timingTouches = useRef<{ finger: Finger; timestamp: number }[]>([])
  const sendTiming = useRef<(measurement: TimingMeasurement) => void>(() => {})
  const requestTimingReset = useRef<() => void>(() => {})
  const [midiTrace, setMidiTrace] = useState(initialMidiTrace)
  const [midiEvents, setMidiEvents] = useState<(MidiEvent & { relativeMs: number })[]>([])
  const midiStartedAt = useRef<number | null>(null)
  const recordMidiEvent = useCallback((event: MidiEvent) => {
    if (midiStartedAt.current === null) midiStartedAt.current = event.timestamp
    const entry = { ...event, relativeMs: event.timestamp - midiStartedAt.current }
    setMidiEvents(previous => [...previous.slice(-14), entry])
    setMidiTrace(previous => appendTraceMidi(previous, event))
  }, [])
  const pointers = useRef(new Map<number, number>())
  const current = useRef(0)
  const transmit = useRef<(state: number, time: number, handlerAt?: number) => void>(() => {})
  const midiReceive = useRef<(state: number, thumb?: boolean, seq?: number) => void>(() => {})
  const registerMidi = useCallback((receive: (state: number, thumb?: boolean, seq?: number) => void) => { midiReceive.current = receive }, [])

  useEffect(() => {
    if (!controller && location.pathname === '/melody-trainer') {
      window.history.replaceState(null, '', '/trainer')
    }
  }, [controller])

  const selectSurface = (next: typeof surface) => {
    setSurface(next)
    if (next === 'melody') setMelodyMounted(true)
  }

  useEffect(() => {
    // Keep reconnecting to the page's saved hostname, never a resolved numeric IP.
    const relayUrl = `ws://${location.hostname || 'localhost'}:8765`
    let attemptedConnection = false
    let socket: WebSocket | null = null
    let retry: ReturnType<typeof setTimeout>
    let disposed = false
    let sequence = 0
    let receivedAt = performance.now()
    const clear = () => {
      midiReceive.current(0)
      clearTouches.current()
      pointers.current.clear()
      current.current = 0
      setState(0)
      setLastEvent(null)
      timingTouches.current = []
      setMidiTrace(initialMidiTrace())
      setTiming(computeArrivals([]))
      setScreen(null)
    }
    const connect = () => {
      if (disposed || document.hidden) return
      clear()
      sequence = 0
      receivedAt = performance.now()
      setStatus(attemptedConnection ? 'Disconnected · waiting for server · reconnecting automatically…' : 'Connecting to relay…')
      attemptedConnection = true
      const connection = new WebSocket(relayUrl)
      socket = connection
      connection.onopen = () => {
        if (disposed || socket !== connection) return connection.close()
        clear()
        connection.send(JSON.stringify({ role: controller ? 'controller' : 'trainer' }))
        if (controller) transmit.current(0, performance.now())
      }
      connection.onmessage = event => {
        const macReceivedAt = performance.now()
        if (socket !== connection) return
        let message
        try { message = JSON.parse(event.data) } catch { return }
        receivedAt = performance.now()
        if (controller && message.type === 'timing-reset') {
          timingTouches.current = []
          sendTiming.current(computeArrivals([]))
        } else if (!controller && message.type === 'timing' && validTimingMeasurement(message.measurement)) {
          setTiming(message.measurement)
        } else if (message.type === 'status') {
          setStatus(message.controllerConnected ? 'Controller connected' : 'Relay connected · waiting for controller')
          if (!controller && !message.controllerConnected) clear()
        } else if (!controller && message.type === 'fingers') {
          midiReceive.current(message.state, message.thumb, message.seq)
          setMidiTrace(previous => appendFingerTrace(previous, message, macReceivedAt))
          if (validScreen(message.screen)) setScreen(message.screen)
          setState(message.state | (message.thumb ? 16 : 0))
          setLastEvent({ seq: message.seq, t: message.t })
        } else if (!controller && message.type === 'touches' && validScreen(message.screen)) {
          setScreen(message.screen)
        }
      }
      connection.onerror = () => connection.close()
      connection.onclose = event => {
        if (socket !== connection || disposed) return
        socket = null
        clear()
        setStatus(event.code === 1008 ? `Rejected: ${event.reason}` : 'Disconnected · waiting for server · reconnecting automatically…')
        if (event.code !== 1008) retry = setTimeout(connect, 1000)
      }
    }
    transmit.current = (value, time, handlerAt) => {
      if (socket?.readyState !== WebSocket.OPEN) return
      if (socket.bufferedAmount > 65536) {
        clear()
        setStatus('Connection stalled · reconnecting…')
        socket.close()
        return
      }
      if (screenTimer.current !== null) clearTimeout(screenTimer.current)
      screenTimer.current = null
      const message = { type: 'fingers', state: value & 15, thumb: Boolean(value & 16), seq: sequence++, t: time, handlerAt, sentAt: 0,
        ...(screenRef.current ? { screen: screenRef.current } : {}) }
      message.sentAt = performance.now()
      socket.send(JSON.stringify(message))
      setLastEvent(message)
    }
    sendTiming.current = measurement => {
      if (controller && socket?.readyState === WebSocket.OPEN && socket.bufferedAmount < 65536) {
        socket.send(JSON.stringify({ type: 'timing', measurement }))
      }
    }
    requestTimingReset.current = () => {
      if (!controller && socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'timing-reset' }))
      }
    }
    sendScreen.current = () => {
      if (controller && socket?.readyState === WebSocket.OPEN && socket.bufferedAmount < 65536 && screenRef.current) {
        socket.send(JSON.stringify({ type: 'touches', screen: screenRef.current }))
      }
    }
    const suspend = () => {
      clearTouches.current()
      if (controller && current.current !== 0) transmit.current(0, performance.now())
      clear()
      clearTimeout(retry)
      const previous = socket
      socket = null
      previous?.close()
      setStatus('Paused · return to reconnect')
    }
    const visibility = () => {
      if (document.hidden) suspend()
      else { suspend(); connect() }
    }
    const blur = () => {
      if (!controller) return
      clearTouches.current()
      pointers.current.clear()
      if (current.current !== 0) transmit.current(0, performance.now())
      current.current = 0
      setState(0)
    }
    document.addEventListener('visibilitychange', visibility)
    window.addEventListener('pagehide', suspend)
    window.addEventListener('pageshow', visibility)
    window.addEventListener('blur', blur)
    const timer = setInterval(() => {
      if (socket && performance.now() - receivedAt > 4500) {
        suspend()
        connect()
      } else if (controller && socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'heartbeat' }))
      }
    }, 1000)
    connect()
    return () => {
      disposed = true
      clearTimeout(retry)
      clearInterval(timer)
      document.removeEventListener('visibilitychange', visibility)
      window.removeEventListener('pagehide', suspend)
      window.removeEventListener('pageshow', visibility)
      window.removeEventListener('blur', blur)
      socket?.close()
      transmit.current = () => {}
      sendScreen.current = () => {}
      sendTiming.current = () => {}
      requestTimingReset.current = () => {}
      if (screenTimer.current !== null) clearTimeout(screenTimer.current)
      screenTimer.current = null
    }
  }, [controller])

  const update = useCallback((pointer: number, time: number, finger?: number, handlerAt?: number) => {
    if (finger !== undefined) pointers.current.set(pointer, finger)
    else pointers.current.delete(pointer)
    let next = 0
    for (const bit of pointers.current.values()) next |= 1 << bit
    if (next === current.current) return
    current.current = next
    setState(next)
    transmit.current(next, time, handlerAt)
  }, [])
  const press = useCallback((pointer: number, finger: number, time: number, handlerAt: number) => {
    update(pointer, time, finger, handlerAt) // Musical event is sent first, without waiting for measurement work.
    const name = (['Index', 'Middle', 'Ring', 'Pinky'] as const)[finger]
    if (!name || timingTouches.current.some(touch => touch.finger === name)) return
    timingTouches.current.push({ finger: name, timestamp: time })
    sendTiming.current(computeArrivals(timingTouches.current))
  }, [update])
  const release = useCallback((pointer: number, time: number, handlerAt: number) => update(pointer, time, undefined, handlerAt), [update])
  const reset = useCallback((time: number) => {
    clearTouches.current()
    pointers.current.clear()
    if (current.current !== 0) {
      current.current = 0
      setState(0)
      transmit.current(0, time)
    }
  }, [])

  if (controller) return <ControllerSurface state={state} status={status} press={press} release={release} reset={reset}
    onScreen={onScreen} registerTouchReset={registerTouchReset} />

  return <main className={surface === 'trainer' ? 'finger-page' : 'finger-page playing-mode'}>
    <nav><a href="/">Starter</a> · <a href={controller ? '/trainer' : '/controller'}>{controller ? 'Trainer' : 'Controller'}</a></nav>
    <h1>{controller ? 'Phone controller' : 'Piano trainer'}</h1>
    <div className="trainer-view-switch" role="group" aria-label="Trainer view">
      <button type="button" aria-pressed={surface === 'trainer'} onClick={() => selectSurface('trainer')}>Trainer</button>
      <button type="button" aria-pressed={surface === 'playing'} onClick={() => selectSurface('playing')}>Playing View</button>
      <button type="button" aria-pressed={surface === 'melody'} onClick={() => selectSurface('melody')}>Melody Trainer</button>
      <button type="button" aria-pressed={surface === 'force'} onClick={() => selectSurface('force')}>Force Microscope</button>
    </div>
    <div className="finger-group-controls" role="group" aria-label="Finger-state grouping">
      <label>Settling window <select value={groupingWindow} onChange={event => setGroupingWindow(Number(event.target.value))}>
        {[0, 8, 16, 24, 40].map(ms => <option key={ms} value={ms}>{ms} ms{ms === 0 ? ' (off)' : ''}</option>)}
      </select></label>
      <label>Mode <select value={groupingMode} onChange={event => setGroupingMode(event.target.value as GroupingMode)}>
        <option value="fixed">Fixed</option><option value="restarting">Restarting</option>
      </select></label>
    </div>
    {surface === 'force' && <FingerTimingTest measurement={timing} fingerState={state & 15}
      midiEvents={midiEvents} traceRows={midiTrace.rows}
      onReset={() => { cancelPendingMidi.current(); setTiming(computeArrivals([])); setMidiEvents([]); midiStartedAt.current = null; setMidiTrace(previous => initialMidiTrace(previous.previousState)); requestTimingReset.current() }} />}
    <div hidden={surface !== 'playing'}><PlayingView history={history} fingerState={state & 15} thumb={Boolean(state & 16)} screen={screen}
      baseOctave={baseOctave} onBaseOctave={setBaseOctave} mapping={mapping} onMapping={setMapping} /></div>
    <div hidden={surface !== 'trainer'}>
      <div className="trainer-panels">
        <ConnectionPanel status={status} lastEvent={lastEvent} />
        <ControllerStatePanel fingerState={state & 15} thumb={Boolean(state & 16)} baseOctave={baseOctave} mapping={mapping} />
        <MidiPanel register={registerMidi} registerCancel={registerMidiCancel} groupingWindow={groupingWindow} groupingMode={groupingMode} onNoteOn={recordNote} onMidiEvent={recordMidiEvent} baseOctave={baseOctave} mapping={mapping} />
      </div>
    </div>
    <div hidden={surface !== 'melody'}>
      {melodyMounted && <MelodyTrainerSurface subscribeNoteOn={surface === 'melody' ? noteEvents.subscribe : undefined}
        screen={screen} fingerState={state & 15} thumb={Boolean(state & 16)} baseOctave={baseOctave} mapping={mapping}
        onPracticeReset={() => cancelPendingMidi.current()} />}
    </div>
  </main>
}
