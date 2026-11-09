# Better Markdown Preview with Pele

An Orca plugin (`execution: "sandboxed-ui"`): a custom editor for `.md`, `.markdown` and `.mdx` files. It is a CodeMirror 6 editor with live preview: Markdown symbols hide except on the line with the cursor, and tables, code blocks, Pele diagrams using Mermaid syntax and front matter render as blocks until the cursor enters them. Fork at github.com/jiludvik2/orca-better-markdown-preview, based on Sumonta056/orca-better-markdown-preview. Do not publish catalog tags without explicit authorization.

## Invariants

- The plugin id stays `better-markdown-preview`. Preserve upstream compatibility; the fork display name identifies Pele.
- A pushed tag is permanent. The catalog refuses a moved tag, so every change ships as a new version.
- The frame has no network. Every library, font and image loads from the plugin folder by a relative URL.
- The editor never rewrites text the user did not touch. Edits go to Orca as the full document through `orca.document.session`; outside writes come back through `onReplace` as a minimal change.
- Orca owns `Cmd +`, `Cmd -` and `Cmd 0` in its main process. They never reach the frame, so zoom lives in the plugin's own control.

## Check

```sh
orca plugin validate .
orca plugin check .
orca plugin dev reload "$PWD"
orca plugin list
```

A change is done when both checks pass and `orca plugin list` shows `local.better-markdown-preview … idle`. `orca plugin dev load "$PWD"` makes this folder a development folder; a new id or new access needs `--approve` with the fingerprint it prints. Look at the result with `orca plugin shot local.better-markdown-preview --editor <file.md> --width 1600 --height 1000 --out <png>`, then read the PNG. A shot shows the editor without focus, so every line is rendered; typing, clicks and the cursor need the user, because `shot --act` runs only while Orca's window is hidden.

`samples/` holds the Markdown files the release images are shot from. `Test/` holds generated or scratch files and is in `.gitignore`.

Orca builds the plugin page from `orca-plugin.json` and `images/`, not from `README.md`. A change a user must see on that page belongs in the manifest `description` or the images.

## Rules

- Editing `editor/` or `lib/`, or a part of a document that renders wrongly: read `.claude/rules/editor.md`.
- Changing `orca-plugin.json`, `images/` or preparing a release: read `.claude/rules/release.md`.
