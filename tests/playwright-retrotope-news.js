import { chromium } from 'playwright';
import OpenAI from 'openai';
import assert from 'assert';

// Describes the answer's format, HOW to provide the answer, not WHAT to do
const systemMessage = `
You are an assistant that generates a valid, unique Playwright locator as a single line of code.
Response format: only the working, UNIQUE Playwright locator, with no explanations or line breaks.

Examples:
'div:nth-child(2) > .info > .details'
'text="Read more"'
'.event:nth-child(3) .details'
'css=.event .details'
'text="The Concept of the LPO" >> css=.event .details >> text="Read more"'

Use only supported Playwright locators: text=..., css=..., or combinations using Playwright's locator syntax. Do not use XPath, :text(), :has(), complex CSS pseudo-selectors, or any unsupported constructs.

If you cannot find a valid locator, reply with "NOT FOUND" and briefly explain why, and provide the closest working Playwright locator if possible.

Return a locator for a CLICKABLE element (such as a button or link).
If your locator contains :text(, :has(, double dots .., or any complex CSS selectors, regenerate your answer until you produce a valid Playwright locator.

**Important:** Only use texts, attributes, and values that are actually present in the provided JSON. Do not invent or assume any texts or values that are not in the JSON.

If your locator matches more than one element, make it more specific using available attributes (such as class, id, href, aria-label, etc.) from the JSON, so that it matches exactly one element.
`;

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

  const json = JSON.stringify(visibleElements, null, 2);

// // Curious what did we parsed and sent to AI?
// console.log('JSON content:', json);
// console.log('JSON length:', json.length);

  console.log('🤖 Calling OpenAI...');
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0,
    messages: [
      {
        role: 'system',
        content: systemMessage
      },
      {
        role: 'user',
        content: 'You are on the website of Cybersec company - Expel. You want to review their MDR packages. Figure out where is it on the page can be and which button/link to click to review the details of the packages.' + json
      }
    ]
  });

  // Response cleanup
  // Remove spaces and quotes
  let locatorString = completion.choices[0].message.content.trim();

  // Removw markdown formatting
  locatorString = locatorString.replace(/```[a-z]*\s*([\s\S]*?)\s*```/i, '$1').trim();

  // Remove wrappers
  locatorString = locatorString.replace(/\.?locator\(['"`](.*)['"`]\)/, '$1');

  // Forbidden constructs check
  if (
    locatorString.includes(':text(') ||
    locatorString.includes(':has(') ||
    locatorString.includes('..') ||
    locatorString.match(/[\[\]~^$*|]/)
  ) {
    console.error('❌ Локатор содержит неподдерживаемые конструкции:', locatorString);
    await browser.close();
    process.exit(1);
  }

  const locator = page.locator(locatorString);
  console.log('Locator string:', locatorString);
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
