# 🗄️ Módulo 02 — Modelos de Datos (SQLAlchemy + Alembic)

## Objetivo

Configurar SQLAlchemy 2.0 async con PostgreSQL y Alembic para migrations automáticas. Crear los modelos ORM que respaldan la API.

---

## Stack de base de datos

```
FastAPI endpoint
      │
      ▼
Pydantic Schema (validación)
      │
      ▼
Service Layer (lógica de negocio)
      │
      ▼
SQLAlchemy Model (ORM)
      │
      ▼
asyncpg Driver (async I/O)
      │
      ▼
PostgreSQL 16
```

---

## Spec de implementación

### Archivo: `app/core/database.py`

```python
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    """Base class para todos los modelos ORM.
    
    Todos los modelos heredan de esta clase.
    Alembic la usa para autogenerar migrations.
    """
    pass

class DatabaseManager:
    """Administra el engine y session factory de SQLAlchemy.
    
    Uso:
        db_manager = DatabaseManager(settings.DATABASE_URL)
        await db_manager.initialize()
        
        async with db_manager.session() as session:
            result = await session.execute(select(Project))
        
        await db_manager.close()
    
    Attributes:
        _engine: AsyncEngine con connection pool.
        _session_factory: Factory de AsyncSession.
    """
    
    def __init__(self, database_url: str, echo: bool = False, pool_size: int = 10):
        """
        Args:
            database_url: PostgreSQL connection string con asyncpg.
                          Formato: postgresql+asyncpg://user:pass@host:port/db
            echo: Si True, loggea todas las queries SQL. Solo para debug.
            pool_size: Tamaño del connection pool. Default 10.
        """
        self._engine = create_async_engine(
            database_url,
            echo=echo,
            pool_size=pool_size,
            max_overflow=5,
            pool_pre_ping=True,  # Verifica conexiones antes de usar
        )
        self._session_factory = async_sessionmaker(
            self._engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )
    
    async def initialize(self) -> None:
        """Crea las tablas si no existen. Solo para desarrollo.
        En producción, usar Alembic migrations."""
        async with self._engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    
    def session(self) -> AsyncSession:
        """Retorna una nueva sesión del pool."""
        return self._session_factory()
    
    async def close(self) -> None:
        """Cierra el engine y todas las conexiones del pool."""
        await self._engine.dispose()
```

### Archivo: `app/models/base.py`

```python
from datetime import datetime
from sqlalchemy import func
from sqlalchemy.orm import Mapped, mapped_column

class TimestampMixin:
    """Mixin que agrega created_at y updated_at a cualquier modelo.
    
    created_at: Se setea automáticamente al insertar.
    updated_at: Se actualiza automáticamente en cada update.
    """
    created_at: Mapped[datetime] = mapped_column(
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

class SoftDeleteMixin:
    """Mixin para soft delete.
    
    deleted_at: None = activo. Timestamp = eliminado.
    Todos los queries deben filtrar: WHERE deleted_at IS NULL
    """
    deleted_at: Mapped[datetime | None] = mapped_column(default=None)
    
    @property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None
```

### Archivo: `app/models/user.py`

```python
from sqlalchemy import String, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

class User(Base, TimestampMixin):
    """Modelo de usuario.
    
    Tabla: users
    
    Columns:
        id: Primary key autoincremental.
        email: Único, indexado, no nulo.
        hashed_password: Bcrypt hash del password.
        full_name: Nombre completo.
        is_active: Si el usuario puede loggearse. Default True.
        is_superuser: Si tiene permisos de admin. Default False.
    
    Relationships:
        projects: Lista de proyectos del usuario (one-to-many).
        api_keys: Lista de API keys del usuario (one-to-many).
    """
    __tablename__ = "users"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(100), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Relationships
    projects: Mapped[list["Project"]] = relationship(back_populates="owner", lazy="selectin")
    api_keys: Mapped[list["APIKey"]] = relationship(back_populates="user", lazy="selectin")
```

### Archivo: `app/models/project.py`

```python
from sqlalchemy import String, Integer, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

class Project(Base, TimestampMixin, SoftDeleteMixin):
    """Modelo de proyecto DMAIC.
    
    Tabla: projects
    
    Columns:
        id: Primary key.
        name: Nombre del proyecto (3-100 chars).
        description: Descripción opcional (max 500 chars).
        status: Fase DMAIC actual (define, measure, analyze, improve, control, completed).
        industry: Industria target (veterinaria, gym, estetica, etc.).
        owner_id: FK al usuario dueño.
    
    Indexes:
        - ix_projects_owner_id: Para queries por usuario.
        - ix_projects_status: Para filtros por fase.
    """
    __tablename__ = "projects"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(
        SQLEnum("define", "measure", "analyze", "improve", "control", "completed", name="project_status"),
        default="define",
        nullable=False,
    )
    industry: Mapped[str | None] = mapped_column(String(50), nullable=True)
    owner_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Relationships
    owner: Mapped["User"] = relationship(back_populates="projects")
```

### Archivo: `app/models/api_key.py`

