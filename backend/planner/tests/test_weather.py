from datetime import datetime, timedelta, timezone
from unittest.mock import Mock

from django.core.cache import cache
from django.test import SimpleTestCase

from planner.services.checkpoints import Checkpoint
from planner.services.errors import WeatherServiceError
from planner.services.geocoding import Coordinates
from planner.services.open_meteo import HourlyForecast, OpenMeteoClient
from planner.services.weather import fetch_checkpoint_weather


def forecast() -> HourlyForecast:
    first_hour = datetime(2026, 11, 11, 10, tzinfo=timezone.utc)
    return HourlyForecast(
        times=[first_hour + timedelta(hours=index) for index in range(3)],
        wind_mph=[10, 30, 50],
        rain_inches=[0.05, 0.5, 1.0],
        snow_inches=[0, 2.0, 3.0],
    )


def checkpoint(eta: str, *, latitude: float = 41.1234) -> Checkpoint:
    return {
        "id": "route-1-checkpoint-1",
        "distance_miles": 10,
        "latitude": latitude,
        "longitude": -87.1234,
        "eta": eta,
        "segment_miles": 10,
    }


class OpenMeteoClientTests(SimpleTestCase):
    def test_batched_response_is_converted_using_reported_units(self):
        response = Mock(status_code=200)
        response.json.return_value = [
            {
                "hourly_units": {
                    "wind_speed_10m": "mph",
                    "rain": "inch",
                    "snowfall": "cm",
                },
                "hourly": {
                    "time": ["2026-11-11T10:00", "2026-11-11T11:00"],
                    "wind_speed_10m": [10, 20],
                    "rain": [0.1, 0.2],
                    "snowfall": [2.54, 5.08],
                },
            },
            {
                "hourly_units": {
                    "wind_speed_10m": "mph",
                    "rain": "mm",
                    "snowfall": "mm",
                },
                "hourly": {
                    "time": ["2026-11-11T10:00", "2026-11-11T11:00"],
                    "wind_speed_10m": [30, 40],
                    "rain": [25.4, 50.8],
                    "snowfall": [50.8, 76.2],
                },
            },
        ]
        http_get = Mock(return_value=response)
        client = OpenMeteoClient(http_get=http_get)

        forecasts = client.fetch_forecasts(
            [
                Coordinates(latitude=41, longitude=-87),
                Coordinates(latitude=42, longitude=-88),
            ]
        )

        self.assertEqual(len(forecasts), 2)
        self.assertEqual(forecasts[0].rain_inches, [0.1, 0.2])
        self.assertAlmostEqual(forecasts[0].snow_inches[0], 1)
        self.assertAlmostEqual(forecasts[0].snow_inches[1], 2)
        self.assertAlmostEqual(forecasts[1].rain_inches[0], 1)
        request = http_get.call_args
        self.assertEqual(request.kwargs["params"]["timezone"], "UTC")
        self.assertNotIn("key", request.kwargs["params"])


class CheckpointWeatherTests(SimpleTestCase):
    def setUp(self):
        cache.clear()

    def tearDown(self):
        cache.clear()

    def test_wind_is_interpolated_and_precipitation_uses_the_hour_ending_after_eta(self):
        client = Mock(spec=OpenMeteoClient)
        client.fetch_forecasts.return_value = [forecast()]

        observation = fetch_checkpoint_weather(
            [checkpoint("2026-11-11T10:30:00+00:00")],
            client=client,
        )[0]

        self.assertEqual(observation["wind_mph"], 20)
        self.assertEqual(observation["rain_in_per_hour"], 0.5)
        self.assertEqual(observation["snow_in_per_hour"], 2)

    def test_weather_is_cached_by_location_for_repeated_trip_planning(self):
        client = Mock(spec=OpenMeteoClient)
        client.fetch_forecasts.return_value = [forecast()]
        points = [
            checkpoint("2026-11-11T10:00:00+00:00"),
            checkpoint("2026-11-11T11:00:00+00:00"),
        ]

        fetch_checkpoint_weather(points, client=client)
        fetch_checkpoint_weather(points, client=client)

        client.fetch_forecasts.assert_called_once()

    def test_missing_arrival_time_forecast_returns_an_explicit_error(self):
        client = Mock(spec=OpenMeteoClient)
        client.fetch_forecasts.return_value = [forecast()]

        with self.assertRaises(WeatherServiceError) as raised:
            fetch_checkpoint_weather(
                [checkpoint("2026-11-11T14:00:00+00:00")],
                client=client,
            )

        self.assertEqual(raised.exception.code, "forecast_horizon_exceeded")
        self.assertEqual(raised.exception.status_code, 422)

    def test_invalid_timezone_is_not_silently_assumed(self):
        client = Mock(spec=OpenMeteoClient)
        client.fetch_forecasts.return_value = [forecast()]

        with self.assertRaises(WeatherServiceError) as raised:
            fetch_checkpoint_weather(
                [checkpoint("2026-11-11T10:00:00")],
                client=client,
            )

        self.assertEqual(raised.exception.code, "invalid_checkpoint_eta")
