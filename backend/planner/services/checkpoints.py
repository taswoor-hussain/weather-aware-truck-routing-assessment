import math
from datetime import datetime, timedelta
from typing import TypedDict

from .errors import RoutingServiceError
from .routing import RouteOption

EARTH_RADIUS_MILES = 3958.7613
MAX_MERCATOR_LATITUDE = 85.0511287798066


class Checkpoint(TypedDict):
    id: str
    distance_miles: float
    latitude: float
    longitude: float
    eta: str
    segment_miles: float


def build_checkpoints(
    route: RouteOption,
    *,
    departure_at: datetime,
    interval_miles: int,
) -> list[Checkpoint]:
    route_distance = route["summary"]["distance_miles"]
    travel_time_seconds = route["summary"]["travel_time_seconds"]
    coordinates = route["geometry"]["coordinates"]
    segment_lengths = [
        _distance_between(coordinates[index - 1], coordinates[index])
        for index in range(1, len(coordinates))
    ]
    geometry_distance = sum(segment_lengths)
    if route_distance <= 0 or geometry_distance <= 0:
        raise RoutingServiceError(
            "The routing provider returned invalid route geometry.",
            code="invalid_routing_response",
            status_code=502,
        )
    if interval_miles <= 0:
        raise ValueError("Route distance, geometry, and checkpoint interval must be positive.")

    sample_distances = [0.0]
    distance = float(interval_miles)
    while distance < route_distance:
        sample_distances.append(distance)
        distance += interval_miles
    if not math.isclose(sample_distances[-1], route_distance, abs_tol=0.01):
        sample_distances.append(route_distance)
    else:
        sample_distances[-1] = route_distance

    checkpoints: list[Checkpoint] = []
    for index, distance_miles in enumerate(sample_distances):
        ratio = distance_miles / route_distance
        latitude, longitude = _point_at_distance(
            coordinates,
            segment_lengths,
            geometry_distance * ratio,
        )
        eta = departure_at + timedelta(seconds=travel_time_seconds * ratio)
        checkpoints.append(
            {
                "id": f'{route["id"]}-checkpoint-{index + 1}',
                "distance_miles": round(distance_miles, 3),
                "latitude": latitude,
                "longitude": longitude,
                "eta": eta.isoformat(),
                "segment_miles": 0.0,
            }
        )

    for index, checkpoint in enumerate(checkpoints):
        start = (
            0.0
            if index == 0
            else (checkpoints[index - 1]["distance_miles"] + checkpoint["distance_miles"]) / 2
        )
        end = (
            route_distance
            if index == len(checkpoints) - 1
            else (checkpoint["distance_miles"] + checkpoints[index + 1]["distance_miles"]) / 2
        )
        checkpoint["segment_miles"] = end - start

    return checkpoints


def _point_at_distance(
    coordinates: list[list[float]],
    segment_lengths: list[float],
    distance_miles: float,
) -> tuple[float, float]:
    if distance_miles <= 0:
        longitude, latitude = coordinates[0]
        return latitude, longitude

    traversed = 0.0
    for index, segment_length in enumerate(segment_lengths):
        if traversed + segment_length >= distance_miles:
            fraction = (distance_miles - traversed) / segment_length if segment_length else 0
            start_longitude, start_latitude = coordinates[index]
            end_longitude, end_latitude = coordinates[index + 1]
            start_y = _mercator_y(start_latitude)
            end_y = _mercator_y(end_latitude)
            latitude = _inverse_mercator_y(start_y + (end_y - start_y) * fraction)
            return (
                latitude,
                start_longitude + (end_longitude - start_longitude) * fraction,
            )
        traversed += segment_length

    longitude, latitude = coordinates[-1]
    return latitude, longitude


def _mercator_y(latitude: float) -> float:
    clamped_latitude = max(
        -MAX_MERCATOR_LATITUDE,
        min(MAX_MERCATOR_LATITUDE, latitude),
    )
    radians = math.radians(clamped_latitude)
    return math.log(math.tan(math.pi / 4 + radians / 2))


def _inverse_mercator_y(y: float) -> float:
    return math.degrees(2 * math.atan(math.exp(y)) - math.pi / 2)


def _distance_between(start: list[float], end: list[float]) -> float:
    start_longitude, start_latitude = map(math.radians, start)
    end_longitude, end_latitude = map(math.radians, end)
    latitude_delta = end_latitude - start_latitude
    longitude_delta = end_longitude - start_longitude
    haversine = (
        math.sin(latitude_delta / 2) ** 2
        + math.cos(start_latitude)
        * math.cos(end_latitude)
        * math.sin(longitude_delta / 2) ** 2
    )
    return 2 * EARTH_RADIUS_MILES * math.asin(math.sqrt(haversine))
