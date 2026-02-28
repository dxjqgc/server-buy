const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  console.log('[抢购] 开始执行...');

  // 读取 cookies
  let cookies = [];
  if (fs.existsSync('./cookies.json')) {
    cookies = JSON.parse(fs.readFileSync('./cookies.json', 'utf8'));
    console.log('[抢购] 已加载 cookies，共', cookies.length, '条');
  } else {
    console.log('[抢购] 未找到 cookies.json，将使用未登录状态');
  }

  console.log('[抢购] 启动浏览器...');
  const launchOptions = {
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-infobars',
      '--window-position=0,0',
      '--ignore-certificate-errors'
    ]
  };
  let browser;
  try {
    browser = await chromium.launch({ ...launchOptions, channel: 'chrome' });
    console.log('[抢购] 已使用本机 Chrome');
  } catch {
    browser = await chromium.launch(launchOptions);
    console.log('[抢购] 未检测到本机 Chrome，使用 Chromium');
  }
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 800 },
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai'
  });
  // 降低被识别为自动化，尽量让提交页正常显示购买按钮
  await context.addInitScript(() => {
    try {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined, configurable: true });
    } catch (_) {}
    if (!window.chrome) window.chrome = { runtime: {} };
  });

  if (cookies.length > 0) {
    await context.addCookies(cookies);
  }

  let page = await context.newPage();
  console.log('[抢购] 打开活动页...');
  await page.goto("https://cloud.tencent.com/act/pro/spring2026");
  console.log('[抢购] 页面加载完成，开始轮询「立即抢购」按钮...');

  // 卡片容器 uno3-buy-card__ft，通过「约3.17元/月」定位到对应卡片
  const card = page.locator('.uno3-buy-card__ft').filter({ has: page.getByText('约9.44元/月') });
  const buyBtn = card.locator('.uno3-buy-card__btn');

  let clicked = false;
  let lastLogText = '';
  let pollCount = 0;
  const pollIntervalMs = 100;
  const shortTimeout = 1500; // 每次查找按钮最多等 1.5 秒，避免 30 秒卡死

  while (!clicked) {
    let btn = null;
    try {
      btn = await buyBtn.first().elementHandle({ timeout: shortTimeout });
    } catch {
      // 卡片或按钮尚未出现（页面还在加载 / 选择器不匹配），继续轮询
    }
    if (btn) {
      const text = await btn.evaluate((el) => el.textContent?.trim());
      if (text !== lastLogText) {
        console.log('[抢购] 按钮状态:', text || '(空)');
        lastLogText = text;
      }
      if (text === '立即抢购') {
        console.log('[抢购] 检测到可抢购，点击「立即抢购」');
        const newPagePromise = context.waitForEvent('page', { timeout: 15000 }).catch(() => null);
        await btn.click();
        const newPage = await newPagePromise;
        if (newPage) {
          console.log('[抢购] 已在新标签页打开提交页，等待页面加载...');
          page = newPage;
        } else {
          console.log('[抢购] 在当前页跳转，等待加载...');
        }
        await page.waitForLoadState('domcontentloaded');
        await page.waitForLoadState('networkidle').catch(() => {});
        await new Promise((r) => setTimeout(r, 2000));
        clicked = true;
      }
    } else {
      if (pollCount === 0) console.log('[抢购] 等待目标商品（约3.17元/月）按钮出现...');
      if (pollCount > 0 && pollCount % 100 === 0) {
        console.log('[抢购] 仍在等待中... 请确认页面已打开且包含「约3.17元/月」');
      }
    }
    await new Promise((r) => setTimeout(r, pollIntervalMs));
    pollCount++;
  }

  console.log('[抢购] 等待「提交订单」按钮（最多 30 秒）...');
  try {
    await page.waitForSelector("text=提交订单", { timeout: 30000 });
    console.log('[抢购] 点击「提交订单」');
    await page.click("text=提交订单");
    console.log('[抢购] 流程结束，请确认订单页是否提交成功。');
  } catch (e) {
    console.log('[抢购] 未在限定时间内找到「提交订单」按钮，请在此浏览器中手动完成下单。');
  }
})();
