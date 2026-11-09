---
paths:
  - "editor/**"
  - "lib/**"
  - "scripts/**"
---

# Editor

## Where things live

- `editor/main.ts` creates the `EditorView`, syncs with `orca.document.session`, and owns the zoom control and the key and pinch handlers.
- `editor/live.ts` builds every decoration in one `StateField` from the Lezer syntax tree. Block widgets (tables, code, diagrams, front matter) must come from a `StateField`, never a `ViewPlugin`.
- `editor/render.ts` turns source into HTML for block widgets with markdown-it and highlight.js, and loads Pele only when a document has a diagram.
- `editor/merge.ts` merges the user's draft with an outside write by changed region. Overlapping changes keep the outside version.
- `editor/reader.css` holds every color, size and spacing. Colors come from the Monokai tokens on `:root`, with darker values under `html.light`.

## The reveal rule

- Line syntax (`#`, `>`, list markers, task boxes, `---`) shows raw when the cursor's line is that line.
- Inline syntax (`**`, `_`, `` ` ``, `~~`, link brackets and URL) shows raw when the selection touches that node.
- Blocks (fenced code, tables, front matter) show raw when the selection touches any of their lines.
- Without focus nothing is active, so the whole document renders. Focus comes from `EditorView.focusChangeEffect`.

## Traps

- CodeMirror's base theme beats plain CSS on `.cm-line`, `.cm-cursor` and `.cm-scroller`. Override them in `EditorView.theme` in `main.ts`, or with a selector that has `.cm-editor` in front.
- Never give a `.cm-line` a margin. CodeMirror measures line heights without margins; use padding.
- `.cm-content` is `white-space: pre-wrap`. A block widget's HTML must be trimmed and its container must set `white-space: normal`, or newlines become empty lines.
- The Markdown highlighter (`syntaxHighlighting`) puts its own spans inside decoration marks. A mark color that must win sets `span { color: inherit }`.
- A Lezer `Link` without a `URL` child is plain bracket text, not a link.
- A string `eval` or `new Function` is refused in the frame. `orca plugin check` warns about it.

## Libraries

`lib/codemirror.mjs` is generated. Change `scripts/codemirror-entry.js` and run `scripts/build-codemirror.sh`; never edit the bundle. Pinned versions live in the script; update `THIRD-PARTY-NOTICES.md` when a version changes. The other files in `lib/` are copied from npm builds: markdown-it 15.0.3 (`dist/browser/markdown-it.umd.min.js`, saved as `markdown-it.min.js`), highlight.js 11.11.1 (`@highlightjs/cdn-assets` `highlight.min.js`) and Pele 1.13.0 (`pele` `dist/pele.global.js`). Reproduce the unmodified Pele runtime and its complete license with `scripts/vendor-pele.sh`; its pinned hashes are in `THIRD-PARTY-NOTICES.md`. Pele renders Mermaid syntax, with links and images disabled and no raw-markup callbacks. Cached SVG templates must receive fresh IDs and matching fragment/ARIA references for every insertion. Keep Pele's default fonts so SVG text measurements match rendering; theme via scoped `--pele-*` colors in `editor/reader.css`.
