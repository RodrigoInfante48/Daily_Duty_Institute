# 📊 Módulo 01 — dbt Exposures via API

## Objetivo

Crear endpoints que sirvan datos de modelos dbt materializados en PostgreSQL, con metadata, freshness tracking, y queries parametrizados.

---

## Concepto: dbt como proveedor, FastAPI como distribuidor

```
dbt run (cada X horas)
    │
    ▼
PostgreSQL (tablas materializadas)
    │
    ├── dim_veterinary_leads     ← CRM de veterinarios
    ├── fct_dentbot_sessions     ← Sesiones de DentBot
    ├── dim_kanbanpro_users      ← Usuarios de KanbanPro
    └── rpt_monthly_metrics      ← Métricas mensuales
    │
    ▼
FastAPI endpoints → consumers (Power BI, MCP, dashboards)
```

**Regla de oro:** FastAPI NO transforma datos. Solo lee tablas que dbt ya transformó.

---

## Spec de implementación

### Archivo: `app/services/dbt_service.py`

```python
"""Service para interactuar con modelos dbt materializados."""

from sqlalchemy import text, inspect
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

class DbtModelRegistry:
    """Registro de modelos dbt expuestos via API.
    
    Define qué modelos están disponibles, sus columnas permitidas
    para filtro, y metadata.
    
    ⚠️ No exponer TODOS los modelos de dbt. Solo los que tienen
    consumers vía API.
    """
    
    MODELS: dict[str, dict] = {
        "dim_veterinary_leads": {
            "table": "dim_veterinary_leads",
            "description": "Leads de clínicas veterinarias del CRM Airtable",
            "filterable_columns": ["city", "status", "source", "created_date"],
            "sortable_columns": ["name", "city", "created_date", "updated_date"],
            "default_sort": "created_date DESC",
            "max_page_size": 200,
        },
        "fct_dentbot_sessions": {
            "table": "fct_dentbot_sessions",
            "description": "Sesiones de DentBot — recursos generados para clínicas dentales",
            "filterable_columns": ["clinic_id", "session_date", "resource_type"],
            "sortable_columns": ["session_date", "clinic_id"],
            "default_sort": "session_date DESC",
            "max_page_size": 100,
        },
        "rpt_monthly_metrics": {
            "table": "rpt_monthly_metrics",
            "description": "Métricas agregadas mensuales de DDI",
            "filterable_columns": ["month", "metric_name"],
            "sortable_columns": ["month"],
            "default_sort": "month DESC",
            "max_page_size": 50,
        },
    }
    
    @classmethod
    def get_model(cls, name: str) -> dict | None:
        return cls.MODELS.get(name)
    
    @classmethod
    def list_models(cls) -> list[dict]:
        return [
            {"name": k, "description": v["description"]}
            for k, v in cls.MODELS.items()
        ]

class DbtService:
    """Servicio para leer datos de modelos dbt.
    
    Usa queries parametrizados para evitar SQL injection.
    Las tablas y columnas vienen del registry (no del input del usuario).
    """
    
    def __init__(self, db: AsyncSession):
        self._db = db
    
    async def get_model_data(
        self,
        model_name: str,
        filters: dict[str, str] | None = None,
        sort_by: str | None = None,
        sort_order: str = "DESC",
        page: int = 1,
        page_size: int = 50,
    ) -> tuple[list[dict], int]:
        """Retorna datos paginados de un modelo dbt.
        
        Seguridad:
        - model_name se valida contra el registry (no se interpola directamente)
        - filters solo permiten columnas del registry
        - sort_by solo permite columnas del registry
        - page_size tiene un máximo por modelo
        
        Args:
            model_name: Nombre del modelo (debe existir en registry)
            filters: Dict de {column: value} para WHERE clauses
            sort_by: Columna para ORDER BY
            sort_order: ASC o DESC
            page: Página (1-indexed)
            page_size: Items por página
        
        Returns:
            Tuple de (rows como list[dict], total count)
        
        Raises:
            ModelNotFoundError: Si el modelo no está en el registry
            InvalidFilterError: Si un filtro usa una columna no permitida
        """
        model_config = DbtModelRegistry.get_model(model_name)
        if not model_config:
            raise ModelNotFoundError(f"Model '{model_name}' not found in registry")
        
        table = model_config["table"]
        max_size = model_config["max_page_size"]
        page_size = min(page_size, max_size)
        
        # Validate filters
        if filters:
            for col in filters:
                if col not in model_config["filterable_columns"]:
                    raise InvalidFilterError(f"Column '{col}' not filterable for model '{model_name}'")
        
        # Build query (table name from registry, not user input)
        # Parameters for values only
        ...
    
    async def get_model_metadata(self, model_name: str) -> dict:
        """Retorna metadata de un modelo dbt.
        
        Returns:
            {
                "name": "dim_veterinary_leads",
                "description": "...",
                "columns": [{"name": "city", "type": "varchar"}],
                "row_count": 523,
                "last_updated": "2026-04-15T10:30:00Z",
                "filterable_columns": [...],
                "sortable_columns": [...]
            }
        """
        ...
    
    async def get_freshness(self) -> list[dict]:
        """Retorna freshness de todos los modelos expuestos.
        
        Freshness = cuánto tiempo ha pasado desde la última actualización.
        
        Returns:
            [
                {
                    "model": "dim_veterinary_leads",
                    "last_updated": "2026-04-15T10:30:00Z",
                    "age_hours": 2.5,
                    "status": "fresh"  # fresh < 6h, stale < 24h, critical >= 24h
                }
            ]
        
        Implementación:
        - Leer MAX(updated_at) o MAX(created_at) de cada tabla
        - Calcular age en horas
        - Asignar status basado en thresholds
        """
        ...
```

