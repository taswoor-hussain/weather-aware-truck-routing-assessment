from unittest.mock import patch

from django.core.cache import cache
from django.test import SimpleTestCase, override_settings
from django.urls import reverse

from planner.services.errors import RoutingServiceError


def planned_response(checkpoint_interval_miles: int = 25) -> dict[str, object]:
    routes = [
        {
            "id": f"route-{index + 1}",
            "summary": {
                "distance_miles": 900.0 + index,
                "travel_time_seconds": 36000 + index * 60,
                "departure_at": "2026-11-11T14:30:00+00:00",
                "arrival_at": "2026-11-12T00:30:00+00:00",
            },
            "geometry": {
                "type": "LineString",
                "coordinates": [[-87.0, 41.0], [-104.0, 39.0 + index]],
            },
            "checkpoints": [
                {
                    "id": f"route-{index + 1}-checkpoint-1",
                    "distance_miles": 0,
                    "latitude": 41,
                    "longitude": -87,
                    "eta": "2026-11-11T14:30:00+00:00",
                    "segment_miles": 900,
                    "weather": {
                        "wind_mph": 10,
                        "rain_in_per_hour": 0,
                        "snow_in_per_hour": 0,
                    },
                    "risk_level": "low",
                    "risk_miles": 900,
                }
            ],
            "risk_summary": {
                "no_travel_miles": 0,
                "severe_miles": 0,
                "high_miles": 0,
                "average_risk": 0,
            },
            "is_recommended": index == 0,
        }
        for index in range(3)
    ]
    return {
        "status": "planned",
        "trip": {
            "origin": "Chicago, IL",
            "destination": "Denver, CO",
            "departure_at": "2026-11-11T14:30:00+00:00",
            "load_weight_lb": 32000,
            "checkpoint_interval_miles": checkpoint_interval_miles,
        },
        "routes": routes,
        "recommendation": {
            "route_id": "route-1",
            "status": "recommended",
            "message": "This route has the lowest weather risk based on the available forecast.",
        },
    }


class HealthEndpointTests(SimpleTestCase):
    def test_health_endpoint_returns_ok(self):
        response = self.client.get(reverse("health"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_health_endpoint_only_accepts_get(self):
        response = self.client.post(reverse("health"))

        self.assertEqual(response.status_code, 405)


class TripRequestApiTests(SimpleTestCase):
    def setUp(self):
        self.url = reverse("plan-trip")
        self.valid_payload = {
            "origin": "Chicago, IL",
            "destination": "Denver, CO",
            "departure_at": "2026-11-11T08:30:00-06:00",
            "load_weight_lb": 32000,
        }

    @override_settings(TOMTOM_API_KEY="test-key")
    @patch("planner.views.plan_trip")
    def test_valid_trip_request_returns_a_plan(self, mock_plan_trip):
        mock_plan_trip.return_value = planned_response()
        response = self.client.post(self.url, self.valid_payload, content_type="application/json")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "planned")
        self.assertEqual(response.json()["trip"]["checkpoint_interval_miles"], 25)
        self.assertEqual(response.json()["recommendation"]["route_id"], "route-1")
        self.assertEqual(len(response.json()["routes"][0]["checkpoints"]), 1)
        mock_plan_trip.assert_called_once()
        self.assertEqual(mock_plan_trip.call_args.kwargs["origin"], "Chicago, IL")
        self.assertEqual(mock_plan_trip.call_args.kwargs["load_weight_lb"], 32000)
        self.assertEqual(mock_plan_trip.call_args.kwargs["api_key"], "test-key")

    @override_settings(TOMTOM_API_KEY="")
    def test_missing_routing_configuration_returns_service_unavailable(self):
        response = self.client.post(
            self.url,
            self.valid_payload,
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["code"], "routing_not_configured")

    @override_settings(TOMTOM_API_KEY="test-key")
    @patch("planner.views.plan_trip")
    def test_provider_errors_return_a_safe_structured_response(self, mock_plan_trip):
        mock_plan_trip.side_effect = RoutingServiceError(
            "The routing provider timed out. Please try again.",
            code="routing_timeout",
            status_code=503,
        )
        response = self.client.post(
            self.url,
            self.valid_payload,
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 503)
        self.assertEqual(
            response.json(),
            {
                "code": "routing_timeout",
                "detail": "The routing provider timed out. Please try again.",
            },
        )

    @patch("planner.views.plan_trip")
    def test_supported_checkpoint_interval_is_preserved(self, mock_plan_trip):
        mock_plan_trip.return_value = planned_response(checkpoint_interval_miles=10)
        response = self.client.post(
            self.url,
            {**self.valid_payload, "checkpoint_interval_miles": 10},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["trip"]["checkpoint_interval_miles"], 10)

    def test_invalid_trip_requests_return_field_errors(self):
        invalid_payloads = (
            ({**self.valid_payload, "load_weight_lb": 0}, "load_weight_lb"),
            ({**self.valid_payload, "checkpoint_interval_miles": 15}, "checkpoint_interval_miles"),
            ({**self.valid_payload, "departure_at": "2026-11-11T08:30:00"}, "departure_at"),
            ({**self.valid_payload, "departure_at": "2026-99-99T08:30:00Z"}, "departure_at"),
            ({**self.valid_payload, "destination": " chicago, il "}, "destination"),
        )

        for payload, field in invalid_payloads:
            with self.subTest(field=field):
                response = self.client.post(
                    self.url,
                    payload,
                    content_type="application/json",
                )

                self.assertEqual(response.status_code, 400)
                self.assertIn(field, response.json())

    def test_missing_required_fields_are_reported(self):
        response = self.client.post(self.url, {}, content_type="application/json")

        self.assertEqual(response.status_code, 400)
        self.assertIn("origin", response.json())
        self.assertIn("destination", response.json())
        self.assertIn("departure_at", response.json())
        self.assertIn("load_weight_lb", response.json())

    def test_unknown_fields_are_rejected_instead_of_silently_ignored(self):
        response = self.client.post(
            self.url,
            {**self.valid_payload, "load_weigth_lb": 32000},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("non_field_errors", response.json())
        self.assertIn("load_weigth_lb", response.json()["non_field_errors"][0])

    def test_only_json_requests_are_supported(self):
        response = self.client.post(self.url, {"origin": "Chicago"})

        self.assertEqual(response.status_code, 415)

    def test_malformed_json_returns_a_client_error(self):
        response = self.client.post(
            self.url,
            data='{"origin":',
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("detail", response.json())

    def test_plan_endpoint_only_accepts_post(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 405)


class TripRequestThrottleTests(SimpleTestCase):
    def setUp(self):
        cache.clear()
        self.url = reverse("plan-trip")
        self.payload = {
            "origin": "Chicago, IL",
            "destination": "Denver, CO",
            "departure_at": "2026-11-11T08:30:00-06:00",
            "load_weight_lb": 32000,
        }

    def tearDown(self):
        cache.clear()

    @patch("planner.views.plan_trip", return_value=planned_response())
    def test_plan_requests_are_rate_limited(self, mock_plan_trip):
        responses = [
            self.client.post(
                self.url,
                self.payload,
                content_type="application/json",
            )
            for _ in range(21)
        ]

        self.assertTrue(all(response.status_code == 200 for response in responses[:20]))
        self.assertEqual(responses[20].status_code, 429)
