# 🔐 Módulo 01 — Autenticación Avanzada

## Objetivo

Implementar un sistema de autenticación modular que soporte tres esquemas:
1. API Key (header estático)
2. Bearer Token (token fijo o pre-generado)
3. OAuth2 con Authorization Code + PKCE (con refresh automático)

---

## Conceptos clave (sin basura teórica)

### API Key
- Se envía como header: `X-API-Key: sk_live_xxx` o `Authorization: Bearer xxx`
- Es un string estático — no expira a menos que lo rotes manualmente
- Caso de uso: scripts internos, MCP servers, pipelines ETL
- **Riesgo:** Si se filtra, acceso total. Nunca commitear a Git.

### Bearer Token
- Similar a API Key pero generalmente tiene expiración
- Se envía: `Authorization: Bearer eyJhbGci...`
- Caso de uso: APIs como Notion, Airtable donde generas un token en settings

### OAuth2 Authorization Code + PKCE
- El flujo más seguro para apps que actúan en nombre de un usuario
- Flow completo:

```
1. Tu app genera code_verifier (random string)
2. Tu app calcula code_challenge = SHA256(code_verifier)
3. Redirige al usuario a /authorize con code_challenge
4. Usuario autoriza → callback con authorization_code
5. Tu app intercambia code + code_verifier por access_token + refresh_token
6. Cuando access_token expira → usa refresh_token para obtener uno nuevo
```

---

## Spec de implementación

### Archivo: `auth_provider.py`

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum

class AuthScheme(Enum):
    API_KEY = "api_key"
    BEARER = "bearer"
    OAUTH2 = "oauth2"

@dataclass
class AuthCredentials:
    """Credenciales resueltas listas para inyectar en un request."""
    headers: dict[str, str]
    scheme: AuthScheme

class AuthProvider(ABC):
    """Interfaz base para providers de autenticación."""
    
    @abstractmethod
    async def get_credentials(self) -> AuthCredentials:
        """Retorna credenciales válidas. Refresca si es necesario."""
        ...
    
    @abstractmethod
    async def is_expired(self) -> bool:
        """Verifica si las credenciales actuales expiraron."""
        ...
```

### Archivo: `token_manager.py`

Clase que implementa `AuthProvider` para el flujo OAuth2 con:

**Responsabilidades:**
1. Almacenar access_token y refresh_token en memoria (no disco por seguridad)
2. Detectar cuándo el access_token está a punto de expirar (buffer de 60 segundos)
3. Ejecutar refresh automáticamente ANTES de que expire
4. Si el refresh falla → lanzar `AuthenticationError` con mensaje claro
5. Thread-safe: usar `asyncio.Lock` para evitar refresh duplicados

**Interfaz pública:**
```python
class TokenManager(AuthProvider):
    def __init__(
        self,
        client_id: str,
        token_url: str,
        access_token: str | None = None,
        refresh_token: str | None = None,
        expires_in: int = 3600,
        expiry_buffer_seconds: int = 60,
    ): ...
    
    async def get_credentials(self) -> AuthCredentials: ...
    async def is_expired(self) -> bool: ...
    async def refresh(self, client: httpx.AsyncClient) -> None: ...
```

**Comportamiento del refresh:**
```python
async def refresh(self, client: httpx.AsyncClient) -> None:
    """
    POST to token_url with:
    - grant_type: "refresh_token"
    - refresh_token: self._refresh_token
    - client_id: self._client_id
    
    Espera respuesta JSON con:
    - access_token (nuevo)
    - refresh_token (nuevo, si el server lo rota)
    - expires_in (segundos)
    
    Si status != 200 o falta access_token → raise AuthenticationError
    """
```

### Archivo: `oauth2_flow.py`

Implementa el flujo completo de Authorization Code + PKCE:

**Funciones:**
```python
def generate_pkce_pair() -> tuple[str, str]:
    """Genera (code_verifier, code_challenge) para PKCE.
    
    code_verifier: 43-128 caracteres, [A-Za-z0-9-._~]
    code_challenge: BASE64URL(SHA256(code_verifier))
    """

def build_authorize_url(
    authorize_endpoint: str,
    client_id: str,
    redirect_uri: str,
    code_challenge: str,
    scopes: list[str],
    state: str | None = None,
) -> str:
    """Construye la URL de autorización con todos los params."""

async def exchange_code_for_tokens(
    client: httpx.AsyncClient,
    token_endpoint: str,
    client_id: str,
    code: str,
    code_verifier: str,
    redirect_uri: str,
) -> dict[str, Any]:
    """Intercambia authorization code por tokens.
    
    Returns:
        {
            "access_token": "xxx",
            "refresh_token": "yyy",
            "expires_in": 3600,
            "token_type": "Bearer",
            "scope": "read write"
        }
    """
```

### Archivo: `api_key_provider.py`

Implementación simple de `AuthProvider` para API Keys:

```python
class ApiKeyProvider(AuthProvider):
    """Provider para autenticación con API Key estática.
    
    Soporta dos ubicaciones:
    - Header personalizado (ej: X-API-Key)
    - Authorization header (Bearer)
    """
    
    def __init__(
        self,
        api_key: str,
        header_name: str = "Authorization",
        prefix: str = "Bearer",
    ): ...
```

---

## Tests requeridos

### `test_token_manager.py`
1. `test_get_credentials_returns_valid_headers` — Token válido → retorna headers correctos
2. `test_auto_refresh_when_expired` — Token expirado → refresh se ejecuta automáticamente
3. `test_refresh_failure_raises_auth_error` — Server retorna 401 en refresh → `AuthenticationError`
4. `test_concurrent_refresh_only_executes_once` — Múltiples requests simultáneos → solo un refresh
5. `test_expiry_buffer` — Token con 30s restantes y buffer de 60s → se considera expirado

### `test_oauth2_flow.py`
1. `test_pkce_pair_generation` — code_verifier tiene longitud correcta, code_challenge es SHA256
2. `test_authorize_url_includes_all_params` — URL contiene client_id, redirect_uri, code_challenge, scope
3. `test_code_exchange_success` — Mock server retorna tokens → parsing correcto
4. `test_code_exchange_failure` — Mock server retorna error → exception clara

### `test_api_key_provider.py`
1. `test_custom_header_name` — Header personalizado se inyecta correctamente
2. `test_never_expires` — `is_expired()` siempre retorna False

---

## Anti-patrones (NO hacer esto)

```python
# ❌ Hardcodear tokens
headers = {"Authorization": "Bearer sk_live_abc123"}

# ❌ No manejar expiración
response = client.get(url, headers={"Authorization": f"Bearer {token}"})
# ¿Y si el token expiró hace 2 horas?

# ❌ Refresh sin lock
async def get_token(self):
    if self.is_expired():
        await self.refresh()  # 10 requests concurrentes = 10 refreshes
    return self.token

# ❌ Guardar tokens en archivos planos
with open("tokens.json", "w") as f:
    json.dump({"access_token": "..."}, f)
```

---

## Recursos

- [OAuth 2.0 con PKCE — RFC 7636](https://tools.ietf.org/html/rfc7636)
- [httpx Auth — Documentación oficial](https://www.python-httpx.org/advanced/authentication/)
- [Notion API Auth](https://developers.notion.com/docs/authorization)
