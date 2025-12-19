#!/bin/bash

echo "🔥 PRUEBAS DE CARGA - Sistema Gestión IDO"
echo "=========================================="
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

BASE_URL="http://localhost:3000"
RESULTS_DIR="./test-results"
mkdir -p "$RESULTS_DIR"

# Instalar autocannon si no existe
if ! command -v autocannon &> /dev/null; then
    echo "📥 Instalando autocannon..."
    npm install -g autocannon
fi

echo -e "${YELLOW}⚠️  Asegúrate de que PM2 esté corriendo (pm2 list)${NC}"
echo ""
read -p "¿Continuar con las pruebas? (s/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo "Cancelado."
    exit 0
fi

echo ""
echo "🚀 Iniciando pruebas..."
echo ""

# TEST 1: Página principal
echo "📊 TEST 1: Página principal (10 usuarios, 30 seg)"
autocannon -c 10 -d 30 "$BASE_URL" > "$RESULTS_DIR/test1-homepage.txt"
echo -e "${GREEN}✅ Completado${NC}"
echo ""

# TEST 2: Prueba gradual
echo "📊 TEST 2: Carga gradual (5→10→20 usuarios)"
echo "  • 5 usuarios..."
autocannon -c 5 -d 10 "$BASE_URL" > "$RESULTS_DIR/test2-5users.txt"
echo "  • 10 usuarios..."
autocannon -c 10 -d 10 "$BASE_URL" > "$RESULTS_DIR/test2-10users.txt"
echo "  • 20 usuarios..."
autocannon -c 20 -d 10 "$BASE_URL" > "$RESULTS_DIR/test2-20users.txt"
echo -e "${GREEN}✅ Completado${NC}"
echo ""

# TEST 3: Stress test
echo -e "${YELLOW}📊 TEST 3: Stress test (50 usuarios, 30 seg)${NC}"
echo -e "${YELLOW}   Esto puede hacer que el servidor trabaje fuerte${NC}"
sleep 2
autocannon -c 50 -d 30 "$BASE_URL" > "$RESULTS_DIR/test3-stress.txt"
echo -e "${GREEN}✅ Completado${NC}"
echo ""

# Generar reporte
REPORT_FILE="$RESULTS_DIR/REPORTE-$(date +%Y%m%d-%H%M%S).txt"

{
    echo "REPORTE DE PRUEBAS DE CARGA"
    echo "============================"
    echo "Fecha: $(date)"
    echo ""
    
    for file in "$RESULTS_DIR"/test*.txt; do
        if [ -f "$file" ]; then
            echo ""
            echo ">>> $(basename "$file")"
            grep -E "Req/Sec|Bytes/Sec|Latency|requests in" "$file" | head -10
        fi
    done
} > "$REPORT_FILE"

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}   ✅ PRUEBAS COMPLETADAS${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo "📁 Resultados en: $RESULTS_DIR"
echo "📄 Reporte: $REPORT_FILE"
echo ""
echo "Para ver el reporte completo:"
echo "  cat $REPORT_FILE"
echo ""
