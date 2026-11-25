/* DOM integration for weather and natural features; stale responses cannot replace a new route. */
(function(){
 let version=0, currentRoute=null, map=null, markers=new Map();
 const safe=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const number=(value,suffix='')=>Number.isFinite(value)?Math.round(value)+suffix:'—';
 const safeLink=value=>{try {const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}};
 const safeImage=value=>/^zurag\/[a-zA-Z0-9_./-]+$/.test(value||'')&&!value.split('/').includes('..')?value:safeLink(value);
 function drawForecast(result){
  const {data,point,fetchedAt}=result;let selected=0;
  const container=document.getElementById('weather-content');
  function draw(){
   const d=data.daily,i=selected,today=i===0,condition=WalkyWeather.description(today?data.current.weather_code:d.weather_code[i]);
   const temperature=today?number(data.current.temperature_2m,'°'):number(d.temperature_2m_max[i],'°');
   const sunrise=typeof d.sunrise[i]==='string'?d.sunrise[i].split('T')[1]?.slice(0,5):'—';
   const sunset=typeof d.sunset[i]==='string'?d.sunset[i].split('T')[1]?.slice(0,5):'—';
   container.innerHTML=`<div class="weather-days" aria-label="Өдрөө сонгох">${d.time.map((date,index)=>`<button type="button" data-weather-day="${index}" aria-label="${safe(date)} өдрийн цаг агаар" aria-pressed="${i===index}">${index===0?'Өнөөдөр':safe(date.slice(5).replace('-','/'))}<span>${number(d.temperature_2m_max[index],'°')}</span></button>`).join('')}</div><div class="weather-now"><div><strong>${temperature}</strong><p class="weather-description">${safe(condition[1])}</p></div><span class="weather-symbol" aria-hidden="true">${condition[0]}</span></div><div class="weather-grid"><div>${today?'Мэдрэгдэх':'Өдрийн хамгийн бага'}<b>${number(today?data.current.apparent_temperature:d.temperature_2m_min[i],'°C')}</b></div><div>Хур тунадасны магадлал<b>${number(d.precipitation_probability_max[i],'%')}</b></div><div>${today?'Салхи':'Салхи, ихдээ'}<b>${number(today?data.current.wind_speed_10m:d.wind_speed_10m_max[i],' м/с')}</b></div><div>${today?'Салхины ширүүсэлт':'Ширүүсэлт, ихдээ'}<b>${number(today?data.current.wind_gusts_10m:d.wind_gusts_10m_max[i],' м/с')}</b></div><div>Нар мандах<b>${safe(sunrise||'—')}</b></div><div>Нар жаргах<b>${safe(sunset||'—')}</b></div></div><div class="weather-hours" aria-label="Цаг тутмын мэдээ"></div><p class="weather-updated">${point[0].toFixed(4)}, ${point[1].toFixed(4)} · УБ цаг<br>Шинэчилсэн: ${safe(new Date(fetchedAt).toLocaleTimeString('mn-MN',{timeZone:'Asia/Ulaanbaatar',hour:'2-digit',minute:'2-digit'}))}</p>`;
   const hours=Array.isArray(data.hourly?.time)?data.hourly.time:[];
   const matching=hours.map((time,index)=>({time,index})).filter(({time})=>typeof time==='string'&&time.startsWith(d.time[i])&&(!today||time>=data.current.time.slice(0,13)+':00')).slice(0,6);
   container.querySelector('.weather-hours').innerHTML=matching.map(({time,index})=>`<div><span>${safe(time.slice(11,16))}</span><b>${number(data.hourly.temperature_2m?.[index],'°')}</b><span>${number(data.hourly.precipitation_probability?.[index],'%')}</span></div>`).join('');
   container.querySelectorAll('[data-weather-day]').forEach(button=>button.addEventListener('click',()=>{selected=Number(button.dataset.weatherDay);draw();container.querySelector(`[data-weather-day="${selected}"]`).focus({preventScroll:true});}));
  }draw();
 }
 async function loadWeather(route,force=false){
  const request=++version,status=document.getElementById('weather-status'),retry=document.getElementById('weather-retry'),content=document.getElementById('weather-content');
  content.replaceChildren();retry.hidden=true;
  const point=WalkyWeather.coordinates(route);
  if(!point){status.textContent='Энэ жимийн координат байхгүй тул цаг агаар харуулах боломжгүй.';return;}
  status.textContent='Цаг агаарын мэдээг ачаалж байна…';
  try{const result=await WalkyWeather.forecast(point,force);if(request!==version)return;status.textContent='';drawForecast(result);}
  catch(error){if(request!==version)return;status.textContent='Цаг агаарын мэдээг авч чадсангүй. Холболтоо шалгаад дахин оролдоорой.';retry.hidden=false;}
 }
 function renderFeatures(route){
  const list=document.getElementById('feature-list'),features=WalkyFeatures.forRoute(route);
  list.innerHTML=features.length?features.map((feature,index)=>{
   const src=safeImage(feature.image),source=safeLink(feature.source),point=WalkyWeather.coordinates({track:[feature.coordinates]});
   return `<article class="feature-item">${src?`<img src="${safe(src)}" alt="${safe(feature.name)}" loading="lazy">`:'<span aria-hidden="true">↟</span>'}<div><p class="feature-type">${safe(feature.type||'Байгалийн онцлог')}</p><h3>${safe(feature.name)}</h3><p>${safe(feature.description)}</p>${source?`<a href="${safe(source)}" target="_blank" rel="noopener noreferrer">Фото / эх сурвалж${feature.credit?' · '+safe(feature.credit):''} ↗</a>`:''}${point?`<button type="button" data-feature="${index}">Ойролцоох цэгийг зурагт харах ↗</button>`:''}</div></article>`;
  }).join(''):'<p class="feature-empty">Энэ жимийн байгалийн онцлогийн дэлгэрэнгүй мэдээлэл хараахан нэмэгдээгүй байна.</p>';
  list.querySelectorAll('[data-feature]').forEach(button=>button.addEventListener('click',()=>{
   if(!map){button.textContent='Газрын зураг ачаалагдсангүй.';return;}
   const index=Number(button.dataset.feature),point=features[index].coordinates;
   document.getElementById('map').scrollIntoView({behavior:'smooth',block:'center'});map.setView(point,15);markers.get(index)?.openPopup();
  }));
 }
 window.WalkyInsights={render(route){currentRoute=route;map=null;markers.clear();renderFeatures(route);loadWeather(route);},addMapFeatures(nextMap,route){map=nextMap;WalkyFeatures.forRoute(route).forEach((feature,index)=>{const point=WalkyWeather.coordinates({track:[feature.coordinates]});if(point)markers.set(index,L.circleMarker(point,{radius:8,color:'#fff',weight:3,fillColor:'#66833e',fillOpacity:1}).addTo(map).bindPopup(safe(feature.name)));});}};
 document.getElementById('weather-retry').addEventListener('click',()=>loadWeather(currentRoute,true));
})();
