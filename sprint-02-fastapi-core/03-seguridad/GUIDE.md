# 🔒 Módulo 03 — Seguridad (JWT + API Keys + Rate Limiting)

## Objetivo

Implementar autenticación JWT para usuarios humanos, API Keys para acceso programático (MCP, scripts), y rate limiting server-side para proteger la API.

---

## Arquitectura de seguridad

```
Request entrante
      │
      ▼
Rate Limiter (middleware) ← Rechaza si > 60 req/min por IP
      │
      ▼
Auth Router ─── /auth/register (público)
      │         /auth/login (público)
      │         /auth/refresh (requiere refresh_token)
      │
      ▼
Protected Router ── Verifica JWT ó API Key
      │
      ▼
Endpoint (con user context inyectado)
```

---

## Spec de implementación

### Archivo: `app/core/security.py`

```python
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from passlib.context import CryptContext
import hashlib
import secrets

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """Hashea un password con bcrypt.
    
    Bcrypt genera un salt automáticamente.
    El hash resultante incluye el salt (no necesitas almacenarlo aparte).
    """
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica un password contra su hash bcrypt."""
    return pwd_context.verify(plain_password, hashed_password)

# JWT tokens
def create_access_token(
    data: dict,
    secret_key: str,
    algorithm: str = "HS256",
    expires_delta: timedelta | None = None,
) -> str:
    """Crea un JWT access token.
    
    Args:
        data: Claims del token. Mínimo: {"sub": user_id}
        secret_key: Clave secreta para firmar.
        algorithm: Algoritmo de firma.
        expires_delta: Duración. Default 30 minutos.
    
    Returns:
        JWT string firmado.
    
    El token contiene:
    - sub: user_id (string)
    - exp: timestamp de expiración
    - iat: timestamp de creación
    - type: "access"
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=30))
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc), "type": "access"})
    return jwt.encode(to_encode, secret_key, algorithm=algorithm)

def create_refresh_token(
    data: dict,
    secret_key: str,
    algorithm: str = "HS256",
    expires_delta: timedelta | None = None,
) -> str:
    """Crea un JWT refresh token.
    
    Igual que access pero:
    - type: "refresh"
    - Duración default: 7 días
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(days=7))
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc), "type": "refresh"})
    return jwt.encode(to_encode, secret_key, algorithm=algorithm)

def decode_token(token: str, secret_key: str, algorithm: str = "HS256") -> dict:
    """Decodifica y valida un JWT.
    
    Raises:
        InvalidTokenError: Si el token es inválido, expirado, o el tipo no coincide.
    """
    try:
        payload = jwt.decode(token, secret_key, algorithms=[algorithm])
        return payload
    except JWTError as e:
        raise InvalidTokenError(str(e))

# API Keys
def generate_api_key(prefix: str = "ddi") -> tuple[str, str]:
    """Genera una API key y su hash.
    
    Returns:
        (key_plaintext, key_hash)
        
    La key tiene formato: {prefix}_{random_32_chars}
    Ejemplo: ddi_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
    
    Solo retornar key_plaintext al usuario UNA VEZ.
    Almacenar key_hash en la DB.
    """
    random_part = secrets.token_hex(16)
    key_plaintext = f"{prefix}_{random_part}"
    key_hash = hashlib.sha256(key_plaintext.encode()).hexdigest()
    return key_plaintext, key_hash

def verify_api_key(key_plaintext: str, key_hash: str) -> bool:
    """Verifica una API key contra su hash almacenado."""
    computed_hash = hashlib.sha256(key_plaintext.encode()).hexdigest()
    return secrets.compare_digest(computed_hash, key_hash)
```

### Archivo: `app/core/auth_dependencies.py`

