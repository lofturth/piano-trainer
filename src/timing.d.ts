export type Finger = 'Index' | 'Middle' | 'Ring' | 'Pinky'

export interface FingerArrival {
  finger: Finger
  timestamp: number
  relativeMs: number
  order: number
}

export function computeArrivals(records: { finger: Finger; timestamp: number }[]): {
  arrivals: FingerArrival[]
  totalSpreadMs: number
}

export type TimingMeasurement = ReturnType<typeof computeArrivals>
export function validTimingMeasurement(value: unknown): value is TimingMeasurement
