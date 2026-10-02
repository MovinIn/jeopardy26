/** Documented rule: dice multiplier applies to spinner tokens only (not powerup potency). */
export const BONUS_MULTIPLIER_RULE =
  'Final banked tokens = spinner tokens × dice multiplier. Powerups are stored separately for the active team.'

const DEFAULT_SLOT_POWERUPS = [
  { id: 'double-next', label: 'Double points on next correct answer' },
  { id: 'block-steal', label: 'Block one steal attempt' },
  { id: 'free-pass', label: 'Free pass on one miss' },
  { id: 'pick-clue', label: 'Pick the next clue category' },
  { id: 'token-boost', label: '+2 bonus tokens (immediate)' },
]

const DEFAULT_DICE_FACES = [1, 2, 3, 4, 5, 6]

function slugId(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'powerup'
}

function parseLeadingInteger(text) {
  const match = /^(\d+)/.exec(String(text).trim())
  return match ? Number.parseInt(match[1], 10) : null
}

export function parseSpinnerEvent(entry) {
  if (typeof entry === 'string') {
    const label = entry.trim()
    const parsed = parseLeadingInteger(label)
    return { label, tokens: parsed ?? 1 }
  }
  if (entry && typeof entry === 'object') {
    const label = typeof entry.label === 'string' ? entry.label.trim() : ''
    const tokens =
      typeof entry.tokens === 'number' && Number.isFinite(entry.tokens)
        ? Math.max(0, Math.floor(entry.tokens))
        : (parseLeadingInteger(label) ?? 1)
    return { label: label || 'Bonus', tokens }
  }
  return { label: 'Bonus', tokens: 1 }
}

export function normalizeSpinnerEvents(events) {
  if (!Array.isArray(events) || events.length === 0) {
    return []
  }
  return events.map(parseSpinnerEvent).filter((e) => e.label)
}

export function computeBankedTokens(baseTokens, multiplier) {
  const base = Math.max(0, Math.floor(baseTokens))
  const mult = Math.max(0, Math.floor(multiplier))
  return base * mult
}

export function normalizeSlotPowerups(raw) {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_SLOT_POWERUPS.map((p) => ({ ...p }))
  }
  return raw
    .map((entry) => {
      if (typeof entry === 'string' && entry.trim()) {
        const label = entry.trim()
        return { id: slugId(label), label }
      }
      if (entry && typeof entry === 'object') {
        const label = typeof entry.label === 'string' ? entry.label.trim() : ''
        if (!label) {
          return null
        }
        const id =
          typeof entry.id === 'string' && entry.id.trim() ? entry.id.trim() : slugId(label)
        return { id, label }
      }
      return null
    })
    .filter(Boolean)
}

export function normalizeDiceFaces(raw) {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [...DEFAULT_DICE_FACES]
  }
  const faces = raw
    .map((v) => (typeof v === 'number' && Number.isFinite(v) ? Math.floor(v) : null))
    .filter((v) => v != null && v > 0)
  return faces.length > 0 ? faces : [...DEFAULT_DICE_FACES]
}

/** @param {number} length @param {() => number} random01 in [0, 1) */
export function pickIndex(length, random01 = Math.random) {
  if (length <= 0) {
    return 0
  }
  if (length === 1) {
    return 0
  }
  return Math.min(length - 1, Math.floor(random01() * length))
}
