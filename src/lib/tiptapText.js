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
