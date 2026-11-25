/* Open-Meteo coordinate forecasts. Public non-commercial endpoint; see README. */
(function(root){
  const cache = new Map();
  const TTL = 15 * 60 * 1000;
  function coordinates(route) {
    return route?.track?.find(p => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite) && Math.abs(p[0]) <= 90 && Math.abs(p[1]) <= 180) || null;
  }
  function url(point) {
    if (!coordinates({track:[point]})) throw new Error('Invalid coordinates');
    const query = new URLSearchParams({latitude:point[0],longitude:point[1],timezone:'Asia/Ulaanbaatar',forecast_days:'7',wind_speed_unit:'ms',current:'temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_gusts_10m',hourly:'temperature_2m,precipitation_probability,weather_code',daily:'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,sunrise,sunset'});
    return 'https://api.open-meteo.com/v1/forecast?' + query;
  }
  function description(code) {
    if (code === 0) return ['☀','Цэлмэг'];
    if ([1,2].includes(code)) return ['⛅','Багавтар үүлтэй'];
    if (code === 3) return ['☁','Үүлэрхэг'];
    if ([45,48].includes(code)) return ['☁','Манантай'];
    if ([51,53,55,56,57].includes(code)) return ['☂','Шиврээ бороотой'];
    if ([61,63,65,66,67,80,81,82].includes(code)) return ['☂','Бороотой'];
    if ([71,73,75,77,85,86].includes(code)) return ['❄','Цастай'];
    if ([95,96,99].includes(code)) return ['ϟ','Аянга цахилгаантай'];
    return ['—','Мэдээлэлгүй'];
  }
  function validate(data) {
    if (!data || !data.daily || !Array.isArray(data.daily.time) || !data.daily.time.length || !data.daily.time.every(t=>typeof t==='string' && /^\d{4}-\d{2}-\d{2}$/.test(t))) throw new Error('Invalid forecast');
    if (!data.current || typeof data.current.time !== 'string' || !Number.isFinite(data.current.temperature_2m)) throw new Error('Invalid current forecast');
    for (const name of ['weather_code','temperature_2m_max','temperature_2m_min','precipitation_probability_max','wind_speed_10m_max','wind_gusts_10m_max','sunrise','sunset']) {
      if (!Array.isArray(data.daily[name]) || data.daily[name].length !== data.daily.time.length) throw new Error('Incomplete forecast');
    }
    return data;
  }
  async function forecast(point,force=false) {
    const address=url(point), existing=cache.get(address);
    if (!force && existing && Date.now()-existing.fetchedAt<TTL) return existing;
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),10000);
    try {
      const response=await fetch(address,{signal:controller.signal});
      if(!response.ok) throw new Error('Weather HTTP '+response.status);
      const result={data:validate(await response.json()),fetchedAt:Date.now(),point};
      cache.set(address,result); return result;
    } finally { clearTimeout(timer); }
  }
  const api={coordinates,url,description,validate,forecast};
  if(typeof module!=='undefined' && module.exports) module.exports=api; else root.WalkyWeather=api;
})(typeof window!=='undefined'?window:globalThis);
