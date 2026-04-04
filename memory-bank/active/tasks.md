# Task: Performance Review of mdc-render.js

* Task ID: perf-review-mdc-render
* Complexity: Level 2
* Type: performance rework

Review `mdc-render.js` for unnecessary work. This userscript runs on every github.com page — eliminate waste without sacrificing functionality, correctness, or adding complexity.

## Verification Plan

Behavioral verification via manual browser testing (no automated test infrastructure; per user instruction from prior task).

### Behaviors to Verify

- **Extension accumulation fix**: Navigate between multiple MDC files via SPA navigation. Open browser console and verify `[mdc-lite]` logs show consistent render times (no progressive slowdown). Confirm footnotes still render correctly.
- **Content-change guard**: On an MDC page, observe console logs. Textarea observer mutations that don't change content should NOT produce `[mdc-lite] Textarea content changed, re-rendering` log entries. Actual content changes should still trigger re-render.
- **Deferred removal**: Navigate to an MDC page. If textarea briefly has no content during hydration, the previously rendered view should remain visible rather than flashing to empty.
- **Regression: basic rendering**: MDC files render correctly with frontmatter, code blocks, footnotes, and mermaid diagrams.
- **Regression: toggle**: Source/rendered toggle works in both directions.
- **Regression: SPA navigation**: Navigate between MDC and non-MDC pages. Cleanup and re-render work correctly.
- **Regression: anchor handling**: Line-number anchors default to source mode; footnote anchors default to rendered mode.

### Test Infrastructure

- Framework: Manual browser testing
- Test location: N/A (functional verification in browser against real GitHub pages)
- Conventions: Console log inspection + visual verification
- New test files: none

## Implementation Plan

### Step 1: Hoist `marked.use(markedFootnote())` to initialization

- File: `mdc-render.js`
- Changes:
  - Add `marked.use(markedFootnote());` once in the IIFE body, near other initialization code (after the constants/state declarations, before function definitions).
  - Change line 351 from `marked.use(markedFootnote()).parse(processedContent)` to `marked.parse(processedContent)`.
- Why: `marked.use()` mutates the global marked instance by pushing extensions onto an internal list. Calling it every render accumulates duplicate extensions that are all evaluated on each parse. This is a memory leak and progressively degrades parse performance.

### Step 2: Add content-change guard to re-render path

- File: `mdc-render.js`
- Changes:
  - Add a module-level variable `let lastRenderedContent = null;` alongside the other state variables.
  - In `renderMDC`, after reading `content` from the textarea, check `if (content === lastRenderedContent) return true;` (return true because the current render is still valid).
  - Set `lastRenderedContent = content;` after successful render.
  - In `cleanup()`, reset `lastRenderedContent = null;` so the next MDC page renders fresh.
- Why: The textarea MutationObserver fires on any DOM mutation (React re-renders, attribute changes, etc.). Without this guard, each mutation triggers full markdown parsing, DOM construction, hljs highlighting, and mermaid injection — even when the text hasn't changed.

### Step 3: Defer rendered-div removal until content is validated

- File: `mdc-render.js`
- Changes:
  - Move `existing?.remove()` (currently line 344-345) to just before `section.parentElement.insertBefore(rendered, section)` (line 365). This way the old view stays visible until the new one is ready to be inserted.
- Why: Currently, the existing rendered div is removed before we even check if the textarea has content. If content validation fails, we've destroyed the rendered view for nothing, causing a flash of raw source.

## Technology Validation

No new technology — validation not required.

## Dependencies

- No changes to dependencies.

## Challenges & Mitigations

- **`marked.use()` idempotency**: Need to verify that calling `marked.use(markedFootnote())` once is sufficient for all subsequent `marked.parse()` calls. The marked docs confirm extensions persist once registered. Low risk.
- **Content-change guard false positives**: If GitHub delivers content in stages (e.g., partial then full), the guard would correctly allow the second render since content differs. If content changes character-for-character, the string comparison catches it. The guard only suppresses truly identical re-renders.
- **Deferred removal timing**: The old and new rendered divs briefly coexist in the DOM (both have `id=RENDERED_ID`). The new div is created but not yet inserted when the old one is removed, so `document.getElementById` would return null during that instant. This is fine because no code queries by ID in that window.

## Status

- [x] Initialization complete
- [x] Verification plan complete
- [x] Implementation plan complete
- [x] Technology validation complete
- [x] Preflight
- [x] Build
- [x] QA