```python
"""Dependencies de autenticación para inyección en endpoints."""

from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials, APIKeyHeader

# Schemes
bearer_scheme = HTTPBearer(auto_error=False)
api_key_scheme = APIKeyHeader(name="X-API-Key", auto_error=False)

async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Security(bearer_scheme),
    api_key: str | None = Security(api_key_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Extrae el usuario actual del JWT token o API Key.
    
    Lógica:
    1. Si hay Bearer token → decodificar JWT → buscar user por sub
    2. Si hay X-API-Key → hashear → buscar en api_keys → obtener user
    3. Si ninguno → 401 Unauthorized
    4. Si user no existe o is_active=False → 401
    5. Retornar User object
    
    Este dependency se inyecta en cualquier endpoint protegido:
        @router.get("/protected")
        async def protected(user: User = Depends(get_current_user)):
            return {"user": user.email}
    """
    if credentials:
        # JWT path
        payload = decode_token(credentials.credentials, settings.JWT_SECRET_KEY)
        if payload.get("type") != "access":
            raise HTTPException(401, "Invalid token type")
        user = await db.get(User, int(payload["sub"]))
    elif api_key:
        # API Key path
        key_hash = hashlib.sha256(api_key.encode()).hexdigest()
        result = await db.execute(
            select(APIKey).where(APIKey.key_hash == key_hash)
        )
        api_key_record = result.scalar_one_or_none()
        if not api_key_record:
            raise HTTPException(401, "Invalid API key")
        if api_key_record.expires_at and api_key_record.expires_at < datetime.now(timezone.utc):
            raise HTTPException(401, "API key expired")
        # Update last_used_at
        api_key_record.last_used_at = datetime.now(timezone.utc)
        await db.commit()
        user = await db.get(User, api_key_record.user_id)
    else:
        raise HTTPException(401, "Authentication required", headers={"WWW-Authenticate": "Bearer"})
    
    if not user or not user.is_active:
        raise HTTPException(401, "User not found or inactive")
    
    return user

async def get_current_superuser(user: User = Depends(get_current_user)) -> User:
    """Verifica que el usuario sea superuser.
    
    Uso para endpoints admin-only.
    """
    if not user.is_superuser:
        raise HTTPException(403, "Superuser access required")
    return user
```

### Archivo: `app/routers/auth.py`

```python
from fastapi import APIRouter

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", status_code=201, summary="Registrar usuario")
async def register(
    email: str,
    password: str,
    full_name: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Registra un nuevo usuario.
    
    Validaciones:
    - Email único
    - Password mínimo 8 caracteres
    - Email formato válido
    
    Returns:
        {"id": 1, "email": "rod@ddi.co", "message": "User created"}
    """
    ...

@router.post("/login", summary="Iniciar sesión")
async def login(
    email: str,
    password: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Autentica y retorna tokens.
    
    Returns:
        {
            "access_token": "eyJ...",
            "refresh_token": "eyJ...",
            "token_type": "bearer",
            "expires_in": 1800
        }
    
    Si credenciales inválidas → 401 con mensaje genérico
    (nunca revelar si el email existe o no).
    """
    ...

@router.post("/refresh", summary="Refrescar token")
async def refresh_token(
    refresh_token: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Obtiene un nuevo access token usando el refresh token.
    
    Validaciones:
    - Token válido y no expirado
    - type == "refresh"
    - Usuario existe y está activo
    
    Returns:
        {
            "access_token": "eyJ... (nuevo)",
            "token_type": "bearer",
            "expires_in": 1800
        }
    """
    ...

@router.post("/api-keys", summary="Crear API Key")
async def create_api_key(
    name: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Crea una nueva API key para el usuario.
    
    ⚠️ La key se muestra UNA SOLA VEZ en esta respuesta.
    Después solo se almacena el hash.
    
    Returns:
        {
            "key": "ddi_a1b2c3d4...",  ← MOSTRAR UNA VEZ
            "name": "MCP DataPocket",
            "prefix": "ddi_a1b2",
            "created_at": "2026-04-15T..."
        }
    """
    ...

@router.get("/api-keys", summary="Listar API Keys")
async def list_api_keys(user: User = Depends(get_current_user)) -> list:
    """Lista las API keys del usuario (sin mostrar la key, solo prefix y metadata)."""
    ...

@router.delete("/api-keys/{key_id}", status_code=204, summary="Revocar API Key")
async def revoke_api_key(key_id: int, user: User = Depends(get_current_user)) -> None:
    """Revoca (elimina) una API key."""
    ...
```

