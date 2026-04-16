# 📄 Módulo 02 — Paginación Avanzada

## Objetivo

Implementar un paginador genérico que soporte los tres patrones principales de paginación en APIs REST, con detección automática del tipo.

---

## Los tres tipos de paginación

### 1. Offset-based (la más común, la menos eficiente)
```
GET /items?offset=0&limit=50    → items 1-50
GET /items?offset=50&limit=50   → items 51-100
GET /items?offset=100&limit=50  → items 101-150
```
- **APIs que la usan:** Spotify, muchas APIs legacy
- **Problema:** Si insertan items mientras paginas, puedes duplicar o perder registros
- **Cuándo usarla:** Cuando la API no ofrece otra opción

### 2. Cursor-based (la más robusta)
```
GET /items?limit=50              → items + next_cursor="abc123"
GET /items?limit=50&cursor=abc123 → items + next_cursor="def456"
GET /items?limit=50&cursor=def456 → items + next_cursor=null (fin)
```
- **APIs que la usan:** Notion, Airtable, Slack, Twitter/X
- **Ventaja:** Inmune a inserciones/deleciones durante la paginación
- **El cursor es opaco:** No intentes parsearlo. Es un token del servidor.

### 3. Keyset-based / Link Header (estándar HTTP)
```
GET /items
Response Headers:
  Link: <https://api.example.com/items?page=2>; rel="next",
        <https://api.example.com/items?page=10>; rel="last"
```
- **APIs que la usan:** GitHub REST API
- **Ventaja:** El servidor controla completamente la URL de la siguiente página
- **Cómo parsear:** Regex o `parse_header_links` de httpx

---

## Spec de implementación

### Archivo: `paginator.py`

```python
from enum import Enum
from typing import AsyncIterator, Any, Callable

class PaginationType(Enum):
    OFFSET = "offset"
    CURSOR = "cursor"
    LINK_HEADER = "link_header"

class PaginationConfig:
    """Configuración para el paginador.
    
    Attributes:
        pagination_type: Tipo de paginación de la API.
        page_size: Items por página. Default 50.
        max_pages: Límite de páginas a consumir. Default 100 (safety net).
        results_key: Key en el JSON donde están los items (ej: "results", "data", "items").
        cursor_key: Key del cursor en la respuesta (solo para CURSOR type).
        cursor_param: Nombre del query param para enviar el cursor.
        offset_param: Nombre del query param para offset.
        limit_param: Nombre del query param para limit.
    """
    
    def __init__(
        self,
        pagination_type: PaginationType,
        page_size: int = 50,
        max_pages: int = 100,
        results_key: str = "results",
        cursor_key: str = "next_cursor",
        cursor_param: str = "start_cursor",
        offset_param: str = "offset",
        limit_param: str = "limit",
    ): ...

class APIPaginator:
    """Paginador genérico async que produce items uno a uno.
    
    Uso:
        config = PaginationConfig(
            pagination_type=PaginationType.CURSOR,
            results_key="results",
            cursor_key="next_cursor",
            cursor_param="start_cursor",
        )
        
        paginator = APIPaginator(client, config)
        
        async for item in paginator.paginate("https://api.notion.com/v1/databases/xxx/query"):
            process(item)
    """
    
    def __init__(
        self,
        client: httpx.AsyncClient,
        config: PaginationConfig,
    ): ...
    
    async def paginate(
        self,
        url: str,
        method: str = "GET",
        body: dict | None = None,
        extra_params: dict | None = None,
        extra_headers: dict | None = None,
    ) -> AsyncIterator[dict[str, Any]]:
        """Itera sobre todos los items de una API paginada.
        
        Yields:
            Cada item individual de cada página.
        
        Raises:
            PaginationError: Si la respuesta no contiene la estructura esperada.
            MaxPagesExceeded: Si se alcanza el límite de max_pages.
        """
        ...
    
    async def paginate_all(
        self,
        url: str,
        **kwargs,
    ) -> list[dict[str, Any]]:
        """Consume todas las páginas y retorna la lista completa.
        
        ⚠️ Cuidado con APIs que tienen millones de registros.
        Preferir paginate() para streaming.
        """
        ...
```

