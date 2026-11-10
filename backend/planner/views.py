from django.conf import settings
from django.http import HttpRequest, JsonResponse
from django.views.decorators.http import require_GET
from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, ScopedRateThrottle
from rest_framework.views import APIView

from .services.errors import PlanningServiceError
from .services.planner import plan_trip
from .serializers import TripRequestSerializer


@require_GET
def health(request: HttpRequest) -> JsonResponse:
    return JsonResponse({"status": "ok"})


class PlanTripView(APIView):
    throttle_classes = [AnonRateThrottle, ScopedRateThrottle]
    throttle_scope = "plan"

    def post(self, request: Request) -> Response:
        serializer = TripRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            result = plan_trip(
                **serializer.validated_data,
                api_key=settings.TOMTOM_API_KEY,
            )
        except PlanningServiceError as error:
            return Response(
                {"code": error.code, "detail": error.message},
                status=error.status_code,
            )
        return Response(result, status=status.HTTP_200_OK)
