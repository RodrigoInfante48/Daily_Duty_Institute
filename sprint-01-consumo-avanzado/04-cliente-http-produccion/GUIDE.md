# 🔧 Módulo 04 — Cliente HTTP de Producción

## Objetivo

Construir un cliente HTTP unificado que integre autenticación, paginación y rate limiting en una interfaz limpia y reutilizable.

---

## Por qué un cliente unificado

Sin esto, cada script ETL reinventa la rueda:
```python
# ❌ Esto en cada script
client = httpx.AsyncClient()
token = get_token()  # ¿y si expiró?
headers = {"Authorization": f"Bearer {token}"}
response = await client.get(url, headers=headers)  # ¿y el rate limit?
data = response.json()["results"]  # ¿y la paginación?
next_cursor = data.get("next_cursor")  # ¿y si no hay?
```

Con el cliente unificado:
```python
# ✅ Esto
api = APIClient.for_notion(api_key="secret_xxx")
records = await api.paginate_all("/v1/databases/{id}/query")
```

---

## Spec de implementación

### Archivo: `api_client.py`

```python
from dataclasses import dataclass
from typing import Any, AsyncIterator

@dataclass
class APIClientConfig:
    """Configuración completa del cliente.
    
    Attributes:
        base_url: URL base de la API (ej: "https://api.notion.com")
        auth_provider: Provider de autenticación (del módulo 01)
        pagination_config: Configuración de paginación (del módulo 02)
        rate_limit_config: Configuración de rate limiting (del módulo 03)
        timeout: Timeout en segundos para cada request. Default 30.
        max_connections: Pool de conexiones máximo. Default 10.
        http2: Habilitar HTTP/2. Default True.
        default_headers: Headers enviados en cada request.
    """
    base_url: str
    auth_provider: AuthProvider | None = None
    pagination_config: PaginationConfig | None = None
    rate_limit_config: RateLimitConfig | None = None
    timeout: float = 30.0
    max_connections: int = 10
    http2: bool = True
    default_headers: dict[str, str] | None = None

class APIClient:
    """Cliente HTTP de producción con auth, paginación y rate limiting.
    
    Características:
    - Connection pooling (reutiliza conexiones TCP)
    - HTTP/2 por defecto
    - Auth automática con refresh
    - Paginación transparente
    - Rate limiting con backoff
    - Circuit breaker
    - Logging estructurado
    - Context manager (async with)
    """
    
    def __init__(self, config: APIClientConfig): ...
    
    # === Context Manager ===
    
    async def __aenter__(self) -> "APIClient": ...
    async def __aexit__(self, *args) -> None: ...
    
    # === Requests básicos ===
    
    async def get(self, path: str, params: dict | None = None, **kwargs) -> dict[str, Any]:
        """GET request con auth y rate limiting automáticos.
        
        Args:
            path: Path relativo al base_url (ej: "/v1/users")
            params: Query parameters
        
        Returns:
            Response JSON parseado.
        
        Raises:
            AuthenticationError: Si la auth falla.
            RateLimitError: Si se exceden los reintentos.
            APIError: Para otros errores HTTP (4xx, 5xx).
        """
        ...
    
    async def post(self, path: str, body: dict | None = None, **kwargs) -> dict[str, Any]:
        """POST request con auth y rate limiting automáticos."""
        ...
    
    async def put(self, path: str, body: dict | None = None, **kwargs) -> dict[str, Any]: ...
    async def patch(self, path: str, body: dict | None = None, **kwargs) -> dict[str, Any]: ...
    async def delete(self, path: str, **kwargs) -> dict[str, Any]: ...
    
    # === Paginación ===
    
    async def paginate(
        self,
        path: str,
        method: str = "GET",
        body: dict | None = None,
        **kwargs,
    ) -> AsyncIterator[dict[str, Any]]:
        """Itera sobre todos los items de un endpoint paginado.
        
        Requiere que pagination_config esté definido.
        """
        ...
    
    async def paginate_all(self, path: str, **kwargs) -> list[dict[str, Any]]:
        """Consume toda la paginación y retorna lista completa."""
        ...
    
    # === Factory methods para APIs conocidas ===
    
    @classmethod
    def for_notion(cls, api_key: str) -> "APIClient":
        """Cliente pre-configurado para Notion API.
        
        - Auth: Bearer token
        - Paginación: Cursor-based (next_cursor)
        - Rate limit: 3 req/s con backoff
        - Version header: Notion-Version: 2022-06-28
        """
        return cls(APIClientConfig(
            base_url="https://api.notion.com",
            auth_provider=ApiKeyProvider(api_key, prefix="Bearer"),
            pagination_config=PaginationConfig(
                pagination_type=PaginationType.CURSOR,
                page_size=100,
                results_key="results",
                cursor_key="next_cursor",
                cursor_param="start_cursor",
            ),
            rate_limit_config=RateLimitConfig(
                max_retries=5,
                base_delay=0.35,
            ),
            default_headers={"Notion-Version": "2022-06-28"},
        ))
    
    @classmethod
    def for_github(cls, token: str) -> "APIClient":
        """Cliente pre-configurado para GitHub REST API."""
        return cls(APIClientConfig(
            base_url="https://api.github.com",
            auth_provider=ApiKeyProvider(token, prefix="Bearer"),
            pagination_config=PaginationConfig(
                pagination_type=PaginationType.LINK_HEADER,
                page_size=100,
                results_key=None,
            ),
            rate_limit_config=RateLimitConfig(
                max_retries=3,
                base_delay=1.0,
            ),
            default_headers={"Accept": "application/vnd.github+json"},
        ))
    
    @classmethod
    def for_airtable(cls, api_key: str) -> "APIClient":
        """Cliente pre-configurado para Airtable API."""
        return cls(APIClientConfig(
            base_url="https://api.airtable.com/v0",
            auth_provider=ApiKeyProvider(api_key, prefix="Bearer"),
            pagination_config=PaginationConfig(
                pagination_type=PaginationType.CURSOR,
                page_size=100,
                results_key="records",
                cursor_key="offset",
                cursor_param="offset",
            ),
            rate_limit_config=RateLimitConfig(
                max_retries=5,
                base_delay=0.2,
            ),
        ))
```

