# 🏃 Sprint 03 — dbt-API Bridge + MCP Integration

**Duración:** 2 semanas  
**Prerequisito:** Sprint 02 + dbt basics  
**Objetivo:** Conectar los modelos dbt con la API FastAPI y crear un bridge para servidores MCP.

---

## El concepto clave: dbt como motor, FastAPI como interfaz

```
dbt models (SQL)          →  PostgreSQL (materialized)  →  FastAPI (exposed)
                                                              │
                                                    ┌─────────┼─────────┐
                                                    │         │         │
                                                 Power BI   MCP     DentBot
                                                           Servers
```

**dbt transforma, FastAPI sirve.** La API no ejecuta queries complejas — lee las tablas ya transformadas por dbt.

---

## Entregables

| # | Módulo | Entregable | Criterio de aceptación |
|---|--------|-----------|----------------------|
| 1 | dbt Exposures | Endpoints que sirven datos de modelos dbt | Datos correctos, metadata expuesta |
| 2 | Cache Strategy | Redis cache con invalidación por dbt run | Hit rate > 80% en queries repetidos |
| 3 | MCP Integration | FastAPI ↔ MCP server bridge | Claude puede consumir datos via MCP |

---

## Módulo 01: dbt Exposures via API

### Concepto
Los `exposures` en dbt documentan quién consume cada modelo. Tu API es un consumer:

```yaml
# dbt project: models/exposures.yml
exposures:
  - name: fastapi_leads_endpoint
    type: application
    maturity: high
    url: https://api.dailyduty.co/v1/leads
    depends_on:
      - ref('dim_veterinary_leads')
    owner:
      name: Rod
      email: rod@dailyduty.co
```

### Endpoints a crear
```
GET  /api/v1/dbt/models                 ← Lista modelos dbt disponibles
GET  /api/v1/dbt/models/{model}/data    ← Datos del modelo (con paginación)
GET  /api/v1/dbt/models/{model}/meta    ← Metadata: columns, freshness, row count
GET  /api/v1/dbt/freshness              ← Freshness de todos los modelos
POST /api/v1/dbt/query                  ← Query parametrizado (filtros, sort, limit)
```

---

## Módulo 02: Cache Strategy

### Por qué Redis
- dbt run se ejecuta cada X horas (no en cada request)
- Los mismos queries se repiten (dashboard refresh, MCP queries)
- Redis: ~0.1ms. PostgreSQL: ~10-50ms. 100x más rápido.

### Patrón: Cache-Aside con Webhook Invalidation

```python
async def get_model_data(model_name: str, filters: dict) -> list[dict]:
    cache_key = f"dbt:{model_name}:{hash(filters)}"
    
    # 1. Try cache
    cached = await redis.get(cache_key)
    if cached:
        return json.loads(cached)
    
    # 2. Cache miss → query PostgreSQL
    data = await query_dbt_model(model_name, filters)
    
    # 3. Set cache with TTL
    await redis.setex(cache_key, ttl=3600, value=json.dumps(data))
    
    return data

# Webhook endpoint para invalidar cache después de dbt run
@router.post("/api/v1/dbt/invalidate-cache")
async def invalidate_cache(model_names: list[str]):
    for model in model_names:
        keys = await redis.keys(f"dbt:{model}:*")
        if keys:
            await redis.delete(*keys)
    return {"invalidated": model_names}
```

---

## Módulo 03: MCP Integration

### El bridge: FastAPI como backend de MCP

Tu DataPocket MCP server puede llamar a tu FastAPI en lugar de hacer queries SQL directos:

```
Claude → MCP Server (DataPocket) → FastAPI → Redis/PostgreSQL
```

### Ventajas del bridge
- MCP server se mantiene simple (solo HTTP calls)
- FastAPI maneja auth, cache, rate limiting
- Un solo punto de acceso a los datos

### Endpoint especial para MCP
```
POST /api/v1/mcp/query
{
    "tool": "get_dashboard_data",
    "params": {
        "model": "dim_veterinary_leads",
        "filters": {"city": "Bogotá"},
        "limit": 50
    }
}
```

### MCP Server actualizado (conceptual)
```python
@mcp.tool
async def get_dashboard_data(model: str, filters: dict) -> str:
    """Obtiene datos de un modelo dbt via la API DDI."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{DDI_API_URL}/api/v1/mcp/query",
            json={"tool": "get_dashboard_data", "params": {"model": model, "filters": filters}},
            headers={"X-API-Key": DDI_API_KEY},
        )
    return response.json()
```

---

## Definition of Done

- [ ] Al menos 3 modelos dbt expuestos via API
- [ ] Cache Redis funcionando con hit rate medible
- [ ] Webhook de invalidación testeado
- [ ] MCP server puede consumir datos via FastAPI
- [ ] Tests de integración pasando
