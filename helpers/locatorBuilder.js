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
        text: node.textContent?.trim() || '',
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

export function buildLocatorOptions(visibleElements) {
  return visibleElements.map(el => {
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

    if (el.parentClass) {
      locator = `${el.parentTag ? el.parentTag.toLowerCase() : ''}.${el.parentClass.split(' ').join('.')} ${locator}`;
    }
    if (el.text) locator += `:has-text("${el.text}")`;

    return { locator, ...el };
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