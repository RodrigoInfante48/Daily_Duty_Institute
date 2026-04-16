# 🏗️ API Mastery Roadmap — Daily Duty Institute

**Autor:** Rodrigo Infante | **Stack:** Python · FastAPI · PostgreSQL · dbt · Power BI · MCP  
**Filosofía:** Kaizen — mejora continua. Cada sprint entrega valor funcional.

---

## Qué es esto

Un roadmap práctico y ejecutable para dominar APIs desde tres ángulos:

1. **Consumo avanzado** — Extraer datos de cualquier API con Python como un pro (paginación, OAuth, rate limits, retry logic).
2. **Creación de APIs propias** — Exponer datos transformados por dbt vía FastAPI y conectar servidores MCP.
3. **Orquestación en producción** — Asegurar, monitorear y escalar las conexiones en entornos reales.

---

## Estructura del repo

```
api-mastery/
├── README.md                          ← Estás aquí
├── ARCHITECTURE.md                    ← Decisiones de arquitectura (ADRs)
├── CONTRIBUTING.md                    ← Guía para devs (Qwen, Gemini, contributors)
│
├── sprint-01-consumo-avanzado/
│   ├── SPRINT.md                      ← Objetivos, entregables, criterios de aceptación
│   ├── 01-autenticacion/
│   │   ├── GUIDE.md                   ← Guía: API Keys, Bearer, OAuth2
│   │   ├── oauth2_flow.py             ← Implementación OAuth2 con PKCE
│   │   ├── token_manager.py           ← Refresh automático de tokens
│   │   └── tests/
│   ├── 02-paginacion/
│   │   ├── GUIDE.md                   ← Guía: cursor, offset, keyset pagination
│   │   ├── paginator.py               ← Clase genérica de paginación
│   │   └── tests/
│   ├── 03-rate-limits/
│   │   ├── GUIDE.md                   ← Guía: backoff, retry, circuit breaker
│   │   ├── rate_limiter.py            ← Rate limiter con token bucket
│   │   └── tests/
│   └── 04-cliente-http-produccion/
│       ├── GUIDE.md                   ← Guía: sesiones, timeouts, logging
│       ├── api_client.py              ← Cliente HTTP robusto (httpx)
│       └── tests/
│
├── sprint-02-fastapi-core/
│   ├── SPRINT.md
│   ├── 01-fundamentos/
│   │   ├── GUIDE.md                   ← Guía: routers, Pydantic, dependency injection
│   │   └── app/
│   ├── 02-modelos-datos/
│   │   ├── GUIDE.md                   ← Guía: SQLAlchemy + Alembic + PostgreSQL
│   │   └── app/
│   ├── 03-seguridad/
│   │   ├── GUIDE.md                   ← Guía: JWT, CORS, rate limiting server-side
│   │   └── app/
│   └── 04-documentacion/
│       ├── GUIDE.md                   ← Guía: OpenAPI, Swagger, ReDoc
│       └── app/
│
├── sprint-03-dbt-api-bridge/
│   ├── SPRINT.md
│   ├── 01-dbt-exposures/
│   │   ├── GUIDE.md                   ← Guía: exponer modelos dbt via API
│   │   └── app/
│   ├── 02-cache-strategy/
│   │   ├── GUIDE.md                   ← Guía: Redis, cache invalidation
│   │   └── app/
│   └── 03-mcp-integration/
│       ├── GUIDE.md                   ← Guía: conectar FastAPI ↔ MCP servers
│       └── app/
│
├── sprint-04-orquestacion/
│   ├── SPRINT.md
│   ├── 01-docker/
│   │   ├── GUIDE.md                   ← Guía: containerización de la API
│   │   └── Dockerfile
│   ├── 02-ci-cd/
│   │   ├── GUIDE.md                   ← Guía: GitHub Actions, tests, deploy
│   │   └── .github/
│   ├── 03-monitoring/
│   │   ├── GUIDE.md                   ← Guía: logging, health checks, alertas
│   │   └── app/
│   └── 04-seguridad-produccion/
│       ├── GUIDE.md                   ← Guía: secrets management, HTTPS, OWASP
│       └── app/
│
├── shared/
│   ├── config.py                      ← Settings con Pydantic BaseSettings
│   ├── exceptions.py                  ← Custom exceptions
│   └── schemas/                       ← Schemas compartidos
│
└── docs/
    ├── GLOSSARY.md                    ← Glosario técnico API
    ├── PATTERNS.md                    ← Patrones de diseño recurrentes
    └── DECISION_LOG.md                ← Log de decisiones técnicas
```

---

## Sprints

| Sprint | Tema | Duración | Prerequisito |
|--------|------|----------|--------------|
| 01 | Consumo avanzado de APIs | 2 semanas | Python intermedio |
| 02 | FastAPI core | 2 semanas | Sprint 01 |
| 03 | dbt + API Bridge + MCP | 2 semanas | Sprint 02 + dbt basics |
| 04 | Orquestación y producción | 2 semanas | Sprint 03 |

---

## Cómo usar este repo

### Si eres Rod (Tech Lead / Arquitecto)
1. Revisa el `SPRINT.md` de cada sprint antes de empezar
2. Lee las `GUIDE.md` — son tu spec técnica
3. Asigna implementaciones a Qwen/Gemini con contexto claro

### Si eres un dev (Qwen, Gemini, contributor)
1. Lee `CONTRIBUTING.md` primero
2. Abre el `SPRINT.md` del sprint actual
3. Implementa siguiendo la `GUIDE.md` correspondiente
4. Tests obligatorios antes de PR

---

## Stack técnico

| Componente | Tecnología | Propósito |
|-----------|------------|-----------|
| HTTP Client | `httpx` | Consumo async de APIs |
| API Framework | `FastAPI` | Creación de APIs propias |
| ORM | `SQLAlchemy 2.0` | Acceso a PostgreSQL |
| Migrations | `Alembic` | Schema migrations |
| Validation | `Pydantic v2` | Input/output validation |
| Auth | `python-jose` + `passlib` | JWT + hashing |
| Cache | `Redis` | Cache de queries dbt |
| Transform | `dbt` | Transformación de datos |
| MCP | `FastMCP` | Servidores MCP propios |
| Testing | `pytest` + `httpx` | Unit + integration tests |
| CI/CD | `GitHub Actions` | Automatización |
| Container | `Docker` | Deployment |

---

## Conexión con el ecosistema DDI

```
                    ┌─────────────────┐
                    │   APIs externas  │
                    │ (Notion, Gemini, │
                    │  Airtable, etc.) │
                    └────────┬────────┘
                             │
                    Sprint 01: Consumo
                             │
                    ┌────────▼────────┐
                    │   Python ETL    │
                    │  (httpx client) │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   PostgreSQL    │
                    │  (Data Warehouse)│
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │      dbt        │
                    │ (Transformación)│
                    └────────┬────────┘
                             │
                Sprint 03: dbt-API Bridge
                             │
                    ┌────────▼────────┐
                    │    FastAPI      │◄── Sprint 02: Core
                    │  (Tu propia API)│
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
     ┌────────▼───┐  ┌──────▼─────┐  ┌─────▼──────┐
     │ MCP Servers │  │  Power BI  │  │  DentBot   │
     │ (Claude)    │  │ (Dashboards)│  │ (Clientes) │
     └─────────────┘  └────────────┘  └────────────┘
```

---

## Licencia

MIT — Daily Duty Institute © 2026