### Archivo: `app/middleware/rate_limit.py`

```python
"""Rate limiting middleware usando sliding window con Redis.

Algoritmo: Sliding Window Counter
- Key: rate_limit:{ip}:{minute_window}
- Incrementar counter en cada request
- TTL: 60 segundos
- Si counter > RATE_LIMIT_PER_MINUTE → 429

Ventajas sobre fixed window:
- No hay "burst" al inicio de cada ventana
- Distribución más uniforme
"""

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

class RateLimitMiddleware(BaseHTTPMiddleware):
    """Middleware de rate limiting por IP.
    
    Configuración:
    - max_requests: Requests por minuto por IP. Default 60.
    - exclude_paths: Paths excluidos (ej: /health, /docs).
    
    Headers de respuesta:
    - X-RateLimit-Limit: Máximo permitido
    - X-RateLimit-Remaining: Restantes en la ventana actual
    - X-RateLimit-Reset: Timestamp de reset de la ventana
    
    Si se excede → HTTP 429 con header Retry-After.
    """
    
    def __init__(self, app, redis, max_requests: int = 60, exclude_paths: list[str] | None = None):
        super().__init__(app)
        self._redis = redis
        self._max_requests = max_requests
        self._exclude_paths = exclude_paths or ["/health", "/docs", "/redoc", "/openapi.json"]
    
    async def dispatch(self, request: Request, call_next) -> Response:
        """Procesa cada request verificando el rate limit.
        
        1. Si path está excluido → pasar directo
        2. Obtener IP del request
        3. Construir key: rate_limit:{ip}:{minute}
        4. INCR en Redis
        5. Si primer request → EXPIRE 60s
        6. Si count > max → 429
        7. Agregar headers de rate limit al response
        """
        ...
```

---

## Tests requeridos

### `tests/test_security.py`
1. **test_hash_password** — Hash y verify funcionan correctamente
2. **test_create_access_token** — Token contiene sub, exp, type="access"
3. **test_create_refresh_token** — Token contiene type="refresh", expira en 7 días
4. **test_decode_expired_token** — Token expirado → InvalidTokenError
5. **test_generate_api_key_format** — Key tiene formato ddi_{32_hex}
6. **test_verify_api_key** — Key generada verifica contra su hash

### `tests/test_auth_endpoints.py`
1. **test_register_success** — Datos válidos → 201 + user creado
2. **test_register_duplicate_email** — Email existente → 409
3. **test_login_success** — Credenciales válidas → tokens
4. **test_login_wrong_password** — Password incorrecto → 401 (mensaje genérico)
5. **test_login_nonexistent_email** — Email no existe → 401 (mismo mensaje que wrong password)
6. **test_refresh_token_success** — Refresh válido → nuevo access token
7. **test_refresh_with_access_token** — Enviar access token como refresh → error
8. **test_create_api_key** — Crear → retorna key una vez
9. **test_authenticate_with_api_key** — X-API-Key válida → acceso al endpoint
10. **test_expired_api_key** — Key expirada → 401

### `tests/test_rate_limit.py`
1. **test_within_limit** — 50 requests → todos pasan
2. **test_exceeds_limit** — 61 requests → request 61 retorna 429
3. **test_rate_limit_headers** — Response incluye X-RateLimit-* headers
4. **test_excluded_paths** — /health no cuenta para rate limit

---

## Anti-patrones

```python
# ❌ Revelar si el email existe
if not user:
    raise HTTPException(401, "Email not found")  # Enumeración de emails
# ✅ Siempre el mismo mensaje
raise HTTPException(401, "Invalid credentials")

# ❌ Token sin expiración
jwt.encode({"sub": user_id}, secret)  # Sin exp → token válido para siempre

# ❌ Almacenar API key en claro
api_key.key = "ddi_abc123"  # Cualquiera con acceso a DB tiene todas las keys

# ❌ Rate limiting sin Redis (en memoria)
request_counts = {}  # Se pierde al reiniciar, no funciona con múltiples workers

# ❌ Comparación de strings no segura
if key == stored_key:  # Vulnerable a timing attacks
# ✅ Usar secrets.compare_digest
```
