/**
 * Tiny safe Markdown-to-HTML renderer for legal documents (ToS / privacy /
 * usage policy) coming from sub2api's `login_agreement_documents`. NOT a
 * full Markdown implementation — supports the subset that legal docs
 * actually use:
 *
 *   # H1 / ## H2 / ### H3 headings
 *   **bold** / *italic*
 *   `inline code`
 *   [link](https://...)              — only http(s) targets accepted
 *   - bullet list (single level)
 *   1. ordered list (single level)
 *   horizontal rule (---)
 *   paragraphs (blank-line separated)
 *
 * All input is HTML-escaped before patterns are matched so untrusted
 * Markdown can't smuggle raw HTML through. We intentionally accept a
 * narrow link-href allow-list (http / https / mailto) to block
 * `javascript:` payloads if an admin's settings get tampered with.
 */

const ESCAPE: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ESCAPE[c])
}

function safeHref(raw: string): string {
  const trimmed = raw.trim()
  if (/^https?:\/\//i.test(trimmed) || /^mailto:/i.test(trimmed)) {
    return escapeHtml(trimmed)
  }
  return '#'
}

function inlineMarkup(line: string): string {
  return line
    // Links — must run before emphasis so [link](*x*) isn't mangled
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label: string, href: string) => {
      return `<a href="${safeHref(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`
    })
    // Bold then italic so **x** isn't eaten by *x*
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="font-mono text-[0.9em] px-1 rounded bg-muted">$1</code>')
}

/**
 * Render Markdown into a string of HTML safe for `v-html`. Returns the
 * empty string for falsy / empty input — callers can show their own
 * placeholder.
 */
export function renderMarkdown(md: string | null | undefined): string {
  if (!md || !md.trim()) return ''

  // Escape every character first; we'll re-introduce just the structural
  // tags we recognise below.
  const escaped = escapeHtml(md)
  const lines = escaped.split('\n')
  const out: string[] = []
  let paragraph: string[] = []
  let list: { kind: 'ul' | 'ol'; items: string[] } | null = null

  const flushParagraph = () => {
    if (paragraph.length === 0) return
    out.push(`<p>${inlineMarkup(paragraph.join(' '))}</p>`)
    paragraph = []
  }
  const flushList = () => {
    if (!list) return
    const items = list.items.map((i) => `<li>${inlineMarkup(i)}</li>`).join('')
    out.push(`<${list.kind}>${items}</${list.kind}>`)
    list = null
  }
  const flushAll = () => { flushParagraph(); flushList() }

  for (const raw of lines) {
    const line = raw.trimEnd()
    if (!line.trim()) { flushAll(); continue }

    let m: RegExpMatchArray | null

    if ((m = line.match(/^###\s+(.+)$/))) { flushAll(); out.push(`<h5>${inlineMarkup(m[1])}</h5>`); continue }
    if ((m = line.match(/^##\s+(.+)$/))) { flushAll(); out.push(`<h4>${inlineMarkup(m[1])}</h4>`); continue }
    if ((m = line.match(/^#\s+(.+)$/))) { flushAll(); out.push(`<h3>${inlineMarkup(m[1])}</h3>`); continue }
    if (/^-{3,}\s*$/.test(line)) { flushAll(); out.push('<hr />'); continue }

    if ((m = line.match(/^\s*[-*]\s+(.+)$/))) {
      flushParagraph()
      if (!list || list.kind !== 'ul') { flushList(); list = { kind: 'ul', items: [] } }
      list.items.push(m[1])
      continue
    }
    if ((m = line.match(/^\s*\d+\.\s+(.+)$/))) {
      flushParagraph()
      if (!list || list.kind !== 'ol') { flushList(); list = { kind: 'ol', items: [] } }
      list.items.push(m[1])
      continue
    }

    flushList()
    paragraph.push(line)
  }

  flushAll()
  return out.join('')
}
