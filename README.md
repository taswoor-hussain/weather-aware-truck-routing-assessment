# Weather-Aware Truck Routing

A React and Django application for comparing truck routes using forecast weather, load weight, and estimated travel time.

## Assessment scope

- Enter an origin, destination, departure date/time, and load weight.
- Compare three route options and recommend the safest practical route.
- Sample weather at route checkpoints using each checkpoint's estimated arrival time.
- Display route summaries, checkpoint risk, ETAs, and a 0–48-hour weather heatmap.

## Run locally

Use Python 3.10+ and Node.js 20+.

```bash
# Terminal 1: Django API
cd backend
if [ ! -f .env ]; then cp .env.example .env; fi
# Keep an existing .env; otherwise replace the example secret and add your TomTom key.
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py runserver

# Terminal 2: React development server
cd frontend
npm install
npm run dev
```

The API health check is available at `http://127.0.0.1:8000/api/health/`.
Vite proxies `/api` requests to Django during local development.

Run frontend validation from `frontend/`:

```bash
npm run build
npm run lint
npm test
```

Run backend validation from `backend/`:

```bash
source .venv/bin/activate
python manage.py check
python manage.py test
```

## Frontend structure

The React app is organized by feature rather than putting form, API, and page
state in one component:

```text
frontend/src/
  app/                         shared application providers
  features/trip-planner/
    api/                       trip API adapter and contract tests
    components/                planner page, form, result presentation
    hooks/                     mutation lifecycle
    schemas/                   client-side form validation
  shared/
    api/                       configured Axios client and API errors
    components/                reusable field and status components
```

The form uses React Hook Form and Zod, the API adapter uses Axios with a request
timeout and validates successful response shapes, and TanStack Query owns the
pending/success/error mutation lifecycle. Tailwind CSS provides the UI styling.

## Trip request API

`POST /api/plan/` validates the trip request, geocodes both places, and requests
three distinct truck routes from TomTom. It samples each route at the selected
checkpoint interval, estimates each checkpoint's arrival time from route
distance and travel duration, and requests hourly forecasts from Open-Meteo.
The response includes the ranked routes, checkpoint weather and risk, route
risk summaries, and a recommendation status. Each checkpoint also includes
hourly risk/weather snapshots from departure through +48 hours for the map
forecast slider.

```json
{
  "origin": "Chicago, IL",
  "destination": "Denver, CO",
  "departure_at": "2026-11-11T08:30:00-06:00",
  "load_weight_lb": 32000,
  "checkpoint_interval_miles": 25
}
```

`checkpoint_interval_miles` is optional and defaults to `25`; supported values
are `10`, `25`, and `50`. `departure_at` must include a timezone offset.
Invalid requests return field-specific `400 Bad Request` errors. Missing
provider configuration returns `503`; unmatched places or fewer than three
distinct routes return `422`. Provider details and credentials are not returned
to the client.

TomTom configuration belongs in the ignored `backend/.env` file. See the
[TomTom Calculate Route documentation](https://docs.tomtom.com/routing-api/documentation/tomtom-maps/v1/calculate-route).
Weather forecasts use the public Open-Meteo forecast API and require no API key.

```env
TOMTOM_API_KEY=your-key
```

The key stays on the server and is never added to frontend assets or responses.
Trip planning uses TomTom's truck travel mode and departure time. The brief
collects cargo weight but not tractor/trailer gross weight or dimensions, so
those vehicle restriction inputs are not guessed or sent to the routing API.

## Weather and risk model

Open-Meteo forecasts are fetched in batches of up to 100 checkpoint locations
and cached by rounded coordinates for 30 minutes. Wind speed is interpolated
between hourly forecast timestamps for the estimated arrival time. Hourly rain
and snowfall amounts are assigned from the forecast hour ending at or after
that ETA. Provider units are converted to mph and inches before scoring.
Planning returns an explicit error if a route ETA falls outside the available
forecast horizon or the forecast cannot cover the slider's full 48-hour window.
The map uses the same checkpoint locations to render 49 hourly snapshots
(departure hour 0 through hour 48); its selected hour is a corridor-wide time,
while route-card risk summaries continue to use each truck checkpoint's ETA.

Each checkpoint receives the highest applicable risk across wind, rain, and
snow. The thresholds follow the assessment:

| Risk | Wind | Rain | Snow |
| --- | --- | --- | --- |
| Low | <25 mph | <0.10 in/hr | <0.5 in/hr |
| Moderate | 25–<35 mph | 0.10–<0.25 in/hr | 0.5–<1.0 in/hr |
| High | 35–<45 mph | 0.25–<0.50 in/hr | 1.0–<2.0 in/hr |
| Severe | 45–<55 mph | 0.50–1.00 in/hr | 2.0–3.0 in/hr |
| No Travel | ≥55 mph | >1.00 in/hr | >3.0 in/hr |

Load adjustments: wind at 45–<55 mph is No Travel above 30,000 lb; wind at
35–<45 mph is Severe above 40,000 lb. The recommendation ranks routes by
No Travel exposure, Severe miles, High miles, mileage-weighted average risk,
then travel time. A route is not recommended when every option has any No
Travel exposure.

## Backend safety defaults

- Production mode is the default. It requires `DJANGO_SECRET_KEY`; set
  `DJANGO_DEBUG=true` only for local development.
- Host allowlisting, secure cookie flags, MIME-sniffing protection, a frame
  policy, and configurable HTTPS/HSTS settings are enabled.
- The API accepts JSON only, limits request-body size, rejects unknown request
  fields, and rate-limits trip planning requests.
- The in-memory throttle cache is per process. A multi-instance deployment
  should use a shared cache (such as Redis) before relying on global rate limits.
- TomTom routing is called with bounded connect/read timeouts. Automated tests
  mock both provider transports and do not require live API keys.
- Map tiles are provided by OpenStreetMap and require an internet connection;
  attribution is shown in the map.

## Development status

This repository is being built in small, reviewable stages. Trip validation,
TomTom truck route options, checkpoint weather, risk scoring, route
recommendation, route comparison, the interactive route map, and the 0–48-hour
checkpoint risk heatmap are in place. Route geometry, checkpoint ETAs, weather,
and risk summaries are available in the results UI.
