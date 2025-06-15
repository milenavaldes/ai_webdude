export function buildLocatorOptions(visibleElements) {
  // Преобразует массив элементов в массив объектов с валидными локаторами
  const locatorOptions = visibleElements.map(el => {
    const { tag, text, href, class: className } = el;
    return {
      locator: `text="${text}"`,
      tag,
      text,
      href,
      class: className
    };
  });
  return locatorOptions;
}