# Tech Context

A browser userscript project that enhances GitHub `.mdc` file pages using client-side markdown parsing and syntax highlighting.

## Environment Setup

- Install a userscript manager extension (for example Tampermonkey or Greasemonkey) in a supported browser.
- Install this script into the userscript manager and allow it to run on `https://github.com/*` as defined in userscript metadata.
- Verify external CDN assets declared in userscript `@require` headers are reachable from the runtime environment.

## Build Tools

- No traditional compile/bundle step is required; the canonical implementation is the single userscript file `mdc-render.js`.
- Userscript metadata (`// ==UserScript==` block in `mdc-render.js`) is the authority for runtime wiring: target URL matching, grants, and external libraries. Note: some libraries (e.g., Mermaid) are loaded dynamically via `GM_addElement` rather than declared in `@require`, to enable lazy loading and bypass GitHub's CSP.

## Testing Process

- Validation is primarily functional/manual in the browser against real GitHub `.mdc` pages.
- Extracted helpers under `lib/` are unit-tested with `node --test`.
- Core behavior to verify after changes: activation gating by URL, render success/fallback behavior, toggle state transitions, anchor handling, and cleanup across SPA navigation.
- Repository-level usage guidance and installation details live in `README.md`.

## Design System

- Visual styling is intentionally aligned with GitHub's Markdown presentation using `markdown-body` classes and injected CSS in `mdc-render.js`.
- Syntax highlighting is delegated to `highlight.js` loaded from userscript metadata configuration.
