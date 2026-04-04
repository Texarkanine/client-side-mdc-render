---
task_id: perf-review-mdc-render
complexity_level: 2
date: 2026-04-03
status: completed
---

# TASK ARCHIVE: Performance Review of mdc-render.js

## SUMMARY

Applied three targeted performance fixes to a userscript that runs on every github.com page: eliminated `marked.use()` extension accumulation, added a content-change guard to skip redundant re-renders, and deferred DOM removal until replacement content is confirmed. All three were waste elimination, not algorithmic optimization. Post-PR-review, also hardened the content-change guard to verify DOM existence.

## REQUIREMENTS

- Review `mdc-render.js` for unnecessary work.
- Eliminate waste without sacrificing functionality, correctness, or adding complexity.
- Guiding principle: "If you get a 2x increase, you started doing something smart. If you get a 100x increase, you stopped doing something stupid." Look for the stupid.

## IMPLEMENTATION

All changes in `mdc-render.js`:

1. **Hoist `marked.use(markedFootnote())`**: Moved from inside `renderMDC()` (called every render) to one-time initialization in the IIFE body. `marked.use()` mutates global state cumulatively — calling it per-render accumulated duplicate extensions that all evaluated on each parse. Memory leak + progressive performance degradation.

2. **Content-change guard**: Added `lastRenderedContent` state variable. If textarea content hasn't changed since last successful render and the rendered DOM element still exists, `renderMDC()` returns early. Reset on `cleanup()`. The MutationObserver fires on any DOM mutation (React re-renders, attribute changes), so without this guard each mutation triggered full markdown parsing + highlighting + mermaid injection.

3. **Deferred DOM removal**: Moved `document.getElementById(RENDERED_ID)?.remove()` to just before `insertBefore()`. The old view stays visible until the new one is ready. Previously, removing first and then failing content validation left a flash of raw source.

Post-PR-review fix: the content-change guard at line 349 originally only checked `content === lastRenderedContent`. CodeRabbit correctly identified that SPA navigation can destroy the rendered DOM node while content stays the same. Added `&& document.getElementById(RENDERED_ID)` to the guard so a missing node forces re-render.

## TESTING

Manual browser testing against real GitHub pages:
- Extension accumulation: consistent render times across SPA navigation, footnotes still correct.
- Content-change guard: observer mutations with unchanged content don't trigger re-render log.
- Deferred removal: no flash of raw source during hydration.
- Regressions: basic rendering, toggle, SPA navigation, anchor handling all verified.

## LESSONS LEARNED

- **Library config APIs that mutate global state must be called once at init, not per-invocation.** `marked.use()` is not idempotent — it pushes extensions onto an internal list. Same principle applies to `hljs.configure()` and similar setup-once APIs. If a library function modifies global configuration, treat it as initialization code.
- **Content-change guards need DOM existence checks too.** A string cache hit doesn't guarantee the DOM artifact is still present after SPA navigation. Both conditions must be true for a cache hit to be valid.
- **The "stop doing something stupid" framing** is the right lens for performance review. All three issues were cases of doing unnecessary work, not doing necessary work inefficiently. Eliminating a redundant full re-render is a bigger win than optimizing the parser.

## PROCESS IMPROVEMENTS

No process changes needed. The analysis-driven approach (read the full codebase, identify the waste, plan surgical fixes) worked well for this type of task.

## TECHNICAL IMPROVEMENTS

The render function is now close to a transactional ideal: build new content off-DOM, verify it's valid, remove old, insert new. No sweeping redesign was needed — three targeted fixes brought the existing design to its natural endpoint.

## NEXT STEPS

None.
