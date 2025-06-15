import { chromium } from 'playwright';
import OpenAI from 'openai';
import assert from 'assert';
import { buildLocatorOptions } from '../helpers/locatorBuilder.js';
import { systemMessage } from '../helpers/systemMessages.js';
import { getLocatorFromAI } from '../helpers/openaiClient.js';




// const userMessage = `Найди кнопку, нажав которую пользователь сможет прочитать статью BioWorld Today.`; // Example user message

(async () => {
  //console.log('🚀 Starting browser...');
  const browser = await chromium.launch({ headless: false, slowMo: 50 }); // headed mode
  // const browser = await chromium.launch(); // headless mode
  const page = await browser.newPage();

  //console.log('🌐 Navigating to page...');
  await page.goto('https://expel.com/');
  await page.waitForSelector('body');

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
    const locatorOptions = buildLocatorOptions(visibleElements);

    const json = JSON.stringify(locatorOptions, null, 2);

    console.log('Locator options count:', locatorOptions.length);
    console.log('JSON length:', json.length);
    console.log('Approx. tokens:', Math.round(json.length / 4));

    await page.pause();

// // Curious what did we parsed and sent to AI?
// console.log('JSON content:', json);
// console.log('JSON length:', json.length);

  const messages = [
  { role: 'system', content: systemMessage },
  {
    role: 'user',
    content: `Here is the list of available elements (as JSON): ${json} Which locator should be used to click the button or link to review MDR packages?`
    // content: `Here is the list of available elements (as JSON): ${json} Which locator should be used to click the button or link to review info about SIEM?`
  }
];

console.log('🤖 Calling OpenAI...');
const { locatorString } = await getLocatorFromAI(messages);

const locator = page.locator(locatorString);
const count = await locator.count();
console.log(`Number of matches: ${count}`);
console.log('✅ Locator received:');
console.log(locator);

if (count !== 1) {
  console.error(`❌ Локатор должен находить ровно 1 элемент, найдено: ${count}`);
  await browser.close();
  process.exit(1);
}

  console.log('👉 Performing click...');
  await locator.click();

  await page.waitForLoadState('load');
  const newUrl = page.url();
  console.log('🌍 New page URL:', newUrl);

  console.log('🎉 Done!');
  await browser.close();
})();
