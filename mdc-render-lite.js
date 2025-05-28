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
	
	// Toggle button labels
	const RENDERED_LABEL = 'MD🠯';
	const SOURCE_LABEL = '.mdc';

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
		// Create segmented control container
		const container = document.createElement('div');
		container.className = 'mdc-segmented-control';
		
		const segmentedControl = document.createElement('segmented-control');
		segmentedControl.setAttribute('data-catalyst', '');
		
		const ul = document.createElement('ul');
		ul.setAttribute('aria-label', 'MDC view');
		ul.setAttribute('role', 'list');
		ul.setAttribute('data-view-component', 'true');
		ul.className = 'SegmentedControl--small SegmentedControl';
		
		// Create "MD↓" button (rendered view)
		const renderedLi = document.createElement('li');
		renderedLi.className = 'SegmentedControl-item SegmentedControl-item--selected';
		renderedLi.setAttribute('role', 'listitem');
		
		const renderedButton = document.createElement('button');
		renderedButton.setAttribute('aria-current', 'true');
		renderedButton.setAttribute('type', 'button');
		renderedButton.setAttribute('data-view-component', 'true');
		renderedButton.className = 'Button--invisible Button--small Button Button--invisible-noVisuals';
		renderedButton.onclick = () => setViewMode('rendered');
		
		const renderedContent = document.createElement('span');
		renderedContent.className = 'Button-content';
		const renderedLabel = document.createElement('span');
		renderedLabel.className = 'Button-label';
		renderedLabel.setAttribute('data-content', RENDERED_LABEL);
		renderedLabel.textContent = RENDERED_LABEL;
		
		renderedContent.appendChild(renderedLabel);
		renderedButton.appendChild(renderedContent);
		renderedLi.appendChild(renderedButton);
		
		// Create ".mdc" button (source view)
		const sourceLi = document.createElement('li');
		sourceLi.className = 'SegmentedControl-item';
		sourceLi.setAttribute('role', 'listitem');
		
		const sourceButton = document.createElement('button');
		sourceButton.setAttribute('aria-current', 'false');
		sourceButton.setAttribute('type', 'button');
		sourceButton.setAttribute('data-view-component', 'true');
		sourceButton.className = 'Button--invisible Button--small Button Button--invisible-noVisuals';
		sourceButton.onclick = () => setViewMode('source');
		
		const sourceContent = document.createElement('span');
		sourceContent.className = 'Button-content';
		const sourceLabel = document.createElement('span');
		sourceLabel.className = 'Button-label';
		sourceLabel.setAttribute('data-content', SOURCE_LABEL);
		sourceLabel.textContent = SOURCE_LABEL;
		
		sourceContent.appendChild(sourceLabel);
		sourceButton.appendChild(sourceContent);
		sourceLi.appendChild(sourceButton);
		
		// Assemble the control
		ul.appendChild(renderedLi);
		ul.appendChild(sourceLi);
		segmentedControl.appendChild(ul);
		container.appendChild(segmentedControl);
		
		return container;
	}

	function setViewMode(mode) {
		const rendered = document.getElementById('mdc-rendered');
		const original = document.querySelector('#read-only-cursor-text-area')?.closest('section');
		const renderedLi = document.querySelector('.mdc-segmented-control .SegmentedControl-item:first-child');
		const sourceLi = document.querySelector('.mdc-segmented-control .SegmentedControl-item:last-child');
		const renderedButton = renderedLi?.querySelector('button');
		const sourceButton = sourceLi?.querySelector('button');

		if (!rendered || !original || !renderedLi || !sourceLi) return;

		if (mode === 'rendered') {
			// Show rendered markdown
			rendered.style.display = 'block';
			original.style.display = 'none';
			
			// Update button states
			renderedLi.classList.add('SegmentedControl-item--selected');
			sourceLi.classList.remove('SegmentedControl-item--selected');
			if (renderedButton) renderedButton.setAttribute('aria-current', 'true');
			if (sourceButton) sourceButton.setAttribute('aria-current', 'false');
		} else {
			// Show original source
			rendered.style.display = 'none';
			original.style.display = 'block';
			
			// Update button states
			renderedLi.classList.remove('SegmentedControl-item--selected');
			sourceLi.classList.add('SegmentedControl-item--selected');
			if (renderedButton) renderedButton.setAttribute('aria-current', 'false');
			if (sourceButton) sourceButton.setAttribute('aria-current', 'true');
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

			// Add toggle control to toolbar
			const toolbar = document.querySelector('.react-blob-header-edit-and-raw-actions');
			if (toolbar && !toolbar.querySelector('.mdc-segmented-control')) {
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
		const control = document.querySelector('.mdc-segmented-control');
		const original = document.querySelector('#read-only-cursor-text-area')?.closest('section');

		if (rendered) rendered.remove();
		if (control) control.remove();
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