### Archivo: `app/routers/dbt_models.py`

```python
router = APIRouter(prefix="/dbt", tags=["dbt Models"])

@router.get("/models", summary="Listar modelos dbt disponibles")
async def list_models() -> list[dict]:
    """Retorna lista de modelos dbt expuestos via API con sus descripciones."""
    return DbtModelRegistry.list_models()

@router.get("/models/{model_name}/data", summary="Datos de un modelo dbt")
async def get_model_data(
    model_name: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    sort_by: str | None = Query(None),
    sort_order: str = Query("DESC", pattern="^(ASC|DESC)$"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse:
    """Retorna datos paginados del modelo.
    
    Filtros se pasan como query params adicionales.
    Ejemplo: /dbt/models/dim_veterinary_leads/data?city=Bogota&status=active
    """
    ...

@router.get("/models/{model_name}/meta", summary="Metadata de un modelo dbt")
async def get_model_metadata(
    model_name: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Retorna metadata: columnas, tipos, row count, freshness."""
    ...

@router.get("/freshness", summary="Freshness de todos los modelos")
async def get_freshness(db: AsyncSession = Depends(get_db)) -> list[dict]:
    """Retorna freshness de todos los modelos dbt expuestos."""
    ...

@router.post("/query", summary="Query parametrizado")
async def query_model(
    body: DbtQueryRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse:
    """Query flexible con filtros, sort, y paginación en el body.
    
    Body:
    {
        "model": "dim_veterinary_leads",
        "filters": {"city": "Bogota", "status": "active"},
        "sort_by": "created_date",
        "sort_order": "DESC",
        "page": 1,
        "page_size": 50
    }
    """
    ...
```

---

## dbt Exposure definition

Agregar al proyecto dbt para documentar que la API consume estos modelos:

### Archivo: `dbt_project/models/exposures.yml`
```yaml
version: 2

exposures:
  - name: ddi_api_leads
    type: application
    maturity: high
    url: https://api.dailyduty.co/api/v1/dbt/models/dim_veterinary_leads/data
    description: "FastAPI endpoint que sirve leads de veterinarias"
    depends_on:
      - ref('dim_veterinary_leads')
    owner:
      name: Rod
      email: rod@dailyduty.co

  - name: ddi_api_dentbot
    type: application  
    maturity: medium
    url: https://api.dailyduty.co/api/v1/dbt/models/fct_dentbot_sessions/data
    description: "FastAPI endpoint que sirve sesiones de DentBot"
    depends_on:
      - ref('fct_dentbot_sessions')
    owner:
      name: Rod
      email: rod@dailyduty.co

  - name: ddi_api_metrics
    type: application
    maturity: medium
    url: https://api.dailyduty.co/api/v1/dbt/models/rpt_monthly_metrics/data
    description: "FastAPI endpoint que sirve métricas mensuales"
    depends_on:
      - ref('rpt_monthly_metrics')
    owner:
      name: Rod
      email: rod@dailyduty.co
```

---

## Tests requeridos

### `tests/test_dbt_service.py`
1. **test_list_models** — Retorna todos los modelos del registry
2. **test_get_model_data_valid** — Modelo existente → datos paginados
3. **test_get_model_not_found** — Modelo inexistente → ModelNotFoundError
4. **test_filter_valid_column** — Filtro por columna permitida → funciona
5. **test_filter_invalid_column** — Filtro por columna no permitida → InvalidFilterError
6. **test_page_size_capped** — page_size=500 con max=200 → retorna max 200
7. **test_freshness_status** — 2h → fresh, 12h → stale, 30h → critical
8. **test_metadata_includes_columns** — Metadata incluye lista de columnas con tipos

---

## Anti-patrones

```python
# ❌ Interpolar tabla directamente del input del usuario
table_name = request.query_params["table"]
await db.execute(text(f"SELECT * FROM {table_name}"))
# SQL injection: ?table=users; DROP TABLE users;--

# ❌ Exponer todos los modelos dbt
for table in inspector.get_table_names():
    register_endpoint(table)
# Expone tablas staging, raw, seeds que no deberían ser públicas

# ❌ Ejecutar dbt desde la API
@router.post("/dbt/run")
async def run_dbt():
    subprocess.run(["dbt", "run"])
# La API lee datos, no ejecuta transformaciones
```
