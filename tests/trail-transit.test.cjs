const test = require('node:test');
const assert = require('node:assert/strict');
const { trackEndpoints, endpointMapsUrl, mapsDirections, nearbyStops, searchUrl } = require('../trail-transit.js');

const zaisan = [47.86110244, 106.90358536];
const summit = [47.83288569, 106.90323889];

test('both Zaisan track directions use the access road as the start and the mountain as the end', () => {
  const id = 'bogd-khan-dugui-tsagaan';
  assert.deepEqual(trackEndpoints({ id, track: [null, summit, zaisan] }), [zaisan, summit]);
  assert.deepEqual(trackEndpoints({ id, track: [zaisan, summit] }), [zaisan, summit]);
  assert.deepEqual(trackEndpoints({ id, track: [[100, 106]] }), [null, null]);
  assert.deepEqual(trackEndpoints({ id: 'tenger-rock', track: [[47.92, 106.92], [47.93, 106.93]] }), [null, null]);
  assert.deepEqual(trackEndpoints({ id: 'tenger-rock', track: [zaisan] }), [zaisan, null]);
});

test('Tsetsee Gun opens the summit for a track recorded downhill', () => {
  const peak = [47.80829589687586, 107.00250134653953];
  const manzushir = [47.7647018920567, 106.99292759254106];
  const route = { id: 'bogd-khan-summit', track: [peak, manzushir] };
  assert.deepEqual(trackEndpoints(route), [manzushir, peak]);
  assert.equal(new URL(endpointMapsUrl(route)).searchParams.get('query'), peak.join(','));
});

test('Google Maps opens the final valid point when the trail has a recorded end', () => {
  const map = new URL(endpointMapsUrl({ id: 'other', track: [zaisan, summit, [100, 106]] }));
  assert.equal(map.origin + map.pathname, 'https://www.google.com/maps/search/');
  assert.equal(map.searchParams.get('query'), summit.join(','));
  assert.equal(endpointMapsUrl({ track: [zaisan] }), null);
});

test('directions leave the transit origin unset and use the bus stop as the walking origin', () => {
  const stop = [47.8669518, 106.9032056];
  const transit = new URL(mapsDirections(zaisan, 'transit'));
  assert.equal(transit.searchParams.get('destination'), zaisan.join(','));
  assert.equal(transit.searchParams.get('travelmode'), 'transit');
  assert.equal(transit.searchParams.has('origin'), false);
  const walk = new URL(mapsDirections(zaisan, 'walking', stop));
  assert.equal(walk.searchParams.get('origin'), stop.join(','));
  assert.match(new URL(searchUrl(zaisan)).searchParams.get('data'), /around:2500,47\.861102,106\.903585/);
});

test('stops are ordered by distance, with published and mapped routes identified', () => {
  const publicStop = { type: 'node', id: 11078880605, lat: 47.8669518, lon: 106.9032056,
    tags: { highway: 'bus_stop', 'name:en': 'Bogd khan amralt' } };
  const platform = { type: 'way', id: 123, center: { lat: 47.8755135, lon: 106.9076973 },
    tags: { public_transport: 'platform', bus: 'yes', name: 'Могул таун', route_ref: 'Ч:52; Ч:52' } };
  const relation = { type: 'relation', id: 456, tags: { route: 'bus', ref: 'Ч:55' },
    members: [{ type: 'way', ref: 123, role: 'platform' }] };
  const distant = { ...publicStop, id: 9, lat: 48 };
  const stops = nearbyStops(zaisan, { elements: [distant, platform, relation, publicStop] });
  assert.deepEqual(stops.map(stop => stop.name), ['Богдхан амралт', 'Могул таун']);
  assert.ok(stops[0].distance > 640 && stops[0].distance < 670);
  assert.equal(stops[0].published.ref, 'Ч:72');
  assert.deepEqual(stops[1].refs, ['Ч:52', 'Ч:55']);
  assert.deepEqual(nearbyStops(zaisan, { elements: [] }), []);
  assert.throws(() => nearbyStops(zaisan, { elements: [], remark: 'timed out' }), /Incomplete/);
});
