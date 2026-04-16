# 🔄 Módulo 02 — CI/CD (GitHub Actions)

## Objetivo

Automatizar tests, linting, y build en cada push/PR con GitHub Actions. Asegurar que código roto nunca llegue a main.

---

## Pipeline overview

```
Push a branch / PR
      │
      ├── Job 1: Lint & Type Check
      │   ├── ruff check .
      │   └── mypy .
      │
      ├── Job 2: Tests
      │   ├── pytest con PostgreSQL service
      │   └── Coverage report
      │
      └── Job 3: Build (solo si tests pasan)
          ├── Docker build
          └── Push a registry (solo en main)
```

---

## Archivo: `.github/workflows/api-ci.yml`

```yaml
name: DDI API CI

on:
  push:
    branches: [main, develop]
    paths:
      - 'api-mastery/**'
  pull_request:
    branches: [main]
    paths:
      - 'api-mastery/**'

env:
  PYTHON_VERSION: "3.12"

jobs:
  lint:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: api-mastery

    steps:
      - uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: ${{ env.PYTHON_VERSION }}

      - name: Cache pip
        uses: actions/cache@v4
        with:
          path: ~/.cache/pip
          key: ${{ runner.os }}-pip-${{ hashFiles('api-mastery/requirements*.txt') }}

      - name: Install dependencies
        run: |
          pip install -r requirements.txt -r requirements-dev.txt

      - name: Ruff lint
        run: ruff check . --output-format=github

      - name: Ruff format check
        run: ruff format --check .

      - name: Mypy type check
        run: mypy . --ignore-missing-imports

  test:
    name: Tests
    runs-on: ubuntu-latest
    needs: lint
    defaults:
      run:
        working-directory: api-mastery

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: ddi_test
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_pass
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    env:
      DATABASE_URL: postgresql+asyncpg://test_user:test_pass@localhost:5432/ddi_test
      REDIS_URL: redis://localhost:6379/1
      JWT_SECRET_KEY: test-secret-key-not-for-production
      TESTING: "true"

    steps:
      - uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: ${{ env.PYTHON_VERSION }}

      - name: Cache pip
        uses: actions/cache@v4
        with:
          path: ~/.cache/pip
          key: ${{ runner.os }}-pip-${{ hashFiles('api-mastery/requirements*.txt') }}

      - name: Install dependencies
        run: |
          pip install -r requirements.txt -r requirements-dev.txt

      - name: Run tests with coverage
        run: |
          pytest -v \
            --tb=short \
            --cov=app \
            --cov-report=xml \
            --cov-report=term-missing \
            --cov-fail-under=80

      - name: Upload coverage
        if: github.event_name == 'pull_request'
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: api-mastery/coverage.xml

  build:
    name: Build Docker Image
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main'
    defaults:
      run:
        working-directory: api-mastery

    steps:
      - uses: actions/checkout@v4

      - name: Build image
        run: |
          docker build -t ddi-api:${{ github.sha }} .
          docker build -t ddi-api:latest .

      - name: Verify image
        run: |
          docker run --rm ddi-api:latest python -c "from app.main import app; print('App loaded successfully')"

      # Descomentar cuando tengas un registry
      # - name: Push to registry
      #   run: |
      #     docker tag ddi-api:latest ${{ secrets.REGISTRY_URL }}/ddi-api:latest
      #     docker push ${{ secrets.REGISTRY_URL }}/ddi-api:latest

  security:
    name: Security Audit
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: api-mastery

    steps:
      - uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: ${{ env.PYTHON_VERSION }}

      - name: Install dependencies
        run: pip install -r requirements.txt

      - name: Audit dependencies
        run: pip audit

      - name: Check for secrets
        uses: trufflesecurity/trufflehog@main
        with:
          extra_args: --only-verified
```

---

## Branch strategy

```
main           ← Producción. Solo merges de develop. Protected.
  │
develop        ← Integración. PRs de feature branches.
  │
sprint-XX/     ← Feature branches por módulo.
feature-name
```

### Branch protection rules (configurar en GitHub):
- `main`:
  - Require PR review (1 aprobación)
  - Require status checks (lint, test, build)
  - No direct pushes
  - No force pushes

---

## Checklist de CI/CD

- [ ] `.github/workflows/api-ci.yml` creado y comiteado
- [ ] Pipeline corre en push a main y develop
- [ ] Pipeline corre en PRs a main
- [ ] Lint job pasa (ruff + mypy)
- [ ] Test job corre con PostgreSQL y Redis services
- [ ] Coverage mínimo 80%
- [ ] Build job crea imagen Docker exitosamente
- [ ] Security audit job corre pip audit
- [ ] Branch protection configurado en main
