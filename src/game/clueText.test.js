import { describe, expect, it } from 'vitest'
import { parseClueTextSegments, renderSegmentHtml } from './clueText.js'

describe('parseClueTextSegments', () => {
  it('returns one text segment when no math delimiters appear', () => {
    expect(parseClueTextSegments('Plain clue with no math.')).toEqual([
      { type: 'text', content: 'Plain clue with no math.' },
    ])
  })

  it('parses inline math in dollar delimiters when content is not a plain dollar amount', () => {
    expect(parseClueTextSegments('Solve $x^2 + 1 = 0$ for real x.')).toEqual([
      { type: 'text', content: 'Solve ' },
      { type: 'math', content: 'x^2 + 1 = 0', display: false },
      { type: 'text', content: ' for real x.' },
    ])
  })

  it('treats $200 as literal text not math', () => {
    expect(parseClueTextSegments('Wager up to $200 on this clue.')).toEqual([
      { type: 'text', content: 'Wager up to $200 on this clue.' },
    ])
  })

  it('parses inline math in \\( ... \\) delimiters', () => {
    expect(parseClueTextSegments('Area is \\( \\pi r^2 \\).')).toEqual([
      { type: 'text', content: 'Area is ' },
      { type: 'math', content: ' \\pi r^2 ', display: false },
      { type: 'text', content: '.' },
    ])
  })

  it('parses display math in $$ ... $$ delimiters', () => {
    expect(parseClueTextSegments('Evaluate $$\\int_0^1 x\\,dx$$.')).toEqual([
      { type: 'text', content: 'Evaluate ' },
      { type: 'math', content: '\\int_0^1 x\\,dx', display: true },
      { type: 'text', content: '.' },
    ])
  })
})

describe('renderSegmentHtml', () => {
  it('escapes plain text segments', () => {
    expect(renderSegmentHtml({ type: 'text', content: '<b>hi</b>' })).toBe('&lt;b&gt;hi&lt;/b&gt;')
  })

  it('renders math segments with KaTeX markup', () => {
    const html = renderSegmentHtml({ type: 'math', content: 'x^2', display: false })
    expect(html).toContain('class="katex"')
    expect(html).toContain('x')
  })
})
