# 🧩 Patrones de Diseño — API Mastery

Patrones que se repiten en el proyecto. Referencia para los devs.

---

## Patrón 1: Provider Abstracto

**Dónde se usa:** Autenticación (AuthProvider)  
**Por qué:** Diferentes APIs requieren diferentes auth schemes. El consumer no debería saber cuál.

```python
# Interfaz
class AuthProvider(ABC):
    async def get_credentials(self) -> AuthCredentials: ...

# Implementaciones
class ApiKeyProvider(AuthProvider): ...
class TokenManager(AuthProvider): ...   # OAuth2
class NoAuthProvider(AuthProvider): ...  # APIs públicas

# Consumer no sabe cuál es
class APIClient:
    def __init__(self, auth: AuthProvider):
        self._auth = auth
    
    async def request(self, ...):
        creds = await self._auth.get_credentials()  # Polimorfismo
```

---

## Patrón 2: Factory Method

**Dónde se usa:** APIClient (`for_notion()`, `for_github()`, etc.)  
**Por qué:** Encapsular configuración compleja en un solo método.

```python
# En vez de esto (error-prone):
client = APIClient(APIClientConfig(
    base_url="https://api.notion.com",
    auth=ApiKeyProvider(key, prefix="Bearer"),
    pagination=PaginationConfig(type=CURSOR, ...),
    rate_limit=RateLimitConfig(base_delay=0.35),
    headers={"Notion-Version": "2022-06-28"},
))

# Hacer esto:
client = APIClient.for_notion(api_key="secret_xxx")
```

---

## Patrón 3: AsyncIterator para Streaming

**Dónde se usa:** Paginación  
**Por qué:** Procesar items uno a uno sin cargar todo en memoria.

```python
# Produce items individualmente
async def paginate(self, url) -> AsyncIterator[dict]:
    while has_more:
        page = await self._fetch_page(url, cursor)
        for item in page["results"]:
            yield item  # Un item a la vez
        cursor = page.get("next_cursor")

# Consumir con async for
async for lead in client.paginate("/leads"):
    await process(lead)  # Memoria constante, no importa si hay 10K leads
```

---

## Patrón 4: Circuit Breaker (State Machine)

**Dónde se usa:** Rate limiting  
**Por qué:** No seguir golpeando una API caída.

```
     success
  ┌─────────────┐
  │             │
  ▼   failure   │
CLOSED ──────► OPEN ──timer──► HALF_OPEN
  ▲                              │
  │         success              │
  └──────────────────────────────┘
              failure → back to OPEN
```

---

## Patrón 5: Cache-Aside

**Dónde se usa:** dbt-API bridge con Redis  
**Por qué:** Reducir load en PostgreSQL para queries repetidos.

```
1. Request llega
2. Check Redis → hit? return cached
3. Cache miss → query PostgreSQL
4. Store result in Redis with TTL
5. Return result
6. dbt run completes → webhook → invalidate cache
```

---

## Patrón 6: Dependency Injection (FastAPI)

**Dónde se usa:** Auth, DB sessions, services  
**Por qué:** Testabilidad + separación de concerns.

```python
# Dependency
async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    payload = decode_jwt(token)
    user = await user_repo.get(payload["sub"])
    if not user:
        raise HTTPException(401)
    return user

# Endpoint lo recibe inyectado
@router.get("/projects")
async def list_projects(user: User = Depends(get_current_user)):
    return await project_service.list_by_user(user.id)
```

---

## Patrón 7: Error Hierarchy

**Dónde se usa:** Todo el cliente HTTP  
**Por qué:** Diferentes errores requieren diferentes acciones.

```
APIError (base)
├── AuthenticationError (401, 403) → refresh token o re-login
├── NotFoundError (404)           → log + skip
├── ValidationError (422)         → fix request
├── RateLimitError (429)          → backoff + retry
└── ServerError (5xx)             → retry con circuit breaker
```