---

## Logging estructurado

Cada request debe loggearse con contexto suficiente para debugging:

```python
logger.info(
    "API Request",
    extra={
        "method": method,
        "url": url,
        "status": response.status_code,
        "duration_ms": elapsed_ms,
        "retry_count": attempt,
        "circuit_state": self._circuit_state.value,
    }
)
```

---

## Error Hierarchy

```python
class APIError(Exception):
    """Base para todos los errores del cliente."""
    def __init__(self, status_code: int, message: str, response_body: dict | None = None):
        self.status_code = status_code
        self.response_body = response_body
        super().__init__(f"HTTP {status_code}: {message}")

class AuthenticationError(APIError):
    """Error de autenticación (401, 403)."""

class NotFoundError(APIError):
    """Recurso no encontrado (404)."""

class ValidationError(APIError):
    """Error de validación del servidor (422)."""

class RateLimitError(APIError):
    """Rate limit excedido (429)."""

class ServerError(APIError):
    """Error del servidor (5xx)."""
```

---

## Tests requeridos

### `test_api_client.py`

1. **test_get_request_with_auth** — Auth headers se inyectan automáticamente
2. **test_post_request_with_body** — Body se serializa como JSON
3. **test_paginate_all_notion** — Simular 3 páginas de Notion → lista completa
4. **test_paginate_iterator** — `async for` funciona correctamente
5. **test_factory_notion** — `for_notion()` tiene la config correcta
6. **test_factory_github** — `for_github()` tiene la config correcta
7. **test_context_manager** — `async with APIClient(config) as client:` funciona
8. **test_error_hierarchy** — 401 → AuthenticationError, 404 → NotFoundError, etc.
9. **test_timeout** — Request que tarda más del timeout → error claro
10. **test_integration_auth_pagination_ratelimit** — Flujo completo con los 3 módulos

---

## Ejemplo end-to-end: Pipeline ETL

```python
async def etl_veterinary_leads():
    """Extrae leads de veterinarias del CRM Airtable → PostgreSQL."""
    
    async with APIClient.for_airtable(api_key=settings.AIRTABLE_API_KEY) as client:
        # Extract
        leads = await client.paginate_all(
            f"/{settings.AIRTABLE_BASE_ID}/Compañias",
        )
        
        # Transform
        cleaned = [transform_lead(lead) for lead in leads]
        
        # Load
        async with get_db_session() as session:
            await bulk_upsert(session, cleaned)
    
    logger.info(f"ETL complete. {len(cleaned)} leads loaded.")
```

Este es el patrón que vas a usar una y otra vez para DentBot, para KanbanPro analytics, para cualquier pipeline nuevo.
