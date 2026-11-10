from django.test import SimpleTestCase

from planner.services.recommendation import WeatherRoute, rank_routes
from planner.services.risk import RiskLevel


def route_with_risk(
    route_id: str,
    *,
    travel_time: int,
    risk_level: RiskLevel,
    risk_miles: float,
) -> WeatherRoute:
    return {
        "id": route_id,
        "summary": {
            "distance_miles": 100,
            "travel_time_seconds": travel_time,
            "departure_at": "2026-11-11T10:00:00+00:00",
            "arrival_at": "2026-11-11T11:00:00+00:00",
        },
        "geometry": {
            "type": "LineString",
            "coordinates": [[-87, 41], [-88, 42]],
        },
        "checkpoints": [
            {
                "id": f"{route_id}-checkpoint-1",
                "distance_miles": 0,
                "latitude": 41,
                "longitude": -87,
                "eta": "2026-11-11T10:00:00+00:00",
                "segment_miles": risk_miles,
                "weather": {
                    "wind_mph": 20,
                    "rain_in_per_hour": 0,
                    "snow_in_per_hour": 0,
                },
                "risk_level": risk_level,
                "risk_miles": risk_miles,
            }
        ],
    }


class RecommendationTests(SimpleTestCase):
    def test_no_travel_exposure_is_prioritized_over_other_risk(self):
        routes = [
            route_with_risk(
                "severe-only",
                travel_time=3600,
                risk_level="severe",
                risk_miles=10,
            ),
            route_with_risk(
                "no-travel",
                travel_time=3000,
                risk_level="no_travel",
                risk_miles=1,
            ),
            route_with_risk(
                "safe",
                travel_time=4000,
                risk_level="low",
                risk_miles=10,
            ),
        ]

        ranked, recommendation = rank_routes(routes)

        self.assertEqual(ranked[0]["id"], "safe")
        self.assertEqual(recommendation["route_id"], "safe")

    def test_unrounded_no_travel_exposure_cannot_be_hidden_by_display_rounding(self):
        routes = [
            route_with_risk(
                "tiny-no-travel",
                travel_time=3000,
                risk_level="no_travel",
                risk_miles=0.04,
            ),
            route_with_risk(
                "safe",
                travel_time=4000,
                risk_level="low",
                risk_miles=0.04,
            ),
        ]

        ranked, recommendation = rank_routes(routes)

        self.assertEqual(ranked[0]["id"], "safe")
        self.assertEqual(ranked[1]["risk_summary"]["no_travel_miles"], 0)
        self.assertEqual(recommendation["route_id"], "safe")

    def test_no_route_is_recommended_when_every_option_has_no_travel_weather(self):
        routes = [
            route_with_risk(
                f"route-{index}",
                travel_time=3600 + index,
                risk_level="no_travel",
                risk_miles=1,
            )
            for index in range(3)
        ]

        ranked, recommendation = rank_routes(routes)

        self.assertIsNone(recommendation["route_id"])
        self.assertEqual(recommendation["status"], "no_safe_route")
        self.assertFalse(any(route["is_recommended"] for route in ranked))
