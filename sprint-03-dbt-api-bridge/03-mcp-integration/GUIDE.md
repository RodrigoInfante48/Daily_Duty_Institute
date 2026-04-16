# 🔗 Módulo 03 — MCP Integration (FastAPI ↔ MCP Bridge)

## Objetivo

Crear un bridge que permita a tus servidores MCP (DataPocket, futuros servers) consumir datos de la FastAPI, y un endpoint especializado que MCP servers puedan llamar eficientemente.

---

## Arquitectura del bridge

```
Usuario (Claude chat)
      │
      ▼
Claude (LLM)
      │ tool_call
      ▼
MCP Server (DataPocket)
      │ HTTP request
      ▼
FastAPI /api/v1/mcp/query    ← Auth: API Key
      │
      ▼
CachedDbtService → Redis → PostgreSQL
      │
      ▼
Response (JSON optimizado para LLM)
```

**¿Por qué un bridge y no acceso directo a PostgreSQL?**
- El MCP server se mantiene simple (solo HTTP, no SQL)
- FastAPI maneja auth, cache, rate limiting, logging
- Un solo punto de acceso = un solo lugar para monitorear y asegurar
- Si cambias de PostgreSQL a otro DB, el MCP no se entera

---

## Spec de implementación

### Archivo: `app/schemas/mcp.py`

```python
"""Schemas para el bridge MCP."""

from pydantic import BaseModel, Field

class MCPQueryRequest(BaseModel):
    """Request genérico para MCP tools.
    
    El MCP server envía un request con:
    - tool: nombre de la herramienta que Claude invocó
    - params: parámetros que Claude envió al tool
    
    FastAPI rutea internamente al service correcto.
    """
    tool: str = Field(
        ...,
        description="Nombre del tool MCP invocado",
        examples=["get_dashboard_data", "get_model_summary", "search_leads"],
    )
    params: dict = Field(
        default_factory=dict,
        description="Parámetros del tool",
        examples=[{"model": "dim_veterinary_leads", "filters": {"city": "Bogotá"}}],
    )

class MCPQueryResponse(BaseModel):
    """Response optimizado para consumo por LLM.
    
    El response está diseñado para que Claude lo pueda interpretar
    fácilmente. Incluye datos + contexto.
    """
    tool: str
    status: str = Field(..., description="success o error")
    data: dict | list | None = Field(None, description="Datos del resultado")
    summary: str = Field(
        ...,
        description="Resumen en lenguaje natural para Claude",
        examples=["Found 23 veterinary leads in Bogotá, 15 active, 8 pending."],
    )
    metadata: dict | None = Field(
        None,
        description="Metadata adicional: freshness, total count, filters applied",
    )

class MCPToolDefinition(BaseModel):
    """Definición de un tool disponible para MCP.
    
    Se usa para que el MCP server sepa qué tools puede llamar
    y qué parámetros acepta cada uno.
    """
    name: str
    description: str
    parameters: dict  # JSON Schema de los params
    examples: list[dict] | None = None
```

### Archivo: `app/services/mcp_bridge_service.py`

```python
"""Service que rutea requests MCP al service interno correcto."""

class MCPBridgeService:
    """Bridge entre MCP tools y servicios internos de la API.
    
    Registra tools disponibles y rutea cada request al handler correcto.
    Genera summaries en lenguaje natural para que Claude interprete mejor.
    """
    
    def __init__(self, dbt_service: CachedDbtService):
        self._dbt = dbt_service
        self._tools: dict[str, callable] = {}
        self._register_default_tools()
    
    def _register_default_tools(self):
        """Registra los tools disponibles por default."""
        self._tools = {
            "get_dashboard_data": self._tool_get_dashboard_data,
            "get_model_summary": self._tool_get_model_summary,
            "search_leads": self._tool_search_leads,
            "get_freshness": self._tool_get_freshness,
            "list_available_models": self._tool_list_models,
        }
    
    async def execute(self, tool: str, params: dict) -> MCPQueryResponse:
        """Ejecuta un tool y retorna response formateado para MCP.
        
        1. Buscar tool en registry
        2. Ejecutar handler con params
        3. Formatear response con summary en lenguaje natural
        4. Retornar MCPQueryResponse
        
        Si tool no existe → error response con lista de tools disponibles
        """
        handler = self._tools.get(tool)
        if not handler:
            return MCPQueryResponse(
                tool=tool,
                status="error",
                summary=f"Tool '{tool}' not found. Available tools: {', '.join(self._tools.keys())}",
            )
        
        try:
            return await handler(params)
        except Exception as e:
            return MCPQueryResponse(
                tool=tool,
                status="error",
                summary=f"Error executing '{tool}': {str(e)}",
            )
    
    async def _tool_get_dashboard_data(self, params: dict) -> MCPQueryResponse:
        """Tool: Obtiene datos de un modelo dbt para dashboard.
        
        Params:
            model (str): Nombre del modelo dbt
            filters (dict, optional): Filtros a aplicar
            limit (int, optional): Máximo de rows. Default 50
        
        Summary generado:
            "Found {n} records from {model}. Filters applied: {filters}. 
             Data freshness: {age}h."
        """
        model = params.get("model")
        filters = params.get("filters")
        limit = params.get("limit", 50)
        
        data, total = await self._dbt.get_model_data(
            model_name=model,
            filters=filters,
            page_size=limit,
        )
        
        summary = f"Found {total} total records in '{model}'"
        if filters:
            filter_str = ", ".join(f"{k}={v}" for k, v in filters.items())
            summary += f" (filtered by: {filter_str})"
        summary += f". Returning {len(data)} rows."
        
        return MCPQueryResponse(
            tool="get_dashboard_data",
            status="success",
            data=data,
            summary=summary,
            metadata={"total": total, "returned": len(data), "filters": filters},
        )
    
    async def _tool_get_model_summary(self, params: dict) -> MCPQueryResponse:
        """Tool: Resumen estadístico de un modelo.
        
        Genera un summary con: row count, columnas, top values de filterable columns.
        Perfecto para que Claude entienda qué datos hay disponibles.
        """
        ...
    
    async def _tool_search_leads(self, params: dict) -> MCPQueryResponse:
        """Tool: Busca leads de veterinarias con filtros flexibles.
        
        Params:
            city (str, optional): Ciudad
            status (str, optional): Estado del lead
            query (str, optional): Búsqueda en nombre
        
        Shortcut específico para el caso de uso del CRM.
        """
        ...
    
    async def _tool_get_freshness(self, params: dict) -> MCPQueryResponse:
        """Tool: Retorna freshness de los datos.
        
        Claude puede usar esto para decidir si confiar en los datos
        o advertir al usuario que están stale.
        """
        ...
    
    async def _tool_list_models(self, params: dict) -> MCPQueryResponse:
        """Tool: Lista modelos disponibles con sus descripciones.
        
        Útil para que Claude descubra qué datos puede consultar.
        """
        ...
    
    def get_tool_definitions(self) -> list[MCPToolDefinition]:
        """Retorna definiciones de todos los tools para el MCP server.
        
        El MCP server usa esto para registrar sus tools en el protocolo MCP.
        """
        return [
            MCPToolDefinition(
                name="get_dashboard_data",
                description="Get paginated data from a dbt model for dashboard display",
                parameters={
                    "type": "object",
                    "properties": {
                        "model": {"type": "string", "description": "dbt model name"},
                        "filters": {"type": "object", "description": "Column filters"},
                        "limit": {"type": "integer", "default": 50, "maximum": 200},
                    },
                    "required": ["model"],
                },
                examples=[
                    {"model": "dim_veterinary_leads", "filters": {"city": "Bogotá"}, "limit": 20},
                ],
            ),
            # ... más definiciones
        ]
```

