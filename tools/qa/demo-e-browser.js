async (page) => {
  const entry = new URL(page.url()); entry.search = ''; entry.hash = '';
  const report = { checks: [], errors: [], externalRequests: [] };
  const assert = (condition, message) => { if (!condition) throw Error(message); };
  const same = (actual, expected, message) => assert(JSON.stringify(actual) === JSON.stringify(expected), message + ': ' + JSON.stringify(actual));
  page.on('pageerror', error => report.errors.push(error.message));
  await page.context().route('**/*', route => {
    if (new URL(route.request().url()).origin === entry.origin) return route.continue();
    report.externalRequests.push(route.request().url()); return route.abort();
  });
  await page.context().addInitScript(() => {
    localStorage.setItem('sunset-coast-run.name', 'FULL');
    localStorage.setItem('sunset-coast-run.demo-a.name', 'OLD DEMO');
    localStorage.setItem('sunset-coast-run.goal-progress.v1', JSON.stringify({version: 1, masks: {easy:31, normal:31, hard:31}, plusUnlocked:true}));
  });
  await page.goto(entry.href + '?qa=demo-e&run=' + Date.now() + '#maptest&endtest&graphicstest&path=0,5,8,9,10');
  await page.getByRole('button', {name:'Play the Demo', exact:true}).click();
  await page.waitForFunction(() => typeof window.__map === 'function' && typeof window.__ending === 'function');
  const cdp = await page.context().newCDPSession(page);
  const proto = await cdp.send('Runtime.evaluate', {expression:'Phaser.Scene.prototype'});
  const instances = await cdp.send('Runtime.queryObjects', {prototypeObjectId:proto.result.objectId});
  await cdp.send('Runtime.callFunctionOn', {objectId:instances.objects.objectId, functionDeclaration:'function(){window.__demoQA=this.find(s=>s.input2&&s.demo)}'});
  assert(await page.locator('meta[name="velvet-edition"]').getAttribute('content') === 'demo-e', 'Browser identity must be demo-e');
  same(await page.evaluate(() => __demoQA.newRace().track.path), [0,1,2,3,4], 'Hostile path hash cannot select another route');
  same(await page.evaluate(() => __demoQA.track.path), [0,1,2,3,4], 'Attract mode uses only coastal stages');
  report.checks.push('demo-e browser metadata', 'hostile route hash ignored', 'coastal attract mode');
  await page.screenshot({path:'output/playwright/demo-e/title.png'});
  const map = await page.evaluate(() => {
    __map([0,5,8,9,10]);
    const scene = __demoQA;
    const selected = [];
    for (let i=0; i<16; i++) { scene.courseMap.move(1,1); selected.push(scene.courseMap.sel); }
    return {path: scene.result.path, selected};
  });
  same(map.path, [0,1,2,3,4], 'Result map cannot display the inland path');
  assert(map.selected.every(node => [0,1,2,3,4].includes(node)), 'Map selection must stay within demo stages');
  report.checks.push('result map and selection limited to five coastal stages');
  await page.waitForFunction(() => __demoQA.mode === 'map' && __demoQA.modeT > .1);
  await page.screenshot({path:'output/playwright/demo-e/map.png'});
  const ending = await page.evaluate(() => { __ending('A', 3); return {mode:__demoQA.mode, background:__demoQA.fin.bg}; });
  assert(ending.mode === 'ending' && ending.background === 'ending_bg', 'Ending preview must remain at E: ' + JSON.stringify(ending));
  report.checks.push('requested ending A remains ending E');
  await page.waitForFunction(() => __demoQA.mode === 'ending' && __demoQA.modeT > 3);
  await page.screenshot({path:'output/playwright/demo-e/ending-e.png'});
  await page.evaluate(async () => { await __demoQA.selectGraphics('plus'); });
  const graphics = await page.evaluate(() => __graphicsInfo());
  assert(graphics.mode === 'classic' && graphics.error === 'locked', 'Full unlock cannot enable Plus in demo');
  const storage = await page.evaluate(() => ({full:localStorage.getItem('sunset-coast-run.name'),oldDemo:localStorage.getItem('sunset-coast-run.demo-a.name'),demo:localStorage.getItem('sunset-coast-run.demo-e.name')}));
  assert(storage.full === 'FULL' && storage.oldDemo === 'OLD DEMO' && storage.demo === null, 'Full and old demo saves must remain separate');
  report.checks.push('Plus locked despite full-edition unlock', 'Full and old demo data preserved');
  same(report.errors, [], 'No JavaScript errors');
  same(report.externalRequests, [], 'No external API requests');
  return {status:'PASS', ...report, ending, graphics};
}
