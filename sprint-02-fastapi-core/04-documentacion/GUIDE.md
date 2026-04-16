# 📚 Módulo 04 — Documentación de API (OpenAPI + Swagger + ReDoc)

## Objetivo

Personalizar la documentación auto-generada de FastAPI para que sea profesional, navegable y útil para los consumidores de la API (MCP servers, frontend, scripts ETL).

---

## Lo que FastAPI te da gratis

FastAPI genera documentación OpenAPI 3.1 automáticamente a partir de:
- Type hints en los endpoints
- Pydantic schemas
- Docstrings
- Decoradores de router

Disponible en:
- `/docs` — Swagger UI (interactivo, puedes probar endpoints)
- `/redoc` — ReDoc (más bonito, mejor para leer)
- `/openapi.json` — Spec raw en JSON

---

## Spec de implementación

### Customización en `app/main.py`

```python
app = FastAPI(
    title="Daily Duty Institute API",
    version="0.1.0",
    description="""
## DDI API — Datos transformados, expuestos, conectados.

API de Daily Duty Institute para:
- 📊 Acceder a datos transformados por dbt
- 🔗 Conectar servidores MCP con datos de producción
- 📋 Gestionar proyectos DMAIC/Kanban

### Autenticación

La API soporta dos métodos de autenticación:

1. **JWT Bearer Token** — Para usuarios humanos (login → token)
2. **API Key** — Para acceso programático (MCP servers, scripts ETL)

### Rate Limits

- 60 requests/minuto por IP
- Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
    """,
    docs_url="/docs",
    redoc_url="/redoc",
    contact={
        "name": "Rod — Daily Duty Institute",
        "url": "https://github.com/RodrigoInfante48",
        "email": "rod@dailyduty.co",
    },
    license_info={
        "name": "MIT",
    },
    openapi_tags=[
        {
            "name": "Health",
            "description": "Endpoints de monitoreo y health check.",
        },
        {
            "name": "Authentication",
            "description": "Registro, login, tokens JWT y API keys.",
        },
        {
            "name": "Projects",
            "description": "CRUD de proyectos DMAIC. Requiere autenticación.",
        },
        {
            "name": "dbt Models",
            "description": "Acceso a datos transformados por dbt. Requiere API key.",
        },
        {
            "name": "MCP Bridge",
            "description": "Endpoints optimizados para servidores MCP.",
        },
    ],
)
```

### Documentación rica en schemas

```python
class ProjectCreate(BaseSchema):
    """Schema para crear un proyecto DMAIC."""
    
    name: str = Field(
        ...,
        min_length=3,
        max_length=100,
        description="Nombre del proyecto. Debe ser único por usuario.",
        examples=["Optimización de Citas — Clínica Dental Norte"],
        json_schema_extra={"pattern": "^[a-zA-ZáéíóúñÁÉÍÓÚÑ0-9 —\\-]+$"},
    )
    description: str | None = Field(
        None,
        max_length=500,
        description="Descripción detallada del problema y objetivo.",
        examples=["Reducir el tiempo de espera promedio de pacientes de 45min a 15min."],
    )
    status: ProjectStatus = Field(
        ProjectStatus.DEFINE,
        description="Fase DMAIC actual. Siempre inicia en 'define'.",
    )
    industry: str | None = Field(
        None,
        max_length=50,
        description="Industria del proyecto.",
        examples=["veterinaria", "dental", "gym", "restaurante"],
    )
    
    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "name": "Reducción de Citas Perdidas",
                    "description": "Aplicar DMAIC para reducir citas no-show en 40%",
                    "status": "define",
                    "industry": "dental",
                }
            ]
        }
    )
```

### Documentación rica en endpoints

```python
@router.get(
    "/",
    summary="Listar proyectos del usuario",
    description="Retorna proyectos paginados con filtros opcionales por fase DMAIC e industria.",
    response_description="Lista paginada de proyectos",
    responses={
        200: {
            "description": "Lista de proyectos",
            "content": {
                "application/json": {
                    "example": {
                        "items": [
                            {
                                "id": 1,
                                "name": "Optimización Citas",
                                "status": "measure",
                                "industry": "dental",
                            }
                        ],
                        "total": 15,
                        "page": 1,
                        "page_size": 20,
                        "total_pages": 1,
                    }
                }
            },
        },
        401: {"description": "No autenticado"},
        429: {"description": "Rate limit excedido"},
    },
)
async def list_projects(...):
    ...
```

### Response schemas para errores

```python
class ErrorResponse(BaseModel):
    """Schema estándar para errores."""
    detail: str = Field(..., description="Mensaje de error legible")
    error_code: str | None = Field(None, description="Código de error interno")
    
    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {"detail": "Project not found", "error_code": "PROJECT_NOT_FOUND"},
                {"detail": "Invalid credentials", "error_code": "AUTH_INVALID"},
            ]
        }
    )

class ValidationErrorResponse(BaseModel):
    """Schema para errores de validación (422)."""
    detail: list[dict] = Field(
        ...,
        description="Lista de errores de validación",
        examples=[[{"loc": ["body", "name"], "msg": "String should have at least 3 characters", "type": "string_too_short"}]],
    )
```

---

## Exportar OpenAPI spec

Para que consumidores generen clientes automáticamente:

```python
# Endpoint para descargar spec
@router.get("/openapi.yaml", include_in_schema=False)
async def openapi_yaml():
    """Retorna la spec OpenAPI en YAML (más legible que JSON)."""
    import yaml
    return Response(
        content=yaml.dump(app.openapi(), default_flow_style=False),
        media_type="application/x-yaml",
    )
```

```bash
# Generar spec estática para el repo
python -c "
import json
from app.main import app
spec = app.openapi()
with open('docs/openapi.json', 'w') as f:
    json.dump(spec, f, indent=2)
print(f'OpenAPI spec exported: {len(spec[\"paths\"])} endpoints')
"
```

---

## Tests requeridos

### `tests/test_docs.py`
1. **test_docs_accessible** — GET /docs → 200
2. **test_redoc_accessible** — GET /redoc → 200
3. **test_openapi_json** — GET /openapi.json → JSON válido con paths
4. **test_all_endpoints_documented** — Cada endpoint tiene summary y description
5. **test_schemas_have_examples** — ProjectCreate y ProjectResponse tienen examples
6. **test_error_responses_documented** — 401, 404, 422, 429 documentados en responses

---

## Checklist de calidad de documentación

Antes de marcar este módulo como completado:

- [ ] Todos los endpoints tienen `summary` (título corto)
- [ ] Todos los endpoints tienen `description` (explicación detallada)
- [ ] Todos los schemas Pydantic tienen `Field(description=...)` en cada campo
- [ ] Al menos 1 ejemplo por schema (`examples` en Field o model_config)
- [ ] Responses de error documentados (401, 403, 404, 422, 429)
- [ ] Tags agrupan endpoints lógicamente
- [ ] `/docs` es navegable y se puede probar cada endpoint
- [ ] `/redoc` se renderiza correctamente
