---
task_id: optional-mermaid-rendering
date: 2026-04-03
complexity_level: 2
---

# Reflection: Optional Mermaid Rendering for MDC

## Summary

Added lazy Mermaid diagram rendering to the MDC userscript using `GM_addElement` to bypass GitHub's CSP, then reworked the implementation through several rounds of user-reported browser testing to fix a `startOnLoad` race condition, simplify the code, and fix a pre-existing SPA navigation bug.

## Requirements vs Outcome

All requirements delivered. The original brief's "clarify GitHub Mermaid behavior" question was answered conclusively during troubleshooting: GitHub renders Mermaid server-side, so its approach cannot be reused by a client-side userscript. An additional pre-existing bug was discovered and fixed during testing: SPA navigation from .mdc to non-.mdc files left the source section hidden because `cleanup()` depended on an element (`#read-only-cursor-text-area`) that doesn't exist on the new page.

## Plan Accuracy

The initial plan assumed standard script injection would work on GitHub. It didn't — GitHub's CSP blocked three successive approaches (`<script src>`, ESM blob import, `new Function()` eval). The plan had to be rearchitected after empirical testing. The final `GM_addElement` approach was not in the original plan at all; it emerged from systematic diagnosis of what GitHub's CSP actually enforces.

Even after landing on `GM_addElement`, two additional issues surfaced only through real browser testing:
1. **Mermaid's `startOnLoad: true` default** auto-scanned the DOM when the script finished loading, found our placeholder divs with "Loading diagram…" text, failed to parse them, and marked them `data-processed`. Our subsequent manual `mermaid.run()` then skipped them. This only manifested on hard refresh (cache miss → slow script load → placeholders already in DOM when auto-scan fires).
2. **Cross-world argument passing**: objects created in the userscript sandbox don't reliably survive export to page-world functions accessed via `unsafeWindow`.

Neither issue was predictable from code review alone — both required browser testing with specific refresh behaviors.

## Build & QA Observations

The rework phase was the real build. The progression of fixes followed a satisfying KISS trajectory:
- First attempt: staging class `mermaid-pending` to hide from auto-scan → worked but complex.
- User insight: "do we NEED to show 'Loading diagram'?" → eliminated the placeholder entirely. The highlighted code fence is perfectly good content while mermaid loads.
- This simpler approach also eliminated the race condition, the staging class, the restore logic, and the error-path DOM cleanup — all in one move.

The pre-existing SPA bug fix was clean: replaced inline `style.display = 'none'` with a CSS class `.mdc-source-hidden`, making `cleanup()` independent of element IDs that may not exist on the target page.

## Insights

### Technical
- **Mermaid `startOnLoad: true`** is the default in v11. Any code that creates `.mermaid`-classed elements before the mermaid script finishes loading is in a race with auto-start. The cleanest fix is to never expose the `.mermaid` class until you're ready to call `run()` — or, even better, don't modify the DOM at all until the library is loaded.
- **Userscript cross-world boundaries** are subtle. Primitives (strings, numbers) cross safely; complex objects (NodeLists, plain objects) may not. When calling page-world APIs via `unsafeWindow`, prefer string arguments (e.g. `querySelector` selector strings) over object arguments.
- **CSS classes are more robust than inline styles for visibility toggling** across SPA navigations. A class can be found and removed by name regardless of what element it's on; an inline `display: none` requires knowing which element was hidden.

### Process
- The initial plan should have included a "verify the loading mechanism works on the target site" spike before committing to a full implementation. CSP constraints and userscript sandbox behaviors are site-specific and not discoverable from code alone.
- The "Loading diagram…" placeholder was premature optimization of perceived UX. The user's question — "do we NEED this?" — was the right one. The existing code-fence rendering was already good enough as a loading state. Removing the placeholder solved both a UX non-problem and a real technical bug in one move.

### Million-Dollar Question

If lazy CSP-safe loading and the `startOnLoad` race had been foundational assumptions from the start, the architecture would have two clean rules: (1) never add class `mermaid` to any element until you're ready to hand it to `mermaid.run()`, and (2) always toggle visibility via CSS classes rather than inline styles. The current implementation follows both rules. The general-purpose `lazyLoadLibrary(url)` utility built on `GM_addElement` + polling remains YAGNI until a second optional dependency appears.
