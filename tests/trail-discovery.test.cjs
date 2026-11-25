const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const weather = require('../trail-weather.js');
const features = require('../trail-features.js');
function fixture(){return {current:{time:'2026-11-09T12:00',temperature_2m:-5},daily:{time:['2026-11-09'],weather_code:[71],temperature_2m_max:[-2],temperature_2m_min:[-10],precipitation_probability_max:[60],wind_speed_10m_max:[5],wind_gusts_10m_max:[12],sunrise:['2026-11-09T07:30'],sunset:['2026-11-09T17:20']}};}
test('forecasts use the selected route coordinates and reject invalid/missing coordinates',()=>{
 assert.deepEqual(weather.coordinates({track:[[99,5],[47.9,107.4]]}),[47.9,107.4]);
 assert.equal(weather.coordinates({track:[[null,106]]}),null);
 assert.equal(weather.coordinates({}),null);
 assert.throws(()=>weather.url([91,106]));
 const u=new URL(weather.url([47.9,107.4]));
 assert.equal(u.searchParams.get('latitude'),'47.9');
 assert.equal(u.searchParams.get('longitude'),'107.4');
 assert.equal(u.searchParams.get('timezone'),'Asia/Ulaanbaatar');
 assert.equal(u.searchParams.get('wind_speed_unit'),'ms');
 assert.equal(u.searchParams.get('forecast_days'),'7');
});
test('snow, rain and unavailable conditions are distinct',()=>{
 assert.match(weather.description(71)[1],/Цас/);
 assert.match(weather.description(61)[1],/Бороо/);
 assert.match(weather.description(null)[1],/Мэдээлэлгүй/);
});
test('incomplete forecasts are rejected instead of rendered as invented weather',()=>{
 assert.equal(weather.validate(fixture()).current.temperature_2m,-5);
 const f=fixture();f.daily.sunset=[];assert.throws(()=>weather.validate(f));
 assert.throws(()=>weather.validate({}));
});
test('forecast cache, forced refresh, failure and retry',async()=>{
 const original=global.fetch;let calls=0;
 try {
  global.fetch=async()=>{calls++;return {ok:true,json:async()=>fixture()};};
  await weather.forecast([47.8,106.9]);await weather.forecast([47.8,106.9]);assert.equal(calls,1);
  await weather.forecast([47.8,106.9],true);assert.equal(calls,2);
  global.fetch=async()=>({ok:false,status:503});await assert.rejects(weather.forecast([47.7,106.9]));
  global.fetch=async()=>({ok:true,json:async()=>fixture()});assert.ok((await weather.forecast([47.7,106.9])).fetchedAt);
 } finally {global.fetch=original;}
});
test('known trails have curated features; unknown trails do not inherit another location',()=>{
 assert.ok(features.forRoute({id:'terelj-turtle-rock'}).some(f=>f.name==='Мэлхий хад'));
 assert.equal(features.forRoute({id:'unknown'}).length,0);
 assert.equal(features.forRoute({id:'terelj-turtle-rock',naturalFeatures:[]}).length,0);
 assert.equal(features.forRoute({naturalFeatures:[{name:'Bad'},null]}).length,0);
});
test('search, distance, duration, and reset update the same list used by the map',()=>{
 const listeners={},elements={};let filtered=[];
 function element(value=''){return {value,options:['','2','4','8'].map(value=>({value})),addEventListener(name,fn){this[name]=fn;},setAttribute(){},focus(){}};}
 for(const id of ['search-input','difficulty-filter','duration-filter','distance-filter','route-count','route-grid'])elements['#'+id]=element();
 const chips=['','short','long'].map(v=>({...element(),dataset:{quickFilter:v}}));
 const context={console,URLSearchParams,CustomEvent:class{constructor(type,init){this.type=type;this.detail=init.detail;}},document:{body:{dataset:{page:'explore'}},addEventListener(){},querySelector:q=>elements[q]||null,querySelectorAll:q=>q==='[data-quick-filter]'?chips:[]},window:{location:{search:''},addEventListener:(n,f)=>{listeners[n]=f;},dispatchEvent:e=>{if(e.type==='routes:filtered')filtered=e.detail;}}};
 vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../main.js'),'utf8'),context);
 vm.runInContext('renderRoutes = function() {}; initExplore();',context);
 assert.equal(filtered.length,5);
 elements['#distance-filter'].value='5';elements['#distance-filter'].input();assert.equal(filtered.length,3);
 elements['#search-input'].value='Тэрэлж';elements['#search-input'].input();assert.equal(filtered.length,1);
 elements['#route-grid'].click({target:{closest:()=>true}});assert.equal(filtered.length,5);assert.equal(elements['#distance-filter'].value,'');
 chips[2].click();assert.equal(filtered.length,2);
 elements['#difficulty-filter'].value='Хялбар';elements['#difficulty-filter'].input();assert.equal(filtered.length,2);
});
