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

`POST /api/plan/` validates the trip request and returns `200 OK`. Route
generation and weather analysis will be added in later stages.

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
Invalid requests return field-specific `400 Bad Request` errors.

## Development status

This repository is being built in small, reviewable stages. The current backend
validates trip requests; routing and weather features are still to come.
