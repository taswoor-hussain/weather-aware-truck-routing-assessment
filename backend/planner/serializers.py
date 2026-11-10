from datetime import datetime

from django.utils.dateparse import parse_datetime
from django.utils.timezone import is_naive
from rest_framework import serializers


class AwareDateTimeField(serializers.DateTimeField):
    default_error_messages = {
        "timezone_required": "Include a timezone offset, for example Z or +05:00."
    }

    def to_internal_value(self, value):
        parsed = value if isinstance(value, datetime) else None
        if isinstance(value, str):
            parsed = parse_datetime(value)

        if parsed is not None and is_naive(parsed):
            self.fail("timezone_required")

        return super().to_internal_value(value)


class TripRequestSerializer(serializers.Serializer):
    origin = serializers.CharField(max_length=120, trim_whitespace=True)
    destination = serializers.CharField(max_length=120, trim_whitespace=True)
    departure_at = AwareDateTimeField()
    load_weight_lb = serializers.IntegerField(min_value=1)
    checkpoint_interval_miles = serializers.ChoiceField(
        choices=(10, 25, 50),
        default=25,
    )

    def validate(self, attrs):
        if attrs["origin"].casefold() == attrs["destination"].casefold():
            raise serializers.ValidationError(
                {"destination": "Origin and destination must be different."}
            )
        return attrs
