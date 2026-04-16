# ⏱️ Módulo 03 — Rate Limits y Resiliencia

## Objetivo

Implementar un sistema de rate limiting client-side con exponential backoff, jitter, y circuit breaker para evitar ser bloqueado por APIs y manejar fallos con gracia.

---

## Conceptos que importan

### Rate Limit Headers (los que te dice el servidor)
```
X-RateLimit-Limit: 100          ← Máximo de requests permitidos
X-RateLimit-Remaining: 23       ← Cuántos te quedan
X-RateLimit-Reset: 1713200000   ← Unix timestamp de cuándo se resetea
Retry-After: 30                 ← Segundos que debes esperar (cuando ya te bloquearon)
```

Cada API usa headers diferentes. Algunos comunes:
- GitHub: `X-RateLimit-*`
- Notion: `Retry-After` (en la respuesta 429)
- Airtable: `X-RateLimit-*`
- Spotify: `Retry-After`

### Exponential Backoff con Jitter
No reintentes inmediatamente. Cada reintento espera más:

```
Intento 1: espera 1s  + random(0, 0.5s)
Intento 2: espera 2s  + random(0, 1.0s)
Intento 3: espera 4s  + random(0, 2.0s)
Intento 4: espera 8s  + random(0, 4.0s)
Intento 5: espera 16s + random(0, 8.0s)  ← máximo, no subir más
```

El jitter (componente random) evita el "thundering herd" — cuando 100 clientes reintentan al mismo segundo.

### Circuit Breaker
Si una API falla repetidamente, deja de llamarla temporalmente:

```
CLOSED (normal)  → Requests pasan normalmente
                    Si hay N fallos consecutivos → OPEN

OPEN (cortado)   → Todos los requests fallan inmediatamente (sin llamar a la API)
                    Después de X segundos → HALF-OPEN

HALF-OPEN        → Permite 1 request de prueba
                    Si funciona → CLOSED
                    Si falla → OPEN otra vez
```

---

## Spec de implementación

### Archivo: `rate_limiter.py`

```python
from dataclasses import dataclass, field
from enum import Enum
import asyncio
import time
import random

class CircuitState(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"

@dataclass
class RateLimitConfig:
    """Configuración del rate limiter.
    
    Attributes:
        max_retries: Número máximo de reintentos. Default 5.
        base_delay: Delay base en segundos para backoff. Default 1.0.
        max_delay: Delay máximo en segundos. Default 60.0.
        jitter_factor: Factor de jitter (0-1). Default 0.5.
        retry_status_codes: Status codes que disparan retry. Default {429, 500, 502, 503, 504}.
        circuit_failure_threshold: Fallos consecutivos para abrir circuito. Default 5.
        circuit_recovery_timeout: Segundos antes de probar half-open. Default 30.
    """
    max_retries: int = 5
    base_delay: float = 1.0
    max_delay: float = 60.0
    jitter_factor: float = 0.5
    retry_status_codes: set[int] = field(default_factory=lambda: {429, 500, 502, 503, 504})
    circuit_failure_threshold: int = 5
    circuit_recovery_timeout: float = 30.0

class RateLimitError(Exception):
    """Se agotaron todos los reintentos."""
    def __init__(self, status_code: int, retry_after: float | None = None):
        self.status_code = status_code
        self.retry_after = retry_after
        super().__init__(
            f"Rate limited (HTTP {status_code}). "
            f"Retry after: {retry_after}s" if retry_after else "Max retries exceeded."
        )

class CircuitOpenError(Exception):
    """El circuit breaker está abierto."""
    def __init__(self, recovery_in: float):
        self.recovery_in = recovery_in
        super().__init__(f"Circuit breaker OPEN. Recovery in {recovery_in:.1f}s")

class ResilientRequester:
    """Wrapper que agrega retry + backoff + circuit breaker a requests HTTP.
    
    Uso:
        config = RateLimitConfig(max_retries=3)
        requester = ResilientRequester(client, config)
        
        response = await requester.request("GET", "https://api.example.com/data")
    """
    
    def __init__(
        self,
        client: httpx.AsyncClient,
        config: RateLimitConfig | None = None,
    ): ...
    
    async def request(
        self,
        method: str,
        url: str,
        **kwargs,
    ) -> httpx.Response:
        """Ejecuta un request con retry automático y circuit breaker.
        
        Lógica:
        1. Verificar circuit breaker → si OPEN, raise CircuitOpenError
        2. Ejecutar request
        3. Si status en retry_status_codes:
           a. Leer Retry-After header (si existe)
           b. Calcular delay con exponential backoff + jitter
           c. Esperar y reintentar
        4. Si excede max_retries → raise RateLimitError
        5. Si request exitoso → resetear circuit breaker counter
        6. Si request falla → incrementar circuit breaker counter
        
        Returns:
            httpx.Response con status code exitoso.
        
        Raises:
            RateLimitError: Todos los reintentos agotados.
            CircuitOpenError: Circuit breaker está abierto.
        """
        ...
    
    def _calculate_delay(self, attempt: int, retry_after: float | None) -> float:
        """Calcula el delay para el siguiente reintento.
        
        Si retry_after viene del servidor, usarlo.
        Si no, usar exponential backoff: min(base * 2^attempt + jitter, max_delay)
        """
        ...
    
    def _extract_retry_after(self, response: httpx.Response) -> float | None:
        """Extrae el valor de Retry-After del response.
        
        Soporta dos formatos:
        - Segundos: "30" → 30.0
        - HTTP-date: "Wed, 15 Apr 2026 10:00:00 GMT" → segundos hasta esa fecha
        """
        ...
    
    @property
    def circuit_state(self) -> CircuitState:
        """Estado actual del circuit breaker."""
        ...
    
    def reset_circuit(self) -> None:
        """Resetea el circuit breaker manualmente."""
        ...
```

