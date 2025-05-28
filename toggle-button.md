# Design Doc: Toggle Button for Custom Markdown Rendering

## **Objective**

Add a floating toggle button to the GitHub file view toolbar (between the Copilot button and Raw button group) that allows users to switch between:
- **Custom Rendered Markdown** (our userscript's output)
- **Original GitHub Document View** (GitHub's default display)

The toggle should:
- Be injected only once per page load (idempotent, check by ID).
- Default to "on" (custom rendering visible, original hidden).
- Toggle visibility of both containers accordingly.
- Only be injected if a `.mdc` file is being rendered (i.e., our `.markdown-body` is present).
- Be hidden when navigating away from `.mdc` files via SPA navigation.

---

## **UI/UX Placement**

- **Location:**  
  The button will be injected between the Copilot button group and the Raw button group in the toolbar:
  ```html
  <!-- Copilot button group -->
  <div class="Box-sc-g0xbh4-0 pr-0 prc-ButtonGroup-ButtonGroup-vcMeG">...</div>
  
  <!-- OUR TOGGLE BUTTON GOES HERE -->
  
  <!-- Raw button group -->
  <div class="react-blob-header-edit-and-raw-actions BlobViewHeader-module__Box_4--vFP89">...</div>
  ```
- **Button Style:**  
  - Use GitHub's existing CSS classes for consistency with theme changes.
  - Use a unique ID, e.g., `id="mdc-toggle-render-btn"`.
  - **Label:** Use the text `M↓` as the button label/icon.
  - **Active (Rendered) State:** Use GitHub's emphasized/active button style classes.
  - **Inactive (Source) State:** Use GitHub's default button style classes.
  - **Structure:** Follow GitHub's button group pattern with proper wrapper divs.

---

## **DOM Elements Involved**

- **Custom Rendered Container:**  
  - Our injected `.markdown-body` `<div>` with unique ID `mdc-rendered-markdown`.
  - **Critical:** Inserted as a sibling to `#highlighted-line-menu-positioner`, NOT as a child of section.
- **Original GitHub Container:**  
  - The `#highlighted-line-menu-positioner` element itself (not its parent).
  - **Important:** Never delete this container, only toggle visibility with `display: none/block`.
  - **Critical:** Must preserve original `display` CSS value, not assume `block`.

---

## **Behavioral Logic**

- **On Page Load:**
  1. Render our markdown as usual.
  2. Inject the toggle button into the toolbar if not already present **and** only if a `.mdc` file is being rendered (i.e., `.markdown-body` exists).
  3. Set initial state to "on" (custom rendering visible, original hidden).

- **On Toggle:**
  - **If toggled "off":**
    - Hide `.markdown-body` (our rendered markdown) using `display: none`.
    - Show the original GitHub container using `display: block` or default.
    - Update button style to default (inactive) and set `aria-pressed="false"`.
  - **If toggled "on":**
    - Show `.markdown-body` using `display: block` or default.
    - Hide the original GitHub container using `display: none`.
    - Update button style to emphasized/active and set `aria-pressed="true"`.

- **On SPA Navigation:**
  - **To .mdc file:** Re-inject button if needed, reset to "on" state.
  - **Away from .mdc file:** Hide button, restore original container visibility.

- **Idempotency:**
  - Before injecting, check for the button by ID.
  - Only one toggle button per page.

---

## **Implementation Steps**

1. **Locate Toolbar:**  
   Find the parent container that holds both the Copilot button group and the Raw button group.

2. **Inject Toggle Button:**  
   - Create a button group wrapper with inline styles (avoid generated CSS classes).
   - Create a `<button id="mdc-toggle-render-btn">` with label `M↓`.
   - **Copy CSS classes and attributes from existing GitHub buttons** (e.g., Raw button).
   - Insert between the Copilot group and Raw group.
   - Add accessibility attributes: `aria-pressed`, `aria-label="Toggle rendered markdown"`.

3. **DOM Structure Setup:**  
   - **Critical:** Insert rendered markdown as sibling to `#highlighted-line-menu-positioner`.
   - **Never clear section.innerHTML** - preserve GitHub's DOM structure completely.
   - Assign unique ID `mdc-rendered-markdown` to our markdown container.

4. **Toggle Handler:**  
   - On click, toggle a state variable (`isRendered`).
   - Show/hide using `display: none/block` with **preserved original display values**.
   - Update button style and `aria-pressed`.
   - **Call syncToggleButtonState()** to ensure visual state matches actual state.

5. **Initial State:**  
   - Capture original display value before hiding: `window.getComputedStyle(element).display`.
   - Set to "Rendered" (custom shown, original hidden, button active).

6. **SPA Navigation Handling:**  
   - **Critical:** Track old content before navigation to avoid rendering stale content.
   - Clean up observers and state completely on each navigation.
   - Reset to "on" state for each new .mdc file.
   - Restore original container when leaving .mdc files.

7. **Robustness:**  
   - Use stable selectors (`data-testid`) not generated CSS classes.
   - Copy computed styles from existing elements for theme compatibility.
   - Proper observer lifecycle management.
   - Element ID-based lookups for performance and reliability.

---

## **Edge Cases & Considerations**

- **Multiple Renders:**  
  - Always check for existing button/container before injecting.
- **SPA Navigation:**  
  - Listen for URL changes to show/hide button based on file type.
  - Reset toggle state to "on" when rendering .mdc files.
  - Restore original container when leaving .mdc files.
- **Accessibility:**  
  - Use `aria-pressed`, `aria-label`, and keyboard accessibility.
- **Original Container:**
  - **Never delete** the original GitHub container; only toggle its visibility.
  - Find container by locating parent of `#highlighted-line-menu-positioner`.
- **Theme Compatibility:**
  - Use GitHub's CSS classes to automatically adapt to user's theme preferences.
- **Error Handling:**
  - Log warnings if toolbar elements cannot be found.
  - Continue script execution without button if injection fails.

---

## **GitHub CSS Classes Reference**

**Important:** Many GitHub CSS classes are generated and will change between builds. Use stable selectors instead:

**Reliable Selectors:**
- **Toolbar Container:** `div.react-blob-header-edit-and-raw-actions` (stable class name)
- **Raw Button:** `[data-testid="raw-button"]` (stable test ID)
- **Original Container:** `#highlighted-line-menu-positioner` (stable ID)
- **Button Attributes:** `data-testid`, `data-hotkey`, `aria-label` (stable attributes)

**Generated Classes to Avoid:**
- `Box-sc-g0xbh4-0`, `prc-ButtonGroup-ButtonGroup-vcMeG` (CSS-in-JS generated)
- `prc-Button-ButtonBase-c50BI`, `prc-Button-IconButton-szpyj` (will change)

**Strategy:**
- Use `data-testid` and semantic selectors for finding elements
- **Copy entire className from existing buttons** for visual consistency
- **Copy data attributes** (`data-loading`, `data-no-visuals`, `data-size`) from reference buttons
- Use `getElementById()` for our own elements with unique IDs

---

## **Example Implementation Structure**

```js
function injectToggleButton() {
  if (document.getElementById('mdc-toggle-render-btn')) return;
  if (!document.getElementById('mdc-rendered-markdown')) return; // Use ID, not class
  
  // Find toolbar container using stable selectors
  const toolbar = findToolbarContainer();
  if (!toolbar) {
    console.warn('[mdc-render] Could not find toolbar for toggle button');
    return;
  }
  
  // Create button by copying from existing GitHub button
  const buttonGroup = createButtonGroupFromReference();
  
  // Insert between Copilot and Raw groups
  insertButtonGroup(toolbar, buttonGroup);
}

function setRenderState(isRendered) {
  const markdownBody = document.getElementById('mdc-rendered-markdown');
  const original = document.querySelector('#highlighted-line-menu-positioner');
  
  if (isRendered) {
    markdownBody.style.display = 'block';
    original.style.display = 'none';
  } else {
    markdownBody.style.display = 'none';
    original.style.display = originalDisplayValue || 'block'; // Preserve original!
  }
  
  syncToggleButtonState(); // Ensure button state matches
}

function handleSPANavigation() {
  if (MDC_FILE_REGEX.test(location.href)) {
    // Critical: Track old content to avoid stale rendering
    const oldContent = document.querySelector('#read-only-cursor-text-area')?.textContent || '';
    
    // Clean up completely
    removeToggleButton();
    document.getElementById('mdc-rendered-markdown')?.remove();
    
    // Reset state
    originalContainer = null;
    originalDisplayValue = null;
    lastContent = oldContent; // Don't reset to empty!
    
    waitForTextareaAndObserve();
  } else {
    // Clean up when leaving .mdc files
    removeToggleButton();
    restoreOriginalContainer();
  }
}
```

---

## **Summary Table**

| State      | .markdown-body | Original Container | Button Label | Button Variant | aria-pressed |
|------------|----------------|-------------------|--------------|----------------|--------------|
| Rendered   | visible        | hidden            | `M↓`         | default        | true         |
| Source     | hidden         | visible           | `M↓`         | invisible      | false        |

---

## **Implementation Learnings & Critical Insights**

### **DOM Structure Preservation (Critical)**
**Problem**: Initial approach of clearing `section.innerHTML` destroyed GitHub's DOM structure.
**Solution**: Preserve original DOM completely - insert our markdown as a sibling to `#highlighted-line-menu-positioner`.
**Key Insight**: Never destroy GitHub's DOM structure. GitHub's JavaScript expects specific elements to exist.

### **CSS Display Value Preservation (Critical)**
**Problem**: Using `display: block` when restoring elements broke layout for elements with different display values.
**Solution**: Capture original `window.getComputedStyle(element).display` before hiding, restore exact value.
```javascript
const computedStyle = window.getComputedStyle(originalContainer);
originalDisplayValue = computedStyle.display;
// Later: element.style.display = originalDisplayValue || 'block';
```

### **Generated CSS Classes (Avoid)**
**Problem**: GitHub uses CSS-in-JS generated classes like `Box-sc-g0xbh4-0` that change between builds.
**Solution**: Use stable selectors (`data-testid`, semantic class names) and copy computed styles from existing elements.

### **SPA Navigation Content Timing (Critical)**
**Problem**: Content observer was rendering stale content from previous file during SPA navigation.
**Solution**: Track old content before navigation, only render when content genuinely changes.
```javascript
const oldContent = oldTextarea ? oldTextarea.textContent : '';
lastContent = oldContent; // Don't reset to empty!
```

### **Element ID Management**
**Problem**: Using class selectors led to ambiguity and performance issues.
**Solution**: Assign unique IDs to all our elements and use `getElementById()` consistently.
```javascript
const MARKDOWN_CONTAINER_ID = 'mdc-rendered-markdown';
markdownDiv.id = MARKDOWN_CONTAINER_ID;
```

### **State Synchronization**
**Problem**: Toggle button visual state could become desynchronized from actual state.
**Solution**: Create dedicated `syncToggleButtonState()` function called after every state change.

### **Observer Lifecycle Management**
**Problem**: MutationObservers persisting across SPA navigation caused conflicts.
**Solution**: Proper cleanup and re-creation of observers for each navigation.

### **Visibility Strategy**
**Initial attempt**: `visibility: hidden` + `position: absolute` + `left: -9999px`
**Problem**: This moved our elements off-screen too.
**Final solution**: Simple `display: none/block` with proper display value preservation.

---

## **Critical Implementation Notes**

1. **Never use `innerHTML = ''`** - Always preserve GitHub's DOM structure
2. **Always capture original display values** before modifying them
3. **Use element IDs, not classes** for our own elements
4. **Clean up observers** on every SPA navigation
5. **Track content changes properly** to avoid stale rendering
6. **Synchronize state explicitly** after every operation

---

## **Testing Plan**

To be done by a human:

- Verify button appears only once, in correct location, and only on .mdc files.
- Toggle switches between views as expected.
- Button style and aria attributes update correctly.
- Works after SPA navigation to/from .mdc files.
- Button disappears when navigating away from .mdc files.
- Original container is restored when leaving .mdc files.
- No interference with GitHub's own buttons.
- Button styling adapts to GitHub theme changes.
- Original GitHub container is never deleted, only hidden/shown.
- **NEW**: Rendered content always matches current file (not previous file).
- **NEW**: Toggle button state stays synchronized across all operations.
- **NEW**: Original GitHub layout and functionality completely preserved.
