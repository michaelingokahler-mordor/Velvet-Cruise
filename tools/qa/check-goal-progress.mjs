import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const out = resolve('output/goal-progress');
mkdirSync(out, { recursive: true });
const file = resolve(out, 'model.mjs');
await build({ entryPoints: ['src/game/goal-progress.ts'], outfile: file, bundle: true, platform: 'node', format: 'esm' });
const api = await import(pathToFileURL(file));
const { normalizeGoalProgress: empty, recordGoal, mergeCompletedGoals, goalCount, GoalProgressStore } = api;
let passed = 0;
function test(name, fn) { fn(); passed++; console.log('PASS '+name); }
const complete = (tier, state=empty(null)) => [...'ABCDE'].reduce((s,g)=>recordGoal(s,tier,g),state);

test('distinctGoals',()=>{
 const initial=empty(null), a=recordGoal(initial,'normal','A');
 assert.equal(goalCount(initial,'normal'),0);assert.equal(goalCount(a,'normal'),1);
 assert.deepEqual(recordGoal(a,'normal','A'),a);
 assert.equal(complete('normal').plusUnlocked,true);
 assert.equal(goalCount(complete('normal'),'normal'),5);
 assert.equal(recordGoal(a,'normal','E').plusUnlocked,false);
});
test('tiersStaySeparate',()=>{
 const s=complete('hard',complete('easy'));
 assert.equal(goalCount(s,'easy'),5);assert.equal(goalCount(s,'hard'),5);
 assert.equal(goalCount(s,'normal'),0);assert.equal(s.plusUnlocked,false);
});
test('legacyFinalNodes',()=>{
 const cleared={easy:[10,12],normal:[0,1,2,3,4,10,12,13,14,10],hard:[4]};
 const s=mergeCompletedGoals(empty(null),cleared,new Set());
 assert.equal(goalCount(s,'normal'),5);assert.equal(s.plusUnlocked,true);
 assert.equal(goalCount(s,'easy'),2);assert.equal(goalCount(s,'hard'),1);
 assert.deepEqual(mergeCompletedGoals(s,cleared,new Set()),s);
});
test('invalidMasksAndUnknownVersions',()=>{
 for(const n of [-1,31.5,63,NaN,'31',null])assert.equal(goalCount(empty({version:1,masks:{normal:n}}),'normal'),0);
 assert.deepEqual(empty({version:99,masks:{normal:31},plusUnlocked:true}),empty(null));
 assert.equal(empty({version:1,masks:{normal:31}}).plusUnlocked,true);
 assert.equal(empty({version:1,masks:{normal:0},plusUnlocked:true}).plusUnlocked,true);
});
test('legacyGoalBadgesDoNotQualify',()=>{
 const s=mergeCompletedGoals(empty(null),{},new Set(['goal-a','goal-b','goal-c','goal-d','goal-e','goal-all']));
 assert.equal(s.plusUnlocked,false);assert.equal(goalCount(s,'normal'),0);
});
test('accountCompletion',()=>{
 const easy=mergeCompletedGoals(empty(null),{},new Set(['easy']));
 assert.equal(goalCount(easy,'easy'),5);assert.equal(easy.plusUnlocked,false);
 const normal=mergeCompletedGoals(easy,{},new Set(['normal']));
 assert.equal(normal.plusUnlocked,true);assert.equal(goalCount(normal,'normal'),5);
 assert.deepEqual(mergeCompletedGoals(normal,{},new Set()),normal);
});
test('storageBlocked',()=>{
 const storage={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
 const store=new GoalProgressStore(storage,'progress');
 for(const g of 'ABCDE')store.record('normal',g);
 assert.equal(store.current.plusUnlocked,true);assert.equal(goalCount(store.current,'normal'),5);
});
test('failedReadNeverOverwritesUnknownSave',()=>{
 let writes=0;
 const store=new GoalProgressStore({getItem(){throw Error('read blocked');},setItem(){writes++;}},'progress');
 for(const g of 'ABCDE')store.record('normal',g);
 assert.equal(store.current.plusUnlocked,true);assert.equal(writes,0);
});
test('persistenceAndNonDestructiveMigration',()=>{
 const values=new Map([['old-goals','["goal-a"]'],['scores','123']]);let writes=0;
 const storage={getItem:k=>values.get(k)??null,setItem(k,v){writes++;values.set(k,v);}};
 const store=new GoalProgressStore(storage,'new-goals');
 store.merge({normal:[10,12]},new Set());store.record('normal','C');
 const before=writes;store.record('normal','C');assert.equal(writes,before);
 const again=new GoalProgressStore(storage,'new-goals');
 assert.equal(goalCount(again.current,'normal'),3);
 assert.equal(values.get('old-goals'),'["goal-a"]');assert.equal(values.get('scores'),'123');
});
test('testHooksDoNotPersist',()=>{
 const values=new Map([['progress',JSON.stringify(complete('normal'))]]);
 const storage={getItem:k=>values.get(k)??null,setItem(){throw Error('must not write');}};
 const store=new GoalProgressStore(storage,'progress',false);
 store.record('normal','A');store.merge({normal:[10,12,13,14,4]},new Set(['normal']));
 assert.equal(goalCount(store.current,'normal'),5);
 assert.equal(values.size,1);
 const fresh=new GoalProgressStore({getItem:()=>null,setItem(){throw Error('must not write');}},'progress',false);
 fresh.record('normal','A');fresh.merge({normal:[10,12,13,14,4]},new Set(['normal']));
 assert.equal(fresh.current.plusUnlocked,false);assert.equal(goalCount(fresh.current,'normal'),0);
});

// Verify the real local/account badge adapter, including the custom progress display.
globalThis.window={};
const saved=new Map();
globalThis.localStorage={getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,String(v))};
const badgesFile=resolve(out,'badges.mjs');
await build({entryPoints:['src/game/badges.ts'],outfile:badgesFile,bundle:true,platform:'node',format:'esm',define:{'import.meta.env.VITE_LOCAL_SERVICES':'"true"'}});
const {Badges,BADGES,BADGE_TYPES,badgeId}=await import(pathToFileURL(badgesFile));
const b=new Badges();b.goalProgress=()=>recordGoal(empty(null),'normal','A');
test('badgeDefinitionsAndProgress',()=>{
 assert.equal(BADGE_TYPES.length,15);
 for(const tier of ['easy','normal','hard']){
  const def=BADGES.find(d=>d.id===badgeId('all-goals',tier));
  assert.ok(def);assert.equal(def.stat,undefined);assert.equal(def.target,5);
  assert.equal(b.progressOf(def),tier==='normal'?1:0);
 }
 const achievements=JSON.parse(readFileSync('assets/ui/achievements.json')).achievements;
 assert.deepEqual(BADGES.map(d=>d.id),achievements.map(d=>d.id));
});
let changed=0;b.onChange=()=>changed++;
b.unlock('all-goals');await new Promise(resolve=>setTimeout(resolve,0));
test('idempotentAccountCompletion',()=>{assert.equal(b.has('all-goals'),true);assert.ok(changed>0);});
const count=changed;b.unlock('all-goals');await new Promise(resolve=>setTimeout(resolve,0));
test('repeatedBadgeDoesNotNotifyAgain',()=>assert.equal(changed,count));

