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
three distinct truck routes from TomTom. A successful response includes route
summaries and GeoJSON LineString coordinates. Weather analysis and route
recommendation are later stages.

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

```env
TOMTOM_API_KEY=your-key
```

The key stays on the server and is never added to frontend assets or responses.
Trip planning uses TomTom's truck travel mode and departure time. The brief
collects cargo weight but not tractor/trailer gross weight or dimensions, so
those vehicle restriction inputs are not guessed or sent to the routing API.

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
  mock the provider transport and do not require a live API key.

## Development status

This repository is being built in small, reviewable stages. Trip validation,
TomTom truck route options, and route summaries are in place; checkpoint weather,
risk scoring, route recommendation, and map rendering are still to come.