---

## Logging requerido

Cada retry debe loggearse para debugging en producción:

```python
import logging

logger = logging.getLogger("api_client.rate_limiter")

# En cada retry:
logger.warning(
    "Rate limited. Attempt %d/%d. Waiting %.1fs. URL: %s. Status: %d",
    attempt, max_retries, delay, url, status_code,
)

# Cuando el circuit se abre:
logger.error(
    "Circuit breaker OPEN for %s. %d consecutive failures. Recovery in %.0fs.",
    url_domain, failure_count, recovery_timeout,
)

# Cuando el circuit se cierra:
logger.info("Circuit breaker CLOSED for %s. Service recovered.", url_domain)
```

---

## Tests requeridos

### `test_rate_limiter.py`

1. **test_successful_request_no_retry** — Status 200 → retorna inmediatamente sin retry
2. **test_retry_on_429** — Status 429 → reintenta con backoff → eventual 200
3. **test_retry_on_500** — Status 500 → reintenta → eventual 200
4. **test_max_retries_exceeded** — 429 siempre → raise `RateLimitError` después de max_retries
5. **test_respects_retry_after_header** — Retry-After: 5 → espera al menos 5 segundos
6. **test_exponential_backoff_delays** — Verificar que los delays crecen exponencialmente
7. **test_jitter_adds_randomness** — Dos ejecuciones → delays diferentes (no determinísticos)
8. **test_circuit_breaker_opens** — 5 fallos consecutivos → CircuitOpenError
9. **test_circuit_breaker_half_open_success** — Circuit OPEN → espera → 1 request exitoso → CLOSED
10. **test_circuit_breaker_half_open_failure** — Circuit OPEN → espera → 1 request falla → OPEN otra vez
11. **test_no_retry_on_400** — Status 400 (client error) → NO reintenta, retorna el error
12. **test_reset_circuit_manual** — `reset_circuit()` → estado vuelve a CLOSED

---

## Integración con el pipeline ETL

En tus pipelines, el rate limiter protege contra:
- Notion API: 3 req/s → sin limiter, tu pipeline crashea al minuto
- Airtable API: 5 req/s → con 500+ registros de veterinarios, necesitas throttling
- GitHub API: 5000 req/hr → suficiente, pero un bug puede quemarlos

```python
# Ejemplo: Extraer todos los leads del CRM Airtable con rate limiting
async def extract_airtable_leads():
    config = RateLimitConfig(
        max_retries=5,
        base_delay=0.2,  # Airtable rate limit es 5/s, entonces ~200ms entre requests
    )
    requester = ResilientRequester(client, config)
    
    # El paginator usa el requester internamente
    paginator = APIPaginator(requester, airtable_config)
    return await paginator.paginate_all(url)
```
