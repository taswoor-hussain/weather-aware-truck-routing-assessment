from collections.abc import Mapping
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
            try:
                parsed = parse_datetime(value)
            except ValueError:
                parsed = None

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

    def to_internal_value(self, data):
        if isinstance(data, Mapping):
            unknown_fields = sorted(set(data) - set(self.fields))
            if unknown_fields:
                raise serializers.ValidationError(
                    {
                        "non_field_errors": [
                            f"Unknown field(s): {', '.join(unknown_fields)}."
                        ]
                    }
                )
        return super().to_internal_value(data)

    def validate(self, attrs):
        if attrs["origin"].casefold() == attrs["destination"].casefold():
            raise serializers.ValidationError(
                {"destination": "Origin and destination must be different."}
            )
        return attrs
