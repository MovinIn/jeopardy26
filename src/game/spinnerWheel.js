export function normalizeDeg(deg) {
  return ((deg % 360) + 360) % 360
}

/** Degrees clockwise from 12 o'clock for divider line separating wedge i-1 and wedge i. */
export function dividerRotateDeg(index, count) {
  if (count <= 0) {
    return 0
  }
  const segment = 360 / count
  return index * segment
}

/** Degrees clockwise from 12 o'clock for the center line of wedge `index`. */
export function wedgeCenterDeg(index, count) {
  if (count <= 0) {
    return 0
  }
  const segment = 360 / count
  return (index + 0.5) * segment
}

/** Final wheel rotation so wedge `index` center aligns with top pointer (0deg / 12 o'clock). */
export function computeNextRotation(currentRotation, index, count) {
  if (count <= 0) {
    return currentRotation
  }
  const center = wedgeCenterDeg(index, count)
  const currentMod = normalizeDeg(currentRotation)
  // To move angle `center` to `0deg`, wheel must be rotated to an angle where (center + R) % 360 === 0.
  const targetMod = normalizeDeg(360 - center)
  let delta = targetMod - currentMod
  if (delta <= 0) {
    delta += 360
  }
  return currentRotation + 360 * 7 + delta
}

export const WEDGE_COLORS = [
  '#060ce9',
  '#0a7a6e',
  '#6a1b9a',
  '#b71c1c',
  '#1b5e20',
  '#c99700',
  '#0047ab',
  '#5d4037',
]

/** Build conic-gradient starting at 0deg (12 o'clock) matching dividers and labels. */
export function buildConicGradient(count) {
  if (count <= 0) {
    return '#060ce9'
  }
  const stops = []
  for (let i = 0; i < count; i += 1) {
    const color = WEDGE_COLORS[i % WEDGE_COLORS.length]
    const start = ((i / count) * 100).toFixed(4)
    const end = (((i + 1) / count) * 100).toFixed(4)
    stops.push(`${color} ${start}%, ${color} ${end}%`)
  }
  return `conic-gradient(from 0deg, ${stops.join(', ')})`
}

/**
 * Positions and rotates wedge label text so it sits centered in wedge `index`
 * without overlapping divider lines.
 */
export function wedgeLabelStyle(index, count) {
  const midAngle = wedgeCenterDeg(index, count)
  const angleRad = (midAngle * Math.PI) / 180
  const radius = 32
  // Max chord width inside the wedge at radius with a safety margin
  const segment = 360 / count
  const maxWidthPct = Math.max(16, Math.min(26, segment * 0.38))

  return {
    left: `${50 + radius * Math.sin(angleRad)}%`,
    top: `${50 - radius * Math.cos(angleRad)}%`,
    transform: `translate(-50%, -50%) rotate(${midAngle}deg)`,
    maxWidth: `${maxWidthPct}%`,
  }
}