---

## Ejemplos de configuración por API

### Notion
```python
notion_config = PaginationConfig(
    pagination_type=PaginationType.CURSOR,
    page_size=100,  # máximo de Notion
    results_key="results",
    cursor_key="next_cursor",
    cursor_param="start_cursor",
)
# Nota: Notion usa POST para queries de databases
```

### GitHub
```python
github_config = PaginationConfig(
    pagination_type=PaginationType.LINK_HEADER,
    page_size=100,  # máximo de GitHub
    results_key=None,  # La respuesta ES el array directamente
)
```

### Airtable
```python
airtable_config = PaginationConfig(
    pagination_type=PaginationType.CURSOR,
    page_size=100,
    results_key="records",
    cursor_key="offset",  # Airtable llama "offset" a su cursor
    cursor_param="offset",
)
```

### Spotify
```python
spotify_config = PaginationConfig(
    pagination_type=PaginationType.OFFSET,
    page_size=50,
    results_key="items",
    offset_param="offset",
    limit_param="limit",
)
```

---

## Lógica de Link Header parsing

Para GitHub y APIs que usan el estándar RFC 8288:

```python
def parse_link_header(link_header: str) -> dict[str, str]:
    """Parsea el header Link y retorna un dict {rel: url}.
    
    Input:  '<https://api.github.com/repos?page=2>; rel="next", <https://api.github.com/repos?page=5>; rel="last"'
    Output: {"next": "https://api.github.com/repos?page=2", "last": "https://api.github.com/repos?page=5"}
    """
```

---

## Tests requeridos

### `test_paginator.py`

1. **test_cursor_pagination_complete** — Mock 3 páginas con cursor → retorna todos los items combinados
2. **test_offset_pagination_complete** — Mock 3 páginas con offset → retorna todos los items
3. **test_link_header_pagination** — Mock con Link headers → sigue los links correctamente
4. **test_max_pages_limit** — API con 200 páginas, max_pages=5 → para en la 5ta y lanza warning
5. **test_empty_results** — Primera página sin items → retorna lista vacía
6. **test_single_page** — Solo 1 página (sin next) → retorna items de esa página
7. **test_async_iterator** — Verificar que `async for item in paginator.paginate()` funciona
8. **test_notion_config_real_structure** — Simular respuesta real de Notion → parsing correcto
9. **test_results_key_none** — Cuando `results_key=None`, la respuesta es directamente el array

---

## Anti-patrones

```python
# ❌ No limitar páginas
async for item in paginator.paginate(url):  # ¿Y si tiene 1M de registros?
    items.append(item)

# ❌ Parsear el cursor
cursor = base64.decode(next_cursor)  # El cursor es opaco, no lo toques

# ❌ Asumir que todas las APIs paginan igual
response["results"]  # ¿Y si es "data"? ¿O "items"? ¿O el array directo?

# ❌ Ignorar el has_more / next_cursor == null
while True:  # Loop infinito si no detectas el fin
    page = await fetch_page()
```

---

## Nota para ETL

En el contexto de tus pipelines ETL (API → Python → PostgreSQL), este paginador es la primera pieza del Extract. El patrón típico es:

```python
async def extract_notion_database(database_id: str) -> list[dict]:
    """Extrae todos los registros de una database de Notion."""
    config = PaginationConfig(
        pagination_type=PaginationType.CURSOR,
        page_size=100,
        results_key="results",
        cursor_key="next_cursor",
        cursor_param="start_cursor",
    )
    
    paginator = APIPaginator(client, config)
    return await paginator.paginate_all(
        url=f"https://api.notion.com/v1/databases/{database_id}/query",
        method="POST",
    )
```
