export async function getVisibleElements(page) {
  const elements = await page.$$(
    'a, button, input, textarea, [role], [onclick], [tabindex], [aria-label], [type], [name]'
  );
  const visibleElements = [];
  for (const el of elements) {
    if (await el.isVisible()) {
      const props = await el.evaluate(node => ({
        tag: node.tagName,
        type: node.getAttribute('type') || null,
        name: node.getAttribute('name') || null,
        role: node.getAttribute('role') || null,
        ariaLabel: node.getAttribute('aria-label') || null,
        text: [...node.childNodes]
          .filter(n => n.nodeType === 3 /* TEXT_NODE */)
          .map(n => n.textContent.trim())
          .filter(Boolean)
          .join(' ') || '',
        href: node.getAttribute('href') || null,
        id: node.id || null,
        class: node.className || null,
        value: node.value || null,
        tabindex: node.getAttribute('tabindex') || null,
        onclick: node.getAttribute('onclick') || null,
      }));
      visibleElements.push(props);
    }
  }
  return visibleElements;
}

/**
 * Builds locator options for a list of visible elements.
 * - Removes duplicates by href+text.
 * - Builds a Playwright-like locator string for each element.
 * - Removes all fields with null or undefined values from the output.
 * @param {Array<Object>} visibleElements - Array of element objects to process.
 * @returns {Array<Object>} Array of objects with locator and cleaned element fields.
 */
export function buildLocatorOptions(visibleElements) {
  // Remove duplicates by unique key (href + text)
  const unique = [];
  const seen = new Set();

  for (const el of visibleElements) {
    // Create a unique key for each element based on href and text
    const key = `${el.href || ''}|${el.text || ''}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(el);
    }
  }

  return unique.map(el => {
    // Start locator with the element's tag name in lowercase
    let locator = el.tag.toLowerCase();

    // Add CSS class selectors if present
    if (el.class) locator += '.' + el.class.split(' ').join('.');

    // Add attribute selectors for various attributes if present
    if (el.href) locator += `[href="${el.href}"]`;
    if (el.id) locator += `#${el.id}`;
    if (el.name) locator += `[name="${el.name}"]`;
    if (el.role) locator += `[role="${el.role}"]`;
    if (el.ariaLabel) locator += `[aria-label="${el.ariaLabel}"]`;
    if (el.type) locator += `[type="${el.type}"]`;
    if (el.tabindex) locator += `[tabindex="${el.tabindex}"]`;
    if (el.onclick) locator += `[onclick="${el.onclick}"]`;
    if (el.value) locator += `[value="${el.value}"]`;

    // If parentClass and parentTag are present, prepend parent selector
    if (el.parentClass && el.parentTag) {
      locator =
        `${el.parentTag.toLowerCase()}.${el.parentClass
          .split(' ')
          .join('.')}` +
        ' ' +
        locator;
    }

    // Add text selector if text is present
    if (el.text) locator += `:has-text("${el.text}")`;

    // Remove all fields with null or undefined values from the element
    const cleanEl = Object.fromEntries(
      Object.entries(el).filter(([_, v]) => v != null)
    );

    // Return the locator and the cleaned element fields
    return { locator, ...cleanEl };
  });
}

export function normalizeLocatorString(locatorString) {
  locatorString = locatorString.replace(/^["']|["']$/g, '');
  locatorString = locatorString.replace(/^text="text=\\?"?(.+?)\\?"?"$/, 'text="$1"');
  locatorString = locatorString.replace(/^text="text="(.+)"$/, 'text="$1"');
  locatorString = locatorString.replace(/\\"/g, '"');
  locatorString = locatorString.trim();

  if (!locatorString.includes(':visible')) {
    locatorString += ':visible';
  }

  return locatorString;
}