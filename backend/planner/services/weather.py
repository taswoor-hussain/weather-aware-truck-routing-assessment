import logging
from bisect import bisect_left
from datetime import datetime, timezone
from typing import TypedDict

from django.core.cache import cache

from .checkpoints import Checkpoint
from .errors import WeatherServiceError
from .geocoding import Coordinates
from .open_meteo import HourlyForecast, OpenMeteoClient
from .risk import WeatherObservation

logger = logging.getLogger(__name__)

FORECAST_CACHE_SECONDS = 30 * 60
MAX_LOCATIONS_PER_REQUEST = 100


class CheckpointLocation(TypedDict):
    latitude: float
    longitude: float
    eta: str


def fetch_checkpoint_weather(
    checkpoints: list[Checkpoint],
    *,
    client: OpenMeteoClient | None = None,
) -> list[WeatherObservation]:
    if not checkpoints:
        return []

    forecasts: dict[str, HourlyForecast] = {}
    locations: dict[str, Coordinates] = {}
    for checkpoint in checkpoints:
        key = _location_key(checkpoint["latitude"], checkpoint["longitude"])
        cached_forecast = cache.get(f"open-meteo:v1:{key}")
        if isinstance(cached_forecast, HourlyForecast):
            forecasts[key] = cached_forecast
        else:
            locations.setdefault(
                key,
                Coordinates(
                    latitude=checkpoint["latitude"],
                    longitude=checkpoint["longitude"],
                ),
            )

    weather_client = client or OpenMeteoClient()
    location_items = list(locations.items())
    for start in range(0, len(location_items), MAX_LOCATIONS_PER_REQUEST):
        batch = location_items[start : start + MAX_LOCATIONS_PER_REQUEST]
        hourly_forecasts = weather_client.fetch_forecasts(
            [location for _, location in batch]
        )
        for (key, _), forecast in zip(batch, hourly_forecasts, strict=True):
            forecasts[key] = forecast
            cache.set(
                f"open-meteo:v1:{key}",
                forecast,
                timeout=FORECAST_CACHE_SECONDS,
            )

    observations: list[WeatherObservation] = []
    for checkpoint in checkpoints:
        key = _location_key(checkpoint["latitude"], checkpoint["longitude"])
        forecast = forecasts.get(key)
        if forecast is None:
            logger.error("Hourly weather forecast was missing after provider fetch.")
            raise WeatherServiceError(
                "Weather data could not be matched to a route checkpoint.",
                code="weather_data_unavailable",
                status_code=502,
            )
        observations.append(_sample_forecast(forecast, _parse_eta(checkpoint["eta"])))

    return observations


def _sample_forecast(forecast: HourlyForecast, eta: datetime) -> WeatherObservation:
    times = forecast.times
    index = bisect_left(times, eta)
    if index >= len(times):
        raise WeatherServiceError(
            "The weather forecast does not cover every estimated arrival time.",
            code="forecast_horizon_exceeded",
            status_code=422,
        )

    if times[index] == eta:
        wind_mph = forecast.wind_mph[index]
    elif index == 0:
        raise WeatherServiceError(
            "The weather forecast does not cover every estimated arrival time.",
            code="forecast_horizon_exceeded",
            status_code=422,
        )
    else:
        before = index - 1
        span_seconds = (times[index] - times[before]).total_seconds()
        elapsed_seconds = (eta - times[before]).total_seconds()
        ratio = elapsed_seconds / span_seconds
        wind_mph = forecast.wind_mph[before] + (
            forecast.wind_mph[index] - forecast.wind_mph[before]
        ) * ratio

    return {
        "wind_mph": round(wind_mph, 2),
        "rain_in_per_hour": forecast.rain_inches[index],
        "snow_in_per_hour": forecast.snow_inches[index],
    }


def _parse_eta(value: str) -> datetime:
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        raise WeatherServiceError(
            "A route checkpoint had an invalid estimated arrival time.",
            code="invalid_checkpoint_eta",
            status_code=502,
        ) from None
    if parsed.tzinfo is None:
        raise WeatherServiceError(
            "A route checkpoint had an invalid estimated arrival time.",
            code="invalid_checkpoint_eta",
            status_code=502,
        )
    return parsed.astimezone(timezone.utc)


def _location_key(latitude: float, longitude: float) -> str:
    return f"{latitude:.4f},{longitude:.4f}"
