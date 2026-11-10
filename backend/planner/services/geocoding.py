import math
from dataclasses import dataclass
from urllib.parse import quote

from .errors import RoutingServiceError
from .tomtom_client import TomTomClient


@dataclass(frozen=True)
class Coordinates:
    latitude: float
    longitude: float


def resolve_location(client: TomTomClient, query: str) -> Coordinates:
    path = f"/search/2/geocode/{quote(query, safe='')}.json"
    payload = client.get_json(path, params={"limit": 1})
    results = payload.get("results")

    if not isinstance(results, list) or not results:
        raise RoutingServiceError(
            f'Could not find "{query}". Try including a city and state.',
            code="location_not_found",
            status_code=422,
        )

    first_result = results[0]
    position = first_result.get("position") if isinstance(first_result, dict) else None
    if not isinstance(position, dict):
        raise _invalid_geocoding_response()

    latitude = position.get("lat")
    longitude = position.get("lon")
    if not _is_valid_coordinate(latitude, minimum=-90, maximum=90):
        raise _invalid_geocoding_response()
    if not _is_valid_coordinate(longitude, minimum=-180, maximum=180):
        raise _invalid_geocoding_response()

    return Coordinates(latitude=float(latitude), longitude=float(longitude))


def suggest_locations(client: TomTomClient, query: str) -> list[dict[str, float | str]]:
    path = f"/search/2/search/{quote(query, safe='')}.json"
    payload = client.get_json(
        path,
        params={"typeahead": True, "limit": 5, "countrySet": "US"},
    )
    results = payload.get("results")
    if not isinstance(results, list):
        raise _invalid_geocoding_response()

    suggestions: list[dict[str, float | str]] = []
    for result in results:
        if not isinstance(result, dict):
            continue
        position = result.get("position")
        address = result.get("address")
        if not isinstance(position, dict) or not isinstance(address, dict):
            continue

        latitude = position.get("lat")
        longitude = position.get("lon")
        label = address.get("freeformAddress")
        if (
            not _is_valid_coordinate(latitude, minimum=-90, maximum=90)
            or not _is_valid_coordinate(longitude, minimum=-180, maximum=180)
            or not isinstance(label, str)
            or not label.strip()
            or len(label) > 120
        ):
            continue

        suggestion = {
            "label": label.strip(),
            "latitude": float(latitude),
            "longitude": float(longitude),
        }
        if suggestion not in suggestions:
            suggestions.append(suggestion)

    if results and not suggestions:
        raise _invalid_geocoding_response()
    return suggestions


def _is_valid_coordinate(value: object, *, minimum: int, maximum: int) -> bool:
    return (
        isinstance(value, (int, float))
        and not isinstance(value, bool)
        and math.isfinite(value)
        and minimum <= value <= maximum
    )


def _invalid_geocoding_response() -> RoutingServiceError:
    return RoutingServiceError(
        "The routing provider returned an invalid location response.",
        code="invalid_geocoding_response",
        status_code=502,
    )
