export function validCalibration(value) {
  return Array.isArray(value) && value.length === 5
    && value.every(point => point && Number.isFinite(point.x) && Number.isFinite(point.y)
      && point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1)
    && value.every((point, index) => value.slice(0, index).every(other =>
      Math.hypot(point.x - other.x, point.y - other.y) > 0.001))
}

export function thumbRadius(centers, width, height) {
  const thumb = centers[0]
  const spacing = Math.min(...centers.slice(1).map(center =>
    Math.hypot((thumb.x - center.x) * width, (thumb.y - center.y) * height)))
  return 1.5 * Math.min(48, Math.min(width, height) * 0.14, spacing * 0.45)
}

export function fingerAt(point, centers, width, height) {
  const thumb = centers[0]
  return Math.hypot((point.x - thumb.x) * width, (point.y - thumb.y) * height)
    <= thumbRadius(centers, width, height)
    ? 4 : nearestCenter(point, centers.slice(1), width, height)
}

export function nearestCenter(point, centers, width, height) {
  let nearest = 0
  let distance = Infinity
  centers.forEach((center, index) => {
    const candidate = ((point.x - center.x) * width) ** 2 + ((point.y - center.y) * height) ** 2
    if (candidate < distance) {
      nearest = index
      distance = candidate
    }
  })
  return nearest
}

export function regions(centers, width, height) {
  const pixels = centers.map(center => ({ x: center.x * width, y: center.y * height }))
  return pixels.map((center, index) => {
    let polygon = [{ x: 0, y: 0 }, { x: width, y: 0 }, { x: width, y: height }, { x: 0, y: height }]
    pixels.forEach((other, otherIndex) => {
      if (index === otherIndex) return
      const normalX = other.x - center.x
      const normalY = other.y - center.y
      const limit = (other.x ** 2 + other.y ** 2 - center.x ** 2 - center.y ** 2) / 2
      const side = point => point.x * normalX + point.y * normalY - limit
      const clipped = []
      polygon.forEach((start, edge) => {
        const end = polygon[(edge + 1) % polygon.length]
        const startSide = side(start)
        const endSide = side(end)
        if (startSide <= 0) clipped.push(start)
        if ((startSide <= 0) !== (endSide <= 0)) {
          const fraction = startSide / (startSide - endSide)
          clipped.push({ x: start.x + (end.x - start.x) * fraction, y: start.y + (end.y - start.y) * fraction })
        }
      })
      polygon = clipped
    })
    return polygon
  })
}
