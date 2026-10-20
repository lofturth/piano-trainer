import test from 'node:test'
import assert from 'node:assert/strict'
import { fingerAt, nearestCenter, regions, thumbRadius, validCalibration } from './calibration.js'

test('saved calibration rejects malformed and duplicate centers', () => {
  const valid = [{ x: 0.5, y: 0.5 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }]
  assert.equal(validCalibration(valid), true)
  for (const invalid of [null, {}, [], valid.slice(1), [...valid.slice(1), valid[1]],
    [null, ...valid.slice(1)], [{ x: NaN, y: 0 }, ...valid.slice(1)],
    [{ x: 2, y: 0 }, ...valid.slice(1)]]) {
    assert.equal(validCalibration(invalid), false)
  }
})

test('thumb stays compact while pitch centers retain their original bit identities', () => {
  const centers = [{ x: 0.15, y: 0.8 }, { x: 0.2, y: 0.4 }, { x: 0.4, y: 0.3 },
    { x: 0.6, y: 0.35 }, { x: 0.8, y: 0.45 }]
  for (const [width, height] of [[390, 750], [750, 390]]) {
    const radius = thumbRadius(centers, width, height)
    assert.ok(radius > 0 && radius <= 72)
    const spacing = Math.min(...centers.slice(1).map(center =>
      Math.hypot((centers[0].x - center.x) * width, (centers[0].y - center.y) * height)))
    assert.equal(radius, 1.5 * Math.min(48, Math.min(width, height) * 0.14, spacing * 0.45))
    assert.ok(Math.PI * radius ** 2 < width * height * 0.07)
    centers.forEach((point, index) => {
      assert.equal(fingerAt(point, centers, width, height), index === 0 ? 4 : index - 1)
    })
    const outside = { x: centers[0].x + (radius + 1) / width, y: centers[0].y }
    assert.equal(fingerAt(outside, centers, width, height), nearestCenter(outside, centers.slice(1), width, height))
  }
})

test('assignment uses physical distance, with deterministic boundary ties', () => {
  const centers = [{ x: 0.2, y: 0.8 }, { x: 0.8, y: 0.2 }]
  assert.equal(nearestCenter({ x: 0.2, y: 0.2 }, centers, 200, 800), 1)
  assert.equal(nearestCenter({ x: 0.2, y: 0.2 }, centers, 800, 200), 0)
  assert.equal(nearestCenter({ x: 0.5, y: 0.5 }, centers, 400, 400), 0)
})

test('Voronoi regions cover the surface without overlapping interiors', () => {
  const layouts = [
    [{ x: 0.15, y: 0.6 }, { x: 0.4, y: 0.4 }, { x: 0.65, y: 0.45 }, { x: 0.85, y: 0.7 }],
    [{ x: 0.1, y: 0.5 }, { x: 0.3, y: 0.5 }, { x: 0.6, y: 0.5 }, { x: 0.9, y: 0.5 }],
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }],
  ]
  for (const [width, height] of [[390, 750], [750, 390]]) {
    for (const centers of layouts) {
      const polygons = regions(centers, width, height)
      let totalArea = 0
      polygons.forEach((polygon, index) => {
        assert.ok(polygon.length >= 3)
        let area = 0
        polygon.forEach((point, edge) => {
          const end = polygon[(edge + 1) % polygon.length]
          area += point.x * end.y - end.x * point.y
          assert.ok(point.x >= -1e-8 && point.x <= width + 1e-8)
          assert.ok(point.y >= -1e-8 && point.y <= height + 1e-8)
          const distance = center => (point.x - center.x * width) ** 2 + (point.y - center.y * height) ** 2
          centers.forEach(center => assert.ok(distance(centers[index]) <= distance(center) + 1e-7))
        })
        totalArea += Math.abs(area) / 2
      })
      assert.ok(Math.abs(totalArea - width * height) < 1e-6)
    }
  }
})
