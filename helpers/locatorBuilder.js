export async function getVisibleElements(page) {
  const elements = await page.$$(
    'a, button, input, textarea, [role], [onclick], [tabindex], [aria-label], [type], [name]'
  );

  const visibleElements = [];
  for (const el of elements) {
    if (await el.isVisible()) {
      const props = await el.evaluate(node => {
        function getDomPath(el) {
          const stack = [];
          while (el.parentNode) {
            const sibs = Array.from(el.parentNode.children).filter(e => e.tagName === el.tagName);
            const idx = sibs.indexOf(el) + 1;
            stack.unshift(`${el.tagName.toLowerCase()}${sibs.length > 1 ? `:nth-of-type(${idx})` : ''}`);
            el = el.parentNode;
          }
          return stack.slice(1).join(' > ');
        }

        const parent = node.closest("header, footer, nav, section, main, article");
        const rect = node.getBoundingClientRect();

        return {
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

          boundingRect: {
            top: Math.round(rect.top),
            left: Math.round(rect.left),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          },

          parentTag: parent?.tagName?.toLowerCase() || null,
          parentClass: parent?.className || null,
          parentId: parent?.id || null,
          contextText: parent?.innerText?.slice(0, 300)?.replace(/\s+/g, ' ') || null,
          domPath: getDomPath(node)
        };
      });

      visibleElements.push(props);
    }
  }

  return visibleElements;
}

/**
 * Builds a base locator string for an element (without .nth()).
 * @param {Object} el
 * @returns {string}
 */
function buildBaseLocator(el) {
  let locator = el.tag.toLowerCase();

  if (el.class) locator += '.' + el.class.split(' ').join('.');
  if (el.href) locator += `[href="${el.href}"]`;
  if (el.id) locator += `#${el.id}`;
  if (el.name) locator += `[name="${el.name}"]`;
  if (el.role) locator += `[role="${el.role}"]`;
  if (el.ariaLabel) locator += `[aria-label="${el.ariaLabel}"]`;
  if (el.type) locator += `[type="${el.type}"]`;
  if (el.tabindex) locator += `[tabindex="${el.tabindex}"]`;
  if (el.onclick) locator += `[onclick="${el.onclick}"]`;
  if (el.value) locator += `[value="${el.value}"]`;

  if (el.parentClass && el.parentTag) {
    locator =
      `${el.parentTag.toLowerCase()}.${el.parentClass
        .split(' ')
        .join('.')}` +
      ' ' +
      locator;
  }

  if (el.text) locator += `:has-text("${el.text}")`;

  return locator;
}

/**
 * Builds locator options for a list of visible elements.
 * - Groups elements by base locator.
 * - Adds .nth() to locatorCode for uniqueness.
 * - Removes all fields with null or undefined values from the output.
 * @param {Array<Object>} visibleElements
 * @returns {Array<Object>}
 */
export function buildLocatorOptions(visibleElements) {
  const unique = [];
  const seen = new Set();

  for (const el of visibleElements) {
    const key = `${el.href || ''}|${el.text || ''}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(el);
    }
  }

  const grouped = new Map();
  for (const el of unique) {
    const baseLocator = buildBaseLocator(el);
    if (!grouped.has(baseLocator)) grouped.set(baseLocator, []);
    grouped.get(baseLocator).push(el);
  }

  const result = [];
  for (const [baseLocator, group] of grouped.entries()) {
    group.forEach((el, idx) => {
      result.push({
        locator: normalizeLocatorString(baseLocator),
        nth: idx,
        tag: el.tag,
        text: el.text,
        href: el.href,
        boundingRect: el.boundingRect,
        parentTag: el.parentTag,
        parentClass: el.parentClass,
        contextText: el.contextText,
        domPath: el.domPath
      });
    });
  }

  return result;
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