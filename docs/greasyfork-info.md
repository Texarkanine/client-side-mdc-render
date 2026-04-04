# Render Cursor Rules as Markdown on GitHub

This UserScript renders Cursor Rules (`*.mdc`) markdown on GitHub into actual Markdown.

There will be a little toggle button in the top right of the page that allows you to switch between the rendered and source views:

![Toggle Button](https://github.com/Texarkanine/client-side-mdc-render/raw/main/docs/mdc-toggle.png)

## Notes

1. Uses the [marked](https://github.com/markedjs/marked) library to render the markdown, `@require`'d by *monkey from the CDN.
    - includes the [marked-footnote](https://github.com/bent10/marked-extensions/tree/main/packages/footnote) extension to render footnotes.
2. Uses the [highlight.js](https://github.com/highlightjs/highlight.js) library to syntax highlight code blocks.
3. Bakes in some CSS to make the markdown look like GitHub's default markdown; may differ slightly from "normal" GitHub markdown.
4. [Mermaid](https://mermaid.js.org/) diagrams are supported via lazy loading. The ~2 MB Mermaid runtime is fetched only when a rendered `.mdc` file includes fenced `mermaid` blocks. It is injected using `GM_addElement` to bypass GitHub's Content Security Policy. This requires the `GM_addElement` grant, which is supported by Tampermonkey, Violentmonkey, and Greasemonkey.
5. This **will** add some overhead to your GitHub browsing experience.

## Example

![Example](https://github.com/Texarkanine/client-side-mdc-render/raw/main/docs/mdc-example.png)
