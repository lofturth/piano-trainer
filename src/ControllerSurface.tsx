import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { fingerAt, regions, thumbRadius, validCalibration } from './calibration.js'
import type { Point } from './calibration.js'
import { touchLocation, TouchTracker } from './touchscreen.js'
import type { Touchscreen } from './touchscreen.js'

const fingers = ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky']
const storageKey = 'piano-trainer.calibration.v2'
const fingerBit = (index: number) => index === 0 ? 4 : index - 1

function loadCalibration(): Point[] | null {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null')
    return validCalibration(saved) ? saved : null
  } catch { return null }
}

export default function ControllerSurface({ state, status, press, release, reset, onScreen, registerTouchReset }: {
  state: number
  status: string
  press: (pointer: number, finger: number, time: number, handlerAt: number) => void
  release: (pointer: number, time: number, handlerAt: number) => void
  reset: (time: number) => void
  onScreen: (screen: Touchscreen) => void
  registerTouchReset: (clear: () => void) => void
}) {
  const [centers, setCenters] = useState(loadCalibration)
  const [draft, setDraft] = useState<Point[]>([])
  const [notice, setNotice] = useState('')
  const [size, setSize] = useState({ width: 1, height: 1 })
  const surface = useRef<HTMLDivElement>(null)
  const pending = useRef<{ pointer: number; point: Point } | null>(null)
  const touches = useRef(new TouchTracker())
  const publish = useCallback(() => {
    const rect = surface.current?.getBoundingClientRect()
    if (rect && rect.width > 0 && rect.height > 0) {
      onScreen({ width: rect.width, height: rect.height, centers, touches: touches.current.snapshot() })
    }
  }, [centers, onScreen])
  const clearTouches = useCallback(() => {
    touches.current.clear()
    pending.current = null
    publish()
  }, [publish])

  useEffect(() => {
    registerTouchReset(clearTouches)
    return () => registerTouchReset(() => {})
  }, [registerTouchReset, clearTouches])

  useEffect(() => {
    const element = surface.current!
    const observer = new ResizeObserver(() => {
      const { width, height } = element.getBoundingClientRect()
      setSize({ width, height })
      clearTouches()
      reset(performance.now())
    })
    const cancel = () => { clearTouches() }
    observer.observe(element)
    document.addEventListener('visibilitychange', cancel)
    window.addEventListener('blur', cancel)
    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', cancel)
      window.removeEventListener('blur', cancel)
    }
  }, [reset, clearTouches])

  const down = (event: PointerEvent<HTMLDivElement>) => {
    const handlerAt = performance.now()
    if (event.pointerType === 'mouse' && event.button !== 0) return
    event.preventDefault()
    const rect = event.currentTarget.getBoundingClientRect()
    const point = touchLocation(event.clientX, event.clientY, rect)
    const finger = centers ? fingerAt(point, centers, rect.width, rect.height) : null
    event.currentTarget.setPointerCapture(event.pointerId)
    touches.current.start(event.pointerId, point, finger)
    publish()
    if (!centers) {
      if (!pending.current) pending.current = { pointer: event.pointerId, point }
      return
    }
    press(event.pointerId, finger!, event.timeStamp, handlerAt)
  }

  const move = (event: PointerEvent<HTMLDivElement>) => {
    const point = touchLocation(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect())
    if (touches.current.move(event.pointerId, point)) publish()
  }

  const end = (event: PointerEvent<HTMLDivElement>, commit = false) => {
    const handlerAt = performance.now()
    if (touches.current.end(event.pointerId)) publish()
    release(event.pointerId, event.timeStamp, handlerAt)
    if (pending.current?.pointer !== event.pointerId) return
    const { point } = pending.current
    pending.current = null
    if (!commit) return
    if (draft.some(other => Math.hypot((point.x - other.x) * size.width, (point.y - other.y) * size.height) < 24)) {
      setNotice('Choose a location farther from the previous fingers.')
      return
    }
    const next = [...draft, point]
    setDraft(next)
    setNotice('')
    if (next.length === 5) {
      setCenters(next)
      try { localStorage.setItem(storageKey, JSON.stringify(next)) }
      catch { setNotice('Calibration works, but could not be saved on this device.') }
    }
  }

  const calibrate = () => {
    clearTouches()
    reset(performance.now())
    pending.current = null
    setCenters(null)
    setDraft([])
    setNotice('')
  }
  const polygons = centers ? regions(centers.slice(1), size.width, size.height) : []
  const radius = centers ? thumbRadius(centers, size.width, size.height) : 0
  const thumbX = centers ? centers[0].x * size.width : 0
  const thumbY = centers ? centers[0].y * size.height : 0

  return <main className="controller-page">
    <div className="controller-toolbar">
      <button type="button" onClick={calibrate} aria-label="Calibrate" title="Calibrate">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
          <path d="M9.7 2.5h4.6l.6 2.4 1.6.9 2.4-.7 2.3 4-1.8 1.7v1.8l1.8 1.7-2.3 4-2.4-.7-1.6.9-.6 2.4H9.7l-.6-2.4-1.6-.9-2.4.7-2.3-4 1.8-1.7v-1.8L2.8 9.1l2.3-4 2.4.7 1.6-.9z" />
          <circle cx="12" cy="11.7" r="3.2" />
        </svg>
      </button>
      <span className="controller-status" role="status">{status}</span>
      <output aria-label="Pitch finger state">{(state & 15).toString(2).padStart(4, '0')}</output>
    </div>
    <div ref={surface} className="playing-surface" aria-label="Five-finger playing surface"
      onContextMenu={event => event.preventDefault()}
      onPointerDown={down} onPointerUp={event => end(event, true)}
      onPointerMove={move}
      onPointerCancel={event => end(event)} onLostPointerCapture={event => end(event)}>
      <svg viewBox={`0 0 ${size.width} ${size.height}`} preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <mask id="pitch-regions" maskUnits="userSpaceOnUse" x="0" y="0" width={size.width} height={size.height}>
            <rect width={size.width} height={size.height} fill="white" />
            <circle cx={thumbX} cy={thumbY} r={radius} fill="black" />
          </mask>
        </defs>
        <g mask="url(#pitch-regions)">
        {polygons.map((polygon, index) => <polygon key={fingers[index + 1]}
          data-finger={index} className={(state & (1 << index)) ? 'region held' : 'region'}
          points={polygon.map(point => `${point.x},${point.y}`).join(' ')} />)}
        </g>
        {centers && <circle cx={thumbX} cy={thumbY} r={radius} data-finger="4"
          className={(state & 16) ? 'region held' : 'region'} />}
      </svg>
      {(centers || draft).map((point, index) => <span key={fingers[index]} data-finger={fingerBit(index)}
        className={(state & (1 << fingerBit(index))) ? 'region-label held' : 'region-label'}
        style={{ left: `clamp(calc(env(safe-area-inset-left) + 32px), ${point.x * 100}%, calc(100% - env(safe-area-inset-right) - 32px))`, top: `clamp(calc(env(safe-area-inset-top) + 68px), ${point.y * 100}%, calc(100% - env(safe-area-inset-bottom) - 20px))` }}>
        <span className="finger-indicator" />{fingers[index]}</span>)}
      {!centers && <div className="calibration-guide" aria-live="polite">
        <strong>{draft.length + 1}/5 · Touch with your {fingers[draft.length]} finger</strong>
        <span>Rest your hand comfortably. Touch and lift one finger at a time.</span>
        <small>Safari: Share → Add to Home Screen for more playing space.</small>
      </div>}
      {notice && <p className="calibration-notice" role="status">{notice}</p>}
    </div>
  </main>
}
