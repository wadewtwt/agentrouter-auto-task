import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(root, 'browser-runtime');
const { chromium } = await import('playwright');
await mkdir(path.join(root, 'logs'), { recursive: true });
const context = await chromium.launchPersistentContext(path.join(root, 'browser-profile'), {
  headless: false,
  viewport: null,
});
const page = context.pages()[0] || await context.newPage();
await page.goto('https://agentrouter.org/console', { waitUntil: 'domcontentloaded' });
console.log('请在专用浏览器中完成 GitHub 登录，登录后保留窗口。');

/** 在原页面或 GitHub 新标签页中确认已进入登录后的控制台。 */
async function waitForAccount(loginPage) {
  await loginPage.waitForURL('https://agentrouter.org/console**', { timeout: 900000 });
  await loginPage.waitForFunction(() => {
    try {
      return Boolean(JSON.parse(localStorage.getItem('user'))?.username);
    } catch {
      return false;
    }
  }, undefined, { timeout: 900000 });
  const username = await loginPage.evaluate(() => JSON.parse(localStorage.getItem('user')).username);
  await loginPage.locator('header button').filter({ hasText: username }).waitFor({ state: 'visible' });
}

await Promise.any([
  waitForAccount(page),
  page.waitForEvent('popup', { timeout: 900000 }).then(waitForAccount),
]);
await writeFile(path.join(root, 'logs', 'setup-ready.txt'), new Date().toISOString(), 'utf8');
console.log('已进入控制台。关闭浏览器后保存会话。');
await new Promise(resolve => context.once('close', resolve));
