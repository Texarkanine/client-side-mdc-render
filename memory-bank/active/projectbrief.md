# Project Brief

## Task
Add Mermaid diagram rendering support to MDC content, with optional loading so Mermaid is only fetched when Mermaid blocks are present.

## Requirements
- Detect Mermaid code fences in rendered MDC content.
- Load Mermaid lazily and initialize only when needed.
- Keep baseline payload small when no Mermaid diagrams are present.
- Clarify whether GitHub Mermaid behavior can be reused directly in this client-side renderer.

## Constraints
- Existing non-Mermaid rendering behavior must remain unchanged.
- Keep implementation simple and maintainable in this single-file renderer.

## Rework: Performance Review
**Context:** This userscript is injected on *every* github.com page. Performance matters — we need to make sure we aren't doing anything unnecessarily expensive.
**Goal:** Review the full `mdc-render.js` for performance issues. Eliminate waste without sacrificing functionality, correctness, or increasing complexity.
**Guiding principle:** "If you get a 2x performance increase, you started doing something smart. If you get a 100x performance increase, you stopped doing something stupid." We're looking for the stupid.
