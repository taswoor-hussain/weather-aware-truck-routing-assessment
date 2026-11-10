from django.test import SimpleTestCase
from django.urls import reverse


class HealthEndpointTests(SimpleTestCase):
    def test_health_endpoint_returns_ok(self):
        response = self.client.get(reverse("health"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})


class TripRequestApiTests(SimpleTestCase):
    def setUp(self):
        self.url = reverse("plan-trip")
        self.valid_payload = {
            "origin": "Chicago, IL",
            "destination": "Denver, CO",
            "departure_at": "2026-11-11T08:30:00-06:00",
            "load_weight_lb": 32000,
        }

    def test_valid_trip_request_is_accepted_with_default_checkpoint_interval(self):
        response = self.client.post(self.url, self.valid_payload, content_type="application/json")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "validated")
        self.assertEqual(response.json()["trip"]["checkpoint_interval_miles"], 25)

    def test_supported_checkpoint_interval_is_preserved(self):
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
