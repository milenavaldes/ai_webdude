import OpenAI from 'openai';

export async function getLocatorFromAI(messages, maxAttempts = 3) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  let locatorString;
  let attempts = 0;

  while (attempts < maxAttempts) {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0,
      messages,
    });
    locatorString = completion.choices[0].message.content.trim();
    locatorString = locatorString.replace(/```[a-z]*\s*([\s\S]*?)\s*```/i, '$1').trim();
    locatorString = locatorString.replace(/\.?locator\(['"`](.*)['"`]\)/, '$1');

    console.log(`\n--- Attempt #${attempts + 1} ---`);
    console.log('Locator string:', locatorString);

    // Return locator and attempts for the test
    return { locatorString, attempts: attempts + 1 };
  }
  return { locatorString, attempts: maxAttempts };
}