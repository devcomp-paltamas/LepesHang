const HTML_TAG_PATTERN = /<\/?[a-z][\s\S]*>/i

const HTML_ENTITY_MAP = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
}

function decodeHtmlEntities(value) {
  return Object.entries(HTML_ENTITY_MAP).reduce(
    (result, [entity, replacement]) => result.replaceAll(entity, replacement),
    value,
  )
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function stripRichText(value) {
  if (!value) return ''

  return decodeHtmlEntities(
    String(value)
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|h[1-6]|blockquote)>/gi, '\n')
      .replace(/<li[^>]*>/gi, '• ')
      .replace(/<\/(li|ul|ol)>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim(),
  )
}

export function hasRichTextContent(value) {
  return stripRichText(value).trim().length > 0
}

export function toRichTextHtml(value) {
  const rawValue = String(value || '').trim()

  if (!rawValue) {
    return ''
  }

  if (HTML_TAG_PATTERN.test(rawValue)) {
    return rawValue
  }

  return rawValue
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

export function normalizeRichTextValue(value) {
  const html = toRichTextHtml(value)
  return hasRichTextContent(html) ? html : ''
}

export function sanitizeRichTextHtml(value) {
  const html = normalizeRichTextValue(value)

  if (!html) {
    return ''
  }

  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\son\w+=(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\sstyle=(?:"[^"]*"|'[^']*')/gi, '')
}
