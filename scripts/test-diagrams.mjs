import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, resolve, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, i, all) => {
  if (i % 2 === 0) pairs.push([value.replace(/^--/, ''), all[i + 1]])
  return pairs
}, []))
for (const key of ['typescript', 'puppeteer', 'chrome']) {
  assert.ok(args[key], `Missing --${key} path`)
}
const require = createRequire(import.meta.url)
const ts = require(resolve(args.typescript))
const puppeteer = require(resolve(args.puppeteer))
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const server = createServer(async (req, res) => {
  try {
    const path = new URL(req.url, 'http://localhost').pathname
    if (path === '/editor/test.html') {
      res.setHeader('Content-Type', 'text/html')
      res.end('<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="reader.css"><script src="../lib/markdown-it.min.js"></script><script src="../lib/highlight.min.js"></script></head><body><main></main></body></html>')
      return
    }
    const file = resolve(root, `.${path}${extname(path) ? '' : '.ts'}`)
    assert.ok(file.startsWith(`${root}/`))
    let content = await readFile(file)
    if (extname(file) === '.ts') {
      content = ts.transpileModule(content.toString(), {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
        fileName: file,
      }).outputText
    }
    res.setHeader('Content-Type', { '.mjs': 'text/javascript', '.html': 'text/html; charset=utf-8', '.ts': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css' }[extname(file)] ?? 'application/octet-stream')
    res.end(content)
  } catch (error) {
    res.writeHead(404).end(String(error))
  }
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
let browser
try {
  browser = await puppeteer.launch({ executablePath: resolve(args.chrome), headless: true })
  const origin = `http://127.0.0.1:${server.address().port}`
  const page = await browser.newPage()
  page.on('pageerror', error => console.error('Browser error:', error))
  const requests = []
  page.on('request', request => requests.push(request.url()))
  await page.goto(`${origin}/editor/test.html`)
  const checks = await page.evaluate(async () => {
    const renderer = await import('./render.ts')
    const check = (condition, message) => { if (!condition) throw new Error(message) }
    let calls = 0
    document.head.addEventListener('load', event => {
      if (event.target.src?.endsWith('/lib/pele.global.js')) {
        const real = window.pele
        window.pele = { ...real, render(...args) { calls++; return real.render(...args) } }
      }
    }, true)
    const source = 'flowchart TD\naccTitle: pele-template-title\naccDescr: pele-template-desc\nA[pele-template-title] --> B[End]'
    check(renderer.cachedDiagram(source) === undefined, 'cold cache')
    const first = await Promise.all([renderer.renderDiagram(source), renderer.renderDiagram(source)])
    check(document.querySelectorAll('script[src="../lib/pele.global.js"]').length === 1, `single-flight loader: ${JSON.stringify({ first, peleType: typeof window.pele, scripts: [...document.scripts].map(script => script.src) })}`)
    check(calls === 1, 'simultaneous requests share one successful render')
    const cached = renderer.cachedDiagram(source)
    check(cached !== undefined, 'successful template cached')
    const fragments = [...first, cached]
    const sankey = 'sankey-beta\nA,B,10\nB,C,5\nA,C,5'
    fragments.push(await renderer.renderDiagram(sankey), renderer.cachedDiagram(sankey))
    const host = document.querySelector('main')
    host.innerHTML = fragments.map(svg => `<div class="cm-block-diagram">${svg}</div>`).join('')
    const ids = [...host.querySelectorAll('[id]')].map(element => element.id)
    check(new Set(ids).size === ids.length && ids.length > 6, 'fresh IDs on all returns')
    let localRefs = 0
    for (const svg of host.querySelectorAll('svg')) {
      const local = new Set([...svg.querySelectorAll('[id]')].map(element => element.id))
      for (const element of svg.querySelectorAll('*')) {
        for (const attr of element.attributes) {
          const refs = attr.name.startsWith('aria-') && ['aria-labelledby', 'aria-describedby'].includes(attr.name)
            ? attr.value.split(/\s+/) : [...attr.value.matchAll(/url\(#([^)]+)\)/g)].map(match => match[1])
          for (const id of refs) { check(local.has(id), `local reference ${id}`); localRefs++ }
        }
      }
      for (const attr of ['aria-labelledby', 'aria-describedby']) {
        if (svg.hasAttribute(attr)) check(local.has(svg.getAttribute(attr)), 'SVG ARIA reference')
      }
    }
    check(localRefs >= 4 && host.querySelectorAll('linearGradient').length > 0, 'Sankey gradients checked')
    check([...host.querySelectorAll('svg')].slice(0, 3).every(svg => svg.textContent.includes('pele-template-title')), 'labels are not rewritten')
    calls = 0
    await renderer.renderDiagram(source)
    check(calls === 0, 'same source/theme cache')
    await renderer.renderDiagram('flowchart TD\nX --> Y')
    check(calls === 1, 'new source renders')
    const dark = getComputedStyle(host.querySelector('svg')).getPropertyValue('--pele-accent').trim()
    document.documentElement.className = 'light'
    document.documentElement.style.setProperty('--orca-background', '#ffffff')
    document.documentElement.style.setProperty('--orca-foreground', '#222222')
    document.documentElement.style.setProperty('--orca-card', '#f3f3f3')
    document.documentElement.style.setProperty('--orca-border', '#cccccc')
    document.documentElement.style.setProperty('--orca-muted-foreground', '#666666')
    const light = getComputedStyle(host.querySelector('svg')).getPropertyValue('--pele-accent').trim()
    check(light !== dark, 'scoped palette responds to theme')
    check(renderer.cachedDiagram(source) === undefined, 'theme cache separate')
    await renderer.renderDiagram(source)
    check(calls === 2, 'new theme renders')
    document.documentElement.className = ''
    await renderer.renderDiagram(source)
    check(calls === 2, 'old theme cache retained')
    const bad = await renderer.renderDiagram('this is not a diagram <img src=x onerror=alert(1)>')
    check(bad.includes('diagram-error') && !bad.includes('<img'), 'invalid syntax escaped')
    check(renderer.cachedDiagram('this is not a diagram <img src=x onerror=alert(1)>') === undefined, 'errors uncached')
    const hostile = await renderer.renderDiagram('flowchart TD\nA["<script>alert(1)</script><img src=x onerror=alert(1)>"] --> B\nclick B "https://example.invalid/"')
    const disabled = await renderer.renderDiagram('flowchart TD\nA["[link](https://example.invalid/) ![image](https://example.invalid/image.png)"]')
    const image = await renderer.renderDiagram('flowchart TD\nA@{ img: "https://example.invalid/image.png", label: "image", h: 60 }')
    for (const html of [hostile, disabled, image]) {
      check(html.includes('<svg') && !html.includes('diagram-error'), 'valid disabled-content diagram still renders')
    }
    const benign = document.createElement('div')
    benign.innerHTML = disabled
    check(benign.textContent.includes('link'), 'benign label survives disabled content')
    const safety = document.createElement('div')
    safety.innerHTML = hostile + disabled + image
    check(!safety.querySelector('script, img, image, a, foreignObject, [onclick], [onerror]'), 'diagram links/images/raw markup disabled')
    const table = renderer.renderTable('| A | B |\n| - | - |\n| <img src=x> | **bold** |')
    check(table.includes('table-wrap') && table.includes('<strong>bold</strong>') && !table.includes('<img'), 'table rendering unchanged')
    const code = renderer.renderCode('js', 'const x = "<img>"')
    check(code.includes('class="copy"') && code.includes('hljs-keyword') && !code.includes('<img>'), 'code/copy rendering unchanged')
    const front = renderer.renderFrontMatter('title: "<img>"\ntags:\n  - one\n  - two')
    check(front.includes('&lt;img&gt;') && front.includes('one, two'), 'front matter unchanged')
    const commonBlocks = { table: renderer.renderTable('| A | B |\n|---|---|\n| a | b |'), frontMatter: renderer.renderFrontMatter('title: Receipt\ntags:\n - diagrams'), code: renderer.renderCode('js', 'const value = 1') }
    return { commonBlocks, fragments: fragments.length, uniqueIds: ids.length, localReferences: localRefs, checks: 'cache, concurrency, SVG/ARIA/gradients, labels, themes, syntax, links/images, common blocks' }
  })
  console.log(JSON.stringify(checks))
  if (args.baseline) {
    const baseline = JSON.parse(await readFile(resolve(args.baseline), 'utf8'))
    for (const key of ['table', 'frontMatter', 'code']) assert.equal(checks.commonBlocks[key], baseline[key], `Upstream ${key} parity`)
    console.log('PASS exact common-block output parity with supplied upstream run')
  }
  assert.ok(requests.every(url => url.startsWith(origin)), 'All browser requests stay local')

  for (const failure of ['network', 'global', 'inflight-theme']) {
    const tab = await browser.newPage()
    await tab.goto(`${origin}/editor/test.html`)
    await tab.setRequestInterception(true)
    let loads = 0
    tab.on('request', async request => {
      if (!request.url().endsWith('/lib/pele.global.js')) { await request.continue(); return }
      loads++
      if (loads === 1 && failure === 'network') await request.abort()
      else if (loads === 1 && failure === 'global') await request.respond({ contentType: 'text/javascript', body: 'window.pele = {}' })
      else if (failure === 'inflight-theme') {
        await tab.evaluate(() => { document.documentElement.className = 'light' })
        await request.continue()
      } else await request.continue()
    })
    const outcome = await tab.evaluate(async failure => {
      const renderer = await import('./render.ts')
      const source = 'flowchart TD\nA --> B'
      const first = await renderer.renderDiagram(source)
      if (failure === 'inflight-theme') {
        if (!first.includes('<svg') || renderer.cachedDiagram(source) !== undefined) throw new Error('inflight result stored under wrong theme')
        document.documentElement.className = ''
        if (!renderer.cachedDiagram(source)) throw new Error('initial theme cache missing')
      } else {
        if (!first.includes('diagram-error') || document.querySelector('script[src="../lib/pele.global.js"]')) throw new Error('loader did not resolve/clean up')
        const retry = await renderer.renderDiagram(source)
        if (!retry.includes('<svg')) throw new Error('loader retry failed')
      }
      return failure
    }, failure)
    assert.equal(loads, failure === 'inflight-theme' ? 1 : 2)
    console.log(`PASS ${outcome}`)
    await tab.close()
  }
  const editor = await browser.newPage()
  await editor.setViewport({ width: 1600, height: 1200 })
  const sample = '---\ntitle: Pele browser fixture\n---\n\n# Pele preview\n\n> [!TIP]\n> Local diagrams\n\n```mermaid\nflowchart LR\naccTitle: First diagram\nA[Start] --> B[Finish]\n```\n\n```mermaid\nflowchart LR\naccTitle: First diagram\nA[Start] --> B[Finish]\n```\n\n| A | B |\n|---|---|\n| one | two |\n\n```js\nconst value = 1\n```'
  await editor.evaluateOnNewDocument(value => {
    window.fixture = { value, changes: [], theme: null, replace: null }
    window.orca = {
      document: { session: async () => ({
        value, readOnly: false,
        change(next) { window.fixture.changes.push(next) },
        onReplace(callback) { window.fixture.replace = callback },
      }) },
      on(event, callback) { if (event === 'theme') window.fixture.theme = callback },
      shell: { openExternal() { throw new Error('Unexpected external link') } },
    }
  }, sample)
  editor.on('pageerror', error => console.error('Editor browser error:', error))
  await editor.goto(`${origin}/editor/index.html`)
  await editor.waitForFunction(() => document.querySelectorAll('.cm-block-diagram svg').length === 2)
  const initial = await editor.evaluate(() => ({
    labels: [...document.querySelectorAll('.cm-block-diagram svg')].map(svg => svg.textContent),
    ids: [...document.querySelectorAll('.cm-block-diagram [id]')].map(node => node.id),
    blocks: ['.table-wrap', 'figure.code', '.front-matter', '.cm-callout'].every(selector => document.querySelector(selector)),
  }))
  assert.ok(initial.blocks && initial.labels.every(label => label.includes('Start')))
  assert.equal(new Set(initial.ids).size, initial.ids.length)
  if (args.screenshot) await editor.screenshot({ path: resolve(args.screenshot.replace(/\.png$/, '-dark.png')), fullPage: true })
  await editor.click('.cm-block-diagram')
  await editor.waitForFunction(() => document.querySelectorAll('.cm-block-diagram svg').length === 1)
  await editor.evaluate(() => { document.body.tabIndex = -1; document.body.focus() })
  await editor.waitForFunction(() => document.querySelectorAll('.cm-block-diagram svg').length === 2)
  await editor.evaluate(() => {
    document.documentElement.className = 'light'
    document.documentElement.style.setProperty('--orca-background', '#ffffff')
    document.documentElement.style.setProperty('--orca-foreground', '#222222')
    document.documentElement.style.setProperty('--orca-card', '#f3f3f3')
    document.documentElement.style.setProperty('--orca-border', '#cccccc')
    document.documentElement.style.setProperty('--orca-muted-foreground', '#666666')
    window.fixture.theme()
  })
  await editor.waitForFunction(() => document.querySelectorAll('.cm-block-diagram svg').length === 2)
  const afterTheme = await editor.evaluate(() => ({
    accent: getComputedStyle(document.querySelector('.cm-block-diagram svg')).getPropertyValue('--pele-accent').trim(),
    ids: [...document.querySelectorAll('.cm-block-diagram [id]')].map(node => node.id),
    changes: window.fixture.changes,
  }))
  assert.equal(afterTheme.accent, '#0b7d93')
  assert.ok(afterTheme.ids.every(id => !initial.ids.includes(id)))
  assert.deepEqual(afterTheme.changes, [])
  await editor.click('[data-zoom="in"]')
  assert.equal(await editor.$eval('.zoom-value', node => node.textContent), '110%')
  await editor.click('[data-zoom="reset"]')
  if (args.screenshot) await editor.screenshot({ path: resolve(args.screenshot), fullPage: true })
  await editor.evaluate(value => window.fixture.replace(value), sample.replace('Start', 'Updated'))
  await editor.waitForFunction(() => [...document.querySelectorAll('.cm-block-diagram svg')].some(svg => svg.textContent.includes('Updated')))
  assert.deepEqual(await editor.evaluate(() => window.fixture.changes), [])
  console.log('PASS actual main.ts/live.ts/CodeMirror with mocked Orca host: fences, duplicate IDs, reveal, theme refresh, unchanged source, outside replace and zoom')
  console.log('PASS shipped render.ts and Pele global browser checks; Orca reload/idle/screenshots remain separate.')
} finally {
  await browser?.close()
  await new Promise(resolve => server.close(resolve))
}
