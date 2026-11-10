from datetime import datetime, timezone
from unittest.mock import patch

from django.test import SimpleTestCase

from planner.services.geocoding import Coordinates
from planner.services.planner import plan_trip
from planner.services.risk import WeatherObservation
from planner.services.routing import RouteOption


def route_option(route_id: str, travel_time_seconds: int) -> RouteOption:
    return {
        "id": route_id,
        "summary": {
            "distance_miles": 100,
            "travel_time_seconds": travel_time_seconds,
            "departure_at": "2026-11-11T10:00:00+00:00",
            "arrival_at": "2026-11-11T10:30:00+00:00",
        },
        "geometry": {
            "type": "LineString",
            "coordinates": [[-87, 41], [-88, 41]],
        },
    }


class PlannerServiceTests(SimpleTestCase):
    @patch("planner.services.planner.fetch_checkpoint_weather")
    @patch("planner.services.planner.calculate_routes")
    @patch("planner.services.planner.resolve_location")
    @patch("planner.services.planner.TomTomClient")
    def test_plans_all_routes_with_checkpoint_weather_and_risk_ranking(
        self,
        mock_tomtom_client,
        mock_resolve_location,
        mock_calculate_routes,
        mock_fetch_checkpoint_weather,
    ):
        routes = [
            route_option("route-1", 1800),
            route_option("route-2", 2400),
            route_option("route-3", 3000),
        ]
        mock_resolve_location.side_effect = [
            Coordinates(latitude=41, longitude=-87),
            Coordinates(latitude=39, longitude=-104),
        ]
        mock_calculate_routes.return_value = routes
        low_weather: WeatherObservation = {
            "wind_mph": 10,
            "rain_in_per_hour": 0,
            "snow_in_per_hour": 0,
        }
        high_weather: WeatherObservation = {
            "wind_mph": 35,
            "rain_in_per_hour": 0,
            "snow_in_per_hour": 0,
        }
        severe_weather: WeatherObservation = {
            "wind_mph": 10,
            "rain_in_per_hour": 0,
            "snow_in_per_hour": 2,
        }
        mock_fetch_checkpoint_weather.return_value = [
            *([high_weather] * 3),
            *([low_weather] * 3),
            *([severe_weather] * 3),
        ]

        result = plan_trip(
            origin="Chicago, IL",
            destination="Denver, CO",
            departure_at=datetime(2026, 11, 11, 10, tzinfo=timezone.utc),
            load_weight_lb=32_000,
            checkpoint_interval_miles=50,
            api_key="test-key",
        )

        self.assertEqual(len(result["routes"]), 3)
        self.assertEqual(
            [route["id"] for route in result["routes"]],
            ["route-2", "route-1", "route-3"],
        )
        self.assertEqual(result["recommendation"]["route_id"], "route-2")
        self.assertTrue(result["routes"][0]["is_recommended"])
        self.assertEqual(len(result["routes"][0]["checkpoints"]), 3)
        self.assertEqual(
            {checkpoint["risk_level"] for route in result["routes"] for checkpoint in route["checkpoints"]},
            {"low", "high", "severe"},
        )
        mock_fetch_checkpoint_weather.assert_called_once()
        self.assertEqual(len(mock_fetch_checkpoint_weather.call_args.args[0]), 9)
        mock_tomtom_client.assert_called_once_with("test-key")
