# Walky — trail discovery

Mongolian-language hiking website built with HTML, CSS and vanilla JavaScript. This update builds on the existing Firebase, saved-hike and photo-gallery implementation.

## Run locally

From this folder:

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

Open http://127.0.0.1:8000 . Use an HTTP server instead of opening the HTML as a file. No build step or package installation is required for the application.

## Included in this update

- Landscape hero with search linking to Explore, short-hike shortcut and saved hikes.
- Shared rounded trail cards and responsive styling for Home, Explore, trail details, saved hikes and map.
- Search, difficulty, duration and distance filters. The map receives the same filtered results as the list.
- Desktop list/map layout and a List/Map switch on mobile. Map markers open trail previews and detail links.
- Trail statistics above a gallery/map layout; section navigation and floating save/plan/map actions.
- Per-trail current conditions, seven forecast days, hourly temperatures and precipitation probability, wind/gusts, sunrise and sunset.
- Forecasts use the first valid recorded route coordinate, not the visitor's location. The card displays the coordinate and Ulaanbaatar timezone. A route's first recorded coordinate is not necessarily its trailhead.
- Weather has a 10-second timeout, 15-minute in-memory cache, retry and missing-coordinate states. Delayed responses cannot replace another route's forecast.
- Curated natural-feature cards based on existing route descriptions and credited photos, with an approximate map point for the Turtle Rock area.

## Source files

| File | Purpose |
| --- | --- |
| `discovery.css` | New visual styling layered over the existing shared stylesheet |
| `discovery-map.js` | Explore map, matching filtered results, mobile map sizing |
| `trail-weather.js` | Coordinate validation, forecast requests, weather labels and caching |
| `trail-features.js` | Editable curated natural-feature data for existing route IDs |
| `trail-insights.js` | Forecast and natural-feature rendering on trail details |
| `main.js` | Existing cards, saving and initialization, with added distance filtering |
| `route-details.js` | Existing trail detail flow plus weather/features integration |
| `tests/trail-discovery.test.cjs` | Forecast/cache/error, feature and filtering tests |

The existing admin and Firebase configuration, authentication, Firestore rules, saved hikes, planning and photo gallery have been preserved. No cloud data or security rules were deployed or changed.

## Weather and maps

Weather uses https://api.open-meteo.com/v1/forecast and needs Internet access. The public endpoint is for the prototype's non-commercial use; check the provider's current terms and capacity before commercial deployment. Attribution is shown on the weather card. Documentation: https://open-meteo.com/en/docs .

Explore uses Leaflet and OpenStreetMap. The existing detail map uses OpenTopoMap. Firebase scripts, Leaflet, Google Fonts, forecast requests and map tiles depend on external services. The page displays fallback messages when forecast requests or the mapping library fail.

Forecasts describe conditions near one coordinate. They are not verified on-trail observations or a safety rating. Existing distances and tracks were retained and should be verified before relying on them for navigation, particularly the placeholder-looking Tenger Rock track.

## Bus access

From a trail detail, use **Автобус** to search for bus directions or show up to three mapped stops within 2.5 km of the recorded access point. Distances are straight-line distances. The Zaisan and Tsetsee Gun tracks use the endpoint nearest their recorded access point as the start because they can be stored in reverse order. For other trails the first valid track point is used. Confirm the actual trail entrance before setting out.

The **Жимийн төгсгөл** link opens the other endpoint in Google Maps as a pin. It is available when a usable track has at least two points.

Built-in trails use a small OpenStreetMap snapshot checked on 2026-11-25. Other coordinates fetch stops and routes on request via Overpass. Transit is disabled for the built-in Tenger Rock placeholder until its recorded access point is replaced. One published route (Ч:72 at Богдхан амралт) is linked to the city's transport notice because OSM does not currently record the route at that stop. The panel distinguishes unavailable data from no mapped stops and links to UBCard for current routes and schedules. Walky does not request the visitor's location. Google Maps can use the device location if permitted there or let the visitor enter a starting point.

## Natural features

Edit `trail-features.js` to update default natural-feature cards. Use verified descriptions, a relevant image and its real source/credit. Do not invent geology or exact landmark coordinates. Unknown routes show an explicit empty state.

A route object may optionally provide a `naturalFeatures` array with `name`, `type`, `description`, `image`, `source`, `credit`, and optional `[latitude, longitude]` `coordinates`. An empty array deliberately hides default cards. The existing admin form does not yet expose a natural-feature editor; use the curated source file for this first version. Photo credits and licenses are also recorded in `zurag/gallery/sources.json`.

## Validation

Run with Node.js:

```bash
node --test tests/*.test.cjs
```

36 automated tests passed, including the original tests and six new discovery/weather tests. JavaScript syntax, duplicate HTML IDs and local asset links were checked. Live API connectivity and visual browser QA could not be performed in the coding session because those connections were unavailable. Weather tests use fixtures; they do not claim a live forecast was fetched.

## Project location

The update is installed directly in `/home/uulen/Documents/uni/walky`. Run the local server from that folder. Existing Firebase configuration and local images are used as before.
