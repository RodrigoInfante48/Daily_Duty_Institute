#!/bin/bash
# ============================================================
# SCRIPT: push_to_github.sh
# Sube el contenido de api-mastery/ al repo Daily_Duty_Institute
#
# INSTRUCCIONES:
# 1. Descarga la carpeta api-mastery/ completa
# 2. Abre terminal en la carpeta donde la descargaste
# 3. Ejecuta: bash push_to_github.sh
#
# PREREQUISITOS:
# - Git instalado
# - GitHub CLI (gh) instalado, O un Personal Access Token configurado
# - Acceso al repo: github.com/RodrigoInfante48/Daily_Duty_Institute
# ============================================================

set -e  # Parar si hay error

REPO_URL="https://github.com/RodrigoInfante48/Daily_Duty_Institute.git"
BRANCH="main"

echo "🚀 Iniciando push al repo Daily_Duty_Institute..."

# Verificar que estamos en el directorio correcto
if [ ! -f "README.md" ]; then
    echo "❌ Error: Ejecuta este script desde dentro de la carpeta api-mastery/"
    echo "   cd api-mastery && bash push_to_github.sh"
    exit 1
fi

# Inicializar git si no existe
if [ ! -d ".git" ]; then
    git init
    git branch -M $BRANCH
fi

# Configurar remote
git remote remove origin 2>/dev/null || true
git remote add origin $REPO_URL

# Configurar usuario (cambiar si necesitas)
git config user.email "rod@dailyduty.co"
git config user.name "Rodrigo Infante"

# Agregar todos los archivos
git add -A

# Commit
git commit -m "🏗️ feat: API Mastery Roadmap - estructura completa

- Sprint 01: Consumo avanzado (auth, paginación, rate limits, cliente HTTP)
- Sprint 02: FastAPI core (routers, SQLAlchemy, JWT, OpenAPI)
- Sprint 03: dbt-API bridge + Redis cache + MCP integration
- Sprint 04: Docker + CI/CD + monitoring + seguridad producción
- Docs: Architecture ADRs, patterns, glossary, decision log
- Shared: config, exceptions, requirements

Total: 16 GUIDE.md con specs de implementación completas"

# Push
echo "📤 Pushing a $BRANCH..."
git push -u origin $BRANCH

echo ""
echo "✅ Push exitoso!"
echo "🔗 Repo: https://github.com/RodrigoInfante48/Daily_Duty_Institute"
echo ""
echo "Próximo paso: Abrir sprint-01-consumo-avanzado/SPRINT.md y arrancar"
