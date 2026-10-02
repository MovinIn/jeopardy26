import { renderClueTextHtml } from '../game/clueText.js'

export function ClueText({ text, className }) {
  const html = renderClueTextHtml(text ?? '')
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />
}
