import assert from 'node:assert/strict';
import {loadConfigFromFile} from 'vite';
const previous=process.env.VELVET_PRODUCTION_STATISTICS;
const cases=[
 ['build','standalone','1',false,false,true],
 ['build','standalone','0',false,false,false],
 ['serve','standalone','1',false,false,false],
 ['build','production','1',false,false,false],
 ['build','desktop','1',false,true,false],
 ['build','demo','1',true,false,false],
 ['build','demo-desktop','1',true,true,false],
];
try{
 for(const[command,mode,flag,demo,desktop,statistics]of cases){
  process.env.VELVET_PRODUCTION_STATISTICS=flag;
  const{config}=await loadConfigFromFile({command,mode},'vite.config.ts');
  assert.equal(config.define.__DEMO_A__,String(demo),mode+' edition');
  assert.equal(config.define['import.meta.env.VITE_DESKTOP_BUILD'],JSON.stringify(String(desktop)),mode+' native identity');
  assert.equal(config.define['import.meta.env.VITE_STATISTICS_PRODUCTION'],JSON.stringify(String(statistics)),command+' '+mode+' statistics');
 }
}finally{if(previous===undefined)delete process.env.VELVET_PRODUCTION_STATISTICS;else process.env.VELVET_PRODUCTION_STATISTICS=previous;}
console.log('PASS: seven build/dev/web/demo/native configuration combinations');
