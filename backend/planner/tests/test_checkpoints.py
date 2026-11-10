from datetime import datetime, timezone

from django.test import SimpleTestCase

from planner.services.checkpoints import build_checkpoints
from planner.services.routing import RouteOption


class CheckpointTests(SimpleTestCase):
    def setUp(self):
        self.route: RouteOption = {
            "id": "route-1",
            "summary": {
                "distance_miles": 20,
                "travel_time_seconds": 3600,
                "departure_at": "2026-11-11T10:00:00+00:00",
                "arrival_at": "2026-11-11T11:00:00+00:00",
            },
            "geometry": {
                "type": "LineString",
                "coordinates": [[0, 0], [0.3, 0]],
            },
        }

    def test_checkpoints_follow_route_distance_and_estimated_arrival_time(self):
        checkpoints = build_checkpoints(
            self.route,
            departure_at=datetime(2026, 11, 11, 10, tzinfo=timezone.utc),
            interval_miles=10,
        )

        self.assertEqual([point["distance_miles"] for point in checkpoints], [0, 10, 20])
        self.assertEqual(
            [point["eta"] for point in checkpoints],
            [
                "2026-11-11T10:00:00+00:00",
                "2026-11-11T10:30:00+00:00",
                "2026-11-11T11:00:00+00:00",
            ],
        )
        self.assertAlmostEqual(checkpoints[1]["longitude"], 0.15, places=5)

    def test_checkpoint_risk_miles_partition_the_full_route(self):
        checkpoints = build_checkpoints(
            self.route,
            departure_at=datetime(2026, 11, 11, 10, tzinfo=timezone.utc),
            interval_miles=10,
        )

        self.assertEqual(
            [point["segment_miles"] for point in checkpoints],
            [5, 10, 5],
        )
        self.assertEqual(sum(point["segment_miles"] for point in checkpoints), 20)

    def test_destination_is_included_even_when_route_is_shorter_than_interval(self):
        short_route = {
            **self.route,
            "summary": {**self.route["summary"], "distance_miles": 5},
        }

        checkpoints = build_checkpoints(
            short_route,
            departure_at=datetime(2026, 11, 11, 10, tzinfo=timezone.utc),
            interval_miles=10,
        )

        self.assertEqual([point["distance_miles"] for point in checkpoints], [0, 5])
        self.assertEqual(sum(point["segment_miles"] for point in checkpoints), 5)
