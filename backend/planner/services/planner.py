from datetime import datetime

from .checkpoints import Checkpoint, build_checkpoints
from .geocoding import resolve_location
from .recommendation import CheckpointedRoute, RiskCheckpoint, rank_routes
from .risk import classify_weather
from .routing import RouteOption, calculate_routes
from .tomtom_client import TomTomClient
from .weather import fetch_checkpoint_weather_data


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
    checkpoints_by_route: list[list[Checkpoint]] = [
        build_checkpoints(
            route,
            departure_at=departure_at,
            interval_miles=checkpoint_interval_miles,
        )
        for route in routes
    ]
    all_checkpoints = [
        checkpoint
        for route_checkpoints in checkpoints_by_route
        for checkpoint in route_checkpoints
    ]
    weather_data = fetch_checkpoint_weather_data(
        all_checkpoints,
        departure_at=departure_at,
        load_weight_lb=load_weight_lb,
    )

    cursor = 0
    weather_routes: list[CheckpointedRoute] = []
    for route, route_checkpoints in zip(routes, checkpoints_by_route, strict=True):
        risk_checkpoints: list[RiskCheckpoint] = []
        for checkpoint in route_checkpoints:
            checkpoint_weather = weather_data[cursor]
            cursor += 1
            weather = checkpoint_weather["weather"]
            risk_checkpoints.append(
                {
                    **checkpoint,
                    "hourly_forecast": checkpoint_weather["hourly_forecast"],
                    "weather": weather,
                    "risk_level": classify_weather(
                        weather,
                        load_weight_lb=load_weight_lb,
                    ),
                    "risk_miles": checkpoint["segment_miles"],
                }
            )
        weather_routes.append(
            {
                **route,
                "checkpoints": risk_checkpoints,
            }
        )

    ranked_routes, recommendation = rank_routes(weather_routes)

    return {
        "status": "planned",
        "trip": {
            "origin": origin,
            "destination": destination,
            "departure_at": departure_at.isoformat(),
            "load_weight_lb": load_weight_lb,
            "checkpoint_interval_miles": checkpoint_interval_miles,
        },
        "routes": ranked_routes,
        "recommendation": recommendation,
    }
