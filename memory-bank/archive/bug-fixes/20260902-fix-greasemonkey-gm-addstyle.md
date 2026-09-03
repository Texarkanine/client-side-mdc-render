---
task_id: fix-greasemonkey-gm-addstyle
complexity_level: 1
date: 2026-09-02
status: completed
---

# TASK ARCHIVE: Fix Greasemonkey GM_addStyle compatibility

## SUMMARY

The userscript installed in Greasemonkey (LibreWolf on macOS) but did nothing — it threw `ReferenceError: GM_addStyle is not defined` on startup. Greasemonkey 4 removed `GM_addStyle` and never added `GM.addStyle`. Tampermonkey still provides the legacy grant. Added `injectCss()` that uses `GM_addStyle` when present and otherwise appends a page-DOM `<style>` element. GitHub's CSP allows `style-src 'unsafe-inline'`, so the DOM fallback works on target pages. Version bumped to 1.6.5. Closes #11.

## REQUIREMENTS

1. Fix Greasemonkey failure: `ReferenceError: GM_addStyle is not defined` ([issue #11](https://github.com/Texarkanine/client-side-mdc-render/issues/11)).
2. Preserve existing Tampermonkey behavior.
3. Remain a client-side userscript with declared grants and CDN libraries.

**Acceptance criteria met:**
- Greasemonkey no longer throws on CSS injection; script can render.
- Tampermonkey path unchanged (`@grant GM_addStyle` retained; grant-first branch).

## IMPLEMENTATION

**Root cause:** Two top-level `GM_addStyle()` calls ran unconditionally at script load. Greasemonkey 4 has neither `GM_addStyle` nor `GM.addStyle` — a rename shim would not have fixed this.

**Fix:** `injectCss(css)` with `typeof GM_addStyle === 'function'` guard (ReferenceError-safe) and DOM fallback via `document.createElement('style')` appended to `document.head || document.documentElement`.

**Files changed:**
- `mdc-render.js` — `injectCss()` helper; both CSS blocks routed through it; v1.6.5
- `lib/gm-compat.js` — canonical implementation for `node --test`
- `lib/gm-compat.test.js` — grant vs DOM-fallback unit tests
- `memory-bank/systemPatterns.md` — documented CSS injection contract
- `memory-bank/techContext.md` — noted `lib/` helpers are unit-tested

**Deliberately unchanged:** Mermaid lazy-load via `GM_addElement` — already fails closed with its own `typeof` guard when the grant is absent.

**Design note:** Logic is duplicated between `lib/gm-compat.js` and `mdc-render.js` because GreasyFork userscripts cannot load modules. Both files cross-reference each other ("keep in sync").

## TESTING

- `node --test` — 3/3 pass (`injectCss` grant path, head fallback, documentElement fallback).
- `/niko-qa` semantic review — **PASS** (build commit d0f25ea).
- Manual Greasemonkey/LibreWolf verification deferred to operator (not available in agent environment).

## LESSONS LEARNED

- Greasemonkey 4 removed `GM_addStyle` and never replaced it with `GM.addStyle`. Do not assume GM4's `GM.*` namespace mirrors Tampermonkey's legacy `GM_*` grants.
- `typeof undeclaredIdentifier === 'function'` is the safe feature-detection idiom when a grant may be absent — bare references throw `ReferenceError`.
- GitHub's `style-src 'unsafe-inline'` makes DOM `<style>` injection a valid CSS path on GitHub pages when the userscript grant is unavailable.

## PROCESS IMPROVEMENTS

Level 1 tasks normally skip archive; operator invoked `/niko-archive` explicitly for cleanup. No reflection phase for L1 — progress, tasks, projectbrief, and QA status provided sufficient archive source material.

## TECHNICAL IMPROVEMENTS

None required. If additional Greasemonkey grant gaps surface (beyond CSS), apply the same grant-first / DOM-or-fail-closed pattern rather than assuming legacy `GM_*` names exist.

## NEXT STEPS

None. Operator to verify in Greasemonkey/LibreWolf after installing v1.6.5.
