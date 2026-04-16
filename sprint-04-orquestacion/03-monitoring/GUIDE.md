# 📊 Módulo 03 — Monitoring (Logging, Health Checks, Métricas)

## Objetivo

Implementar observabilidad en la API: logging estructurado, health checks detallados, y métricas de rendimiento para detectar problemas antes que los usuarios.

---

## Los tres pilares de la observabilidad

```
1. LOGS     → ¿Qué pasó?        → Structured JSON logging
2. METRICS  → ¿Cómo va?         → Counters, histograms, gauges
3. HEALTH   → ¿Está vivo?       → Health check endpoints
```

---

## Spec de implementación

### Archivo: `app/core/logging_config.py`

```python
"""Configuración de logging estructurado en JSON.

¿Por qué JSON y no texto plano?
- Parseables por herramientas (CloudWatch, Datadog, ELK)
- Filtrables por campo (level, endpoint, duration_ms)
- Agregables para métricas
"""

import logging
import json
import sys
from datetime import datetime, timezone

class JSONFormatter(logging.Formatter):
    """Formatea logs como JSON lines.
    
    Output:
    {"timestamp": "2026-04-15T10:30:00Z", "level": "INFO", "message": "Request completed",
     "method": "GET", "path": "/api/v1/projects", "status": 200, "duration_ms": 45}
    """
    
    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        
        # Agregar campos extra si existen
        if hasattr(record, "method"):
            log_entry["method"] = record.method
        if hasattr(record, "path"):
            log_entry["path"] = record.path
        if hasattr(record, "status"):
            log_entry["status"] = record.status
        if hasattr(record, "duration_ms"):
            log_entry["duration_ms"] = record.duration_ms
        if hasattr(record, "user_id"):
            log_entry["user_id"] = record.user_id
        if hasattr(record, "error"):
            log_entry["error"] = record.error
        
        # Incluir traceback si hay excepción
        if record.exc_info:
            log_entry["traceback"] = self.formatException(record.exc_info)
        
        return json.dumps(log_entry, default=str)

def setup_logging(debug: bool = False) -> None:
    """Configura logging para toda la aplicación.
    
    - Nivel: DEBUG si debug=True, INFO si no
    - Formato: JSON
    - Output: stdout (para Docker logs)
    - Silencia loggers ruidosos (uvicorn.access, sqlalchemy.engine)
    """
    level = logging.DEBUG if debug else logging.INFO
    
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JSONFormatter())
    
    root_logger = logging.getLogger()
    root_logger.setLevel(level)
    root_logger.handlers = [handler]
    
    # Silenciar loggers ruidosos
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
```

### Archivo: `app/middleware/request_logging.py`

```python
"""Middleware que loggea cada request con métricas de rendimiento."""

import time
import logging
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("api.requests")

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Loggea cada request con: method, path, status, duration.
    
    Excluye paths de health check y docs para no llenar los logs.
    """
    
    EXCLUDE_PATHS = {"/health", "/docs", "/redoc", "/openapi.json", "/favicon.ico"}
    
    async def dispatch(self, request: Request, call_next) -> Response:
        if request.url.path in self.EXCLUDE_PATHS:
            return await call_next(request)
        
        start_time = time.perf_counter()
        
        response = await call_next(request)
        
        duration_ms = (time.perf_counter() - start_time) * 1000
        
        logger.info(
            "Request completed",
            extra={
                "method": request.method,
                "path": request.url.path,
                "status": response.status_code,
                "duration_ms": round(duration_ms, 2),
                "client_ip": request.client.host if request.client else "unknown",
            },
        )
        
        # Header con tiempo de respuesta
        response.headers["X-Response-Time-Ms"] = str(round(duration_ms, 2))
        
        return response
```

### Archivo: `app/services/metrics_service.py`

