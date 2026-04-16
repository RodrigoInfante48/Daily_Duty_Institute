# 📖 Glosario Técnico — API Mastery

Referencia rápida de conceptos. No es un tutorial — es un diccionario para los devs.

---

## Autenticación y Seguridad

| Término | Definición | Ejemplo en nuestro stack |
|---------|-----------|-------------------------|
| **API Key** | String estático que identifica al cliente. No expira automáticamente. | `X-API-Key: sk_live_xxx` para MCP servers |
| **Bearer Token** | Token de acceso enviado en el header Authorization. Puede expirar. | `Authorization: Bearer eyJhbG...` |
| **JWT** | JSON Web Token. Token firmado que contiene claims (user_id, exp, etc.). | Access token de nuestra FastAPI |
| **OAuth2** | Protocolo de autorización delegada. El usuario autoriza a una app. | Spotify, Google APIs |
| **PKCE** | Proof Key for Code Exchange. Protege OAuth2 en apps públicas. | `code_verifier` + `code_challenge` |
| **Refresh Token** | Token de larga duración para obtener nuevos access tokens. | Token rotado cada 7 días |
| **CORS** | Cross-Origin Resource Sharing. Controla qué dominios pueden llamar tu API. | Permitir solo `dailyduty.co` |
| **HMAC** | Hash-based Message Authentication Code. Firma para verificar integridad. | Webhooks de Hotmart |

## HTTP y Networking

| Término | Definición |
|---------|-----------|
| **Idempotente** | Ejecutar N veces produce el mismo resultado que 1 vez. GET, PUT, DELETE son idempotentes. POST no. |
| **Connection Pooling** | Reutilizar conexiones TCP en lugar de abrir una nueva por request. httpx lo hace automáticamente. |
| **HTTP/2** | Versión del protocolo HTTP con multiplexing (múltiples requests en una conexión). |
| **Status 429** | Too Many Requests. El servidor te está rate-limiting. |
| **Status 401** | Unauthorized. Tu token es inválido o expiró. |
| **Status 403** | Forbidden. Token válido pero sin permisos suficientes. |

## Paginación

| Término | Definición |
|---------|-----------|
| **Offset** | Número de registros a saltar. `?offset=50` salta los primeros 50. |
| **Cursor** | Token opaco que apunta al siguiente batch de resultados. |
| **Keyset** | Paginación basada en el último valor visto (ej: `?after_id=123`). |
| **Link Header** | Header HTTP estándar (RFC 8288) con URLs de navegación: next, prev, last. |

## Rate Limiting

| Término | Definición |
|---------|-----------|
| **Exponential Backoff** | Duplicar el tiempo de espera en cada reintento: 1s, 2s, 4s, 8s... |
| **Jitter** | Componente random en el backoff para evitar sincronización de clientes. |
| **Circuit Breaker** | Patrón que corta requests a un servicio que falla repetidamente. |
| **Token Bucket** | Algoritmo de rate limiting: tokens se acumulan a tasa fija, cada request consume uno. |
| **Retry-After** | Header que indica cuántos segundos esperar antes de reintentar. |

## FastAPI

| Término | Definición |
|---------|-----------|
| **Router** | Agrupación de endpoints por dominio. `APIRouter(prefix="/api/v1/projects")` |
| **Dependency Injection** | Inyectar servicios (DB session, auth, etc.) en endpoints via `Depends()` |
| **Pydantic Model** | Schema de validación para request/response bodies. |
| **Path Parameter** | Variable en la URL: `/projects/{project_id}` |
| **Query Parameter** | Variable en el query string: `?page=1&limit=50` |
| **Middleware** | Función que se ejecuta en cada request (logging, CORS, etc.) |

## Data Engineering

| Término | Definición | Relación con APIs |
|---------|-----------|-------------------|
| **dbt** | Herramienta de transformación SQL. Define modelos como SELECT statements. | FastAPI sirve los modelos transformados |
| **Exposure** | Documentación en dbt de quién consume un modelo. | Nuestra API es un exposure |
| **Materialization** | Cómo dbt persiste un modelo (table, view, incremental). | `table` para endpoints API (más rápido) |
| **Freshness** | Qué tan recientes son los datos. | Endpoint `/dbt/freshness` |

## MCP (Model Context Protocol)

| Término | Definición |
|---------|-----------|
| **MCP Server** | Servicio que expone tools para que un LLM los use. |
| **Tool** | Función que el LLM puede invocar (ej: `get_dashboard_data`). |
| **FastMCP** | Framework Python para crear MCP servers rápidamente. |
| **Bridge** | Patrón donde el MCP server llama a FastAPI en vez de acceder a DB directamente. |
