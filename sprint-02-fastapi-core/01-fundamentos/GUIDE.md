# ⚡ Módulo 01 — Fundamentos FastAPI

## Objetivo

Construir la estructura base de la API: application factory, routers por dominio, dependency injection, y schemas Pydantic v2 para validación automática.

---

## Estructura del proyecto

```
app/
├── __init__.py
├── main.py                  ← Application factory + lifespan
├── core/
│   ├── __init__.py
│   ├── config.py            ← Pydantic BaseSettings
│   └── dependencies.py      ← Dependencies compartidas
├── routers/
│   ├── __init__.py
│   ├── health.py            ← Health check (público)
│   └── projects.py          ← CRUD de proyectos
├── schemas/
│   ├── __init__.py
│   ├── base.py              ← Schemas base reutilizables
│   └── projects.py          ← Schemas de proyectos
└── services/
    ├── __init__.py
    └── project_service.py   ← Lógica de negocio
```

---

## Spec de implementación

### Archivo: `app/core/config.py`

```python
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    """Configuración centralizada cargada desde .env.
    
    Attributes:
        APP_NAME: Nombre de la aplicación.
        APP_VERSION: Versión semántica.
        DEBUG: Modo debug (nunca True en producción).
        DATABASE_URL: Connection string de PostgreSQL.
        REDIS_URL: Connection string de Redis.
        JWT_SECRET_KEY: Secreto para firmar JWT tokens.
        JWT_ALGORITHM: Algoritmo de firma. Default HS256.
        JWT_ACCESS_TOKEN_EXPIRE_MINUTES: Expiración del access token. Default 30.
        JWT_REFRESH_TOKEN_EXPIRE_DAYS: Expiración del refresh token. Default 7.
        API_KEY_HEADER: Nombre del header para API Keys. Default X-API-Key.
        CORS_ORIGINS: Lista de orígenes permitidos.
        RATE_LIMIT_PER_MINUTE: Requests por minuto por IP. Default 60.
    """
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )
    
    APP_NAME: str = "DDI API"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False
    
    DATABASE_URL: str = "postgresql+asyncpg://user:pass@localhost:5432/ddi"
    REDIS_URL: str = "redis://localhost:6379/0"
    
    JWT_SECRET_KEY: str = "CHANGE-ME-IN-PRODUCTION"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    API_KEY_HEADER: str = "X-API-Key"
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]
    RATE_LIMIT_PER_MINUTE: int = 60


def get_settings() -> Settings:
    """Singleton de settings. Cachear con lru_cache si se necesita."""
    return Settings()
```

