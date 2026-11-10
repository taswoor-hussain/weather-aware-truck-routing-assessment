from django.urls import path

from .views import PlanTripView, health

urlpatterns = [
    path("health/", health, name="health"),
    path("plan/", PlanTripView.as_view(), name="plan-trip"),
]
