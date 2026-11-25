(function (root) {
  'use strict';

  const radius = 2500;
  const endpoint = 'https://overpass.private.coffee/api/interpreter';
  const zaisanAccess = [47.86110244, 106.90358536];
  const manzushirAccess = [47.7647018920567, 106.99292759254106];
  const accessReferences = new Map([
    ['bogd-khan-yagaan-sandal', zaisanAccess],
    ['bogd-khan-dugui-tsagaan', zaisanAccess],
    ['bogd-khan-summit', manzushirAccess]
  ]);
  const publishedStops = {
    'node/11078880605': {
      name: 'Богдхан амралт',
      ref: 'Ч:72',
      source: 'https://www.ubtransport.mn/a/400'
    }
  };

  // OpenStreetMap contributors, ODbL. Nearby stops checked on 2026-11-25.
  // Empty arrays mean the area was checked and OSM returned no mapped stops.
  const savedAreas = [
    {
      point: zaisanAccess,
      elements: [
        { type: 'node', id: 11078880605, lat: 47.8669518, lon: 106.9032056,
          tags: { highway: 'bus_stop', 'name:en': 'Bogd khan amralt' } },
        { type: 'node', id: 8240517517, lat: 47.8755135, lon: 106.9076973,
          tags: { highway: 'bus_stop', name: 'Могул таун' } },
        { type: 'node', id: 5914841786, lat: 47.8816034, lon: 106.9128088,
          tags: { highway: 'bus_stop', 'name:en': 'Zaisan' } }
      ]
    },
    { point: [47.90776211739745, 107.42272359697269], elements: [] },
    { point: manzushirAccess, elements: [] }
  ];

  function validPoint(point) {
    return Array.isArray(point) && point.length === 2 && point.every(Number.isFinite)
      && Math.abs(point[0]) <= 90 && Math.abs(point[1]) <= 180;
  }

  function distanceMeters(from, to) {
    const rad = Math.PI / 180;
    const a = Math.sin((to[0] - from[0]) * rad / 2) ** 2
      + Math.cos(from[0] * rad) * Math.cos(to[0] * rad) * Math.sin((to[1] - from[1]) * rad / 2) ** 2;
    return 12742000 * Math.asin(Math.sqrt(Math.min(1, a)));
  }

  function trackEndpoints(route) {
    const points = Array.isArray(route?.track) ? route.track.filter(validPoint) : [];
    const first = points[0];
    const last = points.length > 1 ? points.at(-1) : null;
    // The built-in Tenger Rock track uses placeholder coordinates.
    if (route?.id === 'tenger-rock' && first?.join(',') === '47.92,106.92') return [null, null];
    // These tracks can be recorded downhill, so use the end closest to the known access point as the start.
    const access = accessReferences.get(route?.id);
    if (last && access && distanceMeters(last, access) < distanceMeters(first, access)) {
      return [last, first];
    }
    return [first || null, last];
  }

  function endpointMapsUrl(route) {
    const [, end] = trackEndpoints(route);
    if (!end) return null;
    const params = new URLSearchParams({ api: '1', query: end.join(',') });
    return 'https://www.google.com/maps/search/?' + params;
  }

  function mapsDirections(destination, mode, origin) {
    const params = new URLSearchParams({ api: '1', destination: destination.join(','), travelmode: mode });
    if (origin) params.set('origin', origin.join(','));
    return 'https://www.google.com/maps/dir/?' + params;
  }

  function searchUrl(point) {
    const around = `(around:${radius},${point.map(value => value.toFixed(6)).join(',')})`;
    const query = [
      '[out:json][timeout:8];',
      '(',
      `node["highway"="bus_stop"]${around};`,
      `nwr["public_transport"="platform"]["bus"="yes"]${around};`,
      `node["public_transport"="stop_position"]["bus"="yes"]${around};`,
      ')->.stops;.stops out center;',
      '(rel(bn.stops)["route"="bus"];rel(bw.stops)["route"="bus"];rel(br.stops)["route"="bus"];);out body;'
    ].join('');
    return endpoint + '?' + new URLSearchParams({ data: query });
  }

  function nearbyStops(point, data) {
    if (!Array.isArray(data?.elements) || data.remark) throw new Error('Incomplete stop data');
    const refsByStop = new Map();
    for (const route of data.elements) {
      if (route.type !== 'relation' || route.tags?.route !== 'bus' || !route.tags.ref) continue;
      for (const member of route.members || []) {
        if (member.role && !/^(stop|platform)(?:_|$)/.test(member.role)) continue;
        const id = `${member.type}/${member.ref}`;
        if (!refsByStop.has(id)) refsByStop.set(id, new Set());
        refsByStop.get(id).add(route.tags.ref);
      }
    }

    return data.elements.flatMap(element => {
      const tags = element.tags || {};
      if (!(tags.highway === 'bus_stop'
        || (tags.bus === 'yes' && ['stop_position', 'platform'].includes(tags.public_transport)))) return [];
      const location = [element.lat ?? element.center?.lat, element.lon ?? element.center?.lon];
      if (!validPoint(location)) return [];
      const distance = distanceMeters(point, location);
      if (distance > radius) return [];
      const id = `${element.type}/${element.id}`;
      const published = publishedStops[id];
      const name = tags['name:mn'] || tags.name || published?.name || tags['name:en'] || '';
      const taggedRefs = (tags['route_ref:bus'] || tags.route_ref || '').split(/[;,]/).map(ref => ref.trim()).filter(Boolean);
      const refs = [...new Set([...taggedRefs, ...(refsByStop.get(id) || [])])].sort();
      return [{ name, location, distance, refs, published }];
    }).sort((a, b) => a.distance - b.distance).slice(0, 3);
  }

  function labeledLink(label, href, className = 'text-button') {
    const link = document.createElement('a');
    link.textContent = label;
    link.href = href;
    link.className = className;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    return link;
  }

  function bind() {
    const panel = document.getElementById('trail-transit');
    const directions = document.getElementById('transit-directions');
    const button = document.getElementById('transit-load-stops');
    const status = document.getElementById('transit-status');
    const results = document.getElementById('transit-stops');
    const areaRoute = document.getElementById('transit-area-route');
    let initialized = false;
    let point = null;
    let request = null;

    function renderStop(stop, destination) {
      const row = document.createElement('li');
      const name = document.createElement('strong');
      name.textContent = stop.name || 'Нэргүй буудал';
      const distance = document.createElement('span');
      distance.className = 'transit-distance';
      distance.textContent = stop.distance < 1000
        ? `${Math.round(stop.distance)} м` : `${(stop.distance / 1000).toFixed(1)} км`;
      const routes = document.createElement('p');
      const refs = [...new Set([...stop.refs, ...(stop.published ? [stop.published.ref] : [])])];
      routes.textContent = refs.length ? `Чиглэл: ${refs.join(', ')}` : 'Чиглэлийн дугаар бүртгэлгүй';
      if (stop.published) {
        routes.append(' · ', labeledLink('Эх сурвалж ↗', stop.published.source));
      }
      const links = document.createElement('div');
      links.className = 'transit-links';
      links.append(
        labeledLink('Буудал руу автобусаар ↗', mapsDirections(stop.location, 'transit')),
        labeledLink('Буудлаас жим рүү алхах ↗', mapsDirections(destination, 'walking', stop.location))
      );
      row.append(name, distance, routes, links);
      return row;
    }

    button.addEventListener('click', async () => {
      if (!point || request) return;
      const destination = point;
      const controller = new AbortController();
      request = controller;
      const timer = setTimeout(() => controller.abort(), 10000);
      button.disabled = true;
      results.replaceChildren();
      status.textContent = 'Ойролцоох буудлуудыг хайж байна…';
      try {
        let data = savedAreas.find(area => distanceMeters(area.point, destination) <= 5);
        if (!data) {
          const response = await fetch(searchUrl(destination), { signal: controller.signal });
          if (!response.ok) throw new Error('Could not load mapped stops');
          data = await response.json();
        }
        const stops = nearbyStops(destination, data);
        if (request !== controller) return;
        results.replaceChildren(...stops.map(stop => renderStop(stop, destination)));
        const message = stops.length ? 'Тэмдэглэсэн цэгээс шулуун зайгаар.'
          : '2.5 км дотор бүртгэлтэй буудал олдсонгүй. UBCard дээр давхар шалгаарай.';
        status.textContent = data.point ? `${message} Мэдээлэл: 2026.11.25.` : message;
        if (document.activeElement === button) status.focus();
        button.hidden = true;
      } catch {
        if (request === controller) {
          status.textContent = 'Буудлын мэдээлэл ачаалагдсангүй. Дахин оролдоорой эсвэл UBCard дээр шалгаарай.';
          button.textContent = 'Дахин оролдох';
        }
      } finally {
        clearTimeout(timer);
        if (request === controller) {
          request = null;
          button.disabled = false;
        }
      }
    });

    return {
      render(route) {
        panel.hidden = !route;
        areaRoute.hidden = route?.id !== 'terelj-turtle-rock';
        const [next] = trackEndpoints(route);
        if (initialized && next?.join(',') === point?.join(',')) return;
        initialized = true;
        request?.abort();
        request = null;
        point = next;
        results.replaceChildren();
        status.textContent = point ? '' : 'Очих цэг баталгаажаагүй тул автобусны зам хайх боломжгүй байна.';
        button.hidden = !point;
        button.disabled = false;
        button.textContent = 'Ойр буудлуудыг харах';
        directions.hidden = !point;
        if (point) directions.href = mapsDirections(point, 'transit');
        else directions.removeAttribute('href');
      }
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { trackEndpoints, endpointMapsUrl, mapsDirections, nearbyStops, searchUrl };
  } else {
    root.WalkyTransit = { ...bind(), endpointMapsUrl };
  }
})(typeof window === 'undefined' ? globalThis : window);
