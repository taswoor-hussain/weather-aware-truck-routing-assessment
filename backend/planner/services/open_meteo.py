import logging
import math
from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime, timezone
import requests

from .errors import WeatherServiceError
from .geocoding import Coordinates

logger = logging.getLogger(__name__)

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
REQUEST_TIMEOUT = (3.05, 15)
HOURLY_VARIABLES = "wind_speed_10m,rain,snowfall"


@dataclass(frozen=True)
class HourlyForecast:
    times: list[datetime]
    wind_mph: list[float]
    rain_inches: list[float]
    snow_inches: list[float]


class OpenMeteoClient:
    def __init__(self, *, http_get: Callable[..., requests.Response] | None = None):
        self._http_get = http_get or requests.get

    def fetch_forecasts(
        self,
        locations: list[Coordinates],
    ) -> list[HourlyForecast]:
        if not locations:
            return []

        try:
            response = self._http_get(
                OPEN_METEO_URL,
                params={
                    "latitude": ",".join(f"{location.latitude:.4f}" for location in locations),
                    "longitude": ",".join(f"{location.longitude:.4f}" for location in locations),
                    "hourly": HOURLY_VARIABLES,
                    "wind_speed_unit": "mph",
                    "precipitation_unit": "inch",
                    "timezone": "UTC",
                    "forecast_days": 7,
                },
                timeout=REQUEST_TIMEOUT,
            )
        except requests.Timeout:
            logger.warning("Open-Meteo request timed out.")
            raise WeatherServiceError(
                "The weather provider timed out. Please try again.",
                code="weather_timeout",
                status_code=503,
            ) from None
        except requests.RequestException:
            logger.warning("Could not connect to the Open-Meteo weather provider.")
            raise WeatherServiceError(
                "The weather provider could not be reached. Please try again.",
                code="weather_unavailable",
                status_code=503,
            ) from None

        if response.status_code >= 400:
            logger.warning(
                "Open-Meteo request failed with HTTP status %s.",
                response.status_code,
            )
            status_code = (
                503
                if response.status_code == 429 or response.status_code >= 500
                else 502
            )
            raise WeatherServiceError(
                "The weather provider could not complete the request.",
                code="weather_provider_error",
                status_code=status_code,
            )

        try:
            payload = response.json()
        except ValueError:
            logger.warning("Open-Meteo returned a response that was not valid JSON.")
            raise _invalid_weather_response() from None

        if isinstance(payload, dict):
            payloads = [payload]
        elif isinstance(payload, list):
            payloads = payload
        else:
            raise _invalid_weather_response()

        if len(payloads) != len(locations):
            raise _invalid_weather_response()

        return [_parse_hourly_forecast(item) for item in payloads]


def _parse_hourly_forecast(value: object) -> HourlyForecast:
    if not isinstance(value, dict):
        raise _invalid_weather_response()
    hourly = value.get("hourly")
    units = value.get("hourly_units")
    if not isinstance(hourly, dict) or not isinstance(units, dict):
        raise _invalid_weather_response()

    times = hourly.get("time")
    wind = hourly.get("wind_speed_10m")
    rain = hourly.get("rain")
    snow = hourly.get("snowfall")
    if not all(isinstance(series, list) and series for series in (times, wind, rain, snow)):
        raise _invalid_weather_response()
    if not len(times) == len(wind) == len(rain) == len(snow):
        raise _invalid_weather_response()

    wind_factor = _wind_conversion(units.get("wind_speed_10m"))
    rain_factor = _precipitation_conversion(units.get("rain"))
    snow_factor = _precipitation_conversion(units.get("snowfall"))
    parsed_times = [_parse_time(time) for time in times]
    if any(current <= previous for previous, current in zip(parsed_times, parsed_times[1:])):
        raise _invalid_weather_response()

    return HourlyForecast(
        times=parsed_times,
        wind_mph=[
            _measurement(value, "wind_speed_10m") * wind_factor
            for value in wind
        ],
        rain_inches=[
            _measurement(value, "rain") * rain_factor
            for value in rain
        ],
        snow_inches=[
            _measurement(value, "snowfall") * snow_factor
            for value in snow
        ],
    )


def _parse_time(value: object) -> datetime:
    if not isinstance(value, str):
        raise _invalid_weather_response()
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        raise _invalid_weather_response() from None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _measurement(value: object, name: str) -> float:
    if (
        not isinstance(value, (int, float))
        or isinstance(value, bool)
        or not math.isfinite(value)
        or value < 0
    ):
        raise WeatherServiceError(
            f"The weather provider did not return valid {name} data.",
            code="weather_data_unavailable",
            status_code=503,
        )
    return float(value)


def _wind_conversion(unit: object) -> float:
    if not isinstance(unit, str):
        raise _invalid_weather_response()
    if unit in {"mph", "mi/h", "mp/h"}:
        return 1
    if unit == "km/h":
        return 0.621371
    if unit == "m/s":
        return 2.236936
    raise _invalid_weather_response()


def _precipitation_conversion(unit: object) -> float:
    if not isinstance(unit, str):
        raise _invalid_weather_response()
    if unit in {"inch", "in"}:
        return 1
    if unit == "mm":
        return 1 / 25.4
    if unit == "cm":
        return 1 / 2.54
    raise _invalid_weather_response()


def _invalid_weather_response() -> WeatherServiceError:
    return WeatherServiceError(
        "The weather provider returned an invalid forecast response.",
        code="invalid_weather_response",
        status_code=502,
    )
