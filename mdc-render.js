// ==UserScript==
// @name         Cursor Rule Markdown Renderer for GitHub
// @namespace    http://tampermonkey.net/
// @version      2025-05-27
// @description  Renders Cursor Rules (*.mdc) markdown on GitHub into actual Markdown locally, using the marked library.
// @author       Texarkanine
// @match        https://github.com/*
// @icon         data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAANAAAACACAMAAABN9BexAAABRFBMVEUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///8NAl4NAAAAanRSTlMAAQIDBQcICQsMDg8SGBsfJSo2ODk6Ozw9P0FCREpQUVJTVFpfYWZnbHN0dXZ3eHl7gIKDhYaIiYqLjJiZnqCkp6ipr7CxsrO0vr/BwsPGx8nR1dfY2eDh4uPk5+jp7PHy8/T19vj5+v3+PVg6RwAAAAFiS0dEa1JlpZgAAAPiSURBVHja7d1rWxJBGAbgB3ABK+mgIZqVaUHhqXMQlNnJU6FFWYJWaB6Y//8D+iDsidnd2WXXeOea9xN+4IL7kn3mmUEB6E4iV96sHzByc1DfLI8nYJ/Uwj4jPPvzKatnZpcRn90ZEyf2qM3IT/t5vOuJv2VSzEpX9IxJMk86109bFlB7GgCSP5k000gBWGQSzRyQ2JcJtBdHzvTj+4k0yE164qOJkMVL44dFEJ0lw1DGhvH7AdlZ1RHr+K7fnqALmtQR39DSb6fpgoZ1RAvGyw+Ex6RQIAVSIAVSIAVSIAVSIAVSoP8D4h1E5MUeo8C7r6/n5uNufYFOciKesSMyINbMeD+tkQajA2JbmtcDDH1ilEDstdcDVBktkFcwFBg1kHsw8ANhoEGuweAQCIMNcgkGp0AYcJBzMFQZTZBTMBQYVRA/GJwDYeBB3GBwCYTBB3GCwS0QCIB6g6HKaIPswVBg1EHWYHAPBBIgSzB4BAINkCkYvAKBCMgIhiqTA9QNhgKTBXQWDN6BQAbEmhmhQKADYluaSCAQArFqlckFEh4FUiAFYkwwACpkQGIRXdPIgIQW0WYGdEAY9aw5JzlQAuGuSGGlBPLaKlRADeQeDDVN8JmVgy8ApXBBrsHQ2ZYLgGKvgnqWYyGDXIKhe3Ai8tpJvAvmWRtC2CDnYMj7uRhSn4N4ttMIH+QUDBV/V/fFL/49Xy8hChA/GGqaz7jK7Pj1NC4jEhA3GEzndKL5e8Xn/8f8uoqIQJxgMJ+kCi8o11p+PH+ziAzUGwz5QCvk1LG45+QmIgTZg6EScMmfPRX1tO8hUpA1GGpa0A5zXxRURLQgSzDY3tHzVcoES1AJUYNMwWB/z9UXSKwE2QpPJCAjGPJ91WaREmQvPNGAusFQ6XMf4F2CttM4F9BZMNS0fjc2XiWot/BEBMJIg/sWv++dmnsJ4hSeqEAYPeL9EYb/radbCeIVnshAyOfD2UuPHTp5DsdwnqDQDgecShC/8BAAOZQgh8JDAcQvQUXQBfFKUAmUQb0lyLHw0AD1lCDnwkMEZCtB22lQB1lKkFvhIQMylSDXwkMHpJcg98JDCNQ5CeKe8NAEYerYu/CQAmH21LPw0AKhWET4ICqjQAqkQAqkQAqkQAqkQAqkQOcA+qPfHKbruaAjfsv3oZMb+u0PdEFrOmLdfDa+RNXz0DC8wLhpx786SfA6Gr6xZiJcl+zDj5txYF4m0AMAyR/yeHZTAHBHno94v312WT2VBfS4kxPxFTk8b/QvfogtyPVFFgCmySfDzi3r8pSc2yO9/hSTPStuPFvaqLfoWVr19VLWeLX9A7BB7+nmPT+tAAAAAElFTkSuQmCC
// @grant        GM_addStyle
// @require      https://cdnjs.cloudflare.com/ajax/libs/marked/15.0.7/marked.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/highlight.min.js
// ==/UserScript==

