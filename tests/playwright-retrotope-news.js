import { chromium } from 'playwright';
import OpenAI from 'openai';
import assert from 'assert';

const systemMessage = `
Ты — бот, который выдает Playwright-локатор в одну строку.
Формат ответа: только рабочий УНИКАЛЬНЫЙ Playwright-локатор, без пояснений и переносов строк.
Примеры: 
'div:nth-child(2) > .info > .details'
'text="Read more"
'.event:nth-child(3) .details'
'css=.event .details'
'text="The Concept of the LPO" >> css=.event .details >> text="Read more"'
Используй только поддерживаемые Playwright локаторы: text=..., css=..., или комбинации через locator(). Не используй XPath, :text(), :has(), сложные CSS-псевдоселекторы и любые неподдерживаемые конструкции.
Если не можешь найти, ответь "NOT FOUND" и объясни почему не нашел, а также дай наиболее близкий рабочий вариант Playwright-локатора, если такой есть.
Верни локатор для клика по КЛИКАБЕЛЬНОМУ элементу (например, кнопке или ссылке).
Если твой локатор содержит :text(, :has(, двойную точку .. или любые сложные CSS-селекторы — обязательно перегенерируй ответ, пока не получится валидный Playwright-локатор.
`; // Describes the answer's format, HOW to provide the answer, not WHAT to do

// const userMessage = `Найди кнопку, нажав которую пользователь сможет прочитать статью BioWorld Today.`; // Example user message

(async () => {
  //console.log('🚀 Starting browser...');
  const browser = await chromium.launch({ headless: false, slowMo: 50 }); // headed mode
  // const browser = await chromium.launch(); // headless mode
  const page = await browser.newPage();

  //console.log('🌐 Navigating to page...');
  await page.goto('https://www.retrotope.com/news/');
  await page.waitForSelector('body > div > div > section.articles.events.events_page.block');

  // console.log('📄 Fetching page content...');
//   const html = await page.$eval('div.cont', el => el.outerHTML);
const html = await page.$eval('body > div > div > section.articles.events.events_page.block', el => el.outerHTML);
//   console.log(html); // Log the HTML content of the page

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
      content: 'На странице есть несколько статей, у каждой есть заголовок и кнопка "Read more". Найди КЛИКАБЕЛЬНЫЙ элемент (кнопку "Read more"), который относится именно к статье с заголовком "The Concept of the LPO". Верни только рабочий Playwright-локатор для клика по этой кнопке. Не используй некликабельные элементы. Вот HTML-код страницы:' + html
    //   content: 'Найти наиболее подходящий кликабельный элемент чтобы перейти на статью про "Positive Results from Studies"'  + html
    }
  ]
});

// Удаляем лишние кавычки и пробелы из ответа
let locatorString = completion.choices[0].message.content.trim();

// Удаляем Markdown-блоки (```css ... ```)
locatorString = locatorString.replace(/```[a-z]*\s*([\s\S]*?)\s*```/i, '$1').trim();

// Удаляем .locator('...') и locator('...')
locatorString = locatorString.replace(/\.?locator\(['"`](.*)['"`]\)/, '$1');

// Проверяем на запрещённые конструкции
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
