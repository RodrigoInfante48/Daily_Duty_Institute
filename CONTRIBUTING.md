# 🤝 CONTRIBUTING.md — Guía para Developers

## Roles

| Rol | Quién | Responsabilidad |
|-----|-------|-----------------|
| **Arquitecto / Tech Lead** | Rod | Define specs, revisa PRs, toma decisiones de arquitectura |
| **Mid-Jr Developers** | Qwen 3.5, Gemini 3 | Implementan código siguiendo las GUIDE.md |

---

## Reglas de oro

### 1. Lee antes de codear
Cada módulo tiene una `GUIDE.md`. Es tu spec técnica. Si la GUIDE dice "usar httpx", no uses requests. Si dice "Pydantic v2", no uses dataclasses. La GUIDE es ley.

### 2. Tests primero (o al menos al mismo tiempo)
Ningún PR se acepta sin tests. Mínimo:
- 1 test de happy path
- 1 test de error handling
- 1 test de edge case (si aplica)

### 3. Type hints obligatorios
```python
# ❌ Mal
def fetch_data(url, params):
    ...

# ✅ Bien
async def fetch_data(url: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
    ...
```

### 4. Docstrings en Google style
```python
async def paginate_api(
    client: httpx.AsyncClient,
    url: str,
    max_pages: int = 10,
) -> list[dict[str, Any]]:
    """Consume una API paginada y retorna todos los resultados.

    Args:
        client: Cliente HTTP configurado con auth.
        url: URL base del endpoint paginado.
        max_pages: Límite de páginas a consumir. Default 10.

    Returns:
        Lista combinada de todos los items de todas las páginas.

    Raises:
        RateLimitError: Si se excede el rate limit después de reintentos.
        AuthenticationError: Si el token expiró y no se pudo refrescar.
    """
```

### 5. Naming conventions

| Tipo | Convención | Ejemplo |
|------|-----------|---------|
| Archivos | snake_case | `token_manager.py` |
| Clases | PascalCase | `TokenManager` |
| Funciones | snake_case | `refresh_token()` |
| Constantes | UPPER_SNAKE | `MAX_RETRIES` |
| Variables privadas | _prefijo | `_token_cache` |

---

## Workflow de contribución

```
1. Rod asigna tarea (referencia SPRINT.md + GUIDE.md)
         │
2. Dev lee GUIDE.md completa
         │
3. Dev implementa en branch: sprint-XX/nombre-modulo
         │
4. Dev escribe tests
         │
5. Dev verifica:
   □ mypy pasa sin errores
   □ ruff pasa sin warnings
   □ pytest pasa al 100%
         │
6. Dev crea PR con template (ver abajo)
         │
7. Rod revisa y merge
```

---

## Template de PR

```markdown
## Qué hace este PR

[Descripción clara de lo implementado]

## GUIDE.md de referencia

`sprint-XX/modulo/GUIDE.md`

## Checklist

- [ ] GUIDE.md leída y seguida
- [ ] Type hints en todas las funciones
- [ ] Docstrings en todas las funciones públicas
- [ ] Tests escritos y pasando
- [ ] No hay secrets hardcodeados
- [ ] Imports ordenados (stdlib → third-party → local)
```

---

## Setup del entorno de desarrollo

```bash
# Clonar
git clone https://github.com/RodrigoInfante48/Daily_Duty_Institute.git
cd Daily_Duty_Institute/api-mastery

# Entorno virtual
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
# .venv\Scripts\activate   # Windows

# Dependencias
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Verificar
pytest --tb=short
mypy .
ruff check .
```

---

## Herramientas de calidad

| Herramienta | Propósito | Comando |
|-------------|-----------|---------|
| `pytest` | Tests | `pytest -v` |
| `mypy` | Type checking | `mypy .` |
| `ruff` | Linting + formatting | `ruff check . && ruff format .` |
| `coverage` | Cobertura de tests | `pytest --cov=. --cov-report=html` |

---

## Estructura de tests

```
tests/
├── conftest.py          ← Fixtures compartidos
├── test_auth/
│   ├── test_oauth2.py
│   └── test_token_manager.py
├── test_pagination/
│   └── test_paginator.py
└── test_rate_limits/
    └── test_rate_limiter.py
```

Cada archivo de test sigue esta convención:
```python
class TestNombreClase:
    """Tests para NombreClase."""

    async def test_happy_path(self):
        """Verifica el comportamiento esperado."""
        ...

    async def test_error_handling(self):
        """Verifica manejo de errores."""
        ...
```

---

## Variables de entorno

Usar `.env` + `Pydantic BaseSettings`. Nunca hardcodear secrets.

```bash
# .env.example (copiar a .env)
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/ddi
REDIS_URL=redis://localhost:6379/0
JWT_SECRET_KEY=cambiar-en-produccion
API_KEY_SALT=cambiar-en-produccion
NOTION_API_KEY=secret_xxx
```
