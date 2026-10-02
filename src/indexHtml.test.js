import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const html = readFileSync('index.html', 'utf8')

describe('index.html (what shows before the app loads)', () => {
  it('puts a loading splash inside #root, so a reload never shows an empty page', () => {
    const root = html.match(/<div id="root">([\s\S]*?)<\/div>\s*<script/)
    expect(root).not.toBeNull()
    expect(root[1]).toContain('class="boot"')
    expect(root[1]).toMatch(/Loading/)
    expect(root[1]).toContain('role="status"')
  })

  it('paints a dark background straight away, before any script or stylesheet loads', () => {
    const head = html.slice(0, html.indexOf('</head>'))
    const style = head.match(/<style>([\s\S]*?)<\/style>/)
    expect(style).not.toBeNull()
    expect(style[1]).toMatch(/html,\s*body\s*\{[^}]*background:\s*#02031f/)
    expect(style[1]).toContain('.boot')
  })

  it('still loads the app as a module after the splash', () => {
    expect(html.indexOf('class="boot"')).toBeLessThan(html.indexOf('src="/src/main.jsx"'))
    expect(html).toContain('<script type="module" src="/src/main.jsx"></script>')
  })
})
