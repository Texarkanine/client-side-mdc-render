# Troubleshooting: Mermaid lazy-loading vs GitHub CSP

## Problem
Three successive attempts to lazy-load Mermaid at runtime on GitHub pages have failed due to GitHub's Content Security Policy.

## Failed Approaches

### Attempt 1: `<script src="cdn.jsdelivr.net/...">` injection
- **Result:** `script-src-elem` violation — GitHub CSP only allows scripts from `github.githubassets.com` and a page-specific nonce.

### Attempt 2: GM_xmlhttpRequest + blob ESM `import()`
- **Result:** `TypeError: Error resolving module specifier "./chunks/..."` — Mermaid ESM bundle is multi-file; relative chunk imports fail from blob URL context.

### Attempt 3: GM_xmlhttpRequest + `new Function()` eval of UMD
- **Result:** `EvalError: call to Function() blocked by CSP` — GitHub's CSP does not include `unsafe-eval`, so `new Function()` is blocked even in page context.

## Root Cause Analysis
GitHub's CSP enforces all three of:
1. `script-src` with nonce-only (no external CDN origins) — blocks `<script>` injection
2. No `unsafe-eval` — blocks `eval()`, `new Function()`, `setTimeout(string)` 
3. Blob/data URLs inherit page origin but can't resolve relative module specifiers

The userscript sandbox (Tampermonkey/Greasemonkey) bypasses CSP for its own `@require` scripts because those execute in the extension's privileged context. But once we try to execute *new* code in page context at runtime, CSP applies.

## Hypotheses for Alternative Approaches

- [ ] H1: `@require` Mermaid in userscript metadata (always loaded, render lazy)
- [ ] H2: Server-side rendering API (mermaid.ink / kroki.io)
- [ ] H3: Lighter Mermaid alternative that could be bundled inline
- [ ] H4: Some other userscript API that evaluates code in extension context

## Investigation

### H1: `@require` (always loaded)
- Proven pattern: `marked`, `marked-footnote`, `highlight.js` all use this today.
- Runs in extension context, immune to page CSP.
- Mermaid JS is loaded on *every* `github.com/*` page (the `@match` scope).
- Need to determine: how large is the Mermaid UMD payload?

### H2: Server-side render via mermaid.ink / kroki.io
- Truly lazy: only fetched per-diagram when Mermaid blocks exist.
- Can use GM_xmlhttpRequest to fetch SVG (CSP-safe for XHR).
- Trade-off: external service dependency + diagram content sent to third party.

### H3: Lightweight alternative
- Need to check if any exists.

### H4: Extension-context eval
- Need to check GM.eval / content script tricks.
