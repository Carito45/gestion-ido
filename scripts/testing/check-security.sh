cd ~/gestion-ido

echo "🔍 Verificando configuración de seguridad..."
echo ""

# 1. Archivo .env
echo "1. Verificando .env..."
if [ -f .env ] && [ $(stat -c %a .env) = "600" ]; then
    echo "   ✅ .env existe con permisos correctos (600)"
else
    echo "   ❌ .env no existe o tiene permisos incorrectos"
fi

# 2. DB_ENCRYPTION_KEY
echo "2. Verificando clave de cifrado..."
source .env
if [ ${#DB_ENCRYPTION_KEY} -ge 64 ]; then
    echo "   ✅ DB_ENCRYPTION_KEY tiene longitud correcta (${#DB_ENCRYPTION_KEY} caracteres)"
else
    echo "   ❌ DB_ENCRYPTION_KEY muy corta (${#DB_ENCRYPTION_KEY} caracteres, necesita ≥64)"
fi

# 3. Módulo de cifrado
echo "3. Verificando módulo de cifrado..."
if [ -f config/encryption.js ]; then
    echo "   ✅ config/encryption.js existe"
else
    echo "   ❌ config/encryption.js no existe"
fi

# 4. Directorio de logs
echo "4. Verificando logs..."
if [ -d logs ]; then
    echo "   ✅ Directorio logs/ existe"
else
    echo "   ❌ Directorio logs/ no existe"
fi

# 5. Directorio de backups
echo "5. Verificando backups..."
if [ -d backups ]; then
    echo "   ✅ Directorio backups/ existe"
    backup_count=$(ls -1 backups/*.gz 2>/dev/null | wc -l)
    echo "   📊 Backups disponibles: $backup_count"
else
    echo "   ❌ Directorio backups/ no existe"
fi

# 6. Script de backup
echo "6. Verificando script de backup..."
if [ -x backup-database.sh ]; then
    echo "   ✅ backup-database.sh es ejecutable"
else
    echo "   ❌ backup-database.sh no existe o no es ejecutable"
fi

# 7. Cron jobs
echo "7. Verificando cron jobs..."
cron_count=$(crontab -l 2>/dev/null | grep -c backup-database.sh)
if [ "$cron_count" -gt 0 ]; then
    echo "   ✅ $cron_count cron jobs configurados"
else
    echo "   ⚠️  No hay cron jobs configurados"
fi

# 8. Base de datos
echo "8. Verificando base de datos..."
if [ -f gestion_ido.db ]; then
    db_size=$(du -h gestion_ido.db | cut -f1)
    echo "   ✅ gestion_ido.db existe ($db_size)"
else
    echo "   ❌ gestion_ido.db no existe"
fi

echo ""
echo "✅ Verificación completada"
