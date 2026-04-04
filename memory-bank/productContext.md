# Product Context

## Target Audience

- Developers and AI-assisted contributors who author Cursor rule files (`.mdc`) and review them on GitHub.
- Users of userscript managers (for example Tampermonkey/Greasemonkey) who want local rendering improvements without changing repository contents.

## Use Cases

- Read `.mdc` rule files on GitHub as rendered Markdown instead of raw source.
- Toggle quickly between rendered and source views for authoring and debugging.
- Preserve practical navigation behavior by keeping line-number anchors in source mode and footnote anchors in rendered mode.

## Key Benefits

- Improves readability and scanability of Cursor rule files directly in GitHub UI.
- Keeps workflow lightweight: client-side only, no server-side integration or repository changes required.
- Makes mixed content (frontmatter, markdown, code blocks, footnotes) easier to review with syntax highlighting.

## Success Criteria

- Script activates only on GitHub `.mdc` pages and reliably renders content.
- Toggle control is available and mode switching is stable across SPA navigation.
- Rendering remains synchronized with page content updates and preserves expected anchor behavior.

## Key Constraints

- Must run as a userscript in browser context and depend on external CDN libraries declared in metadata headers.
- Must tolerate GitHub DOM and SPA navigation changes, which are outside project control.
- Adds some browser-side overhead while browsing GitHub, especially on content changes.