// Exercise the real scene's goal handler without booting Phaser or touching player saves.
const sceneSource=readFileSync('src/main.ts','utf8').replace(/boot\(\);\s*$/, 'export { MainScene };');
const sceneFile=resolve(out,'scene.mjs');
await build({stdin:{contents:sceneSource,resolveDir:resolve('src'),loader:'ts'},outfile:sceneFile,bundle:true,platform:'node',format:'esm',
 define:{'import.meta.env.VITE_LOCAL_SERVICES':'"true"'},plugins:[{name:'headless-scene',setup(build){
  build.onResolve({filter:/^phaser$/},()=>({path:'phaser',namespace:'headless'}));
  build.onLoad({filter:/.*/,namespace:'headless'},()=>({contents:'export default { Scene: class Scene {} };',loader:'js'}));
 }}]});
globalThis.ImageData=class{constructor(w,h){this.data=new Uint8ClampedArray(w*h*4);}};
globalThis.document={createElement:()=>({getContext:()=>({})})};
globalThis.location={hash:''};
saved.clear();
const {MainScene}=await import(pathToFileURL(sceneFile));
const scene=new MainScene();scene.race={diff:{id:'normal'}};
scene.badges.goalProgress=()=>scene.goalProgress.current;
scene.badges.onChange=()=>scene.syncGoalProgress();
test('realSceneIgnoresInvalidGoalNodes',()=>{
 scene.badgeGoal(0);assert.equal(goalCount(scene.goalProgress.current,'normal'),0);
});
test('realSceneGoalHandlerCountsDistinctGoals',()=>{
 for(const node of [10,12,13,14,10])scene.badgeGoal(node);
 assert.equal(goalCount(scene.goalProgress.current,'normal'),4);
 assert.equal(scene.goalProgress.current.plusUnlocked,false);
 scene.badgeGoal(4);assert.equal(scene.goalProgress.current.plusUnlocked,true);
 assert.equal(JSON.parse(saved.get('sunset-coast-run.goal-progress.v1')).masks.normal,31);
});
await new Promise(resolve=>setTimeout(resolve,0));
test('realSceneEarnsNewBadgeAndRetainsOldRewards',()=>{
 assert.equal(scene.badges.has('all-goals'),true);
 assert.equal(scene.badges.has('goal-a'),true);assert.equal(scene.badges.has('goal-all'),true);
});
globalThis.location={hash:'#autopilot'};
const {MainScene:TestScene}=await import(pathToFileURL(sceneFile)+'?test-hooks');
saved.clear();const bot=new TestScene();bot.race={diff:{id:'normal'}};bot.badges.enabled=false;
test('realSceneTestHooksDoNotPersist',()=>{
 for(const node of [10,12,13,14,4])bot.badgeGoal(node);
 assert.equal(bot.goalProgress.current.plusUnlocked,false);assert.equal(saved.size,0);
});
const demoFile=resolve(out,'demo.mjs');
await build({entryPoints:['src/game/goal-progress.ts'],outfile:demoFile,bundle:true,platform:'node',format:'esm',define:{__DEMO_A__:'true'}});
const demo=await import(pathToFileURL(demoFile));
test('demoProgressHasSeparateNamespace',()=>{
 assert.equal(demo.GOAL_PROGRESS_KEY,'sunset-coast-run.demo-a.goal-progress.v1');
 assert.notEqual(demo.GOAL_PROGRESS_KEY,api.GOAL_PROGRESS_KEY);
});
console.log(`PASS ${passed} goal-progress checks`);
