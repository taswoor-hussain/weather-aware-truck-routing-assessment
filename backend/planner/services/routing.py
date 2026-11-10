import hashlib
import json
import math
from datetime import datetime, timedelta
from typing import Literal, TypedDict

from .errors import RoutingServiceError
from .geocoding import Coordinates
from .tomtom_client import TomTomClient

METERS_PER_MILE = 1609.344


class RouteSummary(TypedDict):
    distance_miles: float
    travel_time_seconds: int
    departure_at: str
    arrival_at: str


class RouteGeometry(TypedDict):
    type: Literal["LineString"]
    coordinates: list[list[float]]


class RouteOption(TypedDict):
    id: str
    summary: RouteSummary
    geometry: RouteGeometry


def calculate_routes(
    client: TomTomClient,
    origin: Coordinates,
    destination: Coordinates,
    departure_at: datetime,
) -> list[RouteOption]:
    path = (
        "/routing/1/calculateRoute/"
        f"{origin.latitude:.6f},{origin.longitude:.6f}:"
        f"{destination.latitude:.6f},{destination.longitude:.6f}/json"
    )
    payload = client.get_json(
        path,
        params={
            "maxAlternatives": 2,
            "routeType": "fastest",
            "traffic": "true",
            "departAt": departure_at.isoformat(),
            "travelMode": "truck",
            "vehicleCommercial": "true",
            "routeRepresentation": "polyline",
        },
    )
    provider_routes = payload.get("routes")
    if not isinstance(provider_routes, list):
        raise _invalid_route_response()

    routes: list[RouteOption] = []
    seen_geometries: set[str] = set()
    for provider_route in provider_routes:
        normalized = _normalize_route(
            provider_route,
            departure_at,
            route_id=f"route-{len(routes) + 1}",
        )
        geometry_key = _geometry_key(normalized["geometry"]["coordinates"])
        if geometry_key in seen_geometries:
            continue
        seen_geometries.add(geometry_key)
        routes.append(normalized)
        if len(routes) == 3:
            break

    if len(routes) != 3:
        raise RoutingServiceError(
            "The routing provider returned fewer than three distinct routes. "
            "Try a different origin or destination.",
            code="insufficient_routes",
            status_code=422,
        )

    return routes


def _normalize_route(
    value: object,
    departure_at: datetime,
    *,
    route_id: str,
) -> RouteOption:
    if not isinstance(value, dict):
        raise _invalid_route_response()

    summary = value.get("summary")
    legs = value.get("legs")
    if not isinstance(summary, dict) or not isinstance(legs, list):
        raise _invalid_route_response()

    distance = summary.get("lengthInMeters")
    travel_time = summary.get("travelTimeInSeconds")
    if (
        not _is_non_negative_number(distance)
        or distance == 0
        or not _is_non_negative_integer(travel_time)
    ):
        raise _invalid_route_response()

    coordinates: list[list[float]] = []
    for leg in legs:
        points = leg.get("points") if isinstance(leg, dict) else None
        if not isinstance(points, list):
            raise _invalid_route_response()
        for point in points:
            if not isinstance(point, dict):
                raise _invalid_route_response()
            latitude = point.get("latitude")
            longitude = point.get("longitude")
            if not _is_valid_latitude(latitude) or not _is_valid_longitude(longitude):
                raise _invalid_route_response()
            coordinates.append([float(longitude), float(latitude)])

    if len(coordinates) < 2:
        raise _invalid_route_response()

    duration_seconds = int(travel_time)
    arrival_at = departure_at + timedelta(seconds=duration_seconds)
    return {
        "id": route_id,
        "summary": {
            "distance_miles": round(float(distance) / METERS_PER_MILE, 1),
            "travel_time_seconds": duration_seconds,
            "departure_at": departure_at.isoformat(),
            "arrival_at": arrival_at.isoformat(),
        },
        "geometry": {
            "type": "LineString",
            "coordinates": coordinates,
        },
    }


def _geometry_key(coordinates: list[list[float]]) -> str:
    rounded = [[round(longitude, 5), round(latitude, 5)] for longitude, latitude in coordinates]
    encoded = json.dumps(rounded, separators=(",", ":"), allow_nan=False).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def _is_non_negative_number(value: object) -> bool:
    return (
        isinstance(value, (int, float))
        and not isinstance(value, bool)
        and math.isfinite(value)
        and value >= 0
    )


def _is_non_negative_integer(value: object) -> bool:
    return isinstance(value, int) and not isinstance(value, bool) and value >= 0


def _is_valid_latitude(value: object) -> bool:
    return _is_coordinate(value, minimum=-90, maximum=90)


def _is_valid_longitude(value: object) -> bool:
    return _is_coordinate(value, minimum=-180, maximum=180)


def _is_coordinate(value: object, *, minimum: int, maximum: int) -> bool:
    return (
        isinstance(value, (int, float))
        and not isinstance(value, bool)
        and math.isfinite(value)
        and minimum <= value <= maximum
    )


def _invalid_route_response() -> RoutingServiceError:
    return RoutingServiceError(
        "The routing provider returned an invalid route response.",
        code="invalid_routing_response",
        status_code=502,
    )
