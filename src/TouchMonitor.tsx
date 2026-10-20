import { regions, thumbRadius } from './calibration.js'
import { touchStatus } from './touchscreen.js'
import type { Touchscreen } from './touchscreen.js'

const names = ['Index', 'Middle', 'Ring', 'Pinky', 'Thumb']

export default function TouchMonitor({ screen, fingerState, thumb }: { screen: Touchscreen | null; fingerState: number; thumb: boolean }) {
  if (!screen) return <section className="screen-monitor"><h2>Touchscreen</h2><p>Waiting for phone geometry…</p></section>
  const { width, height, centers, touches } = screen
  const polygons = centers ? regions(centers.slice(1), width, height) : []
  const radius = centers ? thumbRadius(centers, width, height) : 0
  const thumbX = centers ? centers[0].x * width : 0
  const thumbY = centers ? centers[0].y * height : 0
  const margin = width * 0.06
  const left = Math.min(0, ...touches.map(touch => touch.x * width)) - margin
  const top = Math.min(0, ...touches.map(touch => touch.y * height)) - margin
  const right = Math.max(width, ...touches.map(touch => touch.x * width)) + margin
  const bottom = Math.max(height, ...touches.map(touch => touch.y * height)) + margin
  const portrait = height > width
  return <section className="screen-monitor" aria-label="Live touchscreen monitor">
    <div><h2>Touchscreen</h2><p>{touches.length} touches · {thumb ? 'Thumb held ↑12' : 'Thumb up'}</p></div>
    <svg className="touch-monitor" viewBox={portrait ? `${-bottom} ${left} ${bottom - top} ${right - left}` : `${left} ${top} ${right - left} ${bottom - top}`}
      style={{ aspectRatio: portrait ? `${height} / ${width}` : `${width} / ${height}` }} role="img" aria-label="Actual phone regions and current touch positions">
      <defs>
        <mask id="monitor-pitch-regions" maskUnits="userSpaceOnUse" x="0" y="0" width={width} height={height}>
          <rect width={width} height={height} fill="white" />
          <circle cx={thumbX} cy={thumbY} r={radius} fill="black" />
        </mask>
        <clipPath id="monitor-area"><rect width={width} height={height} /></clipPath>
      </defs>
      <g transform={portrait ? 'rotate(90)' : undefined}>
      <rect width={width} height={height} fill="#15122c" stroke="currentColor" strokeWidth="2" />
      <g mask="url(#monitor-pitch-regions)">
        {polygons.map((polygon, index) => <polygon key={index} data-finger={index}
          className={(fingerState & (1 << index)) ? 'region held' : 'region'}
          points={polygon.map(point => `${point.x},${point.y}`).join(' ')} />)}
      </g>
      {centers && <g clipPath="url(#monitor-area)">
        <circle cx={thumbX} cy={thumbY} r={radius} data-finger="4" className={thumb ? 'region held' : 'region'} />
        {centers.map((center, index) => <text key={index} x={center.x * width} y={center.y * height}
          fontSize={width * 0.055} fill="white" textAnchor="middle" dominantBaseline="middle">{index === 0 ? 'T' : names[index - 1][0]}</text>)}
      </g>}
      {touches.map(touch => <circle key={touch.id} cx={touch.x * width} cy={touch.y * height}
        r={width * 0.035} className={`touch-marker ${touchStatus(touch, screen)}`}>
        <title>{touch.finger === null ? 'Unassigned' : names[touch.finger]} · {touchStatus(touch, screen)} · pointer {touch.id}</title>
      </circle>)}
      </g>
    </svg>
    <p className="touch-legend">White: assigned · Amber: crossed boundary · Red: outside/no calibration</p>
  </section>
}
