# 🏃 Sprint 01 — Consumo Avanzado de APIs

**Duración:** 2 semanas  
**Objetivo:** Construir un cliente HTTP de producción en Python capaz de consumir cualquier API con autenticación, paginación y manejo de rate limits.

---

## Entregables

| # | Módulo | Entregable | Criterio de aceptación |
|---|--------|-----------|----------------------|
| 1 | Autenticación | `token_manager.py` + `oauth2_flow.py` | Soporta API Key, Bearer Token, OAuth2 con refresh automático |
| 2 | Paginación | `paginator.py` | Consume offset, cursor y keyset pagination de forma genérica |
| 3 | Rate Limits | `rate_limiter.py` | Implementa exponential backoff + circuit breaker |
| 4 | Cliente HTTP | `api_client.py` | Cliente unificado que integra auth + pagination + rate limits |

---

## Definition of Done (por módulo)

- [ ] Código implementado siguiendo la GUIDE.md
- [ ] Type hints completos (mypy strict)
- [ ] Docstrings en todas las funciones públicas
- [ ] Mínimo 3 tests por módulo (happy path, error, edge case)
- [ ] Zero secrets hardcodeados
- [ ] Funciona async con httpx

---

## APIs de práctica (entornos seguros)

Usar estas APIs para testing sin riesgo:

| API | Auth | Paginación | Rate Limit | URL |
|-----|------|-----------|------------|-----|
| JSONPlaceholder | Ninguna | Offset | No | jsonplaceholder.typicode.com |
| GitHub REST | Token | Cursor (Link header) | 5000/hr | api.github.com |
| Notion | Bearer | Cursor (`next_cursor`) | 3 req/s | api.notion.com |
| Spotify | OAuth2 PKCE | Offset + limit | 30 req/s | api.spotify.com |
| Airtable | Bearer | Offset | 5 req/s | api.airtable.com |

---

## Orden de implementación

```
Semana 1:
  Día 1-2 → Módulo 01: Autenticación
  Día 3-4 → Módulo 02: Paginación
  Día 5   → Tests + integración de ambos

Semana 2:
  Día 1-2 → Módulo 03: Rate Limits
  Día 3-4 → Módulo 04: Cliente HTTP unificado
  Día 5   → Tests de integración end-to-end
```

---

## Cómo asignar a los devs

### Para Qwen 3.5 / Gemini 3:

Prompt template para asignar implementación:

```
Contexto: Estoy construyendo un cliente HTTP de producción en Python.
Tu rol: Mid-Jr developer. Implementa exactamente lo que dice la GUIDE.md.

Archivo a implementar: [nombre del archivo]
Lee esta spec completa: [pegar contenido de GUIDE.md]

Restricciones:
- Usa httpx (no requests)
- Async obligatorio
- Type hints completos
- Docstrings en Google style
- No hardcodear ningún secret
- Incluye tests en pytest

Entregame: El código completo del archivo + los tests.
```

---

## Conexión con el ecosistema DDI

Al completar este sprint tendrás:
- Un cliente que puede extraer datos de Notion API (para DentBot)
- Un cliente que puede consumir Airtable API (para tu CRM de veterinarios)
- Un patrón replicable para cualquier API nueva que necesites integrar
- La base del pipeline ETL: API → Python → PostgreSQL
