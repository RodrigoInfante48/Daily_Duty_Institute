# shared/exceptions.py — Custom exceptions para toda la API
# Referencia: docs/PATTERNS.md → Patrón 7: Error Hierarchy


class APIError(Exception):
    """Base para todos los errores del cliente HTTP y la API."""

    def __init__(
        self,
        status_code: int,
        message: str,
        error_code: str | None = None,
        response_body: dict | None = None,
    ):
        self.status_code = status_code
        self.error_code = error_code
        self.response_body = response_body
        super().__init__(f"HTTP {status_code}: {message}")


class AuthenticationError(APIError):
    """Error de autenticación (401, 403)."""

    def __init__(self, message: str = "Authentication failed"):
        super().__init__(401, message, error_code="AUTH_FAILED")


class InvalidTokenError(AuthenticationError):
    """Token JWT inválido o expirado."""

    def __init__(self, message: str = "Invalid or expired token"):
        super().__init__(message)


class NotFoundError(APIError):
    """Recurso no encontrado (404)."""

    def __init__(self, resource: str, identifier: str | int):
        super().__init__(404, f"{resource} '{identifier}' not found", error_code="NOT_FOUND")


class ForbiddenError(APIError):
    """Sin permisos (403)."""

    def __init__(self, message: str = "Access denied"):
        super().__init__(403, message, error_code="FORBIDDEN")


class ValidationError(APIError):
    """Error de validación (422)."""

    def __init__(self, message: str):
        super().__init__(422, message, error_code="VALIDATION_ERROR")


class RateLimitError(APIError):
    """Rate limit excedido (429)."""

    def __init__(self, retry_after: float | None = None):
        self.retry_after = retry_after
        message = f"Rate limited. Retry after {retry_after}s" if retry_after else "Rate limit exceeded"
        super().__init__(429, message, error_code="RATE_LIMITED")


class CircuitOpenError(APIError):
    """Circuit breaker abierto."""

    def __init__(self, recovery_in: float):
        self.recovery_in = recovery_in
        super().__init__(503, f"Service unavailable. Recovery in {recovery_in:.0f}s", error_code="CIRCUIT_OPEN")


class ServerError(APIError):
    """Error del servidor (5xx)."""

    def __init__(self, message: str = "Internal server error"):
        super().__init__(500, message, error_code="SERVER_ERROR")


class ModelNotFoundError(APIError):
    """Modelo dbt no encontrado en el registry."""

    def __init__(self, model_name: str):
        super().__init__(404, f"dbt model '{model_name}' not found in registry", error_code="MODEL_NOT_FOUND")


class InvalidFilterError(APIError):
    """Filtro inválido para un modelo dbt."""

    def __init__(self, message: str):
        super().__init__(400, message, error_code="INVALID_FILTER")


class PaginationError(APIError):
    """Error en paginación."""

    def __init__(self, message: str):
        super().__init__(400, message, error_code="PAGINATION_ERROR")


class MaxPagesExceeded(PaginationError):
    """Se alcanzó el límite máximo de páginas."""

    def __init__(self, max_pages: int):
        super().__init__(f"Maximum pages ({max_pages}) exceeded. Use filters to narrow results.")
