import katex from 'katex'

const DISPLAY_MATH = /\$\$([\s\S]+?)\$\$/g
const INLINE_PARENS = /\\\(([\s\S]+?)\\\)/g
const INLINE_DOLLAR = /\$([^$\n]+?)\$/g

function isPlainDollarAmount(inner) {
  return /^\d{1,3}(,\d{3})*(\.\d+)?$/.test(inner.trim())
}

function pushText(segments, text) {
  if (!text) {
    return
  }
  const last = segments[segments.length - 1]
  if (last?.type === 'text') {
    last.content += text
  } else {
    segments.push({ type: 'text', content: text })
  }
}

function matchFrom(regex, input, startIndex) {
  regex.lastIndex = startIndex
  const match = regex.exec(input)
  if (!match || match.index < startIndex) {
    return null
  }
  return match
}

function nextDelimiter(input, index) {
  const candidates = []
  const display = matchFrom(DISPLAY_MATH, input, index)
  if (display) {
    candidates.push({ index: display.index, length: display[0].length, content: display[1], display: true })
  }
  const parens = matchFrom(INLINE_PARENS, input, index)
  if (parens) {
    candidates.push({ index: parens.index, length: parens[0].length, content: parens[1], display: false })
  }
  const dollars = matchFrom(INLINE_DOLLAR, input, index)
  if (dollars && !isPlainDollarAmount(dollars[1])) {
    candidates.push({ index: dollars.index, length: dollars[0].length, content: dollars[1], display: false })
  }

  if (candidates.length === 0) {
    return null
  }
  candidates.sort((a, b) => a.index - b.index)
  return candidates[0]
}

export function parseClueTextSegments(input) {
  if (typeof input !== 'string' || input.length === 0) {
    return [{ type: 'text', content: '' }]
  }

  const segments = []
  let cursor = 0

  while (cursor < input.length) {
    const match = nextDelimiter(input, cursor)
    if (!match) {
      pushText(segments, input.slice(cursor))
      break
    }
    pushText(segments, input.slice(cursor, match.index))
    segments.push({ type: 'math', content: match.content, display: match.display })
    cursor = match.index + match.length
  }

  return segments.length > 0 ? segments : [{ type: 'text', content: input }]
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function renderSegmentHtml(segment) {
  if (segment.type === 'text') {
    return escapeHtml(segment.content)
  }
  try {
    return katex.renderToString(segment.content, {
      throwOnError: false,
      displayMode: segment.display === true,
    })
  } catch {
    return escapeHtml(segment.content)
  }
}

export function renderClueTextHtml(input) {
  return parseClueTextSegments(input)
    .map((segment) => renderSegmentHtml(segment))
    .join('')
}
