---
task_id: perf-review-mdc-render
date: 2026-04-03
complexity_level: 2
---

# Reflection: Performance Review of mdc-render.js

## Summary

Applied three targeted performance fixes to a userscript that runs on every github.com page: eliminated `marked.use()` accumulation, added a content-change guard to skip redundant re-renders, and deferred DOM removal until replacement content is confirmed. All three were waste elimination, not algorithmic optimization.

## Requirements vs Outcome

All three planned requirements delivered exactly as specified. No gaps, no additions, no reinterpretation. The rework scope was well-defined and the changes were surgical.

## Plan Accuracy

The plan was accurate — three steps, each exactly as described, no reordering or splitting needed. The analysis phase (reading and understanding the full codebase to identify the issues) was where the real work happened. Planning and building were mechanical once the issues were identified.

## Build & QA Observations

Build was clean — three edits landed without iteration. QA passed on first pass. The simplicity of the changes reflected the nature of the task: these were "stop doing something wrong" fixes, not "start doing something clever" additions.

## Insights

### Technical

- `marked.use()` mutates global state cumulatively — it's not idempotent. This is a general gotcha with library configuration APIs that look like they should be called per-use but actually accumulate. Rule of thumb: if a library function modifies global configuration, call it once at initialization, not per-invocation. Same principle applies to `hljs.configure()` and similar setup-once APIs.

### Process

- The "stop doing something stupid" framing (from the user's quote) was the right lens. All three issues were cases of *doing unnecessary work*, not *doing necessary work inefficiently*. The distinction matters for prioritization: eliminating a redundant full re-render is a bigger win than optimizing the markdown parser, because the re-render shouldn't be happening at all.

### Million-Dollar Question

If the render function had been designed transactionally from the start — "prepare the new view, then swap" — the deferred removal and content guard would have been natural. The `marked.use()` fix is just initialization hygiene. The current design is now close to the transactional ideal: build new content off-DOM, verify it's valid, remove old, insert new. No sweeping redesign needed — these three fixes brought the existing design to its natural endpoint.
