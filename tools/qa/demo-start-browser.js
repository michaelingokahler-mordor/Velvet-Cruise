async (page) => {
  const entry = new URL(page.url()); entry.search = ''; entry.hash = '';
  const origin = entry.origin;
  const report = {status:'PASS', checks:[], externalRequests:[], errors:[]};
  const assert = (condition, message) => { if (!condition) throw Error(message); };
  page.on('pageerror', error => report.errors.push(error.message));
  await page.context().route('**/*', route => {
    if (new URL(route.request().url()).origin === origin) return route.continue();
    report.externalRequests.push(route.request().url()); return route.abort();
  });
  const open = async (suffix = '') => {
    const url = new URL(entry); url.search = '?qa=rating&run=' + Date.now(); url.hash = suffix;
    await page.goto(url.href);
    await page.getByRole('dialog', {name:'Ages 6 and up — classification by SabnockWorks'}).waitFor({timeout:8000});
    assert(await page.locator('canvas').count() === 0, 'Game must not start before confirmation');
    assert(await page.getByText('Mild language · Cartoon crashes · Time pressure', {exact:true}).isVisible(), 'Content notes visible');
  };
  const started = async () => {
    await page.locator('#game canvas').waitFor({state:'visible',timeout:30000});
    assert(await page.getByRole('dialog').count() === 0, 'Notice removed after confirmation');
  };
  await open('autopilot&path=0,5,8,9,10');
  await page.screenshot({path:'output/playwright/demo-rating/desktop.png'});
  await page.getByRole('button', {name:'Play the Demo',exact:true}).click(); await started();
  report.checks.push('direct URL and hostile hash show notice before game', 'mouse confirmation');
  await page.reload();
  await page.getByRole('dialog').waitFor({state:'visible'});
  assert(await page.locator('canvas').count() === 0, 'Reload must show notice again');
  await page.keyboard.down('Enter');
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert(await page.locator('canvas').count() === 0, 'Held Enter cannot start or skip menus');
  await page.keyboard.up('Enter'); await started();
  report.checks.push('reload shows notice', 'Enter confirms on release');
  await open(); await page.keyboard.press('Space'); await started();
  report.checks.push('Space confirmation');
  await page.addInitScript(() => {
    window.__ratingPads = [];
    Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>window.__ratingPads});
  });
  await open();
  await page.evaluate(() => {window.__ratingPads=[{buttons:[{pressed:true,value:1}]}];});
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert(await page.locator('canvas').count() === 0, 'Held gamepad confirmation cannot start or skip menus');
  await page.evaluate(() => {window.__ratingPads[0].buttons[0]={pressed:false,value:0};}); await started();
  report.checks.push('gamepad confirm on release');
  await open();
  await page.evaluate(() => {window.__ratingPads=[{buttons:[{pressed:true,value:1}]}];});
  await page.getByRole('button', {name:'Play the Demo',exact:true}).click();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert(await page.locator('canvas').count() === 0, 'Mouse click must wait for held gamepad confirmation');
  await page.evaluate(() => {window.__ratingPads[0].buttons[0]={pressed:false,value:0};}); await started();
  report.checks.push('mouse plus held gamepad waits for release');
  await open(); await page.keyboard.down('Enter'); await page.keyboard.down('Space'); await page.keyboard.up('Space');
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert(await page.locator('canvas').count() === 0, 'Space release must wait for held Enter');
  await page.keyboard.up('Enter'); await started();
  report.checks.push('simultaneous keyboard confirmation waits for all releases');
  const mobile = await page.context().browser().newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  try {
    await mobile.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    const phone = await mobile.newPage(); await phone.goto(entry.href);
    await phone.getByRole('dialog').waitFor({state:'visible'});
    for (const viewport of [{width:390,height:844},{width:844,height:390},{width:320,height:240}]) {
      await phone.setViewportSize(viewport);
      const button = phone.getByRole('button',{name:'Play the Demo',exact:true}); await button.scrollIntoViewIfNeeded();
      const bounds = await button.boundingBox();
      assert(bounds.x >= 0 && bounds.x + bounds.width <= viewport.width + 1, 'Button fits viewport');
      assert(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal overflow');
    }
    await phone.setViewportSize({width:390,height:844});
    await phone.screenshot({path:'output/playwright/demo-rating/mobile.png'});
    await phone.getByRole('button',{name:'Play the Demo',exact:true}).tap();
    await phone.locator('#game canvas').waitFor({state:'visible',timeout:30000});
    report.checks.push('touch confirmation', 'portrait, landscape and short viewport');
  } finally {await mobile.close();}
  assert(report.externalRequests.length === 0, 'No production API requests');
  assert(report.errors.length === 0, 'No JavaScript errors');
  return report;
}
