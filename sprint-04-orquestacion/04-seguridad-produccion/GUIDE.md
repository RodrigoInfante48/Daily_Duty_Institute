# 🛡️ Módulo 04 — Seguridad en Producción

## Objetivo

Asegurar la API para un entorno de producción real: secrets management, HTTPS, headers de seguridad, y checklist OWASP para APIs.

---

## Secrets Management

### Regla #1: Zero secrets en código

```bash
# ❌ NUNCA
JWT_SECRET = "super_secret_key_123"
DATABASE_URL = "postgresql://admin:real_password@prod-server:5432/ddi"

# ✅ SIEMPRE desde environment variables
JWT_SECRET = os.getenv("JWT_SECRET_KEY")
DATABASE_URL = os.getenv("DATABASE_URL")
```

### Archivo: `.env.example` (lo que va al repo)
```bash
# Copiar a .env y cambiar los valores
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/ddi
REDIS_URL=redis://localhost:6379/0
JWT_SECRET_KEY=GENERATE_WITH_openssl_rand_hex_32
```

### Generación de secrets seguros
```bash
# JWT Secret (64 hex chars)
openssl rand -hex 32

# API Key prefix
python -c "import secrets; print(f'ddi_{secrets.token_hex(16)}')"

# Database password
openssl rand -base64 24
```

### GitHub Secrets (para CI/CD)
Configurar en: Settings → Secrets and variables → Actions

| Secret Name | Descripción |
|-------------|-------------|
| `DATABASE_URL` | Connection string de producción |
| `JWT_SECRET_KEY` | Secreto JWT |
| `REDIS_URL` | URL de Redis producción |
| `REGISTRY_URL` | URL del container registry |

### Archivo: `.gitignore` (verificar que incluya)
```
.env
.env.*
!.env.example
*.pem
*.key
*.cert
secrets/
```

---

## Security Headers

### Archivo: `app/middleware/security_headers.py`

```python
"""Middleware que agrega headers de seguridad a cada response."""

from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request, Response

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Agrega headers de seguridad recomendados por OWASP.
    
    Headers:
    - X-Content-Type-Options: nosniff
      Previene que el browser interprete archivos con MIME incorrecto.
    
    - X-Frame-Options: DENY
      Previene clickjacking (tu API en un iframe malicioso).
    
    - Strict-Transport-Security: max-age=31536000; includeSubDomains
      Fuerza HTTPS por 1 año. Solo activar cuando HTTPS esté configurado.
    
    - X-XSS-Protection: 0
      Desactivado porque es legacy y puede causar vulnerabilidades.
      Content-Security-Policy es mejor.
    
    - Referrer-Policy: strict-origin-when-cross-origin
      Controla qué info se envía en el header Referer.
    
    - Cache-Control: no-store
      Para endpoints con datos sensibles. No cachear en el browser.
    
    - Permissions-Policy: geolocation=(), camera=(), microphone=()
      Restringe features del browser (relevante si sirves HTML).
    """
    
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), camera=(), microphone=()"
        
        # Solo para endpoints de datos (no docs)
        if request.url.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store"
        
        # HSTS: solo activar cuando HTTPS esté configurado
        # response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        return response
```

---

## Input Validation y SQL Injection Prevention

### Ya cubierto por el stack:
- **Pydantic v2**: Valida todos los inputs automáticamente
- **SQLAlchemy**: Parametriza queries automáticamente
- **DbtModelRegistry**: Tabla/columna validada contra whitelist

### Verificar que NUNCA se haga:
```python
# ❌ SQL injection
await db.execute(text(f"SELECT * FROM {user_input}"))

# ❌ Path traversal
file_path = f"/data/{user_input}.csv"

# ❌ Command injection
os.system(f"dbt run --select {user_input}")
```

---

## CORS Configuration

