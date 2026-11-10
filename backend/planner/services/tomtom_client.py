import logging
from collections.abc import Callable, Mapping
from typing import Any

import requests

from .errors import RoutingServiceError

logger = logging.getLogger(__name__)

TOMTOM_BASE_URL = "https://api.tomtom.com"
REQUEST_TIMEOUT = (3.05, 10)


class TomTomClient:
    def __init__(
        self,
        api_key: str,
        *,
        http_get: Callable[..., requests.Response] | None = None,
    ):
        self._api_key = api_key.strip()
        self._http_get = http_get or requests.get

    def get_json(
        self,
        path: str,
        *,
        params: Mapping[str, str | int | float | bool],
    ) -> dict[str, Any]:
        if not self._api_key:
            raise RoutingServiceError(
                "Route planning is not configured. Please try again later.",
                code="routing_not_configured",
                status_code=503,
            )

        try:
            response = self._http_get(
                f"{TOMTOM_BASE_URL}{path}",
                params={**params, "key": self._api_key},
                timeout=REQUEST_TIMEOUT,
            )
        except requests.Timeout:
            logger.warning("TomTom request timed out.")
            raise RoutingServiceError(
                "The routing provider timed out. Please try again.",
                code="routing_timeout",
                status_code=503,
            ) from None
        except requests.RequestException:
            logger.warning("Could not connect to the TomTom routing provider.")
            raise RoutingServiceError(
                "The routing provider could not be reached. Please try again.",
                code="routing_unavailable",
                status_code=503,
            ) from None

        if response.status_code >= 400:
            logger.warning(
                "TomTom request failed with HTTP status %s.",
                response.status_code,
            )
            rejected = response.status_code in {401, 403}
            status_code = (
                503
                if rejected or response.status_code == 429 or response.status_code >= 500
                else 502
            )
            code = "routing_provider_rejected_request" if rejected else "routing_provider_error"
            message = (
                "The routing provider rejected its configuration."
                if rejected
                else "The routing provider could not complete the request."
            )
            raise RoutingServiceError(
                message,
                code=code,
                status_code=status_code,
            )

        try:
            payload = response.json()
        except ValueError:
            logger.warning("TomTom returned a response that was not valid JSON.")
            raise RoutingServiceError(
                "The routing provider returned an invalid response.",
                code="invalid_routing_response",
                status_code=502,
            ) from None

        if not isinstance(payload, dict):
            raise RoutingServiceError(
                "The routing provider returned an invalid response.",
                code="invalid_routing_response",
                status_code=502,
            )

        return payload
