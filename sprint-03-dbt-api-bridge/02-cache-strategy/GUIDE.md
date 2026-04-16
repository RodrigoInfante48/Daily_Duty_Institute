# ⚡ Módulo 02 — Cache Strategy (Redis)

## Objetivo

Implementar cache con Redis usando el patrón Cache-Aside para reducir la carga en PostgreSQL y acelerar los endpoints de datos dbt.

---

## Por qué Redis para este caso

| Sin cache | Con cache |
|-----------|-----------|
| Cada request → PostgreSQL query | Primer request → PostgreSQL → Redis |
| ~10-50ms por query | ~0.1ms desde Redis |
| 100 requests/min = 100 queries | 100 requests/min = 1 query + 99 cache hits |
| dbt models no cambian entre runs | Cache válido hasta el siguiente dbt run |

---

## Spec de implementación

### Archivo: `app/services/cache_service.py`

```python
"""Cache service con Redis para datos dbt.

Patrón: Cache-Aside (Lazy-Loading)
1. Request llega
2. Check Redis (hit?) → return cached
3. Miss → query PostgreSQL
4. Store in Redis with TTL
5. Return data

Invalidación:
- TTL automático (1 hora default)
- Webhook manual post-dbt-run
- Invalidación por modelo específico
"""

import json
import hashlib
from datetime import timedelta
from redis.asyncio import Redis

class CacheService:
    """Servicio de cache para datos dbt.
    
    Attributes:
        _redis: Conexión async a Redis.
        _default_ttl: TTL default en segundos.
        _prefix: Prefijo para keys. Default "dbt".
        _stats: Contador de hits/misses para métricas.
    """
    
    def __init__(
        self,
        redis: Redis,
        default_ttl: int = 3600,
        prefix: str = "dbt",
    ):
        self._redis = redis
        self._default_ttl = default_ttl
        self._prefix = prefix
        self._stats = {"hits": 0, "misses": 0}
    
    def _build_key(self, model_name: str, params: dict | None = None) -> str:
        """Construye una cache key determinística.
        
        Formato: {prefix}:{model}:{hash_of_params}
        Ejemplo: dbt:dim_veterinary_leads:a1b2c3d4
        
        El hash garantiza que mismos params = misma key,
        sin importar el orden de los dict keys.
        """
        base = f"{self._prefix}:{model_name}"
        if params:
            # Sort keys para determinismo
            sorted_params = json.dumps(params, sort_keys=True)
            param_hash = hashlib.md5(sorted_params.encode()).hexdigest()[:8]
            return f"{base}:{param_hash}"
        return base
    
    async def get(self, model_name: str, params: dict | None = None) -> list[dict] | None:
        """Intenta obtener datos del cache.
        
        Returns:
            Datos deserializados si hay cache hit, None si miss.
        """
        key = self._build_key(model_name, params)
        cached = await self._redis.get(key)
        
        if cached:
            self._stats["hits"] += 1
            return json.loads(cached)
        
        self._stats["misses"] += 1
        return None
    
    async def set(
        self,
        model_name: str,
        data: list[dict],
        params: dict | None = None,
        ttl: int | None = None,
    ) -> None:
        """Almacena datos en cache.
        
        Args:
            model_name: Nombre del modelo dbt.
            data: Datos a cachear (serializables a JSON).
            params: Parámetros de la query (para la key).
            ttl: TTL en segundos. Default usa self._default_ttl.
        """
        key = self._build_key(model_name, params)
        serialized = json.dumps(data, default=str)  # default=str para datetime
        await self._redis.setex(key, ttl or self._default_ttl, serialized)
    
    async def invalidate_model(self, model_name: str) -> int:
        """Invalida TODAS las entries de un modelo.
        
        Busca todas las keys que matchean el patrón:
        {prefix}:{model_name}:*
        
        Returns:
            Número de keys eliminadas.
        """
        pattern = f"{self._prefix}:{model_name}:*"
        keys = []
        async for key in self._redis.scan_iter(match=pattern):
            keys.append(key)
        
        if keys:
            deleted = await self._redis.delete(*keys)
            return deleted
        return 0
    
    async def invalidate_all(self) -> int:
        """Invalida TODO el cache de dbt.
        
        Usar con cuidado — solo post dbt-run completo.
        """
        pattern = f"{self._prefix}:*"
        keys = []
        async for key in self._redis.scan_iter(match=pattern):
            keys.append(key)
        
        if keys:
            return await self._redis.delete(*keys)
        return 0
    
    @property
    def stats(self) -> dict:
        """Retorna estadísticas de cache.
        
        Returns:
            {
                "hits": 150,
                "misses": 23,
                "hit_rate": 0.87,
                "total_requests": 173
            }
        """
        total = self._stats["hits"] + self._stats["misses"]
        return {
            **self._stats,
            "hit_rate": self._stats["hits"] / total if total > 0 else 0,
            "total_requests": total,
        }
    
    async def get_cached_models(self) -> list[dict]:
        """Lista modelos actualmente en cache con sus TTLs.
        
        Returns:
            [
                {"model": "dim_veterinary_leads", "keys": 5, "avg_ttl_seconds": 2400},
                {"model": "fct_dentbot_sessions", "keys": 2, "avg_ttl_seconds": 3200}
            ]
        """
        ...
```

