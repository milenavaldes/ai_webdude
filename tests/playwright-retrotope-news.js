import { chromium } from 'playwright';
import OpenAI from 'openai';
import assert from 'assert';

// Describes the answer's format, HOW to provide the answer, not WHAT to do
const systemMessage = `
You are an assistant that selects the most appropriate Playwright locator from a provided list of valid locators.
Choose only one locator that best matches the scenario. Do not invent or modify locators.
Return only the locator string from the list, with no explanations or line breaks.
Choose only one locator string from the provided list. Do not combine, modify, or invent locators. Return the locator string exactly as it appears in the list.
If multiple elements have the same text, use additional attributes (such as tag, class, href, id) from the same object to make the locator unique.
Для поиска элемента с несколькими признаками используй Playwright-специфичные конструкции, например, a.outline-button-dark:has-text("View MDR packages").
If you cannot find a valid locator matching the task, reply with "NOT FOUND" and briefly explain why.
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

const locatorOptions = [
  {
    locator: 'text="View MDR packages"',
    tag: 'A',
    text: 'View MDR packages',
    href: 'https://expel.com/mdr-packages/',
    class: 'outline-button-dark'
  },
  {
    locator: 'css=.outline-button-dark',
    tag: 'A',
    text: 'View MDR packages',
    href: 'https://expel.com/mdr-packages/',
    class: 'outline-button-dark'
  },
  {
    locator: 'text="Email threat detection"',
    tag: 'A',
    text: 'Email threat detection',
    href: 'https://expel.com/solutions/email-threat-detection/',
    class: null
  },
  {
    locator: 'text="Optimize your SIEM security"',
    tag: 'A',
    text: 'Optimize your SIEM security',
    href: 'https://expel.com/solutions/optimize-your-siem-security/',
    class: null
  },
  {
    locator: 'text="Achieve world-class security operations metrics"',
    tag: 'A',
    text: 'Achieve world-class security operations metrics',
    href: 'https://expel.com/solutions/improve-security-operations-metrics/',
    class: null
  },
  {
    locator: 'text="Managed detection across products"',
    tag: 'A',
    text: 'Managed detection across products',
    href: 'https://expel.com/solutions/cross-product-managed-detection/',
    class: null
  },
  {
    locator: 'text="Security data lake"',
    tag: 'A',
    text: 'Security data lake',
    href: 'https://expel.com/solutions/security-data-lake/',
    class: null
  },
  {
    locator: 'text="Cloud detection and response"',
    tag: 'A',
    text: 'Cloud detection and response',
    href: 'https://expel.com/solutions/cloud-security/',
    class: null
  }
];

// // Uncomment to see the raw list of visible elements

  const json = JSON.stringify(locatorOptions, null, 2);

// // Curious what did we parsed and sent to AI?
// console.log('JSON content:', json);
// console.log('JSON length:', json.length);

  const messages = [
  { role: 'system', content: systemMessage },
  {
    role: 'user',
    content: `Here is the list of available elements (as JSON): ${json} Which locator should be used to click the button or link to review MDR packages?`
  }
];

console.log('🤖 Calling OpenAI...');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

let locatorString;
let attempts = 0;
while (attempts < 3) {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0,
    messages,
  });
  locatorString = completion.choices[0].message.content.trim();
  locatorString = locatorString.replace(/```[a-z]*\s*([\s\S]*?)\s*```/i, '$1').trim();
  locatorString = locatorString.replace(/\.?locator\(['"`](.*)['"`]\)/, '$1');

  // Логируем попытку и ответ
  console.log(`\n--- Attempt #${attempts + 1} ---`);
  console.log('Locator string:', locatorString);

  const locator = page.locator(locatorString);
  const count = await locator.count();
  console.log(`Number of matches: ${count}`);

  if (count === 1) break;

  messages.push({
    role: 'user',
    content: `Previous locator "${locatorString}" matched ${count} elements. Generate a locator that matches exactly one clickable element, using only texts and attributes from the JSON.`
  });
  attempts++;
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
