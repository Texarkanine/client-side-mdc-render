/**
 * Canonical implementation for `node --test`; duplicate logic in mdc-render.js
 * (GreasyFork userscripts cannot load this module).
 */

/**
 * Inject CSS using the userscript `GM_addStyle` grant when present, otherwise
 * a page-DOM `<style>` element. Greasemonkey 4 removed `GM_addStyle` and never
 * added `GM.addStyle`. GitHub's CSP allows `style-src 'unsafe-inline'`, so the
 * DOM path works on the pages this script targets.
 *
 * @param {string} css
 * @param {{ addStyle?: Function, document: { head?: { appendChild: Function } | null, documentElement: { appendChild: Function }, createElement: Function } }} env
 * @returns {unknown} Result of `addStyle`, or the created style element
 */
export function injectCss(css, env) {
	if (typeof env.addStyle === 'function') {
		return env.addStyle(css);
	}
	const style = env.document.createElement('style');
	style.textContent = css;
	(env.document.head || env.document.documentElement).appendChild(style);
	return style;
}
