/**
 * Resolves a clue image path from board JSON to a public URL.
 * Paths may be absolute (/clues/foo.svg) or relative (clues/foo.svg).
 */
export function resolveClueImageSrc(image) {
  if (typeof image !== 'string') {
    return null
  }
  const trimmed = image.trim()
  if (!trimmed) {
    return null
  }
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}
