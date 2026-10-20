import { useCallback, useEffect, useRef, useState } from 'react'
import ControllerSurface from './ControllerSurface.tsx'
import './FingerPage.css'

const fingers = ['Index', 'Middle', 'Ring', 'Pinky']

export default function FingerPage({ controller }: { controller: boolean }) {
  const [state, setState] = useState(0)
  const [status, setStatus] = useState('Connecting to relay…')
  const [lastEvent, setLastEvent] = useState<{ seq: number; t: number } | null>(null)
  const pointers = useRef(new Map<number, number>())
  const current = useRef(0)
  const transmit = useRef<(state: number, time: number) => void>(() => {})

  useEffect(() => {
    let socket: WebSocket | null = null
    let retry: ReturnType<typeof setTimeout>
    let disposed = false
    let sequence = 0
    let receivedAt = performance.now()
    const clear = () => {
      pointers.current.clear()
      current.current = 0
      setState(0)
      setLastEvent(null)
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
          setState(message.state | (message.thumb ? 16 : 0))
          setLastEvent({ seq: message.seq, t: message.t })
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
      const message = { type: 'fingers', state: value & 15, thumb: Boolean(value & 16), seq: sequence++, t: time }
      socket.send(JSON.stringify(message))
      setLastEvent(message)
    }
    const suspend = () => {
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
    pointers.current.clear()
    if (current.current !== 0) {
      current.current = 0
      setState(0)
      transmit.current(0, time)
    }
  }, [])

  if (controller) return <ControllerSurface state={state} status={status} press={press} release={update} reset={reset} />

  return <main className="finger-page">
    <nav><a href="/">Starter</a> · <a href={controller ? '/trainer' : '/controller'}>{controller ? 'Trainer' : 'Controller'}</a></nav>
    <h1>{controller ? 'Phone controller' : 'Piano trainer'}</h1>
    <p role="status">{status}</p>
    <output className="finger-state" aria-label="Finger state">{(state & 15).toString(2).padStart(4, '0')}</output>
    <p>Bits: Pinky · Ring · Middle · Index (Index = bit 0)</p>
    <div className="finger-zones">
      {fingers.map((finger, index) => <div key={finger} className={(state & (1 << index)) ? 'held' : ''}>{finger}</div>)}
    </div>
    <p className={(state & 16) ? 'trainer-thumb held' : 'trainer-thumb'}>Thumb: {(state & 16) ? 'pressed' : 'released'}</p>
    <p>{lastEvent ? `Sequence ${lastEvent.seq} · phone time ${lastEvent.t.toFixed(1)} ms` : 'No finger event in this connection'}</p>
    <p>{controller ? 'Hold multiple zones. Lift all fingers after reconnecting.' : 'Open /controller on your phone using this Mac’s LAN IP.'}</p>
  </main>
}
