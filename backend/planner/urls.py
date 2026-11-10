from django.urls import path

from .views import PlanTripView, PlaceSuggestionsView, health

urlpatterns = [
    path("health/", health, name="health"),
    path("plan/", PlanTripView.as_view(), name="plan-trip"),
    path("places/suggest/", PlaceSuggestionsView.as_view(), name="place-suggestions"),
]
