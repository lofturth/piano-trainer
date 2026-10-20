import type { Point } from './calibration.js'
export type Touch = Point & { id: number; finger: number | null }
export type Touchscreen = { width: number; height: number; centers: Point[] | null; touches: Touch[] }
export function validScreen(screen: unknown): screen is Touchscreen
export function touchLocation(clientX: number, clientY: number, rect: { left: number; top: number; width: number; height: number }): Point
export function touchStatus(touch: Touch, screen: Touchscreen): 'outside' | 'assigned' | 'crossed'
export class TouchTracker {
  start(id: number, point: Point, finger: number | null): void
  move(id: number, point: Point): boolean
  end(id: number): boolean
  clear(): void
  snapshot(): Touch[]
}
