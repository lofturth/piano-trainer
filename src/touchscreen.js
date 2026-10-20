import { fingerAt, validCalibration } from './calibration.js'

export function validScreen(screen) {
  return Boolean(screen && Number.isFinite(screen.width) && screen.width > 0 && screen.width <= 10000
    && Number.isFinite(screen.height) && screen.height > 0 && screen.height <= 10000
    && (screen.centers === null || validCalibration(screen.centers))
    && Array.isArray(screen.touches) && screen.touches.length <= 10
    && screen.touches.every(touch => touch && Number.isSafeInteger(touch.id)
      && Number.isFinite(touch.x) && Number.isFinite(touch.y)
      && (touch.finger === null || (Number.isInteger(touch.finger) && touch.finger >= 0 && touch.finger <= 4)))
    && new Set(screen.touches.map(touch => touch.id)).size === screen.touches.length)
}

export function touchLocation(clientX, clientY, rect) {
  return { x: (clientX - rect.left) / rect.width, y: (clientY - rect.top) / rect.height }
}

export function touchStatus(touch, screen) {
  if (!screen.centers || touch.x < 0 || touch.x > 1 || touch.y < 0 || touch.y > 1) return 'outside'
  return touch.finger === fingerAt(touch, screen.centers, screen.width, screen.height) ? 'assigned' : 'crossed'
}

export class TouchTracker {
  constructor() { this.touches = new Map() }
  start(id, point, finger) { this.touches.set(id, { id, ...point, finger }) }
  move(id, point) {
    const touch = this.touches.get(id)
    if (!touch || (touch.x === point.x && touch.y === point.y)) return false
    this.touches.set(id, { ...touch, ...point })
    return true
  }
  end(id) { return this.touches.delete(id) }
  clear() { this.touches.clear() }
  snapshot() { return [...this.touches.values()] }
}
