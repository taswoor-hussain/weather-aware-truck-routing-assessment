from typing import Literal, TypedDict

from .checkpoints import Checkpoint
from .risk import RISK_SCORES, RiskLevel, WeatherForecastSample, WeatherObservation
from .routing import RouteOption


class RiskCheckpoint(Checkpoint):
    weather: WeatherObservation
    risk_level: RiskLevel
    risk_miles: float
    hourly_forecast: list[WeatherForecastSample]


class RouteRiskSummary(TypedDict):
    no_travel_miles: float
    severe_miles: float
    high_miles: float
    average_risk: float


class CheckpointedRoute(RouteOption):
    checkpoints: list[RiskCheckpoint]


class WeatherRoute(CheckpointedRoute):
    risk_summary: RouteRiskSummary
    is_recommended: bool


class Recommendation(TypedDict):
    route_id: str | None
    status: Literal["recommended", "no_safe_route"]
    message: str


def rank_routes(
    routes: list[CheckpointedRoute],
) -> tuple[list[WeatherRoute], Recommendation]:
    if not routes:
        raise ValueError("At least one route is required for recommendation.")

    scored_routes: list[
        tuple[CheckpointedRoute, RouteRiskSummary, RouteRiskSummary]
    ] = []
    for route in routes:
        raw_summary = _raw_route_risk(route)
        scored_routes.append((route, _public_summary(raw_summary), raw_summary))
    ranked = sorted(
        scored_routes,
        key=lambda item: (
            item[2]["no_travel_miles"],
            item[2]["severe_miles"],
            item[2]["high_miles"],
            item[2]["average_risk"],
            item[0]["summary"]["travel_time_seconds"],
        ),
    )
    best_route, _, best_summary = ranked[0]
    recommended_route_id = (
        best_route["id"]
        if best_summary["no_travel_miles"] == 0
        else None
    )

    ranked_routes: list[WeatherRoute] = []
    for route, risk_summary, _ in ranked:
        ranked_routes.append(
            {
                **route,
                "risk_summary": risk_summary,
                "is_recommended": route["id"] == recommended_route_id,
            }
        )

    if recommended_route_id is None:
        recommendation: Recommendation = {
            "route_id": None,
            "status": "no_safe_route",
            "message": "All route options include No Travel weather. Do not depart.",
        }
    else:
        recommendation = {
            "route_id": recommended_route_id,
            "status": "recommended",
            "message": "This route has the lowest weather risk based on the available forecast.",
        }

    return ranked_routes, recommendation


def summarize_route_risk(route: WeatherRoute) -> RouteRiskSummary:
    return _public_summary(_raw_route_risk(route))


def _raw_route_risk(route: CheckpointedRoute) -> RouteRiskSummary:
    totals: dict[RiskLevel, float] = {
        "low": 0,
        "moderate": 0,
        "high": 0,
        "severe": 0,
        "no_travel": 0,
    }
    for checkpoint in route["checkpoints"]:
        totals[checkpoint["risk_level"]] += checkpoint["risk_miles"]

    total_miles = sum(totals.values())
    average_risk = (
        sum(RISK_SCORES[level] * miles for level, miles in totals.items()) / total_miles
        if total_miles
        else 0
    )
    return {
        "no_travel_miles": totals["no_travel"],
        "severe_miles": totals["severe"],
        "high_miles": totals["high"],
        "average_risk": average_risk,
    }


def _public_summary(raw: RouteRiskSummary) -> RouteRiskSummary:
    return {
        "no_travel_miles": round(raw["no_travel_miles"], 1),
        "severe_miles": round(raw["severe_miles"], 1),
        "high_miles": round(raw["high_miles"], 1),
        "average_risk": round(raw["average_risk"], 2),
    }