```python
from sqlalchemy import String, Integer, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime

class APIKey(Base, TimestampMixin):
    """Modelo de API Key para acceso programático.
    
    Tabla: api_keys
    
    Columns:
        id: Primary key.
        key_hash: Hash SHA256 de la API key. NUNCA almacenar la key en claro.
        name: Nombre descriptivo (ej: "MCP DataPocket", "Script ETL").
        prefix: Primeros 8 caracteres de la key para identificación visual (ej: "ddi_8f3a").
        user_id: FK al usuario dueño.
        last_used_at: Último uso de la key.
        expires_at: Expiración opcional.
    
    La key real solo se muestra UNA VEZ al crearla.
    Después solo se guarda el hash para verificación.
    """
    __tablename__ = "api_keys"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    key_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    prefix: Mapped[str] = mapped_column(String(12), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    
    # Relationships
    user: Mapped["User"] = relationship(back_populates="api_keys")
```

---

## Alembic Setup

### Inicialización
```bash
alembic init alembic
```

### Archivo: `alembic/env.py` (modificaciones clave)
```python
# Importar los modelos para que Alembic los detecte
from app.models.user import User
from app.models.project import Project
from app.models.api_key import APIKey
from app.core.database import Base

target_metadata = Base.metadata

# Configurar para async
from sqlalchemy.ext.asyncio import create_async_engine

def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()

async def run_async_migrations():
    engine = create_async_engine(config.get_main_option("sqlalchemy.url"))
    async with engine.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await engine.dispose()
```

### Comandos de Alembic
```bash
# Generar migration automática
alembic revision --autogenerate -m "create users and projects tables"

# Aplicar migrations
alembic upgrade head

# Revertir última migration
alembic downgrade -1

# Ver historial
alembic history
```

---

## Archivo: `app/services/project_service.py`

```python
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

class ProjectService:
    """Capa de lógica de negocio para proyectos.
    
    Separa la lógica del router. El router solo:
    1. Recibe input (validado por Pydantic)
    2. Llama al service
    3. Retorna response
    
    El service:
    1. Ejecuta queries
    2. Aplica reglas de negocio
    3. Retorna datos o lanza excepciones
    """
    
    def __init__(self, db: AsyncSession):
        self._db = db
    
    async def list_projects(
        self,
        owner_id: int,
        page: int = 1,
        page_size: int = 20,
        status: str | None = None,
        industry: str | None = None,
    ) -> tuple[list[Project], int]:
        """Lista proyectos con paginación y filtros.
        
        Returns:
            Tuple de (lista de proyectos, total count).
        """
        query = select(Project).where(
            Project.owner_id == owner_id,
            Project.deleted_at.is_(None),
        )
        
        if status:
            query = query.where(Project.status == status)
        if industry:
            query = query.where(Project.industry == industry)
        
        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total = (await self._db.execute(count_query)).scalar_one()
        
        # Paginate
        query = query.offset((page - 1) * page_size).limit(page_size)
        result = await self._db.execute(query)
        
        return list(result.scalars().all()), total
    
    async def create_project(self, owner_id: int, data: ProjectCreate) -> Project:
        """Crea un nuevo proyecto.
        
        Reglas de negocio:
        - Un usuario no puede tener dos proyectos con el mismo nombre.
        - Status inicial siempre es "define".
        """
        ...
    
    async def get_project(self, project_id: int, owner_id: int) -> Project:
        """Obtiene un proyecto verificando ownership.
        
        Raises:
            NotFoundError: Si no existe o está deleted.
            ForbiddenError: Si el proyecto no pertenece al usuario.
        """
        ...
    
    async def update_project(self, project_id: int, owner_id: int, data: ProjectUpdate) -> Project:
        """Actualiza campos de un proyecto.
        
        Solo actualiza campos presentes en data (partial update).
        """
        ...
    
    async def delete_project(self, project_id: int, owner_id: int) -> None:
        """Soft delete: marca deleted_at con timestamp actual."""
        ...
```

---

## Tests requeridos

### `tests/test_models.py`
1. **test_user_creation** — Crear User → id generado, timestamps seteados
2. **test_project_creation_with_defaults** — Project sin status → status="define"
3. **test_soft_delete** — Marcar deleted_at → is_deleted retorna True
4. **test_user_project_relationship** — User.projects retorna sus proyectos

### `tests/test_services.py`
1. **test_list_projects_pagination** — 15 proyectos, page=2, size=10 → 5 items
2. **test_list_projects_filter_status** — Filtrar measure → solo proyectos en measure
3. **test_create_project_duplicate_name** — Mismo nombre → error
4. **test_get_project_wrong_owner** — Proyecto de otro user → ForbiddenError
5. **test_delete_project_soft** — Delete → proyecto sigue en DB con deleted_at

### `tests/conftest.py`
```python
"""Fixtures compartidos para tests.

Incluir:
- async_session: Sesión de DB con SQLite in-memory (no PostgreSQL en tests)
- test_user: Usuario de prueba creado
- test_project: Proyecto de prueba
- async_client: httpx.AsyncClient contra la app de test
"""
```

---

## Anti-patrones

```python
# ❌ Queries SQL raw sin parametrizar
await db.execute(text(f"SELECT * FROM projects WHERE name = '{name}'"))
# SQL injection garantizada

# ❌ Sync driver en async app
DATABASE_URL = "postgresql://..."  # Falta +asyncpg

# ❌ No usar relationship lazy loading correctamente
user = await db.get(User, 1)
print(user.projects)  # Error: lazy load en contexto async
# Usar lazy="selectin" o explicit join

# ❌ Crear tablas en producción con create_all
await Base.metadata.create_all(engine)  # Usar Alembic migrations
```
