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
  // await page.goto('https://quantic.edu/');
  await page.goto('https://expel.com/');
  await page.waitForSelector('body');

  const visibleElements = await getVisibleElements(page);

  console.log('--- Visible elements collected ---');
  // // Print all visible elements
  // console.dir(visibleElements, { depth: null, maxArrayLength: null });

  const locatorOptions = buildLocatorOptions(visibleElements);

  const json = JSON.stringify(locatorOptions, null, 2);

  console.log('Locator options count:', locatorOptions.length);
  console.log('JSON length:', json.length);
  console.log('Approx. tokens:', Math.round(json.length / 4));


// // Curious what did we parsed and sent to AI?
console.log('JSON content:', json);

// console.log('JSON length:', json.length);

  const messages = [
  { role: 'system', content: systemMessage },
  {
    role: 'user',
    // content: `Here is the list of available elements (as JSON): ${json} Which locator should be used to click the button or link to review MDR packages?`
    // content: `Here is the list of available elements (as JSON): ${json} You are user who wants to request demo. Where do you go?`
    // content: `Here is the list of available elements (as JSON): ${json} You are user interested in the program MSSE. Which locator should be used to click the button or link to see more information about this program?`
    // content: `Here is the list of available elements (as JSON): ${json} You are user who want to apply to the university. Which locator should you push?`
     content: `Here is the list of available elements (as JSON): ${json} Which locator should be used to click the button or link to review info about SIEM?`
    // content: `You want to work in this company. Which locator should be used to click the button or link to see Careers? Here is the list of available elements (as JSON): ${json}`
  }
];

console.log('🤖 Calling OpenAI...');
const { locatorString: completionLocatorString } = await getLocatorFromAI(messages);

let locatorString = completionLocatorString.trim();
locatorString = normalizeLocatorString(locatorString);

const rawLocator = page.locator(locatorString);
const count = await rawLocator.count();
console.log(`Number of matches: ${count}`);
console.log('✅ Locator received:', locatorString);

if (count < 1) {
  console.error(`❌ No results found for locator: ${locatorString}`);
  await browser.close();
  process.exit(1);
}

const idx = count === 1 ? 0 : decideNthSmartWay
  ? decideNthSmartWay(locatorString, count)
  : 0;

const locator = rawLocator.nth(idx);

console.log('👉 Performing click...');
await locator.click();

await page.waitForLoadState('load');
const newUrl = page.url();
console.log('🌍 New page URL:', newUrl);

console.log('🎉 Done! Are you happy with the the result?');

  //await page.pause();
  await browser.close();
})();
