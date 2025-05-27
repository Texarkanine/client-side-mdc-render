// ==UserScript==
// @name         Cursor Rule Markdown Renderer for GitHub
// @namespace    http://tampermonkey.net/
// @version      2025-05-27
// @description  Client-side renders Cursor Rules (*.mdc) markdown on GitHub into actual Markdown
// @author       Texarkanine
// @match        https://github.com/*
// @icon         data:image/png;base64,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
// @grant        GM_addStyle
// @require      https://cdnjs.cloudflare.com/ajax/libs/marked/15.0.7/marked.min.js
// ==/UserScript==

(function() {
	'use strict';

	// Set to true to enable debug logging
	const DEBUG = false;

	// GitHub uses these specific selectors for file content display
	const CONTENT_SECTION = 'section';
	const MARKDOWN_SOURCE = '#read-only-cursor-text-area';
	
	// Only process .mdc files on GitHub
	const MDC_FILE_REGEX = /^https:\/\/github\.com\/.*\.mdc$/;
	
	// Cursor rules have YAML frontmatter that needs special handling
	const YAML_FRONTMATTER_REGEX = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;

	// GitHub-compatible markdown styles using GitHub's CSS variables for theme compatibility
	const MARKDOWN_CSS = `
		.markdown-body {
			box-sizing: border-box;
			min-width: 200px;
			max-width: 980px;
			margin: 0 auto;
			padding: 45px;
			background: var(--color-canvas-default, #fff);
			color: var(--color-fg-default, #24292f);
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
			font-size: 16px;
			line-height: 1.5;
			word-wrap: break-word;
		}
		.markdown-body h1, .markdown-body h2, .markdown-body h3, 
		.markdown-body h4, .markdown-body h5, .markdown-body h6 {
			margin-top: 24px;
			margin-bottom: 16px;
			font-weight: 600;
			line-height: 1.25;
		}
		.markdown-body p {
			margin-top: 0;
			margin-bottom: 10px;
		}
		.markdown-body pre {
			background-color: #f6f8fa;
			padding: 16px;
			overflow: auto;
			border-radius: 6px;
		}
		.markdown-body code {
			background-color: #f6f8fa;
			padding: 0.2em 0.4em;
			border-radius: 6px;
			font-size: 85%;
		}
		.markdown-body blockquote {
			padding: 0 1em;
			color: #6a737d;
			border-left: 0.25em solid #dfe2e5;
		}
		.markdown-body ul, .markdown-body ol {
			padding-left: 2em;
		}
		.markdown-body table {
			border-collapse: collapse;
			display: block;
			width: 100%;
			overflow: auto;
		}
		.markdown-body th, .markdown-body td {
			border: 1px solid #dfe2e5;
			padding: 6px 13px;
		}
	`;

	let cssInjected = false;

	/**
	 * Processes .mdc content by wrapping YAML frontmatter in code blocks.
	 * This is necessary because cursor rules use YAML frontmatter that should
	 * be displayed as code rather than parsed as markdown.
	 */
	function processContent(rawContent) {
		const match = rawContent.match(YAML_FRONTMATTER_REGEX);
		
		if (match) {
			const [, yamlContent, markdownContent] = match;
			return `\`\`\`yaml\n${yamlContent}\n\`\`\`\n\n${markdownContent}`;
		}
		
		return rawContent;
	}

	/**
	 * Injects GitHub-compatible markdown styles.
	 * Uses GitHub's CSS variables to match the current theme automatically.
	 */
	function injectStyles() {
		if (cssInjected) return;

		GM_addStyle(MARKDOWN_CSS);
		cssInjected = true;
	}

	/**
	 * Renders the markdown content by replacing the section content.
	 * Preserves the original textarea as hidden for potential future reference.
	 */
	function renderMarkdown() {
		const section = document.querySelector(CONTENT_SECTION);
		const textarea = document.querySelector(MARKDOWN_SOURCE);
		
		if (!section || !textarea) {
			return false;
		}

		const rawContent = textarea.textContent;
		if (!rawContent) {
			return false;
		}

		// Process content and render markdown
		const processedContent = processContent(rawContent);
		const markdownDiv = document.createElement('div');
		markdownDiv.className = 'markdown-body';
		markdownDiv.innerHTML = marked.parse(processedContent);

		// Replace section content while preserving the original textarea
		section.innerHTML = '';
		textarea.style.display = 'none'; // Keep textarea but hide it
		section.appendChild(textarea);
		section.appendChild(markdownDiv);

		injectStyles();
		return true;
	}

	let contentObserver = null;
	let lastContent = '';

	/**
	 * Sets up observation of the textarea content changes.
	 * This ensures we only render when the actual content changes, not stale content.
	 */
	function observeContentChanges() {
		// Clean up any existing observer
		if (contentObserver) {
			contentObserver.disconnect();
			contentObserver = null;
		}

		const textarea = document.querySelector(MARKDOWN_SOURCE);
		if (!textarea) {
			return false;
		}

		// Check if content is different from last render
		const currentContent = textarea.textContent;
		if (currentContent && currentContent !== lastContent) {
			lastContent = currentContent;
			if (renderMarkdown()) {
				DEBUG && console.log('[mdc-render] Successfully rendered markdown');
			}
		}

		// Set up observer for future content changes
		contentObserver = new MutationObserver(() => {
			const newContent = textarea.textContent;
			if (newContent && newContent !== lastContent) {
				lastContent = newContent;
				if (renderMarkdown()) {
					DEBUG && console.log('[mdc-render] Content changed, re-rendered markdown');
				}
			}
		});

		// Observe changes to the textarea's text content
		contentObserver.observe(textarea, {
			childList: true,
			subtree: true,
			characterData: true
		});

		return true;
	}

	/**
	 * Waits for the textarea to appear, then sets up content observation.
	 * GitHub loads content asynchronously, so we need to wait for the textarea.
	 */
	function waitForTextareaAndObserve() {
		let attempts = 0;
		const maxAttempts = 100; // 10 seconds at 100ms intervals
		
		const checkInterval = setInterval(() => {
			attempts++;
			
			if (observeContentChanges()) {
				clearInterval(checkInterval);
				DEBUG && console.log('[mdc-render] Set up content observation');
			} else if (attempts >= maxAttempts) {
				clearInterval(checkInterval);
				DEBUG && console.log('[mdc-render] Timeout waiting for textarea');
			}
		}, 100);
	}

	/**
	 * Handles URL changes to detect navigation to .mdc files.
	 * GitHub is a SPA, so we need to monitor URL changes via DOM mutations.
	 */
	function handleUrlChange() {
		if (MDC_FILE_REGEX.test(location.href)) {
			DEBUG && console.log('[mdc-render] MDC file detected:', location.href);
			waitForTextareaAndObserve();
		}
	}

	// Initialize: handle current page and set up URL change detection
	let currentUrl = location.href;
	handleUrlChange();

	// Monitor for URL changes in GitHub's SPA
	new MutationObserver(() => {
		if (location.href !== currentUrl) {
			currentUrl = location.href;
			handleUrlChange();
		}
	}).observe(document, { subtree: true, childList: true });

})();
