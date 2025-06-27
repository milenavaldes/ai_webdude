import { chromium } from 'playwright';
import assert from 'assert';
import { getVisibleElements, buildLocatorOptions, normalizeLocatorString } from '../helpers/locatorBuilder.js';
import { systemMessage } from '../helpers/systemMessages.js';
import { getLocatorFromAI } from '../helpers/openaiClient.js';

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 50 }); // headed mode
  // const browser = await chromium.launch(); // headless mode
  const page = await browser.newPage();

  //console.log('🌐 Navigating to page...');
  await page.goto('https://expel.com/');
  await page.waitForSelector('body');

  const visibleElements = await getVisibleElements(page);

  console.log('--- Visible elements collected ---');
  console.dir(visibleElements, { depth: null, maxArrayLength: null });

  const locatorOptions = buildLocatorOptions(visibleElements);

  const json = JSON.stringify(locatorOptions, null, 2);

  console.log('Locator options count:', locatorOptions.length);
  console.log('JSON length:', json.length);
  console.log('Approx. tokens:', Math.round(json.length / 4));

// // Curious what did we parsed and sent to AI?
// console.log('JSON content:', json);
// console.log('JSON length:', json.length);

  const messages = [
  { role: 'system', content: systemMessage },
  {
    role: 'user',
    // content: `Here is the list of available elements (as JSON): ${json} Which locator should be used to click the button or link to review MDR packages?`
    // content: `Here is the list of available elements (as JSON): ${json} You are user who wants to request demo. Where do you go?`
    content: `Here is the list of available elements (as JSON): ${json} You are user interested in the program MSSE. Which locator should be used to click the button or link to see more information about this program?`
    // content: `Here is the list of available elements (as JSON): ${json} Which locator should be used to click the button or link to review info about SIEM?`
    // content: `You want to work in this company. Which locator should be used to click the button or link to see Careers? Here is the list of available elements (as JSON): ${json}`
  }
];

console.log('🤖 Calling OpenAI...');
const { locatorString: completionLocatorString } = await getLocatorFromAI(messages);

let locatorString = completionLocatorString.trim();
locatorString = normalizeLocatorString(locatorString);

const locator = page.locator(locatorString);
const count = await locator.count();
console.log(`Number of matches: ${count}`);
console.log('✅ Locator received:');
console.log(locator);

await page.pause();

if (count !== 1) {
  console.error(`❌ Локатор должен находить ровно 1 видимый элемент, найдено: ${count}`);
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
