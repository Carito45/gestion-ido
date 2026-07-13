#!/bin/bash

echo "🔧 Script de Mantenimiento - Sistema Gestión IDO"
echo "=============================================="

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Menú
echo ""
echo "Selecciona una opción:"
echo "1) Verificar vulnerabilidades (npm audit)"
echo "2) Actualizar dependencias"
echo "3) Limpiar logs antiguos"
echo "4) Backup de base de datos"
echo "5) Ver últimos logs de error"
echo "6) Ver espacio en disco"
echo "7) Verificar sintaxis de código"
echo "0) Salir"
echo ""
read -p "Opción: " opcion

case $opcion in
  1)
    echo -e "${YELLOW}Verificando vulnerabilidades...${NC}"
    npm audit
    ;;
  2)
    echo -e "${YELLOW}Actualizando dependencias...${NC}"
    npm update
    npm audit fix
    echo -e "${GREEN}✓ Dependencias actualizadas${NC}"
    ;;
  3)
    echo -e "${YELLOW}Limpiando logs...${NC}"
    find logs/ -name "*.log" -mtime +30 -delete
    echo -e "${GREEN}✓ Logs antiguos eliminados${NC}"
    ;;
  4)
    echo -e "${YELLOW}Creando backup...${NC}"
    FECHA=$(date +%Y%m%d_%H%M%S)
    cp gestion_ido.db "gestion_ido_backup_${FECHA}.db"
    echo -e "${GREEN}✓ Backup creado: gestion_ido_backup_${FECHA}.db${NC}"
    ;;
  5)
    echo -e "${YELLOW}Últimos 50 errores:${NC}"
    tail -n 50 logs/error.log
    ;;
  6)
    echo -e "${YELLOW}Espacio en disco:${NC}"
    df -h .
    echo ""
    echo "Tamaño de archivos:"
    du -sh uploads/ logs/ *.db
    ;;
  7)
    echo -e "${YELLOW}Verificando sintaxis...${NC}"
    node -c server.js && echo -e "${GREEN}✓ server.js OK${NC}" || echo -e "${RED}✗ server.js ERROR${NC}"
    node -c security-utils.js && echo -e "${GREEN}✓ security-utils.js OK${NC}" || echo -e "${RED}✗ security-utils.js ERROR${NC}"
    for file in routes/*.js; do
      node -c "$file" && echo -e "${GREEN}✓ $file OK${NC}" || echo -e "${RED}✗ $file ERROR${NC}"
    done
    ;;
  0)
    echo "Saliendo..."
    exit 0
    ;;
  *)
    echo -e "${RED}Opción inválida${NC}"
    ;;
esac
