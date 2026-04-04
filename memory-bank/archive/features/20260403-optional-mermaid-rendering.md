---
task_id: optional-mermaid-rendering
complexity_level: 2
date: 2026-04-03
status: completed
---

# TASK ARCHIVE: Optional Mermaid Rendering for MDC

## SUMMARY

Added lazy Mermaid diagram rendering to the MDC userscript. Mermaid code fences now render as diagrams when present; no payload cost on pages without them. The Mermaid runtime is injected via `GM_addElement` to bypass GitHub's CSP, with polling for the global to appear. A pre-existing SPA navigation bug was also fixed during testing.

## REQUIREMENTS

- Detect Mermaid code fences in rendered MDC content.
- Load Mermaid lazily — only fetch when diagrams are present.
- Keep baseline payload small for non-Mermaid pages.
- Determine whether GitHub's native Mermaid rendering can be reused (answer: no — GitHub renders Mermaid server-side).
- Existing non-Mermaid rendering must remain unchanged.

## IMPLEMENTATION

All changes in `mdc-render.js`:
- `getMermaidGlobal()`: checks both `window.mermaid` and `unsafeWindow.mermaid` (cross-world boundary).
- `loadMermaid()`: injects `@mermaid-js/tiny@11` via `GM_addElement`, polls for the global with a 15s timeout. Singleton promise prevents duplicate loads.
- `renderMermaidBlocks(container)`: finds `pre code.language-mermaid` blocks, waits for mermaid to load, then replaces code fences with `.mermaid` divs and calls `mermaid.run()`. Code fences remain visible as highlighted content until mermaid is ready.
- Added `@grant GM_addElement` and `@grant unsafeWindow` to userscript metadata.
- Replaced inline `style.display = 'none'` with CSS class `.mdc-source-hidden` for SPA-safe visibility toggling.
- Updated `README.md` with Mermaid support documentation.

## TESTING

Manual browser testing against real GitHub pages:
- MDC files with mermaid fences render diagrams on hard refresh and SPA navigation.
- MDC files without mermaid fences render normally; no mermaid script injected.
- SPA navigation between MDC and non-MDC pages: clean toggle state, no stale views.
- Footnotes, code blocks, frontmatter, and anchor handling all verified as regression-free.

## LESSONS LEARNED

- **GitHub's CSP is triple-locked**: `script-src` blocks external origins, inline scripts, and `eval()`/`new Function()`. Three successive bypass approaches failed before landing on `GM_addElement`, which injects from the extension context rather than the page origin.
- **Mermaid `startOnLoad: true` (default in v11)** creates a race condition with any code that creates `.mermaid`-classed elements before the script finishes loading. Solution: don't modify the DOM until the library is loaded.
- **Userscript cross-world boundaries**: primitives cross safely; complex objects (NodeLists) may not. Prefer string arguments (e.g., CSS selectors) when calling page-world APIs via `unsafeWindow`.
- **CSS classes > inline styles for SPA visibility toggling**: a class can be found and removed by name regardless of element; inline `display: none` requires knowing which element was hidden.

## PROCESS IMPROVEMENTS

- Include a "verify the loading mechanism works on the target site" spike before committing to a full implementation. CSP constraints and userscript sandbox behaviors are site-specific and not discoverable from code alone.
- "Loading…" placeholders were premature UX optimization. The existing highlighted code fence was already a perfectly good loading state. Removing the placeholder solved both a UX non-problem and a real technical bug.

## TECHNICAL IMPROVEMENTS

None beyond what was already implemented. The `GM_addElement` + polling pattern is reusable if a second optional dependency appears, but wrapping it in a utility is YAGNI until then.

## NEXT STEPS

None.
