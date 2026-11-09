declare const markdownit: (options: object) => any
declare const hljs: any
interface PeleRenderer {
  render(source: string, options: { idPrefix: string; links: false; images: false }): { svg: string }
}

declare global {
  interface Window { pele?: unknown }
}

function isPeleRenderer(value: unknown): value is PeleRenderer {
  return typeof value === 'object' && value !== null && 'render' in value && typeof value.render === 'function'
}

export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const md = markdownit({ html: false, linkify: true, typographer: true })

export function renderTable(source: string): string {
  return `<div class="table-wrap">${md.render(source).trim()}</div>`
}

function highlight(code: string, lang: string): string {
  if (lang && hljs.getLanguage(lang)) return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value
  return hljs.highlightAuto(code).value
}

export function renderCode(lang: string, code: string): string {
  return (
    `<figure class="code"><figcaption><span>${escapeHtml(lang || 'text')}</span>` +
    `<button type="button" class="copy">Copy</button></figcaption>` +
    `<pre><code class="hljs">${highlight(code, lang)}</code></pre></figure>`
  )
}

export function renderFrontMatter(body: string): string {
  const rows: [string, string][] = []
  for (const line of body.split(/\r?\n/)) {
    const pair = /^([\w.-]+):\s*(.*)$/.exec(line)
    const item = /^\s+-\s+(.*)$/.exec(line)
    if (pair) rows.push([pair[1], pair[2].replace(/^["']|["']$/g, '')])
    else if (item && rows.length) {
      const last = rows[rows.length - 1]
      last[1] = last[1] ? `${last[1]}, ${item[1]}` : item[1]
    }
  }
  const cells = rows.map(([key, value]) => `<dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value)}</dd>`).join('')
  return `<dl class="front-matter">${cells}</dl>`
}

let peleReady: Promise<PeleRenderer> | null = null
let diagramCount = 0
const diagrams = new Map<string, string>()
const svgReferenceAttributes = new Set([
  'style', 'fill', 'stroke', 'filter', 'clip-path', 'mask',
  'marker-start', 'marker-mid', 'marker-end', 'cursor',
])

function loadPele(): Promise<PeleRenderer> {
  if (peleReady) return peleReady
  const script = document.createElement('script')
  peleReady = new Promise<PeleRenderer>((resolve, reject) => {
    script.src = '../lib/pele.global.js'
    script.onload = () => {
      if (isPeleRenderer(window.pele)) resolve(window.pele)
      else reject(new Error('Pele did not expose a renderer'))
    }
    script.onerror = () => reject(new Error('Pele failed to load'))
    document.head.append(script)
  }).catch(error => {
    peleReady = null
    script.remove()
    throw error
  })
  return peleReady
}

function diagramKey(source: string): string {
  return `${document.documentElement.className}\n${source}`
}

// Cache templates, never an insertion's IDs. Remap attributes only: label text and
// data-id values are source content, even when they happen to contain an old ID.
function materializeDiagram(svg: string): string {
  const template = document.createElement('template')
  template.innerHTML = svg
  const prefix = `pele-${++diagramCount}-`
  const ids = new Map<string, string>()
  for (const element of template.content.querySelectorAll('[id]')) {
    const old = element.id
    const replacement = `${prefix}${ids.size}`
    ids.set(old, replacement)
    element.id = replacement
  }
  for (const element of template.content.querySelectorAll('*')) {
    for (const attribute of [...element.attributes]) {
      let value = attribute.value
      if (attribute.localName === 'href' && value.startsWith('#')) {
        const replacement = ids.get(value.slice(1))
        if (replacement) value = `#${replacement}`
      } else if (['aria-labelledby', 'aria-describedby'].includes(attribute.name)) {
        value = value.replace(/\S+/g, id => ids.get(id) ?? id)
      } else if (svgReferenceAttributes.has(attribute.name)) {
        value = value.replace(/url\(\s*(['"]?)#([^\s)'"]+)\1\s*\)/g,
          (reference, quote: string, id: string) => ids.has(id) ? `url(${quote}#${ids.get(id)}${quote})` : reference)
      }
      if (value !== attribute.value) element.setAttributeNS(attribute.namespaceURI, attribute.name, value)
    }
  }
  return template.innerHTML
}

export function cachedDiagram(source: string): string | undefined {
  const svg = diagrams.get(diagramKey(source))
  return svg === undefined ? undefined : materializeDiagram(svg)
}

export async function renderDiagram(source: string): Promise<string> {
  const key = diagramKey(source)
  const cached = diagrams.get(key)
  if (cached !== undefined) return materializeDiagram(cached)
  try {
    const pele = await loadPele()
    const svg = diagrams.get(key) ?? pele.render(source, {
      idPrefix: 'pele-template', links: false, images: false,
    }).svg
    diagrams.set(key, svg)
    return materializeDiagram(svg)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return `<pre class="diagram-error">${escapeHtml(message)}</pre>`
  }
}
