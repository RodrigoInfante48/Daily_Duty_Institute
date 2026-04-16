# 📝 Decision Log

Log cronológico de decisiones técnicas tomadas durante el desarrollo.

---

| Fecha | Decisión | Contexto | Decidido por |
|-------|---------|----------|-------------|
| 2026-04-15 | Usar httpx en lugar de requests | Necesitamos async para pipelines concurrentes | Rod (Arquitecto) |
| 2026-04-15 | FastAPI como framework | Pydantic nativo, OpenAPI auto, mejor rendimiento | Rod (Arquitecto) |
| 2026-04-15 | Auth en 3 niveles (público, API Key, JWT) | Diferentes consumers necesitan diferentes niveles | Rod (Arquitecto) |
| 2026-04-15 | Redis para cache de modelos dbt | dbt corre en schedule, no en cada request | Rod (Arquitecto) |
| 2026-04-15 | Estructura modular por dominio | Escalabilidad y testabilidad | Rod (Arquitecto) |
| 2026-04-15 | Proyecto estructurado en 4 sprints | Entrega incremental de valor, cada sprint es usable | Rod (Arquitecto) |

---

## Cómo agregar entradas

```
| YYYY-MM-DD | Qué se decidió | Por qué | Quién lo decidió |
```
