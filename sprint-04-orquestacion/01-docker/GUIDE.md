# 🐳 Módulo 01 — Docker

## Objetivo

Containerizar la API y sus dependencias (PostgreSQL, Redis) para que cualquier dev pueda levantar el stack completo con un solo comando.

---

## Archivos a crear

### Archivo: `Dockerfile`

```dockerfile
# Multi-stage build para imagen más liviana

# Stage 1: Builder
FROM python:3.12-slim AS builder

WORKDIR /build

# Instalar dependencias en un layer separado (cache)
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# Stage 2: Runtime
FROM python:3.12-slim AS runtime

WORKDIR /app

# Copiar dependencias del builder
COPY --from=builder /install /usr/local

# Copiar código de la app
COPY app/ ./app/
COPY alembic/ ./alembic/
COPY alembic.ini .

# Non-root user (seguridad)
RUN adduser --disabled-password --gecos '' appuser
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:8000/health').raise_for_status()"

# Exponer puerto
EXPOSE 8000

# Entrypoint: Alembic migrations + Uvicorn
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4"]
```

**Detalles importantes:**
- Multi-stage build: imagen final ~150MB en vez de ~800MB
- Non-root user: el container no corre como root
- Health check: Docker sabe si la app está sana
- Migrations antes de arrancar: DB siempre actualizada
- 4 workers: aprovechar múltiples cores

### Archivo: `docker-compose.yml`

```yaml
version: "3.9"

services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: ddi-api
    ports:
      - "8000:8000"
    env_file: .env
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - ddi-network

  db:
    image: postgres:16-alpine
    container_name: ddi-db
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init.sql
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-ddi}
      POSTGRES_USER: ${POSTGRES_USER:-ddi_user}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-ddi_pass_change_me}
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-ddi_user} -d ${POSTGRES_DB:-ddi}"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    networks:
      - ddi-network

  redis:
    image: redis:7-alpine
    container_name: ddi-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    restart: unless-stopped
    networks:
      - ddi-network

volumes:
  postgres_data:
  redis_data:

networks:
  ddi-network:
    driver: bridge
```

### Archivo: `docker-compose.test.yml`

```yaml
# Override para testing: usa DB in-memory y no persiste datos
version: "3.9"

services:
  api:
    build:
      context: .
      target: builder  # Usa stage con dev dependencies
    command: pytest -v --tb=short
    environment:
      DATABASE_URL: "sqlite+aiosqlite:///:memory:"
      REDIS_URL: "redis://redis:6379/1"
      TESTING: "true"

  redis:
    image: redis:7-alpine
    tmpfs:
      - /data
```

### Archivo: `.dockerignore`

```
.git
.venv
__pycache__
*.pyc
.env
.env.*
*.md
docs/
tests/
.github/
.mypy_cache/
.ruff_cache/
.pytest_cache/
htmlcov/
```

### Archivo: `scripts/init-db.sql`

```sql
-- Script de inicialización de PostgreSQL
-- Se ejecuta SOLO la primera vez que se crea el volumen

-- Crear extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Log
DO $$
BEGIN
    RAISE NOTICE 'DDI Database initialized successfully';
END $$;
```

---

## Comandos de uso

```bash
# Levantar todo el stack
docker compose up -d

# Ver logs
docker compose logs -f api

# Reconstruir imagen después de cambios
docker compose up -d --build api

# Correr tests en container
docker compose -f docker-compose.yml -f docker-compose.test.yml run api

# Acceder a PostgreSQL
docker compose exec db psql -U ddi_user -d ddi

# Acceder a Redis CLI
docker compose exec redis redis-cli

# Parar todo
docker compose down

# Parar y borrar volúmenes (CUIDADO: borra datos)
docker compose down -v
```

---

## Archivo: `.env.example`

```bash
# Base de datos
POSTGRES_DB=ddi
POSTGRES_USER=ddi_user
POSTGRES_PASSWORD=cambiar_en_produccion
DATABASE_URL=postgresql+asyncpg://ddi_user:cambiar_en_produccion@db:5432/ddi

# Redis
REDIS_URL=redis://redis:6379/0

# JWT
JWT_SECRET_KEY=generar-con-openssl-rand-hex-32
JWT_ALGORITHM=HS256

# API
APP_NAME=DDI API
APP_VERSION=0.1.0
DEBUG=false
CORS_ORIGINS=["http://localhost:3000"]
RATE_LIMIT_PER_MINUTE=60

# MCP
DDI_API_KEY=generar-con-python-secrets
```

---

## Tests requeridos

### `tests/test_docker.py` (manual checklist)
1. **test_compose_up** — `docker compose up -d` → todos los containers healthy
2. **test_api_reachable** — `curl http://localhost:8000/health` → 200
3. **test_db_connection** — API puede conectar a PostgreSQL
4. **test_redis_connection** — API puede conectar a Redis
5. **test_migrations_ran** — Tablas existen después de arrancar
6. **test_rebuild_preserves_data** — Rebuild API → datos de DB persisten