### Integración con DbtService

```python
class CachedDbtService:
    """Wrapper que agrega caching al DbtService.
    
    Sigue el patrón Decorator: misma interfaz que DbtService,
    pero verifica cache antes de ir a DB.
    """
    
    def __init__(self, dbt_service: DbtService, cache: CacheService):
        self._dbt = dbt_service
        self._cache = cache
    
    async def get_model_data(
        self,
        model_name: str,
        filters: dict | None = None,
        sort_by: str | None = None,
        sort_order: str = "DESC",
        page: int = 1,
        page_size: int = 50,
    ) -> tuple[list[dict], int]:
        """Obtiene datos con cache-aside pattern.
        
        1. Construir params dict para cache key
        2. Check cache → hit? return
        3. Miss → llamar a self._dbt.get_model_data()
        4. Store en cache
        5. Return
        """
        params = {
            "filters": filters,
            "sort_by": sort_by,
            "sort_order": sort_order,
            "page": page,
            "page_size": page_size,
        }
        
        # Check cache
        cached = await self._cache.get(model_name, params)
        if cached:
            return cached["data"], cached["total"]
        
        # Cache miss
        data, total = await self._dbt.get_model_data(
            model_name, filters, sort_by, sort_order, page, page_size
        )
        
        # Store in cache
        await self._cache.set(model_name, {"data": data, "total": total}, params)
        
        return data, total
```

### Webhook de invalidación

```python
# app/routers/webhooks.py
router = APIRouter(prefix="/webhooks", tags=["Webhooks"])

@router.post("/dbt-run-complete", summary="Invalidar cache post-dbt-run")
async def dbt_run_complete(
    body: DbtRunWebhookPayload,
    api_key: str = Security(api_key_scheme),
    cache: CacheService = Depends(get_cache),
) -> dict:
    """Webhook llamado después de cada dbt run.
    
    Body:
    {
        "models": ["dim_veterinary_leads", "rpt_monthly_metrics"],
        "run_id": "abc123",
        "status": "success"
    }
    
    Si models está vacío → invalidar todo.
    Si models tiene nombres → invalidar solo esos.
    
    Autenticación: API Key requerida.
    """
    if body.status != "success":
        return {"invalidated": 0, "reason": "Run was not successful"}
    
    if body.models:
        total = 0
        for model in body.models:
            total += await cache.invalidate_model(model)
        return {"invalidated": total, "models": body.models}
    else:
        total = await cache.invalidate_all()
        return {"invalidated": total, "models": "all"}
```

---

## Configuración de dbt para llamar al webhook

### Post-hook en dbt_project.yml
```yaml
# dbt_project.yml
on-run-end:
  - "{{ ddi_notify_api(results) }}"
```

### Macro dbt
```sql
-- macros/ddi_notify_api.sql
{% macro ddi_notify_api(results) %}
  {% set models = [] %}
  {% for result in results %}
    {% if result.status == 'success' %}
      {% do models.append(result.node.name) %}
    {% endif %}
  {% endfor %}
  
  {{ log("Notifying DDI API: " ~ models | join(", "), info=True) }}
  
  -- El webhook se llama con un script Python post-hook
  -- Ver scripts/dbt_post_hook.py
{% endmacro %}
```

---

## Tests requeridos

### `tests/test_cache_service.py`
1. **test_cache_miss_returns_none** — Key no existe → None
2. **test_cache_set_and_get** — Set + Get → datos correctos
3. **test_cache_ttl_respected** — Set con TTL=1s, esperar 2s → None
4. **test_deterministic_keys** — Mismos params en diferente orden → misma key
5. **test_invalidate_model** — Invalidar modelo → todas sus keys eliminadas
6. **test_invalidate_all** — Invalidar todo → zero keys
7. **test_stats_tracking** — 3 hits + 1 miss → hit_rate = 0.75
8. **test_cached_dbt_service_hit** — Cache hit → no llama a DB
9. **test_cached_dbt_service_miss** — Cache miss → llama a DB + cachea resultado
10. **test_webhook_invalidates** — POST webhook → modelo invalidado

---

## Anti-patrones

```python
# ❌ Cache sin TTL
await redis.set(key, data)  # Nunca expira, datos stale para siempre

# ❌ Cache key no determinística
key = f"dbt:{model}:{random.randint(0, 1000)}"  # Nunca va a tener cache hit

# ❌ Serializar objetos no serializables
json.dumps(data)  # Crashea si tiene datetime, Decimal, etc.
# ✅ Usar default=str

# ❌ KEYS * en producción
keys = await redis.keys("*")  # Bloquea Redis si hay millones de keys
# ✅ Usar SCAN
async for key in redis.scan_iter(match=pattern): ...

# ❌ Invalidar en el endpoint en vez de webhook
@router.get("/data")
async def get_data():
    await cache.invalidate_all()  # Invalida en cada request... WTF
```
