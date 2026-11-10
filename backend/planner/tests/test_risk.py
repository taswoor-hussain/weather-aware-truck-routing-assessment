from django.test import SimpleTestCase

from planner.services.risk import (
    classify_rain,
    classify_snow,
    classify_weather,
    classify_wind,
)


class WindRiskTests(SimpleTestCase):
    def test_wind_thresholds_and_load_boundaries(self):
        cases = (
            (24.99, 50_000, "low"),
            (25, 30_000, "moderate"),
            (35, 40_000, "high"),
            (35, 40_001, "severe"),
            (45, 30_000, "severe"),
            (45, 30_001, "no_travel"),
            (54.99, 20_000, "severe"),
            (55, 1, "no_travel"),
        )

        for wind, load, expected in cases:
            with self.subTest(wind=wind, load=load):
                self.assertEqual(
                    classify_wind(wind, load_weight_lb=load),
                    expected,
                )


class PrecipitationRiskTests(SimpleTestCase):
    def test_rain_thresholds(self):
        cases = (
            (0.099, "low"),
            (0.1, "moderate"),
            (0.25, "high"),
            (0.5, "severe"),
            (1, "severe"),
            (1.001, "no_travel"),
        )
        for amount, expected in cases:
            with self.subTest(amount=amount):
                self.assertEqual(classify_rain(amount), expected)

    def test_snow_thresholds(self):
        cases = (
            (0.499, "low"),
            (0.5, "moderate"),
            (1, "high"),
            (2, "severe"),
            (3, "severe"),
            (3.001, "no_travel"),
        )
        for amount, expected in cases:
            with self.subTest(amount=amount):
                self.assertEqual(classify_snow(amount), expected)

    def test_checkpoint_uses_the_worst_weather_risk(self):
        risk = classify_weather(
            {
                "wind_mph": 10,
                "rain_in_per_hour": 0.3,
                "snow_in_per_hour": 0,
            },
            load_weight_lb=20_000,
        )

        self.assertEqual(risk, "high")

    def test_invalid_measurements_are_not_treated_as_safe_weather(self):
        with self.assertRaises(ValueError):
            classify_rain(float("nan"))
