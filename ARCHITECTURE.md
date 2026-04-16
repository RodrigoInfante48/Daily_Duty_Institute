# 🏛️ ARCHITECTURE.md — Decisiones de Arquitectura

## ADR-001: httpx como cliente HTTP principal

**Estado:** Aceptado  
**Fecha:** 2026-04-15  
**Contexto:** Necesitamos un cliente HTTP que soporte async, sesiones persistentes, HTTP/2 y sea compatible con el patrón de retry/backoff que usamos en ETL.  
**Decisión:** Usar `httpx` en lugar de `requests`.  
**Razones:**
- Soporte nativo para async/await (critical para pipelines concurrentes)
- API compatible con `requests` (baja curva de aprendizaje)
- Soporte HTTP/2 out-of-the-box
- Mejor integración con `pytest` via `httpx.AsyncClient`
- `requests` no soporta async nativamente

**Consecuencias:**
- Todas las interacciones HTTP usan `httpx`
- Los devs deben entender async/await básico

---

## ADR-002: FastAPI como framework de API

**Estado:** Aceptado  
**Fecha:** 2026-04-15  
**Contexto:** Necesitamos un framework para exponer datos transformados por dbt y servir como bridge para MCP servers.  
**Decisión:** Usar `FastAPI`.  
**Razones:**
- Validación automática con Pydantic v2 (ya lo usamos en DataPocket MCP)
- OpenAPI docs auto-generados
- Rendimiento superior (Starlette + Uvicorn)
- Dependency injection nativo (perfecto para auth, DB sessions)
- Ecosistema compatible con nuestro stack Python

**Consecuencias:**
- API docs disponibles en `/docs` y `/redoc` automáticamente
- Schemas de request/response siempre validados

---

## ADR-003: Estrategia de autenticación en capas

**Estado:** Aceptado  
**Fecha:** 2026-04-15  
**Contexto:** Diferentes consumidores necesitan diferentes niveles de auth.  
**Decisión:** Implementar tres niveles de autenticación:

| Nivel | Método | Caso de uso |
|-------|--------|-------------|
| Público | Sin auth | Health checks, docs |
| API Key | Header `X-API-Key` | MCP servers, scripts internos |
| JWT Bearer | OAuth2 + JWT | Usuarios finales, dashboards |

**Consecuencias:**
- Cada endpoint declara su nivel de auth via dependency injection
- API keys se almacenan hasheadas en PostgreSQL
- JWT tokens con rotación automática (access: 30min, refresh: 7d)

---

## ADR-004: Cache strategy con Redis

**Estado:** Propuesto  
**Fecha:** 2026-04-15  
**Contexto:** Los modelos dbt se ejecutan en schedule (cada X horas). No tiene sentido re-ejecutar queries en cada request API.  
**Decisión:** Redis como cache layer entre PostgreSQL y FastAPI.  
**Patrón:** Cache-aside con TTL basado en el schedule de dbt.

```
Request → FastAPI → Redis (hit?) → Response
                        │ (miss)
                        ▼
                   PostgreSQL → Redis (set) → Response
```

**Consecuencias:**
- Cache invalidation manual cuando dbt run completa (webhook)
- TTL default: 1 hora (configurable por endpoint)
- Métricas de hit/miss ratio para monitoreo

---

## ADR-005: Estructura de paquetes tipo módulo

**Estado:** Aceptado  
**Fecha:** 2026-04-15  
**Contexto:** El proyecto crecerá con múltiples endpoints y dominios.  
**Decisión:** Estructura modular con routers separados por dominio.

```
app/
├── main.py              ← Application factory
├── core/
│   ├── config.py        ← Pydantic BaseSettings
│   ├── security.py      ← Auth dependencies
│   └── database.py      ← Session factory
├── routers/
│   ├── health.py        ← Health checks
│   ├── dbt_models.py    ← Endpoints de datos dbt
│   └── mcp_bridge.py    ← Bridge para MCP
├── models/              ← SQLAlchemy models
├── schemas/             ← Pydantic schemas
└── services/            ← Business logic
```

**Consecuencias:**
- Cada dominio es independiente y testeable
- Nuevos endpoints = nuevo router file + registro en main

---

## Cómo agregar un nuevo ADR

1. Incrementar el número: `ADR-00X`
2. Incluir: Estado, Fecha, Contexto, Decisión, Razones, Consecuencias
3. Estados válidos: `Propuesto`, `Aceptado`, `Deprecado`, `Reemplazado por ADR-XXX`