### Archivo: `app/main.py`

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup y shutdown de la aplicación.
    
    Startup:
    - Inicializar pool de PostgreSQL
    - Conectar a Redis
    - Log: "DDI API v{version} started"
    
    Shutdown:
    - Cerrar pool de PostgreSQL
    - Cerrar conexión Redis
    - Log: "DDI API shutting down"
    """
    # startup
    yield
    # shutdown

def create_app() -> FastAPI:
    """Application factory.
    
    1. Crear instancia FastAPI con metadata
    2. Agregar CORS middleware
    3. Registrar routers
    4. Retornar app
    
    Metadata para OpenAPI:
    - title: settings.APP_NAME
    - version: settings.APP_VERSION
    - description: "API de Daily Duty Institute — datos transformados, expuestos, conectados."
    - docs_url: "/docs"
    - redoc_url: "/redoc"
    """
    settings = get_settings()
    
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        lifespan=lifespan,
    )
    
    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Routers
    app.include_router(health_router)
    app.include_router(projects_router, prefix="/api/v1")
    
    return app

app = create_app()
```

### Archivo: `app/schemas/base.py`

```python
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class BaseSchema(BaseModel):
    """Schema base con configuración común."""
    model_config = ConfigDict(
        from_attributes=True,      # Permite crear desde ORM objects
        populate_by_name=True,     # Permite usar alias o nombre del campo
        str_strip_whitespace=True, # Strip whitespace automático en strings
    )

class TimestampMixin(BaseModel):
    """Mixin para timestamps automáticos."""
    created_at: datetime
    updated_at: datetime

class PaginatedResponse(BaseModel):
    """Response wrapper para endpoints paginados.
    
    Attributes:
        items: Lista de resultados.
        total: Total de registros (sin paginar).
        page: Página actual (1-indexed).
        page_size: Items por página.
        total_pages: Total de páginas calculado.
    """
    items: list
    total: int
    page: int
    page_size: int
    total_pages: int
    
    @classmethod
    def create(cls, items: list, total: int, page: int, page_size: int) -> "PaginatedResponse":
        """Factory method que calcula total_pages automáticamente."""
        import math
        return cls(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=math.ceil(total / page_size) if page_size > 0 else 0,
        )
```

### Archivo: `app/schemas/projects.py`

```python
from datetime import datetime
from pydantic import Field
from enum import Enum

class ProjectStatus(str, Enum):
    DEFINE = "define"
    MEASURE = "measure"
    ANALYZE = "analyze"
    IMPROVE = "improve"
    CONTROL = "control"
    COMPLETED = "completed"

class ProjectCreate(BaseSchema):
    """Schema para crear un proyecto.
    
    Validaciones:
    - name: 3-100 caracteres, requerido
    - description: opcional, máximo 500 caracteres
    - status: default DEFINE
    - industry: opcional (gym, veterinaria, estetica, restaurante, etc.)
    """
    name: str = Field(..., min_length=3, max_length=100, examples=["Optimización Citas Veterinaria"])
    description: str | None = Field(None, max_length=500)
    status: ProjectStatus = ProjectStatus.DEFINE
    industry: str | None = Field(None, max_length=50, examples=["veterinaria"])

class ProjectUpdate(BaseSchema):
    """Schema para actualizar un proyecto. Todos los campos opcionales."""
    name: str | None = Field(None, min_length=3, max_length=100)
    description: str | None = Field(None, max_length=500)
    status: ProjectStatus | None = None
    industry: str | None = Field(None, max_length=50)

class ProjectResponse(BaseSchema, TimestampMixin):
    """Schema de respuesta para un proyecto."""
    id: int
    name: str
    description: str | None
    status: ProjectStatus
    industry: str | None
    owner_id: int
```

### Archivo: `app/routers/health.py`

```python
from fastapi import APIRouter

router = APIRouter(tags=["Health"])

@router.get("/health", summary="Health Check", description="Verifica que la API y sus dependencias estén funcionando.")
async def health_check() -> dict:
    """Retorna estado de salud de la API.
    
    Response:
    {
        "status": "healthy",
        "version": "0.1.0",
        "services": {
            "database": "connected" | "disconnected",
            "redis": "connected" | "disconnected"
        }
    }
    """
    ...
```

### Archivo: `app/routers/projects.py`

```python
from fastapi import APIRouter, Depends, HTTPException, Query

router = APIRouter(prefix="/projects", tags=["Projects"])

@router.get("/", summary="Listar proyectos")
async def list_projects(
    page: int = Query(1, ge=1, description="Número de página"),
    page_size: int = Query(20, ge=1, le=100, description="Items por página"),
    status: ProjectStatus | None = Query(None, description="Filtrar por fase DMAIC"),
    industry: str | None = Query(None, description="Filtrar por industria"),
    # user: User = Depends(get_current_user),  ← Se agrega en Sprint 02 Módulo 03
) -> PaginatedResponse:
    """Lista proyectos del usuario con paginación y filtros.
    
    Implementación:
    1. Construir query base filtrado por owner_id
    2. Aplicar filtros opcionales (status, industry)
    3. Contar total
    4. Aplicar offset + limit
    5. Retornar PaginatedResponse
    """
    ...

@router.post("/", status_code=201, summary="Crear proyecto")
async def create_project(
    project: ProjectCreate,
    # user: User = Depends(get_current_user),
) -> ProjectResponse:
    """Crea un nuevo proyecto DMAIC.
    
    Implementación:
    1. Validar input (Pydantic lo hace automáticamente)
    2. Crear registro en DB
    3. Retornar ProjectResponse con id y timestamps
    """
    ...

@router.get("/{project_id}", summary="Detalle de proyecto")
async def get_project(project_id: int) -> ProjectResponse:
    """Retorna un proyecto por ID.
    
    Si no existe → 404 con mensaje claro.
    Si existe pero no es del usuario → 403.
    """
    ...

@router.put("/{project_id}", summary="Actualizar proyecto")
async def update_project(project_id: int, project: ProjectUpdate) -> ProjectResponse:
    """Actualiza campos de un proyecto.
    
    Solo actualiza campos que vienen en el body (partial update).
    Usa model.model_dump(exclude_unset=True) para detectar qué se envió.
    """
    ...

@router.delete("/{project_id}", status_code=204, summary="Eliminar proyecto")
async def delete_project(project_id: int) -> None:
    """Soft delete de un proyecto (marca como deleted, no borra)."""
    ...
```

### Archivo: `app/core/dependencies.py`

```python
"""Dependencies compartidas para inyección en endpoints.

