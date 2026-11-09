# Better Markdown Preview with Pele

A fork of [Sumonta056/Better Markdown Preview](https://github.com/Sumonta056/orca-better-markdown-preview) using [Pele](https://github.com/obsidianmd/pele) for Mermaid-syntax diagrams. Upstream authorship and MIT license are preserved.

Read and edit Markdown in one view inside [Orca](https://github.com/stablyai/orca). The Markdown symbols hide until you edit a line, so a note reads like a finished page and stays editable.

![Better Markdown Preview showing colored headings, bullets, a tip callout and a task list](images/cover.png)

## Features

- **Colored headings.** H1 to H6 each have their own Monokai color, and H1 and H2 have a fading underline.
- **Organized lists.** Each nesting level has its own bullet shape and color. Numbered lists have colored numbers.
- **Task lists.** Click a checkbox to tick a task. Finished tasks are crossed out.
- **Clean tables.** A compact header, a bold key column and striped rows. A table is only as wide as its content.
- **Code blocks.** Syntax colors, a language label and a copy button.
- **Callouts.** GitHub callouts: `> [!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]` and `[!CAUTION]`.
- **Front matter.** YAML front matter shows as a card.
- **Pele diagrams.** ` ```mermaid ` blocks draw locally with Pele 1.13.0.
- **Live editing.** Type anywhere. Click a table, code block, diagram or front matter card to edit its source.
- **Zoom.** Use the `− 100% +` control in the top right corner, or pinch on the trackpad.
- **Readable type.** Body text uses the Figtree font, included in the plugin.

![A table and a TypeScript code block](images/tables.png)

The diagram image below is retained from upstream; Pele diagram geometry differs.

![Upstream front matter card and Mermaid flowchart](images/diagram.png)

## Install

This fork is not published to the community catalog. Clone this repository and follow the development checks below; approve the development plugin only after reviewing Orca's requested access. For the review branch, use `git clone --branch release/v1.1.0 https://github.com/jiludvik2/orca-better-markdown-preview.git`. The plugin ID remains `better-markdown-preview`, so use one version at a time.

1. Open a `.md`, `.markdown` or `.mdx` file.
2. In the view toggle at the top right of the editor, click the **first icon** (the pen nib). Its tooltip says **Preview**.

   ![The editor view toggle. The first icon, a pen nib, opens Better Markdown Preview](images/view-toggle.png)

   The other icons are Orca's own views. `<>` is Source, and the pencil is Orca's rich editor.

Orca opens Markdown files in Source first, and a plugin cannot change that. Click the first icon each time you open a file.

## Use

| Action | How |
| --- | --- |
| Open the preview | Click the first icon (the pen nib) in the editor's view toggle. |
| Edit a line | Click it. Its Markdown symbols show while the cursor is on it. |
| Edit a table, code block or diagram | Click it. It changes to its source until the cursor leaves it. |
| Tick a task | Click its checkbox. |
| Open a link | `Cmd`-click it. A normal click puts the cursor in it. |
| Zoom | Click `−` or `+`, or pinch. Click the percentage to reset. |
| Undo | `Cmd Z` |
| Save | Orca's usual save shortcut. |

## Limits

- **Zoom keys.** Orca keeps `Cmd +` and `Cmd -` for its own window, so they do not zoom the preview. Use the zoom control or a pinch.
- **No network.** Orca runs plugins without network access. Images from web URLs do not load.
- **No raw HTML.** HTML in the Markdown shows as text.
- **Agent edits.** When an agent writes the file while you type, the preview keeps both changes if they touch different lines. If both change the same lines, the agent's version wins.

## What's new in 1.1.0

- Replace Mermaid.js with the bundled Pele 1.13.0 renderer, retaining `mermaid` fences and source editing.
- Map diagram colors to the editor palette in light and dark themes. Repeated diagrams get independent SVG IDs and accessible labels.
- Show escaped diagram errors and retry after a library load failure. Diagram links and images are disabled; all rendering stays offline.
- Pele targets Mermaid 12.1 syntax; complete Mermaid 12.3 feature parity is not promised. See [Pele's compatibility notes](https://github.com/obsidianmd/pele#compatibility) for renderer differences.

## What's new in 1.0.4

- Security update: Mermaid 12.3.0 and markdown-it 15.0.3 fix all known advisories in the earlier versions, including XSS in diagram labels and documents that froze the editor.
- Mermaid now uses the smaller tiny build. Mindmap and architecture diagrams, and math in diagram labels, are no longer supported. All other diagram types work as before.

## What's new in 1.0.3

- Tables have a new look: a full grid with lines between all cells, a grey header band and yellow column names.
- Tables with 3 columns or fewer fill the width of the text. Wider tables stay as wide as their content.
- Column names now line up with the cells below them.
- Table lines show clearly in every Orca theme.

## What's new in 1.0.2

- A plugin icon: colored heading lines with a pen nib. Its source is `images/icon.svg`.

## What's new in 1.0.1

- The plugin page now says how to open the preview: click the first icon in the view toggle.
- A new cover that fits the wide crop on the plugin page.

## What's new in 1.0.0

- First release.

## Develop

```sh
orca plugin validate .
orca plugin check .
orca plugin dev load "$PWD"
orca plugin shot local.better-markdown-preview --editor "$PWD/samples/tables.md" --width 1600 --height 1000
```

`editor/main.ts` starts the editor, keeps the file in sync with Orca and owns the zoom control. `editor/live.ts` decides which parts of the document show rendered and which show as Markdown. `editor/render.ts` draws tables, code blocks, front matter and diagrams. `editor/merge.ts` combines your edits with outside changes. `editor/reader.css` holds every color and size.

`lib/` holds markdown-it 15.0.3, highlight.js 11.11.1, Pele 1.13.0 and a CodeMirror 6 bundle. Reproduce Pele from the pinned npm distribution with `scripts/vendor-pele.sh`; hashes and full notices are in `THIRD-PARTY-NOTICES.md`. Run `scripts/build-codemirror.sh` to rebuild `lib/codemirror.mjs` from `scripts/codemirror-entry.js`.

The optional browser checks exercise the shipped `editor/render.ts` and browser global without enabling the plugin in Orca. Supply existing TypeScript, Puppeteer Core and Chrome paths (no project dependency installation):

```sh
node scripts/test-diagrams.mjs --typescript /path/to/typescript --puppeteer /path/to/puppeteer-core --chrome /path/to/chrome
```

These checks supplement the required Orca reload, idle-state and screenshot checks in `CLAUDE.md`; they do not verify Orca integration. The retained images have not been regenerated for this fork.

## License

MIT. The bundled libraries and the Figtree font keep their own licenses, listed in [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).
