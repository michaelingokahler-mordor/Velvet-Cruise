async page => {
  const check = (condition, message) => { if (!condition) throw new Error(message); };
  const install = async (target, name, score) => target.evaluate(async ({ name, score }) => {
    const api = await import('/__qa/rankings.js');
    window.rankingsQa = api;
    await api.initTesana();
    api.saveName(name);
    await api.submitScore('score-normal-tour2', score);
    return { online: api.servicesOnline(), id: JSON.parse(localStorage.getItem('sunset-coast-run.online-profile')).id };
  }, { name, score });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.evaluate(() => localStorage.clear()); // Disposable CLI QA profile only.
  await page.reload();
  await page.locator('canvas').waitFor();
  await page.evaluate(() => {
    localStorage.setItem('sunset-coast-run.arcade.tour2', JSON.stringify({ normal: [{ n: 'LOCAL', s: 98765, c: 'red', d: 1 }] }));
    localStorage.setItem('sunset-coast-run.stage-bests.tour2', '{"normal":{"0":12345}}');
  });
  const alice = await install(page, 'QA ALICE', 2001);
  check(alice.online, 'Alice connects to the Worker');
  const contextB = await page.context().browser().newContext({ viewport: { width: 1280, height: 720 } });
  const bobPage = await contextB.newPage();
  bobPage.on('pageerror', error => errors.push(error.message));
  await bobPage.goto('http://127.0.0.1:4187/');
  await bobPage.locator('canvas').waitFor();
  const bob = await install(bobPage, 'QA BOB', 3001);
  check(alice.id !== bob.id, 'Separate browser profiles use separate identities');
  let entries = await bobPage.evaluate(() => window.rankingsQa.topScores('score-normal-tour2'));
  check(entries[0].displayName === 'QA BOB' && entries[1].displayName === 'QA ALICE', 'Both players see shared descending scores');
  await page.context().setOffline(true);
  await page.evaluate(() => window.rankingsQa.submitScore('score-normal-tour2', 4001));
  const offline = await page.evaluate(() => ({
    best: JSON.parse(localStorage.getItem('sunset-coast-run.local-bests'))['score-normal-tour2'],
    pending: JSON.parse(localStorage.getItem('sunset-coast-run.online-pending'))['score-normal-tour2'],
    arcade: JSON.parse(localStorage.getItem('sunset-coast-run.arcade.tour2')).normal[0].s,
    stage: JSON.parse(localStorage.getItem('sunset-coast-run.stage-bests.tour2')).normal[0],
  }));
  check(offline.best === 4001 && offline.pending === 4001 && offline.arcade === 98765 && offline.stage === 12345, 'Offline scores persist alongside existing local records');
  await page.context().setOffline(false);
  await page.reload();
  await page.waitForFunction(() => !JSON.parse(localStorage.getItem('sunset-coast-run.online-pending') || '{}')['score-normal-tour2']);
  const localArcade = await page.evaluate(async () => (await import('/__qa/rankings.js')).arcadeTable('normal')[0]?.s);
  check(localArcade === 98765, 'The deployed game still reads the existing local arcade table');
  entries = await bobPage.evaluate(() => window.rankingsQa.topScores('score-normal-tour2'));
  check(entries[0].displayName === 'QA ALICE' && entries[0].score === 4001, 'Reopening sends the queued result and updates the other browser');
  await bobPage.reload();
  await bobPage.locator('canvas').waitFor();
  const canvas = await bobPage.locator('canvas').boundingBox();
  const rankingRead = bobPage.waitForResponse(response => response.url().includes('/scores/score-normal-tour2') && response.status() === 200);
  await bobPage.mouse.click(canvas.x + canvas.width / 2, canvas.y + canvas.height * 115 / 180);
  await rankingRead;
  await bobPage.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await bobPage.screenshot({ path: 'output/online-tests/shared-rankings.png' });
  check(errors.length === 0, 'No game JavaScript errors: ' + errors.join('; '));
  await contextB.close();
  return { status: 'PASS', checks: ['two isolated browser profiles', 'real Worker/D1 shared board', 'real browser offline queue', 'reload retry', 'local arcade/stage preservation', 'game ranking screen'], profiles: [alice.id, bob.id], entries: entries.map(e => ({ name: e.displayName, score: e.score })), errors };
}
