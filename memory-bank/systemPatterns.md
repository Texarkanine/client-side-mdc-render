# System Patterns

## How This System Works

The project is a single self-contained userscript that augments GitHub file pages in-place. It detects whether the current URL points to an `.mdc` file, reads the existing page content from GitHub's read-only text area, transforms it (frontmatter extraction plus markdown rendering), and injects a rendered container adjacent to the original source section. A small segmented toggle controls which view is visible. Because GitHub behaves as a single-page app, the script relies on URL-change detection and idempotent cleanup/re-render cycles to avoid stale UI or duplicate controls.

The load-bearing assumptions are GitHub DOM selectors (for file content and toolbar), URL shape for `.mdc` files and anchors, and availability of globally loaded rendering/highlighting libraries from userscript `@require` entries. If those assumptions drift, rendering can silently fail or degrade to source-only view.

## Activation and Lifecycle Gating

Activation is strictly gated by `MDC_FILE_REGEX` and centralized in `handlePageChange()`. The script follows a lifecycle of `init -> detect -> render/observe -> cleanup`, with `isActive` preventing duplicate setup and ensuring teardown on non-`.mdc` navigation.

## DOM Injection with Reversible View Switching

Rendered output is inserted as a sibling to GitHub's existing source section and toggled via `display` changes rather than replacing source DOM. This preserves source-mode behavior (including GitHub-native line anchors) while allowing rendered-mode enhancements.

## Resilience via Retry and Mutation Observation

Initial render can fail when GitHub content has not mounted yet, so rendering retries at short intervals up to a max attempt threshold. Once active, a `MutationObserver` on the source textarea triggers re-renders to keep output synchronized with asynchronous page updates.

## Anchor-Aware Default Mode

Default mode selection is pattern-based: line anchors prefer source mode and footnote anchors prefer rendered mode. This reconciles GitHub-native line navigation with generated rendered footnote navigation and avoids forcing one mode for all anchor types.
