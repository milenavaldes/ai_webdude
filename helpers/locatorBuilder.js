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
    const { tag, text, href, class: className } = el;
    return {
      locator: `text="${text}"`,
      tag,
      text,
      href,
      class: className
    };
  });
}