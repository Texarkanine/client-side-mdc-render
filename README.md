# Render Cursor Rules as Markdown on GitHub

This UserScript renders Cursor Rules (*.mdc) markdown on GitHub into actual Markdown.

## Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) or [Greasemonkey](https://www.greasespot.net/)
2. Install the script from [GreasyFork](https://greasyfork.org/en/scripts/537391-cursor-rule-markdown-renderer-for-github)
3. Enjoy GitHub rendering Cursor Rules as Markdown!

## Notes

1. Uses the [marked](https://github.com/markedjs/marked) library to render the markdown, `@require`'d by *monkey from the CDN.
    - this WILL add some overhead to your GitHub browsing experience.
2. Uses the [highlight.js](https://github.com/highlightjs/highlight.js) library to syntax highlight code blocks.
3. Bakes in some CSS to make the markdown look like GitHub's default markdown (can't load it live because of GitHub's [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP))