```python
"""Servicio de métricas in-memory.

Para producción seria mejor Prometheus + Grafana,
pero esto funciona para monitoreo básico vía endpoint.
"""

import time
from collections import defaultdict
from dataclasses import dataclass, field

@dataclass
class EndpointMetrics:
    """Métricas por endpoint."""
    request_count: int = 0
    error_count: int = 0
    total_duration_ms: float = 0
    min_duration_ms: float = float("inf")
    max_duration_ms: float = 0
    status_codes: dict[int, int] = field(default_factory=lambda: defaultdict(int))

class MetricsCollector:
    """Colector de métricas de la API.
    
    Trackea por endpoint:
    - Request count
    - Error count (4xx, 5xx)
    - Response time (avg, min, max, p95)
    - Status code distribution
    
    Uso:
        metrics = MetricsCollector()
        metrics.record("GET /api/v1/projects", 200, 45.2)
        metrics.record("GET /api/v1/projects", 500, 120.5)
        
        report = metrics.get_report()
    """
    
    def __init__(self):
        self._metrics: dict[str, EndpointMetrics] = defaultdict(EndpointMetrics)
        self._start_time = time.time()
        self._durations: dict[str, list[float]] = defaultdict(list)
    
    def record(self, endpoint: str, status_code: int, duration_ms: float) -> None:
        """Registra una request completada."""
        m = self._metrics[endpoint]
        m.request_count += 1
        m.total_duration_ms += duration_ms
        m.min_duration_ms = min(m.min_duration_ms, duration_ms)
        m.max_duration_ms = max(m.max_duration_ms, duration_ms)
        m.status_codes[status_code] += 1
        
        if status_code >= 400:
            m.error_count += 1
        
        # Guardar duraciones para percentiles (max 1000 últimas)
        durations = self._durations[endpoint]
        durations.append(duration_ms)
        if len(durations) > 1000:
            durations.pop(0)
    
    def get_report(self) -> dict:
        """Genera reporte completo de métricas.
        
        Returns:
            {
                "uptime_seconds": 3600,
                "total_requests": 1500,
                "total_errors": 23,
                "error_rate": 0.015,
                "endpoints": {
                    "GET /api/v1/projects": {
                        "requests": 500,
                        "errors": 3,
                        "avg_ms": 42.5,
                        "p95_ms": 120.0,
                        "min_ms": 5.0,
                        "max_ms": 250.0
                    }
                }
            }
        """
        ...
    
    def get_p95(self, endpoint: str) -> float:
        """Calcula el percentil 95 de response time para un endpoint."""
        durations = sorted(self._durations.get(endpoint, []))
        if not durations:
            return 0
        index = int(len(durations) * 0.95)
        return durations[min(index, len(durations) - 1)]
```

### Archivo: `app/routers/health.py` (actualizado)

```python
router = APIRouter(tags=["Health"])

@router.get("/health", summary="Health Check básico")
async def health_check(
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
) -> dict:
    """Health check con verificación de dependencias.
    
    Returns:
        {
            "status": "healthy" | "degraded" | "unhealthy",
            "version": "0.1.0",
            "uptime_seconds": 3600,
            "checks": {
                "database": {"status": "up", "latency_ms": 2.3},
                "redis": {"status": "up", "latency_ms": 0.5}
            }
        }
    
    Status logic:
    - Todos up → "healthy"
    - Redis down pero DB up → "degraded" (funciona sin cache)
    - DB down → "unhealthy"
    """
    checks = {}
    
    # Check PostgreSQL
    try:
        start = time.perf_counter()
        await db.execute(text("SELECT 1"))
        db_latency = (time.perf_counter() - start) * 1000
        checks["database"] = {"status": "up", "latency_ms": round(db_latency, 2)}
    except Exception as e:
        checks["database"] = {"status": "down", "error": str(e)}
    
    # Check Redis
    try:
        start = time.perf_counter()
        await redis.ping()
        redis_latency = (time.perf_counter() - start) * 1000
        checks["redis"] = {"status": "up", "latency_ms": round(redis_latency, 2)}
    except Exception as e:
        checks["redis"] = {"status": "down", "error": str(e)}
    
    # Determine overall status
    db_up = checks["database"]["status"] == "up"
    redis_up = checks["redis"]["status"] == "up"
    
    if db_up and redis_up:
        status = "healthy"
    elif db_up:
        status = "degraded"
    else:
        status = "unhealthy"
    
    status_code = 200 if status != "unhealthy" else 503
    
    return JSONResponse(
        status_code=status_code,
        content={
            "status": status,
            "version": settings.APP_VERSION,
            "uptime_seconds": round(time.time() - app_start_time),
            "checks": checks,
        },
    )

@router.get("/metrics", summary="Métricas de la API", tags=["Monitoring"])
async def get_metrics(
    user: User = Depends(get_current_superuser),  # Solo admin
    metrics: MetricsCollector = Depends(get_metrics),
) -> dict:
    """Retorna métricas de rendimiento de todos los endpoints."""
    return metrics.get_report()
```

---

## Tests requeridos

### `tests/test_monitoring.py`
1. **test_health_all_up** — DB y Redis up → status "healthy", HTTP 200
2. **test_health_redis_down** — Redis down → status "degraded", HTTP 200
3. **test_health_db_down** — DB down → status "unhealthy", HTTP 503
4. **test_request_logging** — Request → log entry con method, path, status, duration
5. **test_metrics_collection** — 10 requests → metrics reflejan count correcto
6. **test_metrics_p95** — 100 requests con duraciones variadas → p95 correcto
7. **test_metrics_error_rate** — 5 errores de 100 requests → error_rate = 0.05
8. **test_json_log_format** — Log output es JSON parseable
