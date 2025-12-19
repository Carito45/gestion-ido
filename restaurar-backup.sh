#!/bin/bash
# restaurar-backup.sh - Restaura el último backup de forma segura

echo "🔍 Buscando último backup..."

ULTIMO_BACKUP=$(ls -td backups/pre-demo-seguro-* 2>/dev/null | head -1)

if [ -z "$ULTIMO_BACKUP" ]; then
  echo "❌ No se encontró backup"
  exit 1
fi

echo "📦 Backup encontrado: $ULTIMO_BACKUP"
echo ""
echo "⚠️  ADVERTENCIA: Esto sobrescribirá los datos actuales"
read -p "¿Continuar con la restauración? (s/n): " confirm

if [ "$confirm" != "s" ]; then
  echo "❌ Restauración cancelada"
  exit 0
fi

echo ""
echo "🔄 Deteniendo servidor..."
pm2 stop gestion-ido

echo "📥 Restaurando archivos..."
cp $ULTIMO_BACKUP/gestion_ido.db ./data/
cp -r $ULTIMO_BACKUP/uploads/* ./uploads/ 2>/dev/null || true

echo "🚀 Reiniciando servidor..."
pm2 restart gestion-ido

echo ""
echo "✅ ¡Sistema restaurado completamente!"
echo "📁 Desde: $ULTIMO_BACKUP"
