export function computeArrivals(records) {
  if (!records || records.length === 0) return { arrivals: [], totalSpreadMs: 0 }
  const sorted = [...records].sort((a, b) => a.timestamp - b.timestamp)
  const t0 = sorted[0].timestamp
  const arrivals = sorted.map((r, i) => ({
    finger: r.finger,
    timestamp: r.timestamp,
    relativeMs: r.timestamp - t0,
    order: i + 1,
  }))
  const totalSpreadMs = sorted[sorted.length - 1].timestamp - t0
  return { arrivals, totalSpreadMs }
}

export function validTimingMeasurement(value) {
  const fingers = ['Index', 'Middle', 'Ring', 'Pinky']
  return Boolean(value && Array.isArray(value.arrivals) && value.arrivals.length <= 4
    && Number.isFinite(value.totalSpreadMs) && value.totalSpreadMs >= 0
    && value.arrivals.every((a, index) => a && fingers.includes(a.finger)
      && Number.isFinite(a.timestamp) && a.timestamp >= 0
      && Number.isFinite(a.relativeMs) && a.relativeMs >= 0 && a.order === index + 1)
    && new Set(value.arrivals.map(a => a.finger)).size === value.arrivals.length
    && value.totalSpreadMs === (value.arrivals.at(-1)?.relativeMs ?? 0))
}
