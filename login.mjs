import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const logDirectory = path.join(root, 'logs');
await mkdir(logDirectory, { recursive: true });
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(root, 'browser-runtime');
const { chromium } = await import('playwright');
let context;
let page;
let stage = '初始化';

/** 将运行结果写入本地日志，不记录凭据和 OAuth 地址。 */
async function record(status, message) {
  const result = { time: new Date().toISOString(), status, message };
  console.log(`${result.time} ${status} ${message}`);
  await appendFile(path.join(logDirectory, 'runs.jsonl'), `${JSON.stringify(result)}\n`, 'utf8');
  await writeFile(path.join(logDirectory, 'last-result.json'), JSON.stringify(result, null, 2), 'utf8');
}

/** 在页面操作被今日公告遮挡时关闭公告，并记录处理结果。 */
async function registerAnnouncementHandler(loginPage) {
  const closeToday = loginPage.getByRole('button', { name: '今日关闭', exact: true });
  await loginPage.addLocatorHandler(closeToday, async () => {
    await closeToday.click();
    await record('announcement_closed', '已点击今日关闭，关闭系统公告。');
  });
}

/** 根据已登录页面中的用户名定位右上角账户按钮。 */
async function accountButton() {
  await page.waitForFunction(() => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      return Boolean(user?.username);
    } catch {
      return false;
    }
  }, undefined, { timeout: 60000 });
  const username = await page.evaluate(() => JSON.parse(localStorage.getItem('user')).username);
  const button = page.locator('header button').filter({ hasText: username });
  await button.waitFor({ state: 'visible', timeout: 60000 });
  return button;
}

try {
  const beijingHour = Number(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Shanghai', hour: '2-digit', hourCycle: 'h23',
  }).format(new Date()));
  if (process.argv.includes('--scheduled') && beijingHour !== 9) {
    await record('skipped', '已超出北京时间 09:00–10:00，跳过本次定时执行。');
  } else {
    await record('started', '开始刷新 AgentRouter 登录。');
    context = await chromium.launchPersistentContext(path.join(root, 'browser-profile'), {
      headless: false,
      viewport: { width: 1360, height: 900 },
    });
    context.setDefaultTimeout(30000);
    page = context.pages()[0] || await context.newPage();
    await registerAnnouncementHandler(page);
    stage = '打开控制台';
    await page.goto('https://agentrouter.org/console', { waitUntil: 'domcontentloaded' });
    const githubButton = page.getByRole('button', { name: /使用 GitHub 继续|Continue with GitHub/i });
    stage = '等待登录按钮或账户按钮';
    await Promise.any([
      githubButton.waitFor({ state: 'visible', timeout: 60000 }),
      accountButton(),
    ]);
    if (!await githubButton.isVisible()) {
      stage = '打开账户菜单';
      const button = await accountButton();
      await button.hover();
      stage = '等待并点击退出';
      const logout = page.getByText(/^(退出|退出登录|退出登陆|Logout|Log out|Sign out)$/i);
      await logout.waitFor({ state: 'visible' });
      await logout.click();
      await page.waitForURL(url => url.origin === 'https://agentrouter.org' && url.pathname === '/login');
      await record('logged_out', '已退出 AgentRouter 登录。');
    }
    stage = '通过 GitHub 重新登录';
    const popup = page.waitForEvent('popup', { timeout: 30000 });
    await githubButton.click();
    page = await popup;
    await registerAnnouncementHandler(page);
    await page.waitForURL(url => url.origin === 'https://agentrouter.org' && url.pathname.startsWith('/console'), {
      timeout: 90000,
    });
    stage = '验证重新登录后的账户按钮';
    await accountButton();
    await record('success', 'GitHub 登录完成，已确认返回控制台并显示账户菜单。');
  }
} catch (error) {
  if (page && !page.isClosed()) {
    await page.screenshot({ path: path.join(logDirectory, 'last-failure.png') }).catch(() => {});
  }
  const detail = String(error.message).split('\n')[0].replace(/https?:\/\/\S+/g, '[URL]');
  await record('failed', `登录流程失败，阶段：${stage}（${error.name}: ${detail}）；请检查网络、页面变化或运行 npm run setup 更新 GitHub 会话。`);
  process.exitCode = 1;
} finally {
  await context?.close();
}
