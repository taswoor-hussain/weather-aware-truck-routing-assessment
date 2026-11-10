from django.http import JsonResponse
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .serializers import TripRequestSerializer


def health(request):
    return JsonResponse({"status": "ok"})


@api_view(["POST"])
def plan_trip(request):
    serializer = TripRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    return Response(
        {"status": "validated", "trip": serializer.data},
        status=status.HTTP_200_OK,
    )
