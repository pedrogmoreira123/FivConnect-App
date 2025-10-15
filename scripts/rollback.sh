#!/bin/bash
echo "🔄 Iniciando rollback..."

# Buscar última tag de backup
BACKUP_TAG=$(git tag -l "backup-pre-melhorias-*" | sort -r | head -n 1)

if [ -z "$BACKUP_TAG" ]; then
  echo "❌ Nenhuma tag de backup encontrada!"
  exit 1
fi

echo "📦 Rollback para: $BACKUP_TAG"
git checkout $BACKUP_TAG

echo "🔨 Rebuilding..."
npm run build

echo "✅ Rollback concluído!"
echo "⚠️  Lembre-se de reiniciar o servidor!"
