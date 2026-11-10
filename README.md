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

## Development status

This repository is being built in small, reviewable stages. The initial setup is in place; application features will be added in subsequent commits.
