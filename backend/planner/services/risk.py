import math
from typing import Literal, TypedDict

RiskLevel = Literal["low", "moderate", "high", "severe", "no_travel"]

RISK_SCORES: dict[RiskLevel, int] = {
    "low": 0,
    "moderate": 1,
    "high": 2,
    "severe": 3,
    "no_travel": 4,
}


class WeatherObservation(TypedDict):
    wind_mph: float
    rain_in_per_hour: float
    snow_in_per_hour: float


class WeatherForecastSample(WeatherObservation):
    hour: int
    risk_level: RiskLevel


def classify_weather(
    weather: WeatherObservation,
    *,
    load_weight_lb: int,
) -> RiskLevel:
    wind_risk = classify_wind(weather["wind_mph"], load_weight_lb=load_weight_lb)
    rain_risk = classify_rain(weather["rain_in_per_hour"])
    snow_risk = classify_snow(weather["snow_in_per_hour"])
    return max((wind_risk, rain_risk, snow_risk), key=RISK_SCORES.__getitem__)


def classify_wind(wind_mph: float, *, load_weight_lb: int) -> RiskLevel:
    _validate_measurement(wind_mph)
    if (
        not isinstance(load_weight_lb, int)
        or isinstance(load_weight_lb, bool)
        or load_weight_lb < 1
    ):
        raise ValueError("Load weight must be a positive whole number of pounds.")
    if wind_mph >= 55:
        return "no_travel"
    if wind_mph >= 45:
        return "no_travel" if load_weight_lb > 30_000 else "severe"
    if wind_mph >= 35:
        return "severe" if load_weight_lb > 40_000 else "high"
    if wind_mph >= 25:
        return "moderate"
    return "low"


def classify_rain(rain_in_per_hour: float) -> RiskLevel:
    _validate_measurement(rain_in_per_hour)
    if rain_in_per_hour > 1:
        return "no_travel"
    if rain_in_per_hour >= 0.5:
        return "severe"
    if rain_in_per_hour >= 0.25:
        return "high"
    if rain_in_per_hour >= 0.1:
        return "moderate"
    return "low"


def classify_snow(snow_in_per_hour: float) -> RiskLevel:
    _validate_measurement(snow_in_per_hour)
    if snow_in_per_hour > 3:
        return "no_travel"
    if snow_in_per_hour >= 2:
        return "severe"
    if snow_in_per_hour >= 1:
        return "high"
    if snow_in_per_hour >= 0.5:
        return "moderate"
    return "low"


def _validate_measurement(value: float) -> None:
    if not math.isfinite(value) or value < 0:
        raise ValueError("Weather measurements must be finite and non-negative.")
