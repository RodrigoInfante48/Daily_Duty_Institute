# 🏃 Sprint 04 — Orquestación y Producción

**Duración:** 2 semanas  
**Prerequisito:** Sprint 03  
**Objetivo:** Containerizar, automatizar CI/CD, monitorear y asegurar todo el stack API en un entorno de producción.

---

## Entregables

| # | Módulo | Entregable | Criterio de aceptación |
|---|--------|-----------|----------------------|
| 1 | Docker | Dockerfile + docker-compose | `docker compose up` levanta todo el stack |
| 2 | CI/CD | GitHub Actions pipeline | Push a main → tests → build → deploy |
| 3 | Monitoring | Health checks + logging + alertas | Detecta fallos en < 5 minutos |
| 4 | Seguridad prod | Secrets management + HTTPS + OWASP basics | Zero secrets en código, HTTPS enforced |

---

## Módulo 01: Docker

### docker-compose.yml (stack completo)
```yaml
services:
  api:
    build: .
    ports: ["8000:8000"]
    env_file: .env
    depends_on: [db, redis]
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  db:
    image: postgres:16-alpine
    volumes: [postgres_data:/var/lib/postgresql/data]
    environment:
      POSTGRES_DB: ddi
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

volumes:
  postgres_data:
```

---

## Módulo 02: CI/CD con GitHub Actions

### Pipeline: `.github/workflows/api.yml`
```
Push a main/PR:
  1. Checkout
  2. Setup Python 3.12
  3. Install deps
  4. Run ruff (lint)
  5. Run mypy (types)
  6. Run pytest (tests)
  7. Build Docker image
  8. (solo main) Push image + deploy
```

---

## Módulo 03: Monitoring

### Health check endpoint
```python
@router.get("/health")
async def health():
    return {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "db": await check_db(),
        "redis": await check_redis(),
        "uptime_seconds": get_uptime(),
    }
```

### Métricas a trackear
- Request count por endpoint
- Response time (p50, p95, p99)
- Error rate
- Cache hit/miss ratio
- Active connections

---

## Módulo 04: Seguridad en producción

### Checklist OWASP para APIs
- [ ] Todas las rutas sensibles requieren auth
- [ ] Rate limiting global (1000 req/min por IP)
- [ ] CORS restrictivo (solo dominios conocidos)
- [ ] Input validation en todos los endpoints (Pydantic)
- [ ] SQL injection prevenido (SQLAlchemy, no raw queries)
- [ ] Secrets en variables de entorno, nunca en código
- [ ] HTTPS enforced (redirect HTTP → HTTPS)
- [ ] Headers de seguridad (X-Content-Type-Options, etc.)
- [ ] Logging de intentos de auth fallidos
- [ ] Dependencias auditadas (`pip audit`)

### Secrets management
```
Desarrollo:  .env (gitignored)
Staging:     GitHub Secrets → env vars en container
Producción:  GitHub Secrets o vault → env vars en container
```

---

## Definition of Done

- [ ] `docker compose up` levanta api + db + redis sin errores
- [ ] GitHub Actions corre tests en cada PR
- [ ] `/health` reporta status de db y redis
- [ ] Zero secrets en el código (verified by `git-secrets` scan)
- [ ] README actualizado con instrucciones de setup
