export type Point = { x: number; y: number }
export function validCalibration(value: unknown): value is Point[]
export function nearestCenter(point: Point, centers: Point[], width: number, height: number): number
export function regions(centers: Point[], width: number, height: number): Point[][]
export function thumbRadius(centers: Point[], width: number, height: number): number
export function fingerAt(point: Point, centers: Point[], width: number, height: number): number
