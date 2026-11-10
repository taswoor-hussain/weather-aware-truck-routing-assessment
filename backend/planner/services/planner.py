from datetime import datetime

from .geocoding import resolve_location
from .routing import RouteOption, calculate_routes
from .tomtom_client import TomTomClient


def plan_trip(
    *,
    origin: str,
    destination: str,
    departure_at: datetime,
    load_weight_lb: int,
    checkpoint_interval_miles: int,
    api_key: str,
) -> dict[str, object]:
    client = TomTomClient(api_key)
    origin_coordinates = resolve_location(client, origin)
    destination_coordinates = resolve_location(client, destination)
    routes: list[RouteOption] = calculate_routes(
        client,
        origin_coordinates,
        destination_coordinates,
        departure_at,
    )

    return {
        "status": "planned",
        "trip": {
            "origin": origin,
            "destination": destination,
            "departure_at": departure_at.isoformat(),
            "load_weight_lb": load_weight_lb,
            "checkpoint_interval_miles": checkpoint_interval_miles,
        },
        "routes": routes,
    }
