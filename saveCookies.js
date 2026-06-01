const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto("https://cloud.tencent.com/login");

  console.log("请在浏览器中手动登录腾讯云...");
  await page.waitForTimeout(30000);

  const cookies = await context.cookies();
  fs.writeFileSync('./cookies.json', JSON.stringify(cookies, null, 2));

  console.log("登录态已保存到 cookies.json");
  await browser.close();
})();
