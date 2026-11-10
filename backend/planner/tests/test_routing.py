from datetime import datetime, timezone
from unittest.mock import Mock

import requests
from django.test import SimpleTestCase

from planner.services.errors import RoutingServiceError
from planner.services.geocoding import Coordinates, resolve_location
from planner.services.routing import calculate_routes
from planner.services.tomtom_client import TomTomClient


def provider_route(index):
    offset = index * 0.1
    return {
        "summary": {
            "lengthInMeters": 16093,
            "travelTimeInSeconds": 3600 + index * 60,
        },
        "legs": [
            {
                "points": [
                    {"latitude": 41.0 + offset, "longitude": -87.0},
                    {"latitude": 42.0 + offset, "longitude": -100.0},
                ]
            }
        ],
    }


class TomTomClientTests(SimpleTestCase):
    def test_missing_key_fails_before_making_a_request(self):
        http_get = Mock()
        client = TomTomClient("", http_get=http_get)

        with self.assertRaises(RoutingServiceError) as raised:
            client.get_json("/search/test.json", params={})

        self.assertEqual(raised.exception.code, "routing_not_configured")
        http_get.assert_not_called()

    def test_provider_timeout_is_converted_without_exposing_credentials(self):
        http_get = Mock(side_effect=requests.Timeout("request URL contained test-secret"))
        client = TomTomClient("test-secret", http_get=http_get)

        with self.assertRaises(RoutingServiceError) as raised:
            client.get_json("/routing/test.json", params={})

        self.assertEqual(raised.exception.code, "routing_timeout")
        self.assertNotIn("test-secret", str(raised.exception))

    def test_provider_auth_error_does_not_expose_provider_payload(self):
        response = Mock(status_code=403)
        response.json.return_value = {"message": "sensitive provider diagnostics"}
        client = TomTomClient("test-secret", http_get=Mock(return_value=response))

        with self.assertRaises(RoutingServiceError) as raised:
            client.get_json("/routing/test.json", params={})

        self.assertEqual(raised.exception.status_code, 503)
        self.assertNotIn("sensitive provider diagnostics", str(raised.exception))

    def test_invalid_provider_json_becomes_a_gateway_error(self):
        response = Mock(status_code=200)
        response.json.side_effect = ValueError("invalid JSON")
        client = TomTomClient("test-secret", http_get=Mock(return_value=response))

        with self.assertRaises(RoutingServiceError) as raised:
            client.get_json("/routing/test.json", params={})

        self.assertEqual(raised.exception.code, "invalid_routing_response")
        self.assertEqual(raised.exception.status_code, 502)


class GeocodingTests(SimpleTestCase):
    def test_geocode_uses_encoded_place_and_returns_checked_coordinates(self):
        client = Mock(spec=TomTomClient)
        client.get_json.return_value = {
            "results": [{"position": {"lat": 41.8781, "lon": -87.6298}}]
        }

        location = resolve_location(client, "Chicago, IL")

        self.assertEqual(location, Coordinates(latitude=41.8781, longitude=-87.6298))
        client.get_json.assert_called_once_with(
            "/search/2/geocode/Chicago%2C%20IL.json",
            params={"limit": 1},
        )

    def test_unmatched_place_returns_a_client_error(self):
        client = Mock(spec=TomTomClient)
        client.get_json.return_value = {"results": []}

        with self.assertRaises(RoutingServiceError) as raised:
            resolve_location(client, "Unknown place")

        self.assertEqual(raised.exception.code, "location_not_found")
        self.assertEqual(raised.exception.status_code, 422)


class RoutingTests(SimpleTestCase):
    def setUp(self):
        self.departure_at = datetime(2026, 11, 11, 14, 30, tzinfo=timezone.utc)
        self.origin = Coordinates(latitude=41.8781, longitude=-87.6298)
        self.destination = Coordinates(latitude=39.7392, longitude=-104.9903)

    def test_requests_three_distinct_truck_routes_and_normalizes_geojson(self):
        http_get = Mock()
        response = Mock(status_code=200)
        response.json.return_value = {"routes": [provider_route(i) for i in range(3)]}
        http_get.return_value = response
        client = TomTomClient("test-key", http_get=http_get)

        routes = calculate_routes(
            client,
            self.origin,
            self.destination,
            self.departure_at,
        )

        self.assertEqual(len(routes), 3)
        self.assertEqual(routes[0]["id"], "route-1")
        self.assertEqual(routes[0]["summary"]["distance_miles"], 10.0)
        self.assertEqual(routes[0]["summary"]["travel_time_seconds"], 3600)
        self.assertEqual(
            routes[0]["geometry"]["coordinates"][0],
            [-87.0, 41.0],
        )
        request = http_get.call_args
        self.assertEqual(request.kwargs["params"]["maxAlternatives"], 2)
        self.assertEqual(request.kwargs["params"]["travelMode"], "truck")
        self.assertEqual(request.kwargs["params"]["key"], "test-key")
        self.assertEqual(request.kwargs["timeout"], (3.05, 10))

    def test_identical_route_geometries_are_not_counted_as_alternatives(self):
        client = Mock(spec=TomTomClient)
        client.get_json.return_value = {
            "routes": [provider_route(0), provider_route(0), provider_route(1)]
        }

        with self.assertRaises(RoutingServiceError) as raised:
            calculate_routes(client, self.origin, self.destination, self.departure_at)

        self.assertEqual(raised.exception.code, "insufficient_routes")
        self.assertEqual(raised.exception.status_code, 422)

    def test_malformed_route_geometry_is_rejected(self):
        malformed = provider_route(0)
        malformed["legs"][0]["points"][0]["latitude"] = True
        client = Mock(spec=TomTomClient)
        client.get_json.return_value = {"routes": [malformed]}

        with self.assertRaises(RoutingServiceError) as raised:
            calculate_routes(client, self.origin, self.destination, self.departure_at)

        self.assertEqual(raised.exception.code, "invalid_routing_response")
        self.assertEqual(raised.exception.status_code, 502)
