const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const pg = await ctx.newPage();

  await pg.goto('http://localhost:4797/add', { waitUntil: 'networkidle' });
  await pg.waitForTimeout(1500);
  await pg.screenshot({ path: 'D:/CHRIS/RESEARCH/LEARN-EN/_visual/app/add-check.png', fullPage: true });
  console.log('add done');

  await pg.goto('http://localhost:4797/progress', { waitUntil: 'networkidle' });
  await pg.waitForTimeout(1500);
  await pg.screenshot({ path: 'D:/CHRIS/RESEARCH/LEARN-EN/_visual/app/prog-check.png', fullPage: true });
  console.log('prog done');

  await browser.close();
  console.log('all done');
})().catch(e => { console.error(e); process.exit(1); });
