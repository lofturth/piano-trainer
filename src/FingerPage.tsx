import { useCallback, useEffect, useRef, useState } from 'react'
import ControllerSurface from './ControllerSurface.tsx'
import type { MappingName } from './pitch-mapping.js'
import MidiPanel from './MidiPanel.tsx'
import PlayingView from './PlayingView.tsx'
import { appendPlayedNote } from './note-history.js'
import { validScreen } from './touchscreen.js'
import type { Touchscreen } from './touchscreen.js'
import './FingerPage.css'
import ConnectionPanel from './panels/ConnectionPanel.tsx'
import ControllerStatePanel from './panels/ControllerStatePanel.tsx'

export default function FingerPage({ controller }: { controller: boolean }) {
  const [state, setState] = useState(0)
  const [status, setStatus] = useState('Connecting to relay…')
  const [lastEvent, setLastEvent] = useState<{ seq: number; t: number } | null>(null)
  const [playingView, setPlayingView] = useState(false)
  const [history, setHistory] = useState<string[]>([])
  const [baseOctave, setBaseOctave] = useState(4)
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
  const recordNote = useCallback((note: string) => {
    setHistory(previous => appendPlayedNote(previous, note))
  }, [])
  const pointers = useRef(new Map<number, number>())
  const current = useRef(0)
  const transmit = useRef<(state: number, time: number) => void>(() => {})
  const midiReceive = useRef<(state: number, thumb?: boolean) => void>(() => {})
  const registerMidi = useCallback((receive: (state: number, thumb?: boolean) => void) => { midiReceive.current = receive }, [])

  useEffect(() => {
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
      setScreen(null)
    }
    const connect = () => {
      if (disposed || document.hidden) return
      clear()
      sequence = 0
      receivedAt = performance.now()
      setStatus('Connecting to relay…')
      const connection = new WebSocket(`ws://${location.hostname || 'localhost'}:8765`)
      socket = connection
      connection.onopen = () => {
        if (disposed || socket !== connection) return connection.close()
        clear()
        connection.send(JSON.stringify({ role: controller ? 'controller' : 'trainer' }))
        if (controller) transmit.current(0, performance.now())
      }
      connection.onmessage = event => {
        if (socket !== connection) return
        let message
        try { message = JSON.parse(event.data) } catch { return }
        receivedAt = performance.now()
        if (message.type === 'status') {
          setStatus(message.controllerConnected ? 'Controller connected' : 'Relay connected · waiting for controller')
          if (!controller && !message.controllerConnected) clear()
        } else if (!controller && message.type === 'fingers') {
          midiReceive.current(message.state, message.thumb)
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
        setStatus(event.code === 1008 ? `Rejected: ${event.reason}` : 'Disconnected · reconnecting…')
        if (event.code !== 1008) retry = setTimeout(connect, 1000)
      }
    }
    transmit.current = (value, time) => {
      if (socket?.readyState !== WebSocket.OPEN) return
      if (socket.bufferedAmount > 65536) {
        clear()
        setStatus('Connection stalled · reconnecting…')
        socket.close()
        return
      }
      if (screenTimer.current !== null) clearTimeout(screenTimer.current)
      screenTimer.current = null
      const message = { type: 'fingers', state: value & 15, thumb: Boolean(value & 16), seq: sequence++, t: time,
        ...(screenRef.current ? { screen: screenRef.current } : {}) }
      socket.send(JSON.stringify(message))
      setLastEvent(message)
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
      if (screenTimer.current !== null) clearTimeout(screenTimer.current)
      screenTimer.current = null
    }
  }, [controller])

  const update = useCallback((pointer: number, time: number, finger?: number) => {
    if (finger !== undefined) pointers.current.set(pointer, finger)
    else pointers.current.delete(pointer)
    let next = 0
    for (const bit of pointers.current.values()) next |= 1 << bit
    if (next === current.current) return
    current.current = next
    setState(next)
    transmit.current(next, time)
  }, [])
  const press = useCallback((pointer: number, finger: number, time: number) => update(pointer, time, finger), [update])
  const reset = useCallback((time: number) => {
    clearTouches.current()
    pointers.current.clear()
    if (current.current !== 0) {
      current.current = 0
      setState(0)
      transmit.current(0, time)
    }
  }, [])

  if (controller) return <ControllerSurface state={state} status={status} press={press} release={update} reset={reset}
    onScreen={onScreen} registerTouchReset={registerTouchReset} />

  return <main className={playingView ? 'finger-page playing-mode' : 'finger-page'}>
    <nav><a href="/">Starter</a> · <a href={controller ? '/trainer' : '/controller'}>{controller ? 'Trainer' : 'Controller'}</a> · <a href="/melody-trainer">Melody Trainer</a></nav>
    <h1>{controller ? 'Phone controller' : 'Piano trainer'}</h1>
    <div className="trainer-view-switch" role="group" aria-label="Trainer view">
      <button type="button" aria-pressed={!playingView} onClick={() => setPlayingView(false)}>Trainer</button>
      <button type="button" aria-pressed={playingView} onClick={() => setPlayingView(true)}>Playing View</button>
    </div>
    <div hidden={!playingView}><PlayingView history={history} fingerState={state & 15} thumb={Boolean(state & 16)} screen={screen}
      baseOctave={baseOctave} onBaseOctave={setBaseOctave} mapping={mapping} onMapping={setMapping} /></div>
    <div hidden={playingView}>
      <div className="trainer-panels">
        <ConnectionPanel status={status} lastEvent={lastEvent} />
        <ControllerStatePanel fingerState={state & 15} thumb={Boolean(state & 16)} baseOctave={baseOctave} mapping={mapping} />
        <MidiPanel register={registerMidi} onNoteOn={recordNote} baseOctave={baseOctave} mapping={mapping} />
      </div>
    </div>
  </main>
}
