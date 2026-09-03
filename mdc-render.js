// ==UserScript==
// @name         Cursor Rule Markdown Renderer for GitHub
// @namespace    https://github.com/texarkanine
// @version      1.6.5
// @description  Renders Cursor Rules (*.mdc) markdown on GitHub into actual Markdown locally, using the marked library + highlight.js.
// @author       Texarkanine
// @licence      GPLv3
// @homepageURL  https://github.com/texarkanine/client-side-mdc-render
// @supportURL   https://github.com/texarkanine/client-side-mdc-render/issues
// @match        https://github.com/*
// @icon         data:image/png;base64,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
// @grant        GM_addStyle
// @grant        GM_addElement
// @grant        unsafeWindow
// @require      https://cdn.jsdelivr.net/npm/marked@15/lib/marked.umd.min.js
// @require      https://cdn.jsdelivr.net/npm/marked-footnote@1/dist/index.umd.min.js
// @require      https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets@11/highlight.min.js
// ==/UserScript==

(function() {
	'use strict';

	/** Set to `true` locally when troubleshooting; keep `false` for published releases. */
	const DEBUG = false;

	// Updated regex to match .mdc files
	const MDC_FILE_REGEX = /^https:\/\/github\.com\/.*\.mdc(#.*)?$/;
	const YAML_FRONTMATTER_REGEX = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
	
	// Regex to detect specific anchor types
	const LINE_NUMBER_ANCHOR_REGEX = /^#L\d+$/;
	const FOOTNOTE_ANCHOR_REGEX = /^#footnote-/;

	const RENDERED_LABEL = 'M⇩';
	const SOURCE_LABEL = '.mdc';

	const MAX_RENDER_ATTEMPTS = 50;
	const RENDER_RETRY_INTERVAL = 100;

	const MERMAID_CDN_URL = 'https://cdn.jsdelivr.net/npm/@mermaid-js/tiny@11/dist/mermaid.tiny.js';
	const MERMAID_POLL_INTERVAL = 50;
	const MERMAID_POLL_TIMEOUT = 15000;

	const RENDERED_ID = 'client-side-mdc-markdown';

	let currentUrl = location.href;
	let isActive = false;
	let textareaObserver = null;
	let mermaidLoadPromise = null;
	let lastRenderedContent = null;

	marked.use(markedFootnote());

	/**
	 * Duplicated from lib/gm-compat.js — keep in sync.
	 * Greasemonkey 4 removed GM_addStyle and never added GM.addStyle.
	 * @param {string} css
	 */
	function injectCss(css) {
		if (typeof GM_addStyle === 'function') {
			return GM_addStyle(css);
		}
		const style = document.createElement('style');
		style.textContent = css;
		(document.head || document.documentElement).appendChild(style);
		return style;
	}

	injectCss(`
		#client-side-mdc-markdown {
			box-sizing: border-box;
			min-width: 200px;
			max-width: 980px;
			margin: 24px auto 0;
			padding: 45px;
			word-wrap: break-word;
		}
		.mdc-source-hidden {
			display: none !important;
		}
		#client-side-mdc-markdown table.mdc-frontmatter-table {
			display: table;
			width: 100%;
			max-width: 100%;
			border-collapse: collapse;
			margin: 0 0 16px;
			font-size: 85%;
			color: var(--fgColor-default, var(--color-fg-default, inherit));
		}
		#client-side-mdc-markdown table.mdc-frontmatter-table td {
			border: 1px solid var(
				--borderColor-default,
				var(--color-border-default)
			);
			padding: 6px 13px;
			vertical-align: top;
		}
		#client-side-mdc-markdown table.mdc-frontmatter-table td:first-child {
			font-weight: 600;
			width: 1%;
			white-space: nowrap;
			background-color: var(
				--bgColor-muted,
				var(--color-canvas-subtle)
			);
		}
	`);

	/**
	 * Map highlight.js token classes to GitHub's Primer design-system variables.
	 * These `--color-prettylights-syntax-*` properties are defined on every GitHub
	 * page and automatically adapt to light, dark, and custom themes — no external
	 * stylesheet fetch required.
	 *
	 * Mapping derived from the hljs "github" / "github-dark" themes cross-referenced
	 * with Primer Primitives color definitions.
	 */
	injectCss(`
		#client-side-mdc-markdown pre code.hljs { display: block; overflow-x: auto; padding: 1em; }
		#client-side-mdc-markdown code.hljs { padding: 3px 5px; }
		#client-side-mdc-markdown .hljs { color: var(--color-prettylights-syntax-storage-modifier-import); }
		#client-side-mdc-markdown .hljs-doctag,
		#client-side-mdc-markdown .hljs-keyword,
		#client-side-mdc-markdown .hljs-meta .hljs-keyword,
		#client-side-mdc-markdown .hljs-template-tag,
		#client-side-mdc-markdown .hljs-template-variable,
		#client-side-mdc-markdown .hljs-type,
		#client-side-mdc-markdown .hljs-variable.language_ { color: var(--color-prettylights-syntax-keyword); }
		#client-side-mdc-markdown .hljs-title,
		#client-side-mdc-markdown .hljs-title.class_,
		#client-side-mdc-markdown .hljs-title.class_.inherited__,
		#client-side-mdc-markdown .hljs-title.function_ { color: var(--color-prettylights-syntax-entity); }
		#client-side-mdc-markdown .hljs-attr,
		#client-side-mdc-markdown .hljs-attribute,
		#client-side-mdc-markdown .hljs-literal,
		#client-side-mdc-markdown .hljs-meta,
		#client-side-mdc-markdown .hljs-number,
		#client-side-mdc-markdown .hljs-operator,
		#client-side-mdc-markdown .hljs-selector-attr,
		#client-side-mdc-markdown .hljs-selector-class,
		#client-side-mdc-markdown .hljs-selector-id,
		#client-side-mdc-markdown .hljs-variable { color: var(--color-prettylights-syntax-constant); }
		#client-side-mdc-markdown .hljs-meta .hljs-string,
		#client-side-mdc-markdown .hljs-regexp { color: var(--color-prettylights-syntax-string-regexp); }
		#client-side-mdc-markdown .hljs-string { color: var(--color-prettylights-syntax-string); }
		#client-side-mdc-markdown .hljs-built_in,
		#client-side-mdc-markdown .hljs-symbol { color: var(--color-prettylights-syntax-variable); }
		#client-side-mdc-markdown .hljs-code,
		#client-side-mdc-markdown .hljs-comment,
		#client-side-mdc-markdown .hljs-formula { color: var(--color-prettylights-syntax-comment); }
		#client-side-mdc-markdown .hljs-name,
		#client-side-mdc-markdown .hljs-quote,
		#client-side-mdc-markdown .hljs-selector-pseudo,
		#client-side-mdc-markdown .hljs-selector-tag { color: var(--color-prettylights-syntax-entity-tag); }
		#client-side-mdc-markdown .hljs-subst { color: var(--color-prettylights-syntax-storage-modifier-import); }
		#client-side-mdc-markdown .hljs-section { color: var(--color-prettylights-syntax-markup-heading); font-weight: 700; }
		#client-side-mdc-markdown .hljs-bullet { color: var(--color-prettylights-syntax-markup-list); }
		#client-side-mdc-markdown .hljs-emphasis { color: var(--color-prettylights-syntax-markup-italic); font-style: italic; }
		#client-side-mdc-markdown .hljs-strong { color: var(--color-prettylights-syntax-markup-bold); font-weight: 700; }
		#client-side-mdc-markdown .hljs-addition { color: var(--color-prettylights-syntax-markup-inserted-text); background-color: var(--color-prettylights-syntax-markup-inserted-bg); }
		#client-side-mdc-markdown .hljs-deletion { color: var(--color-prettylights-syntax-markup-deleted-text); background-color: var(--color-prettylights-syntax-markup-deleted-bg); }
	`);

	/**
	 * Gets the current anchor from the URL if present
	 * @returns {string|null} The anchor part of the URL, or null if no anchor
	 */
	function getCurrentAnchor() {
		const hashIndex = location.href.indexOf('#');
		return hashIndex !== -1 ? location.href.substring(hashIndex) : null;
	}

	/**
	 * Determines the default view mode based on the current anchor
	 * @returns {'rendered'|'source'} The view mode to use
	 */
	function getDefaultViewMode() {
		const anchor = getCurrentAnchor();
		
		if (!anchor) {
			return 'rendered';
		}
		
		// If it's a line number anchor, default to source mode
		if (LINE_NUMBER_ANCHOR_REGEX.test(anchor)) {
			return 'source';
		}
		
		// If it's a footnote anchor, default to rendered mode
		if (FOOTNOTE_ANCHOR_REGEX.test(anchor)) {
			return 'rendered';
		}
		
		// Default to rendered for all other anchors
		return 'rendered';
	}

	/**
	 * Scrolls to the current anchor if it exists
	 * @param {string} mode - Current view mode ('rendered' or 'source')
	 */
	function scrollToAnchor(mode) {
		const anchor = getCurrentAnchor();
		if (!anchor) return;
		
		// For line number anchors in source mode, GitHub's native handling works
		if (mode === 'source' && LINE_NUMBER_ANCHOR_REGEX.test(anchor)) {
			return;
		}
		
		// For footnote anchors in rendered mode, we need to handle scrolling
		if (mode === 'rendered' && FOOTNOTE_ANCHOR_REGEX.test(anchor)) {
			// Use setTimeout to ensure the DOM has updated
			setTimeout(() => {
				const targetElement = document.querySelector(anchor);
				if (targetElement) {
					targetElement.scrollIntoView();
				}
			}, 100);
		}
	}

	/**
	 * Duplicated from lib/frontmatter-table.js — keep in sync.
	 * @param {string} text
	 * @returns {string}
	 */
	function escapeHtmlCell(text) {
		return text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;');
	}

	/**
	 * Duplicated from lib/frontmatter-table.js — keep in sync.
	 * @param {string} yamlContent
	 * @returns {string}
	 */
	function yamlFrontmatterBlockToTableHtml(yamlContent) {
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
	 * Extracts YAML frontmatter and replaces it with a headerless two-column HTML table.
	 * Raw `key | value` markdown is not parsed as a GFM table by marked without a
	 * separator row; HTML matches the usual metadata preview and renders consistently.
	 * @param {string} content - Raw MDC file content
	 * @returns {string} Markdown body prefixed with frontmatter table HTML
	 */
	function processContent(content) {
		const match = content.match(YAML_FRONTMATTER_REGEX);
		if (match) {
			const [, yamlContent, markdownContent] = match;
			const table = yamlFrontmatterBlockToTableHtml(yamlContent);
			return `${table}\n\n${markdownContent}`;
		}
		return content;
	}

	/**
	 * GM_addElement injects into the page world, so the global may only
	 * be visible via unsafeWindow rather than the userscript sandbox's window.
	 */
	function getMermaidGlobal() {
		return window.mermaid
			|| (typeof unsafeWindow !== 'undefined' && unsafeWindow.mermaid)
			|| undefined;
	}

	/**
	 * Injects the Mermaid script via GM_addElement (bypasses page CSP) and
	 * polls for the global to appear.
	 * @returns {Promise<any>}
	 */
	function loadMermaid() {
		const existing = getMermaidGlobal();
		if (existing) {
			DEBUG && console.log('[mdc-lite] Mermaid already loaded');
			return Promise.resolve(existing);
		}

		if (mermaidLoadPromise) {
			DEBUG && console.log('[mdc-lite] Mermaid load already in progress');
			return mermaidLoadPromise;
		}

		mermaidLoadPromise = new Promise((resolve, reject) => {
			if (typeof GM_addElement !== 'function') {
				reject(new Error('GM_addElement unavailable — cannot lazy-load Mermaid'));
				return;
			}

			DEBUG && console.log('[mdc-lite] Injecting Mermaid script via GM_addElement:', MERMAID_CDN_URL);
			GM_addElement('script', { src: MERMAID_CDN_URL, type: 'text/javascript' });

			let elapsed = 0;
			const poll = setInterval(() => {
				elapsed += MERMAID_POLL_INTERVAL;
				const api = getMermaidGlobal();

				if (api) {
					clearInterval(poll);
					DEBUG && console.log('[mdc-lite] Mermaid global detected after', elapsed, 'ms');
					resolve(api);
					return;
				}

				if (elapsed >= MERMAID_POLL_TIMEOUT) {
					clearInterval(poll);
					DEBUG && console.warn('[mdc-lite] Mermaid poll timed out — window.mermaid:', typeof window.mermaid,
						', unsafeWindow.mermaid:', typeof (typeof unsafeWindow !== 'undefined' ? unsafeWindow.mermaid : 'N/A'));
					reject(new Error(`Mermaid global not available after ${MERMAID_POLL_TIMEOUT}ms`));
				}
			}, MERMAID_POLL_INTERVAL);
		}).catch(error => {
			mermaidLoadPromise = null;
			throw error;
		});

		return mermaidLoadPromise;
	}

	/**
	 * Finds Mermaid code blocks in rendered HTML, converts them to Mermaid
	 * containers, lazily loads the Mermaid runtime, and renders diagrams.
	 * No-ops when no Mermaid blocks are present.
	 * @param {HTMLElement} container - Rendered markdown container
	 */
	function renderMermaidBlocks(container) {
		const codeBlocks = container.querySelectorAll('pre code.language-mermaid, pre code.lang-mermaid');
		if (codeBlocks.length === 0) return;

		DEBUG && console.log('[mdc-lite] Mermaid blocks found:', codeBlocks.length);

		// Don't touch the DOM until mermaid is ready. The fenced code block
		// (with hljs highlighting) is perfectly good content while we wait.
		loadMermaid()
			.then(mermaid => {
				DEBUG && console.log('[mdc-lite] Mermaid loaded, rendering', codeBlocks.length, 'diagram(s)');
				codeBlocks.forEach(codeNode => {
					const pre = codeNode.closest('pre');
					if (!pre) return;
					const div = document.createElement('div');
					div.className = 'mermaid';
					div.textContent = codeNode.textContent || '';
					pre.replaceWith(div);
				});
				return mermaid.run({ querySelector: '#' + RENDERED_ID + ' .mermaid' });
			})
			.then(() => {
				DEBUG && console.log('[mdc-lite] Mermaid render complete');
			})
			.catch(error => {
				DEBUG && console.warn('[mdc-lite] Mermaid render skipped:', error);
			});
	}

	/**
	 * Creates a button element with GitHub's styling
	 * @param {string} label - Button text content
	 * @param {string} mode - View mode ('rendered' or 'source')
	 * @param {boolean} isSelected - Whether button should be in selected state
	 * @returns {HTMLLIElement} Complete button list item element
	 */
	function createButton(label, mode, isSelected = false) {
		const li = document.createElement('li');
		li.className = `SegmentedControl-item${isSelected ? ' SegmentedControl-item--selected' : ''}`;
		li.setAttribute('role', 'listitem');

		const button = document.createElement('button');
		button.setAttribute('aria-current', isSelected.toString());
		button.setAttribute('type', 'button');
		button.setAttribute('data-view-component', 'true');
		button.className = 'Button--invisible Button--small Button Button--invisible-noVisuals';
		button.onclick = () => setViewMode(mode);

		const content = document.createElement('span');
		content.className = 'Button-content';
		const labelSpan = document.createElement('span');
		labelSpan.className = 'Button-label';
		labelSpan.setAttribute('data-content', label);
		labelSpan.textContent = label;

		content.appendChild(labelSpan);
		button.appendChild(content);
		li.appendChild(button);

		return li;
	}

	/**
	 * Creates a GitHub-styled segmented control for toggling between rendered and source views
	 * @param {string} defaultMode - The default view mode to select
	 * @returns {HTMLDivElement} Complete toggle button control
	 */
	function createToggleButton(defaultMode = 'rendered') {
		const container = document.createElement('div');
		container.className = 'mdc-segmented-control';

		const segmentedControl = document.createElement('segmented-control');
		segmentedControl.setAttribute('data-catalyst', '');

		const ul = document.createElement('ul');
		ul.setAttribute('aria-label', 'MDC view');
		ul.setAttribute('role', 'list');
		ul.setAttribute('data-view-component', 'true');
		ul.className = 'SegmentedControl--small SegmentedControl';

		const isRenderedSelected = defaultMode === 'rendered';

		ul.appendChild(createButton(RENDERED_LABEL, 'rendered', isRenderedSelected));
		ul.appendChild(createButton(SOURCE_LABEL, 'source', !isRenderedSelected));

		segmentedControl.appendChild(ul);
		container.appendChild(segmentedControl);

		return container;
	}

	/**
	 * Switches between rendered markdown and source code views
	 * @param {'rendered'|'source'} mode - View mode to activate
	 */
	function setViewMode(mode) {
		const rendered = document.getElementById(RENDERED_ID);
		const original = document.querySelector('#read-only-cursor-text-area')?.closest('section');
		const buttons = document.querySelectorAll('.mdc-segmented-control .SegmentedControl-item');

		if (!rendered || !original || buttons.length !== 2) return;

		const [renderedItem, sourceItem] = buttons;
		const renderedButton = renderedItem.querySelector('button');
		const sourceButton = sourceItem.querySelector('button');

		const isRenderedMode = mode === 'rendered';

		rendered.style.display = isRenderedMode ? 'block' : 'none';
		original.classList.toggle('mdc-source-hidden', isRenderedMode);

		renderedItem.classList.toggle('SegmentedControl-item--selected', isRenderedMode);
		sourceItem.classList.toggle('SegmentedControl-item--selected', !isRenderedMode);

		if (renderedButton) renderedButton.setAttribute('aria-current', isRenderedMode.toString());
		if (sourceButton) sourceButton.setAttribute('aria-current', (!isRenderedMode).toString());
		
		// Scroll to anchor if needed
		scrollToAnchor(mode);
	}

	/**
	 * Renders MDC content as HTML and inserts it into the page
	 * @param {string} defaultMode - The default view mode to select ('rendered' or 'source')
	 * @returns {boolean} True if rendering was successful, false otherwise
	 */
	function renderMDC(defaultMode = 'rendered') {
		const textarea = document.querySelector('#read-only-cursor-text-area');
		if (!textarea) {
			DEBUG && console.debug('[mdc-lite] Waiting for textarea mount');
			return false;
		}

		const content = textarea.textContent?.trim();
		if (!content) {
			DEBUG && console.log('[mdc-lite] No content in textarea');
			return false;
		}

		if (content === lastRenderedContent && document.getElementById(RENDERED_ID)) return true;

		const processedContent = processContent(content);
		const rendered = document.createElement('div');
		rendered.id = RENDERED_ID;
		rendered.className = 'markdown-body';
		rendered.innerHTML = marked.parse(processedContent);

		renderMermaidBlocks(rendered);

		rendered.querySelectorAll('pre code').forEach(block => {
			hljs.highlightElement(block);
		});

		const section = textarea.closest('section');
		if (!section?.parentElement) {
			DEBUG && console.log('[mdc-lite] Could not find section to insert rendered content');
			return false;
		}

		document.getElementById(RENDERED_ID)?.remove();
		section.parentElement.insertBefore(rendered, section);
		lastRenderedContent = content;
		
		// Always show toggle button, but set initial state based on defaultMode
		const toolbar = document.querySelector('.react-blob-header-edit-and-raw-actions');
		if (toolbar && !toolbar.querySelector('.mdc-segmented-control')) {
			toolbar.insertBefore(createToggleButton(defaultMode), toolbar.firstChild);
		}

		// Apply the default view mode
		setViewMode(defaultMode);

		DEBUG && console.log('[mdc-lite] Successfully rendered MDC with mode:', defaultMode);
		return true;
	}

	/**
	 * Removes all MDC-related elements and restores original state
	 */
	function cleanup() {
		document.getElementById(RENDERED_ID)?.remove();
		document.querySelector('.mdc-segmented-control')?.remove();
		document.querySelector('.mdc-source-hidden')?.classList.remove('mdc-source-hidden');

		if (textareaObserver) {
			textareaObserver.disconnect();
			textareaObserver = null;
		}

		isActive = false;
		lastRenderedContent = null;
		DEBUG && console.log('[mdc-lite] Cleaned up');
	}

	/**
	 * Sets up a MutationObserver to watch for textarea content changes and re-render accordingly
	 * @returns {boolean} True if observer was successfully set up, false otherwise
	 */
	function setupTextareaObserver() {
		const textarea = document.querySelector('#read-only-cursor-text-area');
		if (!textarea) return false;

		textareaObserver?.disconnect();

		textareaObserver = new MutationObserver(() => {
			DEBUG && console.log('[mdc-lite] Textarea content changed, re-rendering');
			renderMDC(getDefaultViewMode());
		});

		textareaObserver.observe(textarea, {
			childList: true,
			subtree: true,
			characterData: true
		});

		DEBUG && console.log('[mdc-lite] Textarea observer set up');
		return true;
	}

	/**
	 * Handles page navigation changes, activating or deactivating MDC rendering based on URL
	 */
	function handlePageChange() {
		if (MDC_FILE_REGEX.test(location.href)) {
			if (!isActive) {
				DEBUG && console.log('[mdc-lite] MDC file detected:', location.href);
				isActive = true;

				// Determine the default view mode based on anchor
				const defaultMode = getDefaultViewMode();
				DEBUG && console.log('[mdc-lite] Default mode:', defaultMode);

				if (renderMDC(defaultMode)) {
					setupTextareaObserver();
				} else {
					// Content not ready yet - retry with exponential backoff would be better, but keeping simple
					let attempts = 0;

					const interval = setInterval(() => {
						attempts++;
						if (renderMDC(defaultMode)) {
							clearInterval(interval);
							setupTextareaObserver();
						} else if (attempts >= MAX_RENDER_ATTEMPTS) {
							clearInterval(interval);
							DEBUG && console.log('[mdc-lite] Timeout waiting for content');
						}
					}, RENDER_RETRY_INTERVAL);
				}
			} else {
				// SPA navigation to another MDC file - re-render to sync toggle state
				const defaultMode = getDefaultViewMode();
				if (renderMDC(defaultMode)) {
					setupTextareaObserver();
				}
			}
		} else if (isActive) {
			cleanup();
		}
	}

	/**
	 * Initializes the userscript by setting up page change detection and handling the current page
	 */
	function init() {
		handlePageChange();

		// Monitor for SPA navigation changes
		new MutationObserver(() => {
			if (location.href !== currentUrl) {
				currentUrl = location.href;
				DEBUG && console.log('[mdc-lite] Navigation detected:', currentUrl);
				handlePageChange();
			}
		}).observe(document, { subtree: true, childList: true });

		DEBUG && console.log('[mdc-lite] Initialized');
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}

})();
