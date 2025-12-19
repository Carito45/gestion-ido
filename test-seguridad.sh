#!/bin/bash

echo "🔒 AUDITORÍA DE SEGURIDAD - Sistema Gestión IDO"
echo "==============================================="
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BASE_URL="http://localhost:3000"
REPORT_FILE="./security-report-$(date +%Y%m%d-%H%M%S).txt"

echo "AUDITORÍA DE SEGURIDAD" > "$REPORT_FILE"
echo "======================" >> "$REPORT_FILE"
echo "Fecha: $(date)" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# TEST 1: Headers de seguridad
echo -e "${BLUE}🔍 TEST 1: Headers de Seguridad${NC}"
HEADERS=$(curl -s -I "$BASE_URL" 2>/dev/null)

echo "TEST 1: Headers de Seguridad" >> "$REPORT_FILE"
echo "-----------------------------" >> "$REPORT_FILE"

for header in "X-Frame-Options" "X-Content-Type-Options" "Strict-Transport-Security" "Content-Security-Policy"; do
    if echo "$HEADERS" | grep -qi "$header"; then
        echo -e "  ${GREEN}✅ $header presente${NC}"
        echo "✅ $header: PRESENTE" >> "$REPORT_FILE"
    else
        echo -e "  ${RED}❌ $header ausente${NC}"
        echo "❌ $header: AUSENTE (RECOMENDADO)" >> "$REPORT_FILE"
    fi
done
echo "" >> "$REPORT_FILE"
echo ""

# TEST 2: Rate Limiting
echo -e "${BLUE}🔍 TEST 2: Rate Limiting${NC}"
echo "TEST 2: Rate Limiting" >> "$REPORT_FILE"
echo "---------------------" >> "$REPORT_FILE"

blocked=0
for i in {1..25}; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"email":"test@test.com","password":"test"}' 2>/dev/null)
    
    if [ "$STATUS" = "429" ]; then
        ((blocked++))
    fi
done

if [ $blocked -gt 0 ]; then
    echo -e "  ${GREEN}✅ Rate limiting activo ($blocked/25 bloqueadas)${NC}"
    echo "✅ Rate limiting: ACTIVO ($blocked/25 requests bloqueadas)" >> "$REPORT_FILE"
else
    echo -e "  ${YELLOW}⚠️  Rate limiting no detectado${NC}"
    echo "⚠️ Rate limiting: NO DETECTADO" >> "$REPORT_FILE"
fi
echo "" >> "$REPORT_FILE"
echo ""

# TEST 3: Archivos sensibles
echo -e "${BLUE}🔍 TEST 3: Exposición de Archivos Sensibles${NC}"
echo "TEST 3: Archivos Sensibles" >> "$REPORT_FILE"
echo "--------------------------" >> "$REPORT_FILE"

for path in "/.env" "/package.json" "/.git/config" "/backup/" "/logs/"; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$path" 2>/dev/null)
    
    if [ "$STATUS" = "200" ]; then
        echo -e "  ${RED}❌ CRÍTICO: $path accesible (HTTP $STATUS)${NC}"
        echo "❌ CRÍTICO: $path accesible públicamente" >> "$REPORT_FILE"
    else
        echo -e "  ${GREEN}✅ $path protegido (HTTP $STATUS)${NC}"
        echo "✅ $path: PROTEGIDO (HTTP $STATUS)" >> "$REPORT_FILE"
    fi
done
echo "" >> "$REPORT_FILE"
echo ""

# TEST 4: HTTPS
echo -e "${BLUE}🔍 TEST 4: Configuración HTTPS${NC}"
echo "TEST 4: HTTPS" >> "$REPORT_FILE"
echo "-------------" >> "$REPORT_FILE"

if echo "$BASE_URL" | grep -q "https://"; then
    echo -e "  ${GREEN}✅ HTTPS habilitado${NC}"
    echo "✅ HTTPS: HABILITADO" >> "$REPORT_FILE"
else
    echo -e "  ${YELLOW}⚠️  HTTPS no habilitado${NC}"
    echo -e "  ${RED}⚠️  CRÍTICO para producción${NC}"
    echo "⚠️ HTTPS: NO HABILITADO (CRÍTICO PARA PRODUCCIÓN)" >> "$REPORT_FILE"
fi
echo "" >> "$REPORT_FILE"
echo ""

# Recomendaciones
{
    echo ""
    echo "RECOMENDACIONES PRIORITARIAS"
    echo "============================"
    echo ""
    echo "1. ANTES DE PRODUCCIÓN (CRÍTICO):"
    echo "   • Habilitar HTTPS con certificado SSL"
    echo "   • Cambiar NODE_ENV=production"
    echo "   • Verificar que archivos sensibles no sean accesibles"
    echo ""
    echo "2. CONFIGURACIÓN:"
    echo "   • Revisar headers de seguridad faltantes"
    echo "   • Mantener rate limiting activo"
    echo ""
} >> "$REPORT_FILE"

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}   ✅ AUDITORÍA COMPLETADA${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo "📄 Reporte guardado en: $REPORT_FILE"
echo ""
echo "Para ver el reporte:"
echo "  cat $REPORT_FILE"
echo ""
