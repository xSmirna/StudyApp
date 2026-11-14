export type DustPoint = {
  x: number
  y: number
  size: number
  /** 0–1 relative brightness / opacity */
  alpha: number
}

export type ConstellationDustPattern = {
  points: DustPoint[]
}

const STORAGE_KEY = 'studyapp.constellationDust.v3'
const POINT_COUNT = 7

function readStore(): Record<string, ConstellationDustPattern> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, ConstellationDustPattern>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeStore(store: Record<string, ConstellationDustPattern>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

/** Rough bell-curve offset using three uniforms (organic clustering). */
function randomOffset(spread: number): number {
  return ((Math.random() + Math.random() + Math.random()) / 3 - 0.5) * 2 * spread
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * Creates an organic dust pattern: a couple of soft clusters plus a few stray
 * sparks, biased left of the branch so card text stays clear.
 */
export function createConstellationDustPattern(): ConstellationDustPattern {
  const clusterCount = Math.random() < 0.45 ? 2 : 3
  const clusters = Array.from({ length: clusterCount }, () => ({
    x: randomBetween(8, 58),
    y: randomBetween(18, 82),
    spread: randomBetween(10, 22),
  }))

  const points: DustPoint[] = []

  // Most points gather near cluster centers.
  for (let i = 0; i < POINT_COUNT - 2; i += 1) {
    const cluster = clusters[i % clusters.length]!
    points.push({
      x: clamp(cluster.x + randomOffset(cluster.spread), 2, 72),
      y: clamp(cluster.y + randomOffset(cluster.spread), 2, 98),
      size: randomBetween(5, 14),
      alpha: randomBetween(0.35, 0.95),
    })
  }

  // A couple of lonelier outliers for an irregular sky.
  for (let i = 0; i < 2; i += 1) {
    points.push({
      x: randomBetween(2, 70),
      y: randomBetween(4, 96),
      size: randomBetween(4, 10),
      alpha: randomBetween(0.25, 0.7),
    })
  }

  return { points }
}

export function saveConstellationDust(
  subjectId: string,
  pattern: ConstellationDustPattern,
): void {
  const store = readStore()
  store[subjectId] = pattern
  writeStore(store)
}

export function getConstellationDust(
  subjectId: string,
): ConstellationDustPattern | undefined {
  return readStore()[subjectId]
}

export function ensureConstellationDust(
  subjectId: string,
): ConstellationDustPattern {
  const existing = getConstellationDust(subjectId)
  if (existing?.points?.length) {
    return existing
  }
  const pattern = createConstellationDustPattern()
  saveConstellationDust(subjectId, pattern)
  return pattern
}

export function removeConstellationDust(subjectId: string): void {
  const store = readStore()
  if (!(subjectId in store)) return
  delete store[subjectId]
  writeStore(store)
}

/** Inline CSS variables for `.constellation-branch-dust`. */
export function dustPatternToStyle(
  pattern: ConstellationDustPattern,
): Record<string, string> {
  const style: Record<string, string> = {}
  pattern.points.forEach((point, index) => {
    const n = index + 1
    const alpha = point.alpha ?? 0.7
    style[`--dust-${n}-pos`] = `${point.x.toFixed(1)}% ${point.y.toFixed(1)}%`
    style[`--dust-${n}-size`] = `${point.size.toFixed(1)}px`
    style[`--dust-${n}-alpha`] = alpha.toFixed(3)
    style[`--dust-${n}-alpha-soft`] = (alpha * 0.35).toFixed(3)
  })
  return style
}
