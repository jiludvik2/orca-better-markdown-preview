---
paths:
  - "orca-plugin.json"
  - "README.md"
  - "images/**"
---

# Release

1. Set the new `version` in `orca-plugin.json` (semver: patch for fixes, minor for new features).
2. Add a "What's new in X.Y.Z" section to `README.md`.
3. If the view looks different, regenerate the images from `samples/`. Set the zoom to 100% first.

   ```sh
   for f in tables diagram; do
     orca plugin shot local.better-markdown-preview --editor "$PWD/samples/$f.md" --width 1600 --height 1000 --out "images/$f.png"
   done
   orca plugin shot local.better-markdown-preview --editor "$PWD/samples/cover-panel.md" --width 860 --height 420 --out Test/cover-panel.png
   ```

   Then open `scripts/cover.html` in Chrome at a 1600×1000 viewport with a device scale of 1, and save a screenshot as `images/cover.png`. The plugin page crops the cover to a wide strip of about y 315 to 685, so every key part of the cover stays inside that strip. The cover must be at least 800×500 and at most 1 MB. Each screenshot must be at least 1280×800 and at most 1.5 MB.
4. Run the checks in `CLAUDE.md`.
5. Commit on `release/vX.Y.Z`.
6. Deliver the fork branch for review. Do not tag, publish to the community catalog, or open an upstream PR without explicit authorization. Preserve the existing release history.

Keep `engines.orca` at the lowest version whose fields the manifest uses (now `>=1.4.248`, because the editor sets `frame`). Keep `license` as `MIT`.
