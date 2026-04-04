---
task_id: fix-hljs-syntax-coloring
complexity_level: 2
date: 2026-04-04
status: completed
---

# TASK ARCHIVE: Fix highlight.js syntax coloring on fenced code blocks

## SUMMARY

Fenced code blocks in rendered `.mdc` files (e.g. ` ```typescript `) were monochrome despite highlight.js being loaded and `highlightElement()` being called. Two root causes were identified and fixed: (1) no CSS rules existed for hljs token classes, and (2) a prior agent's attempt to fix the CSS introduced a JS regression by accessing hljs via `globalThis` instead of the closure-scoped bare variable. The fix adds an inline CSS mapping from `hljs-*` classes to GitHub's `--color-prettylights-syntax-*` CSS custom properties, which auto-adapt to all GitHub themes with zero network requests and zero runtime logic.

## REQUIREMENTS

1. Syntax-highlighted fenced code blocks must display colored tokens.
2. Colors must respect GitHub's light/dark theme automatically.
3. Prefer GitHub's already-loaded CSS over pulling additional external stylesheets. Minimize network requests.
4. Remove the prior agent's non-working external stylesheet approach.

## IMPLEMENTATION

**Net change from v1.6.1 baseline:** version bump to 1.6.2, +1 `GM_addStyle()` block (~55 lines of CSS).

**Root cause diagnosis:**

- **Original bug (CSS):** `hljs.highlightElement()` was running and adding `<span class="hljs-keyword">`, `<span class="hljs-string">`, etc. to the DOM, but no CSS rules existed for those classes. The hljs `@require` loads the JS engine only; theme CSS is a separate file. Without it, tokens inherit the parent's text color and appear monochrome.

- **Prior agent regression (JS):** Composer changed `hljs.highlightElement(block)` to `getHighlightJs().highlightElement(block)`, where `getHighlightJs()` checked `globalThis.hljs`. In Tampermonkey's sandbox, `@require`-loaded libraries create variables in the userscript's closure scope, NOT on `globalThis`. So `globalThis.hljs` was `undefined` and the hljs call silently stopped running entirely. Proof: `marked`, `markedFootnote`, and `hljs` all work as bare names via closure but are not properties of `globalThis`.

**Fix applied:**

- Reverted the hljs call to bare `hljs.highlightElement(block)` (closure-accessible from `@require`).
- Removed all of Composer's infrastructure: `HLJS_THEME_STYLESHEETS`, `HLJS_STYLE_LINK_ID`, `syncHljsStylesheet()`, `ensureHljsThemeObserver()`, `isGithubDarkColorMode()`, `getHighlightJs()`, `hljsThemeObserver` state variable.
- Added inline CSS via `GM_addStyle()` mapping every hljs token class to GitHub's `--color-prettylights-syntax-*` CSS custom properties. These are defined on every GitHub page by Primer Primitives and automatically adapt to light, dark, and custom themes.

**Key design decision — CSS variables vs `@resource` + `GM_getResourceText`:**

The alternative considered was preloading hljs's official `github.min.css` / `github-dark.min.css` at install time via `@resource` metadata and injecting at runtime via `GM_getResourceText`. This would eliminate the hand-maintained CSS mapping. However:

- hljs theme files ship hardcoded colors (light-mode only per file). Supporting dark mode would require runtime theme detection, dynamic style swapping, and a MutationObserver on `data-color-mode` — roughly what Composer built, and roughly what broke.
- It introduces a new `@grant` (`GM_getResourceText`).
- It doesn't adapt to custom GitHub themes — only light and dark.

The CSS variable approach was chosen because it is the only way to get automatic adaptation to all GitHub themes (light, dark, custom) with no runtime logic, no observers, no dynamic style injection, and no CDN fetches. The cost is a hand-maintained mapping of ~44 lines of static CSS between two structurally stable systems.

**Files changed:** `mdc-render.js` only.

## TESTING

Validation is manual/browser-based per project convention (no automated test infrastructure exists). Verified by loading `discord-api.mdc` on GitHub and confirming TypeScript fenced code blocks display colored syntax tokens. QA semantic review passed: KISS, DRY, YAGNI, completeness, regression, and integrity checks all clean. One trivial documentation fix applied during QA: `systemPatterns.md` updated to note the CSS variable dependency as a load-bearing assumption.

## LESSONS LEARNED

- **Userscript sandbox scoping:** `@require`-loaded libraries in Tampermonkey are closure-scoped. `var hljs = ...` from the `@require`'d script is accessible as a bare name but is NOT on `globalThis`. Always use bare names for `@require`'d globals; never wrap them in `globalThis` lookups.

- **GM_addElement reliability:** `GM_addElement('script', ...)` bypasses CSP reliably (proven with Mermaid). `GM_addElement('link', ...)` for external stylesheets does NOT reliably work — likely CSP `style-src` restrictions or DOM scope issues. Use `GM_addStyle()` for CSS injection in userscripts.

- **CSS variable piggybacking:** GitHub's `--color-prettylights-syntax-*` variables control ALL of GitHub's own syntax highlighting (`pl-*` classes). GitHub can't remove them without breaking their own site. This makes them the optimal theming bridge for userscript CSS that needs to match the host page's theme. Degradation if they're ever removed: monochrome code blocks (functional, not broken).

## PROCESS IMPROVEMENTS

- **Verify JS execution before adding CSS:** When fixing rendering bugs involving library integration, confirm the library is actually callable before layering CSS on top. A `console.log(typeof hljs)` at the call site would have immediately revealed the `globalThis` regression.

- **Operator pushback improves design:** The operator's challenge ("do we need this? why not free?") forced a thorough tradeoff analysis. Record design decisions and their rejected alternatives, not just implementations. The reasoning outlasts the code.

## TECHNICAL IMPROVEMENTS

None. The current approach — static CSS mapping to Primer design tokens — is the most elegant solution for the stated requirements. If hljs were ever replaced with a different highlighter, the mapping would need updating to match the new class vocabulary.

## NEXT STEPS

None.