(function() {
	'use strict';

	// Set to true to enable debug logging
	const DEBUG = true;

	// GitHub uses these specific selectors for file content display
	const CONTENT_SECTION = 'section';
	const MARKDOWN_SOURCE = '#read-only-cursor-text-area';
	const GITHUB_POSITIONER = '#highlighted-line-menu-positioner';

	// Only process .mdc files on GitHub
	const MDC_FILE_REGEX = /^https:\/\/github\.com\/.*\.mdc$/;

	// Cursor rules have YAML frontmatter that needs special handling
	const YAML_FRONTMATTER_REGEX = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;

	// Toggle button constants
	const TOGGLE_BUTTON_ID = 'mdc-toggle-render-btn';
	const TOGGLE_BUTTON_GROUP_ID = 'mdc-toggle-button-group';
	const MARKDOWN_CONTAINER_ID = 'mdc-rendered-markdown';

	// GitHub-compatible markdown styles using GitHub's CSS variables for theme compatibility
	const MARKDOWN_CSS = `
		.markdown-body {
			box-sizing: border-box;
			min-width: 200px;
			max-width: 980px;
			margin: 0 auto;
			padding: 45px;
			word-wrap: break-word;
		}
	`;

	let cssInjected = false;
	let originalContainer = null;
	let originalDisplayValue = null; // Store the original display value
	let isRendered = true; // Default state: custom rendering visible

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
	 * Finds and stores the original GitHub container that should be preserved.
	 * Looks for the #highlighted-line-menu-positioner element within the section.
	 */
	function findOriginalContainer() {
		if (originalContainer) return originalContainer;

		const positioner = document.querySelector(GITHUB_POSITIONER);
		if (positioner) {
			originalContainer = positioner;
			DEBUG && console.log('[mdc-render] Found original container via highlighted-line-menu-positioner:', positioner.id, positioner.innerHTML.length + ' chars');
			return originalContainer;
		}

		// Fallback: look for the section's first child that's not our markdown
		const section = document.querySelector(CONTENT_SECTION);
		if (section) {
			const children = Array.from(section.children);
			for (const child of children) {
				if (child.id !== MARKDOWN_CONTAINER_ID && child.id !== TOGGLE_BUTTON_ID) {
					originalContainer = child;
					DEBUG && console.log('[mdc-render] Found original container via fallback method');
					return originalContainer;
				}
			}
		}

		DEBUG && console.warn('[mdc-render] Could not find original container');
		return null;
	}

	/**
	 * Creates the toggle button using GitHub's existing CSS classes.
	 * Copies classes from existing buttons to maintain visual consistency.
	 */
	function createToggleButton() {
		// Find an existing button to copy classes from
		const rawButton = document.querySelector('[data-testid="raw-button"]');
		const copyButton = document.querySelector('[data-testid="copy-raw-button"]');
		const referenceButton = rawButton || copyButton;

		if (!referenceButton) {
			console.warn('[mdc-render] Could not find reference button for styling');
			return null;
		}

		// Create button group wrapper
		const buttonGroup = document.createElement('div');
		buttonGroup.id = TOGGLE_BUTTON_GROUP_ID;
		buttonGroup.style.display = 'inline-flex';
		buttonGroup.style.marginRight = '8px';

		// Create the toggle button
		const button = document.createElement('button');
		button.id = TOGGLE_BUTTON_ID;
		button.textContent = 'M↓';
		button.setAttribute('aria-label', 'Toggle rendered markdown');
		button.setAttribute('aria-pressed', 'true'); // Default to active state
		button.setAttribute('type', 'button');
		button.setAttribute('data-testid', 'mdc-toggle-button');

		// Copy classes from reference button
		if (referenceButton.className) {
			button.className = referenceButton.className;
		}

		// Copy data attributes that affect styling
		const dataToCopy = ['data-loading', 'data-no-visuals', 'data-size'];
		dataToCopy.forEach(attr => {
			const value = referenceButton.getAttribute(attr);
			if (value !== null) {
				button.setAttribute(attr, value);
			}
		});

		// Set initial variant for active state
		button.setAttribute('data-variant', 'default'); // Active state

		button.addEventListener('click', toggleRenderState);

		buttonGroup.appendChild(button);
		return buttonGroup;
	}

	/**
	 * Finds the toolbar where the toggle button should be inserted.
	 * Looks for the container that holds the Raw button and related actions.
	 */
	function findToolbar() {
		// Look for the Raw button first, then find its container
		const rawButton = document.querySelector('[data-testid="raw-button"]');
		if (rawButton) {
			// Find the toolbar container that holds the Raw button
			let container = rawButton.closest('.react-blob-header-edit-and-raw-actions');
			if (container) {
				return container.parentElement; // Get the parent that contains all button groups
			}
		}

		// Fallback: look for the stable class name
		const toolbar = document.querySelector('.react-blob-header-edit-and-raw-actions');
		if (toolbar) {
			return toolbar.parentElement;
		}

		DEBUG && console.warn('[mdc-render] Could not find toolbar for toggle button');
		return null;
	}

	/**
	 * Injects the toggle button into the GitHub toolbar.
	 * Places it before the Raw button group.
	 */
	function injectToggleButton() {
		// Check if button already exists
		if (document.getElementById(TOGGLE_BUTTON_ID)) {
			DEBUG && console.log('[mdc-render] Toggle button already exists');
			return true;
		}

		// Only inject if we're rendering a .mdc file
		if (!document.getElementById(MARKDOWN_CONTAINER_ID)) {
			DEBUG && console.log('[mdc-render] No markdown body found, skipping toggle button injection');
			return false;
		}

		const toolbar = findToolbar();
		if (!toolbar) {
			console.warn('[mdc-render] Could not find toolbar for toggle button');
			return false;
		}

		// Find the Raw button group to insert before it
		const rawButtonGroup = toolbar.querySelector('.react-blob-header-edit-and-raw-actions');
		if (!rawButtonGroup) {
			console.warn('[mdc-render] Could not find Raw button group');
			return false;
		}

		const toggleButtonGroup = createToggleButton();
		if (!toggleButtonGroup) {
			return false;
		}

		toolbar.insertBefore(toggleButtonGroup, rawButtonGroup);

		DEBUG && console.log('[mdc-render] Toggle button injected successfully');
		return true;
	}

	/**
	 * Toggles between rendered markdown and original GitHub view.
	 */
	function toggleRenderState() {
		isRendered = !isRendered;
		setRenderState(isRendered);
		syncToggleButtonState(); // Ensure button state stays in sync
		DEBUG && console.log('[mdc-render] Toggled to state:', isRendered ? 'rendered' : 'source');
	}

	/**
	 * Sets the render state and updates UI accordingly.
	 */
	function setRenderState(rendered) {
		const markdownBody = document.getElementById(MARKDOWN_CONTAINER_ID);
		const toggleButton = document.getElementById(TOGGLE_BUTTON_ID);
		const original = findOriginalContainer();

		if (!markdownBody || !toggleButton) {
			DEBUG && console.warn('[mdc-render] Missing elements for state change. Markdown:', !!markdownBody, 'Button:', !!toggleButton);
			return;
		}

		DEBUG && console.log('[mdc-render] Setting render state to:', rendered, 'Markdown in DOM:', markdownBody.parentElement ? 'yes' : 'no');

		if (rendered) {
			// Show rendered markdown, hide original
			markdownBody.style.display = 'block';
			if (original) {
				original.style.display = 'none';
			}
			toggleButton.setAttribute('aria-pressed', 'true');
			toggleButton.setAttribute('data-variant', 'default'); // Active state
			DEBUG && console.log('[mdc-render] Showing markdown, hiding original. Markdown visible:', markdownBody.offsetHeight > 0);
		} else {
			// Show original, hide rendered markdown
			markdownBody.style.display = 'none';
			if (original) {
				// Restore the original display value
				original.style.display = originalDisplayValue || 'block';
			}
			toggleButton.setAttribute('aria-pressed', 'false');
			toggleButton.setAttribute('data-variant', 'invisible'); // Inactive state
			DEBUG && console.log('[mdc-render] Showing original, hiding markdown. Restored display:', originalDisplayValue || 'block', 'Original visible:', original ? original.offsetHeight > 0 : 'no original');
		}

		isRendered = rendered;
		DEBUG && console.log('[mdc-render] Set render state to:', rendered ? 'rendered' : 'source');
	}

	/**
	 * Removes the toggle button (for SPA navigation away from .mdc files).
	 */
	function removeToggleButton() {
		const buttonGroup = document.getElementById(TOGGLE_BUTTON_GROUP_ID);
		if (buttonGroup) {
			buttonGroup.remove();
			DEBUG && console.log('[mdc-render] Toggle button removed');
		}
	}

	/**
	 * Ensures the toggle button state matches the actual render state.
	 */
	function syncToggleButtonState() {
		const toggleButton = document.getElementById(TOGGLE_BUTTON_ID);
		if (toggleButton) {
			toggleButton.setAttribute('aria-pressed', isRendered ? 'true' : 'false');
			toggleButton.setAttribute('data-variant', isRendered ? 'default' : 'invisible');
			DEBUG && console.log('[mdc-render] Synced toggle button state to:', isRendered);
		}
	}

	/**
	 * Restores the original container visibility and removes our markdown when leaving .mdc files.
	 */
	function restoreOriginalContainer() {
		const original = findOriginalContainer();
		if (original) {
			// Restore the original display value
			original.style.display = originalDisplayValue || 'block';
			DEBUG && console.log('[mdc-render] Original container restored with display:', originalDisplayValue || 'block');
		}
		
		// Remove our rendered markdown
		const markdownBody = document.getElementById(MARKDOWN_CONTAINER_ID);
		if (markdownBody) {
			markdownBody.remove();
			DEBUG && console.log('[mdc-render] Rendered markdown removed');
		}
	}

	/**
	 * Renders the markdown content by adding it to the section alongside the original content.
	 * Preserves the original DOM structure and toggles visibility instead of replacing content.
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

		// Check if we've already rendered this content (avoid duplicate rendering)
		const existingMarkdown = document.getElementById(MARKDOWN_CONTAINER_ID);
		if (existingMarkdown && lastContent === rawContent) {
			DEBUG && console.log('[mdc-render] Markdown already rendered for this content');
			return true;
		}
		
		// If content changed, remove existing markdown
		if (existingMarkdown) {
			existingMarkdown.remove();
			DEBUG && console.log('[mdc-render] Removed existing markdown for content update');
		}

		// Find and store the original container before adding our content
		findOriginalContainer();

		// Process content and render markdown
		const processedContent = processContent(rawContent);
		const markdownDiv = document.createElement('div');
		markdownDiv.id = MARKDOWN_CONTAINER_ID;
		markdownDiv.className = 'markdown-body';
		markdownDiv.innerHTML = marked.parse(processedContent);

		// Syntax highlight code blocks using highlight.js
		markdownDiv.querySelectorAll('pre code[class^="language-"]').forEach(block => {
			hljs.highlightElement(block);
		});
		DEBUG && console.log('[mdc-render] highlight.js applied to code blocks');

		// Insert our rendered markdown as a sibling to the positioner
		const positioner = document.querySelector(GITHUB_POSITIONER);
		if (positioner && positioner.parentElement) {
			// Insert our markdown after the positioner
			positioner.parentElement.insertBefore(markdownDiv, positioner.nextSibling);
			DEBUG && console.log('[mdc-render] Inserted markdown as sibling to positioner. Parent:', positioner.parentElement.tagName, 'Markdown ID:', markdownDiv.id);
		} else {
			// Fallback: append to section if positioner not found
			section.appendChild(markdownDiv);
			DEBUG && console.log('[mdc-render] Fallback: appended markdown to section. Markdown ID:', markdownDiv.id);
		}

		// Hide the original container initially (we start in "rendered" mode)
		if (originalContainer) {
			// Store the original display value before hiding
			const computedStyle = window.getComputedStyle(originalContainer);
			originalDisplayValue = computedStyle.display;
			// If the original was already hidden, default to block
			if (originalDisplayValue === 'none') {
				originalDisplayValue = 'block';
			}
			originalContainer.style.display = 'none';
			DEBUG && console.log('[mdc-render] Hidden original container:', originalContainer.id || originalContainer.tagName, 'Original display:', originalDisplayValue);
		}

		injectStyles();
		
		// Inject toggle button after rendering
		setTimeout(() => {
			injectToggleButton();
			setRenderState(true); // Ensure we start in rendered state
			syncToggleButtonState(); // Ensure button state is correct
		}, 100);

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

		// Check if content is different from last render and render immediately
		const currentContent = textarea.textContent;
		if (currentContent && currentContent !== lastContent) {
			lastContent = currentContent;
			DEBUG && console.log('[mdc-render] Found new content, rendering immediately');
			if (renderMarkdown()) {
				DEBUG && console.log('[mdc-render] Successfully rendered markdown');
			}
		}

		// Set up observer for future content changes
		contentObserver = new MutationObserver(() => {
			const newContent = textarea.textContent;
			if (newContent && newContent !== lastContent) {
				lastContent = newContent;
				DEBUG && console.log('[mdc-render] Content changed via observer, re-rendering');
				// Reset state when content changes
				originalContainer = null;
				originalDisplayValue = null;
				isRendered = true;
				if (renderMarkdown()) {
					DEBUG && console.log('[mdc-render] Content changed, re-rendered markdown');
					// Re-inject toggle button and set proper state
					setTimeout(() => {
						injectToggleButton();
						setRenderState(true);
						syncToggleButtonState();
					}, 100);
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
		const maxAttempts = 150; // 15 seconds at 100ms intervals (longer for hard page loads)

		const checkInterval = setInterval(() => {
			attempts++;
			DEBUG && attempts % 10 === 0 && console.log('[mdc-render] Still waiting for textarea, attempt:', attempts);

			if (observeContentChanges()) {
				clearInterval(checkInterval);
				DEBUG && console.log('[mdc-render] Set up content observation after', attempts, 'attempts');
			} else if (attempts >= maxAttempts) {
				clearInterval(checkInterval);
				DEBUG && console.log('[mdc-render] Timeout waiting for textarea after', attempts, 'attempts');
				
				// Final debug: check what elements are actually available
				const section = document.querySelector(CONTENT_SECTION);
				const allTextareas = document.querySelectorAll('textarea');
				DEBUG && console.log('[mdc-render] Debug - Section found:', !!section, 'Total textareas:', allTextareas.length);
				allTextareas.forEach((ta, i) => {
					DEBUG && console.log(`[mdc-render] Textarea ${i}:`, ta.id, ta.className, 'content length:', ta.textContent?.length || 0);
				});
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
			
			// Capture old content before cleanup to avoid rendering stale content
			const oldTextarea = document.querySelector(MARKDOWN_SOURCE);
			const oldContent = oldTextarea ? oldTextarea.textContent : '';
			
			// Clean up any existing state first
			removeToggleButton();
			const existingMarkdown = document.getElementById(MARKDOWN_CONTAINER_ID);
			if (existingMarkdown) {
				existingMarkdown.remove();
				DEBUG && console.log('[mdc-render] Removed existing markdown from previous navigation');
			}
			
			// Reset state for new .mdc file
			originalContainer = null;
			originalDisplayValue = null;
			isRendered = true;
			
			// Clean up any existing observer
			if (contentObserver) {
				contentObserver.disconnect();
				contentObserver = null;
			}
			
			// Only set lastContent to old content if it's not empty (to avoid hard page load issues)
			// On hard page loads, the textarea might be empty initially and get populated later
			if (oldContent && oldContent.trim().length > 0) {
				lastContent = oldContent;
				DEBUG && console.log('[mdc-render] Set lastContent to old content to avoid stale rendering');
			} else {
				lastContent = '';
				DEBUG && console.log('[mdc-render] Reset lastContent for fresh page load');
			}
			
			waitForTextareaAndObserve();
		} else {
			// Navigating away from .mdc file - clean up
			removeToggleButton();
			restoreOriginalContainer();
			// Clean up observer
			if (contentObserver) {
				contentObserver.disconnect();
				contentObserver = null;
			}
			lastContent = '';
			DEBUG && console.log('[mdc-render] Navigated away from MDC file, cleaned up');
		}
	}

	/**
	 * Initializes the script, handling both hard page loads and SPA navigation.
	 */
	function initialize() {
		let currentUrl = location.href;
		
		// Handle initial page load (hard navigation)
		if (document.readyState === 'loading') {
			// Page is still loading, wait for it to be ready
			document.addEventListener('DOMContentLoaded', () => {
				DEBUG && console.log('[mdc-render] DOMContentLoaded - handling initial page');
				handleUrlChange();
			});
		} else {
			// Page is already loaded, handle immediately
			DEBUG && console.log('[mdc-render] Page already loaded - handling initial page');
			handleUrlChange();
		}

		// Monitor for URL changes in GitHub's SPA
		new MutationObserver(() => {
			if (location.href !== currentUrl) {
				currentUrl = location.href;
				DEBUG && console.log('[mdc-render] SPA navigation detected:', currentUrl);
				handleUrlChange();
			}
		}).observe(document, { subtree: true, childList: true });
	}

	// Initialize the script
	initialize();

})();