```python
# Desarrollo
CORS_ORIGINS = ["http://localhost:3000", "http://localhost:8080"]

# Producción
CORS_ORIGINS = [
    "https://dailyduty.co",
    "https://app.dailyduty.co",
    "https://rodrigoinfante48.github.io",
]

# ❌ NUNCA en producción
CORS_ORIGINS = ["*"]  # Cualquier sitio puede llamar tu API
```

---

## Error Response Sanitization

```python
# ❌ Exponer detalles internos en producción
@app.exception_handler(Exception)
async def generic_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={
            "detail": str(exc),  # Puede contener SQL, paths, secrets
            "traceback": traceback.format_exc(),  # NUNCA
        },
    )

# ✅ Sanitizar en producción
@app.exception_handler(Exception)
async def generic_exception_handler(request, exc):
    # Log completo internamente
    logger.exception("Unhandled exception", extra={"path": request.url.path})
    
    # Response genérico al cliente
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error" if not settings.DEBUG else str(exc),
            "error_code": "INTERNAL_ERROR",
        },
    )
```

---

## Dependency Audit

### Script: `scripts/security_audit.sh`
```bash
#!/bin/bash
echo "=== Security Audit ==="

echo -e "\n1. Checking for known vulnerabilities..."
pip audit

echo -e "\n2. Checking for hardcoded secrets..."
grep -rn "password\s*=" --include="*.py" app/ | grep -v "hashed_password" | grep -v ".env"
grep -rn "secret\s*=" --include="*.py" app/ | grep -v "os.getenv" | grep -v "settings."
grep -rn "api_key\s*=" --include="*.py" app/ | grep -v "os.getenv" | grep -v "settings."

echo -e "\n3. Checking .env is gitignored..."
if git check-ignore .env > /dev/null 2>&1; then
    echo "✅ .env is gitignored"
else
    echo "❌ WARNING: .env is NOT gitignored!"
fi

echo -e "\n4. Checking for DEBUG=True..."
grep -rn "DEBUG.*=.*True" --include="*.py" app/ | grep -v "settings\."
grep "DEBUG=true" .env 2>/dev/null && echo "⚠️ DEBUG is true in .env"

echo -e "\n=== Audit Complete ==="
```

---

## OWASP API Security Top 10 — Checklist

| # | Riesgo | Mitigación | Estado |
|---|--------|-----------|--------|
| 1 | Broken Object Level Authorization | Verificar `owner_id` en cada query | [ ] |
| 2 | Broken Authentication | JWT + refresh + API Keys con hash | [ ] |
| 3 | Broken Object Property Level Authorization | Pydantic schemas controlan qué se expone | [ ] |
| 4 | Unrestricted Resource Consumption | Rate limiting + max_page_size | [ ] |
| 5 | Broken Function Level Authorization | `get_current_user` + `get_current_superuser` | [ ] |
| 6 | Unrestricted Access to Sensitive Business Flows | Endpoints críticos requieren auth | [ ] |
| 7 | Server Side Request Forgery | No proxy requests del usuario | [ ] |
| 8 | Security Misconfiguration | CORS restrictivo, headers, no DEBUG | [ ] |
| 9 | Improper Inventory Management | OpenAPI docs auto-generados | [ ] |
| 10 | Unsafe Consumption of APIs | httpx con timeout + SSL verify | [ ] |

---

## Tests requeridos

### `tests/test_security_prod.py`
1. **test_security_headers_present** — Todos los headers de seguridad en response
2. **test_cors_rejects_unknown_origin** — Origin no permitido → request bloqueado
3. **test_error_no_traceback_in_prod** — Error 500 → no traceback en response (DEBUG=False)
4. **test_error_shows_traceback_in_debug** — Error 500 → traceback en response (DEBUG=True)
5. **test_sql_injection_prevented** — Input malicioso en filtro → no ejecuta SQL
6. **test_rate_limit_by_ip** — 61 requests → 429
7. **test_auth_required_on_protected** — Sin token → 401 en todos los endpoints /api/v1/*
8. **test_api_key_hash_stored** — Crear API key → solo hash en DB, no plaintext
