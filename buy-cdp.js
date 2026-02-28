/**
 * 通过 CDP 连接「你已手动打开的 Chrome」进行抢购，提交页购买按钮会正常显示。
 *
 * 使用步骤：
 * 1. 关闭所有 Chrome 窗口后，用以下命令启动 Chrome（保留此窗口不要关）：
 *    Windows: "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222
 *    或: chrome.exe --remote-debugging-port=9222
 * 2. 在该 Chrome 里打开活动页并登录（或先登录腾讯云再打开活动页）
 * 3. 在本目录执行: node buy-cdp.js
 */
const { chromium } = require('playwright');
const fs = require('fs');

const ACTIVITY_URL = 'https://cloud.tencent.com/act/pro/spring2026';
const CDP_URL = 'http://127.0.0.1:9222';

async function checkPort9222() {
  return new Promise((resolve) => {
    const net = require('net');
    const s = net.createConnection(9222, '127.0.0.1', () => { s.destroy(); resolve(true); });
    s.on('error', () => resolve(false));
    s.setTimeout(500, () => { s.destroy(); resolve(false); });
  });
}

(async () => {
  console.log('[抢购] 开始执行（CDP 模式：连接已打开的 Chrome）...');

  let cookies = [];
  if (fs.existsSync('./cookies.json')) {
    cookies = JSON.parse(fs.readFileSync('./cookies.json', 'utf8'));
    console.log('[抢购] 已读取 cookies，共', cookies.length, '条');
  }

  console.log('[抢购] 正在连接本机 Chrome（端口 9222）...');
  const portOpen = await checkPort9222();
  if (!portOpen) {
    console.error('[抢购] 端口 9222 无响应（ECONNREFUSED），说明当前没有「带调试端口」的 Chrome。');
    console.error('');
    console.error('正确做法（顺序不能错）：');
    console.error('  1. 任务管理器 → 结束所有「Google Chrome」/ chrome.exe（关窗口不够，要进程退出）');
    console.error('  2. 在本目录 PowerShell 执行: .\\start-chrome-debug.ps1');
    console.error('  3. 弹出的是「唯一」的 Chrome，在该窗口里登录并打开活动页');
    console.error('  4. 再运行: node buy-cdp.js');
    console.error('');
    console.error('验证：Chrome 用脚本启动后，在地址栏打开 http://127.0.0.1:9222/json 应能看到 JSON。');
    process.exit(1);
  }

  let browser;
  try {
    browser = await chromium.connectOverCDP(CDP_URL);
  } catch (e) {
    console.error('[抢购] 连接失败:', e.message || e);
    console.error('若 9222 已开放，请确认本机安装的是 Chromium/Chrome，且 Playwright 版本支持 CDP。');
    process.exit(1);
  }
  console.log('[抢购] 已连接 Chrome');

  const contexts = browser.contexts();
  const context = contexts[0] || await browser.newContext();
  if (cookies.length > 0) {
    await context.addCookies(cookies);
  }

  let page = null;
  const pages = context.pages();
  for (const p of pages) {
    try {
      if (p.url().includes('cloud.tencent.com') && p.url().includes('act')) {
        page = p;
        console.log('[抢购] 使用当前已打开的活动页');
        break;
      }
    } catch (_) {}
  }
  if (!page && pages.length > 0) {
    page = pages[0];
    console.log('[抢购] 在当前标签页打开活动页...');
    await page.goto(ACTIVITY_URL);
  }
  if (!page) {
    page = await context.newPage();
    console.log('[抢购] 在新标签页打开活动页...');
    await page.goto(ACTIVITY_URL);
  }

  console.log('[抢购] 页面就绪，开始轮询「立即抢购」按钮...');

  const card = page.locator('.uno3-buy-card__ft').filter({ has: page.getByText('约3.17元/月') });
  const buyBtn = card.locator('.uno3-buy-card__btn');

  let clicked = false;
  let lastLogText = '';
  let pollCount = 0;
  const pollIntervalMs = 50;  // 准点抢时更快响应（原 100ms）
  const shortTimeout = 1500;

  while (!clicked) {
    let btn = null;
    try {
      btn = await buyBtn.first().elementHandle({ timeout: shortTimeout });
    } catch {}

    if (btn) {
      const text = await btn.evaluate((el) => el.textContent?.trim());
      if (text !== lastLogText) {
        console.log('[抢购] 按钮状态:', text || '(空)');
        lastLogText = text;
      }
      if (text === '立即抢购') {
        console.log('[抢购] 检测到可抢购，点击「立即抢购」');
        await btn.click();
        // 极短时间检查是否开了新标签页（侧边栏多在当前页）
        const newPage = await context.waitForEvent('page', { timeout: 500 }).catch(() => null);
        if (newPage) {
          page = newPage;
        }
        clicked = true;
      }
    } else {
      if (pollCount === 0) console.log('[抢购] 等待目标商品（约3.17元/月）按钮出现...');
      if (pollCount > 0 && pollCount % 100 === 0) {
        console.log('[抢购] 仍在等待中...');
      }
    }
    await new Promise((r) => setTimeout(r, pollIntervalMs));
    pollCount++;
  }

  // 侧边栏出现后立即点「立即购买」，只等按钮可点、不做多余等待
  const sidebarBtnSelector = '.uno3-buy-dialog .uno3-dialog-footer-btn button.uno3-button--primary';
  try {
    await page.waitForSelector(sidebarBtnSelector, { state: 'visible', timeout: 15000 });
    const btn = page.locator(sidebarBtnSelector).filter({ hasText: '立即购买' }).first();
    await btn.click();
    console.log('[抢购] 已点击侧边栏「立即购买」，请手动完成余下操作。');
  } catch (e) {
    console.log('[抢购] 未找到侧边栏「立即购买」:', e.message || e);
  }

  await browser.close();
  console.log('[抢购] 已断开连接，Chrome 窗口保持打开，可继续手动操作。');
})();