Patrón: Cada dependency es una función async que FastAPI inyecta automáticamente.
"""

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Provee una sesión de base de datos.
    
    Uso en endpoint:
        @router.get("/")
        async def list_items(db: AsyncSession = Depends(get_db)):
            ...
    
    Implementación:
    1. Crear sesión del pool
    2. Yield sesión (el endpoint la usa)
    3. Commit si no hubo errores
    4. Rollback si hubo excepción
    5. Cerrar sesión siempre
    """
    ...

async def get_redis() -> Redis:
    """Provee conexión a Redis.
    
    Uso en endpoint:
        @router.get("/cached")
        async def get_data(redis: Redis = Depends(get_redis)):
            cached = await redis.get("key")
    """
    ...
```

---

## Tests requeridos

### `tests/test_health.py`
1. **test_health_returns_200** — GET /health → 200
2. **test_health_includes_version** — Response incluye version del settings

### `tests/test_projects.py`
1. **test_create_project_valid** — POST con datos válidos → 201 + ProjectResponse
2. **test_create_project_name_too_short** — name="ab" → 422 validation error
3. **test_list_projects_pagination** — 25 proyectos, page_size=10 → 10 items, total=25, total_pages=3
4. **test_list_projects_filter_status** — Filtrar por status=measure → solo proyectos en measure
5. **test_get_project_not_found** — ID inexistente → 404
6. **test_update_project_partial** — Solo enviar name → name se actualiza, resto igual
7. **test_delete_project** — DELETE → 204, GET posterior → 404

### `tests/test_schemas.py`
1. **test_project_create_defaults** — ProjectCreate sin status → status = "define"
2. **test_project_status_enum** — Status inválido → validation error
3. **test_paginated_response_calculation** — 47 items, page_size=10 → total_pages=5

---

## Anti-patrones

```python
# ❌ Lógica de negocio en el router
@router.post("/")
async def create_project(project: ProjectCreate, db: AsyncSession = Depends(get_db)):
    # 50 líneas de lógica aquí...
    # Esto va en services/project_service.py

# ❌ No usar Depends
@router.get("/")
async def list_projects():
    db = get_database_connection()  # Manual, no testeable

# ❌ Schemas sin validación
class ProjectCreate(BaseModel):
    name: str  # Sin min_length, sin max_length, acepta ""

# ❌ Retornar ORM objects directamente
@router.get("/{id}")
async def get_project(id: int, db = Depends(get_db)):
    return await db.get(Project, id)  # Expone campos internos
```
