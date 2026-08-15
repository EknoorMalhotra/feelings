// Flattens Tiptap's JSON doc into plain text, for snippets and search.
export function extractText(doc) {
  if (!doc) return ''
  if (doc.type === 'text') return doc.text ?? ''
  if (!Array.isArray(doc.content)) return ''
  return doc.content
    .map(extractText)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function entrySnippet(entry, maxLength = 90) {
  return extractText(entry.body).slice(0, maxLength)
}

// Derives a short title from raw text — used for voice entries, which have
// no user-typed title. Prefers the first sentence; Whisper transcripts often
// lack punctuation entirely, so falls back to a word-boundary truncation.
export function deriveTitle(text, maxLength = 60) {
  const trimmed = (text ?? '').trim()
  if (!trimmed) return ''

  const sentenceEnd = trimmed.slice(0, maxLength + 1).search(/[.!?](\s|$)/)
  if (sentenceEnd !== -1) {
    return trimmed.slice(0, sentenceEnd + 1)
  }

  if (trimmed.length <= maxLength) return trimmed

  const truncated = trimmed.slice(0, maxLength)
  const lastSpace = truncated.lastIndexOf(' ')
  const boundary = lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated
  return `${boundary}…`
}

// Wraps a flat transcript string into a minimal Tiptap doc (one paragraph per line).
export function textToDoc(text) {
  const paragraphs = (text ?? '')
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean)

  if (paragraphs.length === 0) {
    return { type: 'doc', content: [{ type: 'paragraph' }] }
  }

  return {
    type: 'doc',
    content: paragraphs.map((p) => ({ type: 'paragraph', content: [{ type: 'text', text: p }] })),
  }
}
