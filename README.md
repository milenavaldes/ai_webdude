# ai_webdude
Test Automation Tool with Dynamic Smart Locators. This tool dynamically generates smart locators during runtime, adapting in real-time to page changes or DOM updates to ensure reliable and robust test execution.

It receives the instruction for the test case in natural language. You don't need to worry about the dynamically changed locators or elements being changed/re-named. As long as it clear for a human - WebDude will understand and figure out where to click to complete the task. Similarly it doesn't care about the language, so you can set the test-cases on any convenient for you language.

WebDude utilizes ChatGPT to make intellectuall decisions of two types: 
1. What to do (mainly where to click) to complete the task?
2. What selector to use for action?

To make it work you need to have OpenAI API token set in your environment in openaiClient.js file. This variable is referring to the token OPENAI_API_KEY.  

Install all dependencies running npm install.


To run the test in CLI: 
node tests/playwright-retrotope-news.js


