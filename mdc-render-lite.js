// ==UserScript==
// @name         MDC Renderer Lite for GitHub
// @namespace    http://tampermonkey.net/
// @version      2025-01-27-lite
// @description  Simplified MDC markdown renderer for GitHub
// @author       Texarkanine
// @match        https://github.com/*
// @grant        GM_addStyle
// @require      https://cdnjs.cloudflare.com/ajax/libs/marked/15.0.7/marked.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/highlight.min.js
// ==/UserScript==

(function() {
	'use strict';

	const DEBUG = true;
	const MDC_FILE_REGEX = /^https:\/\/github\.com\/.*\.mdc$/;
	const YAML_FRONTMATTER_REGEX = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;

	// Simple state
	let currentUrl = location.href;
	let isActive = false;
	let textareaObserver = null;

	// Inject basic styles
	GM_addStyle(`
		.markdown-body {
			box-sizing: border-box;
			min-width: 200px;
			max-width: 980px;
			margin: 24px auto 0;
			padding: 45px;
			word-wrap: break-word;
		}
		.mdc-toggle {
			margin-right: 8px;
			padding: 5px 10px;
			background: #f6f8fa;
			border: 1px solid #d0d7de;
			border-radius: 6px;
			cursor: pointer;
		}
		.mdc-toggle.active {
			background: #0969da;
			color: white;
		}
	`);

	function processContent(content) {
		const match = content.match(YAML_FRONTMATTER_REGEX);
		if (match) {
			const [, yamlContent, markdownContent] = match;
			return `\`\`\`yaml\n${yamlContent}\n\`\`\`\n\n${markdownContent}`;
		}
		return content;
	}

	function createToggleButton() {
		const button = document.createElement('button');
		button.textContent = 'M↓';
		button.className = 'mdc-toggle active';
		button.title = 'Toggle MDC rendering';
		button.onclick = toggleView;
		return button;
	}

	function toggleView() {
		const rendered = document.getElementById('mdc-rendered');
		const original = document.querySelector('#read-only-cursor-text-area')?.closest('section');
		const button = document.querySelector('.mdc-toggle');

		if (!rendered || !original || !button) return;

		if (rendered.style.display === 'none') {
			// Show rendered
			rendered.style.display = 'block';
			original.style.display = 'none';
			button.classList.add('active');
		} else {
			// Show original
			rendered.style.display = 'none';
			original.style.display = 'block';
			button.classList.remove('active');
		}
	}

	function renderMDC() {
		const textarea = document.querySelector('#read-only-cursor-text-area');
		if (!textarea) {
			DEBUG && console.log('[mdc-lite] No textarea found');
			return false;
		}

		const content = textarea.textContent;
		if (!content || content.trim().length === 0) {
			DEBUG && console.log('[mdc-lite] No content in textarea');
			return false;
		}

		// Remove existing rendered content
		const existing = document.getElementById('mdc-rendered');
		if (existing) existing.remove();

		// Process and render content
		const processedContent = processContent(content);
		const rendered = document.createElement('div');
		rendered.id = 'mdc-rendered';
		rendered.className = 'markdown-body';
		rendered.innerHTML = marked.parse(processedContent);

		// Apply syntax highlighting
		rendered.querySelectorAll('pre code').forEach(block => {
			hljs.highlightElement(block);
		});

		// Find insertion point and insert
		const section = textarea.closest('section');
		if (section) {
			section.parentElement.insertBefore(rendered, section);
			section.style.display = 'none'; // Hide original

			// Add toggle button to toolbar
			const toolbar = document.querySelector('.react-blob-header-edit-and-raw-actions');
			if (toolbar && !toolbar.querySelector('.mdc-toggle')) {
				toolbar.insertBefore(createToggleButton(), toolbar.firstChild);
			}

			DEBUG && console.log('[mdc-lite] Successfully rendered MDC');
			return true;
		}

		DEBUG && console.log('[mdc-lite] Could not find section to insert rendered content');
		return false;
	}

	function cleanup() {
		const rendered = document.getElementById('mdc-rendered');
		const button = document.querySelector('.mdc-toggle');
		const original = document.querySelector('#read-only-cursor-text-area')?.closest('section');

		if (rendered) rendered.remove();
		if (button) button.remove();
		if (original) original.style.display = 'block';

		// Clean up textarea observer
		if (textareaObserver) {
			textareaObserver.disconnect();
			textareaObserver = null;
		}

		isActive = false;
		DEBUG && console.log('[mdc-lite] Cleaned up');
	}

	function setupTextareaObserver() {
		const textarea = document.querySelector('#read-only-cursor-text-area');
		if (!textarea) return false;

		// Clean up any existing observer
		if (textareaObserver) {
			textareaObserver.disconnect();
		}

		// Set up new observer
		textareaObserver = new MutationObserver(() => {
			DEBUG && console.log('[mdc-lite] Textarea content changed, re-rendering');
			renderMDC();
		});

		textareaObserver.observe(textarea, {
			childList: true,
			subtree: true,
			characterData: true
		});

		DEBUG && console.log('[mdc-lite] Textarea observer set up');
		return true;
	}

	function handlePageChange() {
		if (MDC_FILE_REGEX.test(location.href)) {
			if (!isActive) {
				DEBUG && console.log('[mdc-lite] MDC file detected:', location.href);
				isActive = true;
				
				// Try to render immediately (for hard page loads)
				if (renderMDC()) {
					// Success - also set up observer for future changes
					setupTextareaObserver();
				} else {
					// Content not ready yet (hard page load) - wait for textarea and content
					let attempts = 0;
					const maxAttempts = 50; // 5 seconds
					
					const interval = setInterval(() => {
						attempts++;
						if (renderMDC()) {
							clearInterval(interval);
							setupTextareaObserver(); // Set up observer after successful render
						} else if (attempts >= maxAttempts) {
							clearInterval(interval);
							DEBUG && console.log('[mdc-lite] Timeout waiting for content');
						}
					}, 100);
				}
			} else {
				// Already active, just set up observer (SPA navigation case)
				setupTextareaObserver();
			}
		} else {
			if (isActive) {
				cleanup();
			}
		}
	}

	// Initialize
	function init() {
		// Handle current page
		handlePageChange();

		// Monitor for navigation changes
		new MutationObserver(() => {
			if (location.href !== currentUrl) {
				currentUrl = location.href;
				DEBUG && console.log('[mdc-lite] Navigation detected:', currentUrl);
				handlePageChange();
			}
		}).observe(document, { subtree: true, childList: true });

		DEBUG && console.log('[mdc-lite] Initialized');
	}

	// Start when DOM is ready
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}

})(); 