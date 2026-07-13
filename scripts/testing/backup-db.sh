#!/bin/bash
# ========================================
# 🗄️ SCRIPT DE BACKUP AUTOMÁTICO
# Sistema de Gestión IDO
# ========================================

# Configuración
PROJECT_DIR="/home/carito/gestion-ido"
DB_FILE="$PROJECT_DIR/data/gestion_ido.db"
BACKUP_DIR="$PROJECT_DIR/backups/daily"
LOG_FILE="$PROJECT_DIR/logs/backup.log"
RETENTION_DAYS=30

# Fecha actual
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
DATE=$(date +%Y-%m-%d)

# Crear carpeta de backups si no existe
mkdir -p "$BACKUP_DIR"
mkdir -p "$(dirname "$LOG_FILE")"

# Función de log
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=========================================="
log "Iniciando backup de base de datos"

# Verificar que la base de datos existe
if [ ! -f "$DB_FILE" ]; then
    log "❌ ERROR: Base de datos no encontrada en $DB_FILE"
    exit 1
fi

# Crear backup
BACKUP_FILE="$BACKUP_DIR/gestion_ido_$TIMESTAMP.db"
log "Creando backup: $BACKUP_FILE"

# Usar sqlite3 para backup consistente
sqlite3 "$DB_FILE" ".backup '$BACKUP_FILE'" 2>&1 | tee -a "$LOG_FILE"

if [ $? -eq 0 ] && [ -f "$BACKUP_FILE" ]; then
    # Comprimir backup
    gzip "$BACKUP_FILE"
    BACKUP_FILE="$BACKUP_FILE.gz"
    
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log "✅ Backup creado exitosamente: $BACKUP_FILE ($BACKUP_SIZE)"
    
    # Verificar integridad del backup
    gunzip -c "$BACKUP_FILE" | sqlite3 :memory: "PRAGMA integrity_check;" > /tmp/backup_check.txt 2>&1
    
    if grep -q "ok" /tmp/backup_check.txt; then
        log "✅ Integridad del backup verificada: OK"
    else
        log "⚠️ ADVERTENCIA: No se pudo verificar la integridad del backup"
    fi
    
    rm /tmp/backup_check.txt
    
else
    log "❌ ERROR: Falló la creación del backup"
    exit 1
fi

# Eliminar backups antiguos (más de RETENTION_DAYS días)
log "Limpiando backups antiguos (más de $RETENTION_DAYS días)..."
DELETED=$(find "$BACKUP_DIR" -name "gestion_ido_*.db.gz" -type f -mtime +$RETENTION_DAYS -delete -print | wc -l)

if [ "$DELETED" -gt 0 ]; then
    log "🗑️ $DELETED backups antiguos eliminados"
else
    log "✅ No hay backups antiguos para eliminar"
fi

# Resumen
TOTAL_BACKUPS=$(ls -1 "$BACKUP_DIR"/gestion_ido_*.db.gz 2>/dev/null | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)

log "📊 Resumen: $TOTAL_BACKUPS backups en $BACKUP_DIR ($TOTAL_SIZE)"
log "✅ Backup completado exitosamente"
log "=========================================="

exit 0