### Archivo: `app/routers/mcp_bridge.py`

```python
router = APIRouter(prefix="/mcp", tags=["MCP Bridge"])

@router.post("/query", summary="Ejecutar query MCP")
async def mcp_query(
    body: MCPQueryRequest,
    user: User = Depends(get_current_user),  # Auth via API Key
    bridge: MCPBridgeService = Depends(get_mcp_bridge),
) -> MCPQueryResponse:
    """Endpoint unificado para que MCP servers consuman datos.
    
    El MCP server solo necesita conocer este endpoint.
    El routing interno a services/models lo maneja el bridge.
    """
    return await bridge.execute(body.tool, body.params)

@router.get("/tools", summary="Listar tools disponibles")
async def list_tools(
    bridge: MCPBridgeService = Depends(get_mcp_bridge),
) -> list[MCPToolDefinition]:
    """Retorna las definiciones de todos los tools MCP disponibles.
    
    El MCP server puede llamar a este endpoint para auto-registrar
    sus tools sin hardcodearlos.
    """
    return bridge.get_tool_definitions()
```

### Actualización del MCP Server (DataPocket)

```python
"""Ejemplo de cómo el MCP server usa el bridge.

Archivo: datapocket_mcp/server.py (actualización)
"""

from fastmcp import FastMCP
import httpx

mcp = FastMCP("DataPocket")

# Configuración
DDI_API_URL = os.getenv("DDI_API_URL", "http://localhost:8000")
DDI_API_KEY = os.getenv("DDI_API_KEY")

async def call_bridge(tool: str, params: dict) -> dict:
    """Helper para llamar al bridge desde cualquier tool."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{DDI_API_URL}/api/v1/mcp/query",
            json={"tool": tool, "params": params},
            headers={"X-API-Key": DDI_API_KEY},
            timeout=30.0,
        )
        response.raise_for_status()
        return response.json()

@mcp.tool
async def get_dashboard_data(model: str, filters: dict | None = None, limit: int = 50) -> str:
    """Obtiene datos de un modelo dbt para análisis o dashboard.
    
    Args:
        model: Nombre del modelo (ej: dim_veterinary_leads)
        filters: Filtros opcionales (ej: {"city": "Bogotá"})
        limit: Máximo de registros a retornar
    """
    result = await call_bridge("get_dashboard_data", {
        "model": model,
        "filters": filters,
        "limit": limit,
    })
    
    if result["status"] == "error":
        return f"Error: {result['summary']}"
    
    return f"{result['summary']}\n\nData:\n{json.dumps(result['data'], indent=2, default=str)}"

@mcp.tool
async def search_leads(city: str | None = None, status: str | None = None) -> str:
    """Busca leads de clínicas veterinarias en el CRM."""
    result = await call_bridge("search_leads", {
        "city": city,
        "status": status,
    })
    return f"{result['summary']}\n\n{json.dumps(result['data'], indent=2, default=str)}"
```

---

## Tests requeridos

### `tests/test_mcp_bridge.py`
1. **test_execute_valid_tool** — Tool existente → success response con data
2. **test_execute_invalid_tool** — Tool inexistente → error con lista de disponibles
3. **test_get_dashboard_data_with_filters** — Filtros aplicados correctamente
4. **test_summary_generation** — Summary incluye count, filtros, y freshness
5. **test_tool_definitions_complete** — Todas las definiciones tienen name, description, parameters
6. **test_mcp_endpoint_auth_required** — Sin API Key → 401
7. **test_mcp_endpoint_success** — Con API Key válida → datos retornados
8. **test_list_tools_endpoint** — GET /mcp/tools → lista de MCPToolDefinition
