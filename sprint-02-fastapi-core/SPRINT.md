# 🏃 Sprint 02 — FastAPI Core

**Duración:** 2 semanas  
**Prerequisito:** Sprint 01 completado  
**Objetivo:** Construir una API propia con FastAPI que exponga datos, maneje autenticación JWT, y esté lista para conectarse a PostgreSQL + dbt.

---

## Entregables

| # | Módulo | Entregable | Criterio de aceptación |
|---|--------|-----------|----------------------|
| 1 | Fundamentos | App FastAPI con routers, DI, Pydantic schemas | CRUD funcional con validación |
| 2 | Modelos de datos | SQLAlchemy 2.0 + Alembic + PostgreSQL | Migrations automáticas, async sessions |
| 3 | Seguridad | JWT auth + API Keys + CORS + rate limiting server-side | Login flow completo, endpoints protegidos |
| 4 | Documentación | OpenAPI customizado + ReDoc | Docs navegables y correctos |

---

## Definition of Done

- [ ] `uvicorn app.main:app --reload` arranca sin errores
- [ ] Mínimo 5 endpoints funcionales
- [ ] Auth JWT funcional (register, login, protected endpoints)
- [ ] API Keys para acceso programático (MCP, scripts)
- [ ] Migrations con Alembic corriendo
- [ ] Tests con `httpx.AsyncClient` + `pytest-asyncio`
- [ ] OpenAPI docs generados correctamente en `/docs`

---

## Endpoints mínimos del MVP

```
POST   /auth/register       ← Crear usuario
POST   /auth/login           ← Obtener JWT
POST   /auth/refresh         ← Refrescar JWT
GET    /health               ← Health check (público)
GET    /api/v1/projects      ← Listar proyectos (auth requerida)
POST   /api/v1/projects      ← Crear proyecto
GET    /api/v1/projects/{id}  ← Detalle de proyecto
PUT    /api/v1/projects/{id}  ← Actualizar proyecto
DELETE /api/v1/projects/{id}  ← Eliminar proyecto
GET    /api/v1/metrics        ← Métricas (API Key)
```

---

## Orden de implementación

```
Semana 1:
  Día 1-2 → Módulo 01: Fundamentos (routers, schemas, DI)
  Día 3-4 → Módulo 02: PostgreSQL + SQLAlchemy + Alembic
  Día 5   → Integración y tests

Semana 2:
  Día 1-2 → Módulo 03: JWT + API Keys + CORS
  Día 3-4 → Módulo 04: OpenAPI docs + refinamiento
  Día 5   → Tests de integración end-to-end
```

---

## Conexión con Sprint 01

El Sprint 01 te enseñó a CONSUMIR APIs. El Sprint 02 te enseña a CREAR APIs.
Los patterns son el espejo:

| Sprint 01 (consumir) | Sprint 02 (crear) |
|----------------------|-------------------|
| Enviar Bearer token | Validar Bearer token |
| Manejar paginación | Implementar paginación |
| Respetar rate limits | Aplicar rate limits |
| Parsear respuestas JSON | Definir schemas de respuesta |
