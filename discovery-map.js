/* List and map share the same filtered routes. No location permission is needed. */
(function () {
  let map, layer, latest = [], initialized = false;
  const markers = new Map();
  const safe = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function validPoint(point) { return Array.isArray(point) && point.length === 2 && point.every(Number.isFinite) && Math.abs(point[0]) <= 90 && Math.abs(point[1]) <= 180; }
  function render(routes) {
    latest = routes;
    const status = document.getElementById('map-status');
    if (!window.L) { status.textContent = 'Газрын зураг ачаалагдсангүй. Жимийн жагсаалтаас үргэлжлүүлэн сонгоорой.'; return; }
    if (!initialized) {
      map = L.map('explore-map', { scrollWheelZoom: false }).setView([47.88, 107.05], 10);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom:19, attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(map);
      layer = L.layerGroup().addTo(map); initialized = true;
    }
    layer.clearLayers(); markers.clear();
    const points = [];
    routes.forEach(route => {
      const point = route.track?.find(validPoint); if (!point) return;
      points.push(point);
      const marker = L.marker(point, { icon:L.divIcon({className:'trail-marker',html:`<span>${safe(route.distanceKm)} км</span>`,iconSize:[65,30],iconAnchor:[32,15]}), title:route.name }).addTo(layer);
      marker.bindPopup(`<div class="map-popup"><strong>${safe(route.name)}</strong><p>${safe(route.difficulty)} · ${safe(route.distanceKm)} км · ${safe(route.timeHr)} цаг</p><a href="route-detail.html?id=${encodeURIComponent(route.id)}">Жимийн тухай үзэх →</a></div>`);
      marker.on('click', () => {
        document.querySelectorAll('[data-card-route]').forEach(card => card.classList.toggle('map-selected',card.dataset.cardRoute===route.id));
        markers.forEach(m => m.getElement()?.classList.remove('selected'));
        marker.getElement()?.classList.add('selected');
      });
      markers.set(route.id,marker);
    });
    if (points.length) map.fitBounds(L.latLngBounds(points), {padding:[45,45],maxZoom:13});
    status.textContent = points.length ? '' : 'Сонгосон жимүүдийн газрын зургийн мэдээлэл алга.';
  }
  window.addEventListener('routes:filtered',event=>render(event.detail));
  document.addEventListener('DOMContentLoaded',()=>{
    document.querySelectorAll('[data-view]').forEach(button=>{
      if(button.tagName!=='BUTTON') return;
      button.addEventListener('click',()=>{
        document.querySelector('.explore-layout').dataset.view=button.dataset.view;
        document.querySelectorAll('button[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
        if(button.dataset.view==='map') { if (!initialized) render(latest); requestAnimationFrame(()=>{map?.invalidateSize();const points=latest.map(r=>r.track?.find(validPoint)).filter(Boolean);if(map&&points.length)map.fitBounds(L.latLngBounds(points),{padding:[45,45],maxZoom:13});}); }
      });
    });
    window.addEventListener('resize',()=>map?.invalidateSize());
  });
})();
