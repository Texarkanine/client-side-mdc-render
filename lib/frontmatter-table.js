/**
 * Canonical implementation for `node --test`; duplicate logic in mdc-render.js
 * (GreasyFork userscripts cannot load this module).
 */

export const YAML_FRONTMATTER_REGEX =
	/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;

/**
 * @param {string} text
 * @returns {string}
 */
export function escapeHtmlCell(text) {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

/**
 * Build a headerless two-column table as HTML.
 * Plain `key | value` markdown is not reliably parsed as a GFM table without a separator row;
 * HTML tbody-only tables match the usual "metadata sheet" look and render consistently in marked.
 *
 * @param {string} yamlContent - Text between --- fences (no delimiters)
 * @returns {string} HTML fragment
 */
export function yamlFrontmatterBlockToTableHtml(yamlContent) {
	const rowsHtml = [];
	const lines = yamlContent.split(/\r?\n/);

	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) {
			continue;
		}

		const colon = trimmed.indexOf(':');
		if (colon === -1) {
			const esc = escapeHtmlCell(trimmed);
			rowsHtml.push(
				`<tr><td colspan="2">${esc}</td></tr>`,
			);
			continue;
		}

		const key = trimmed.slice(0, colon).trim();
		const value = trimmed.slice(colon + 1).trim();
		rowsHtml.push(
			`<tr><td>${escapeHtmlCell(key)}</td><td>${escapeHtmlCell(
				value,
			)}</td></tr>`,
		);
	}

	return `<table class="mdc-frontmatter-table"><tbody>${rowsHtml.join(
		'',
	)}</tbody></table>`;
}

/**
 * @param {string} content
 * @param {RegExp} [frontmatterRegex]
 * @returns {string}
 */
export function processContent(content, frontmatterRegex = YAML_FRONTMATTER_REGEX) {
	const match = content.match(frontmatterRegex);
	if (match) {
		const [, yamlContent, markdownContent] = match;
		const table = yamlFrontmatterBlockToTableHtml(yamlContent);
		return `${table}\n\n${markdownContent}`;
	}
	return content;
}
