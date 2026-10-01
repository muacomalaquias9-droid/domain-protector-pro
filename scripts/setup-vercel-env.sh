#!/bin/bash

# Script para configurar automaticamente as variáveis de ambiente no Vercel
# Use: bash scripts/setup-vercel-env.sh

set -e

echo "🚀 Configurando variáveis de ambiente no Vercel..."

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar se Vercel CLI está instalado
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}⚠️  Vercel CLI não está instalado${NC}"
    echo "Instalando Vercel CLI..."
    npm install -g vercel
fi

echo
echo -e "${BLUE}📋 Insira os dados do Supabase${NC}"
echo

# Configurações do Supabase
read -p "URL do Supabase (ex: https://xxx.supabase.co): " SUPABASE_URL
read -sp "SERVICE ROLE KEY do Supabase: " SUPABASE_SERVICE_ROLE_KEY
echo
read -p "PUBLISHABLE KEY do Supabase (sb_publishable_...): " SUPABASE_PUBLISHABLE_KEY

# Validar entrada
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ] || [ -z "$SUPABASE_PUBLISHABLE_KEY" ]; then
    echo -e "${YELLOW}❌ Todas as variáveis são obrigatórias${NC}"
    exit 1
fi

echo
echo -e "${BLUE}⏳ Configurando variáveis no Vercel...${NC}"
echo

# Adicionar variáveis usando Vercel CLI
vercel env add SUPABASE_URL "$SUPABASE_URL" production development preview
vercel env add SUPABASE_SERVICE_ROLE_KEY "$SUPABASE_SERVICE_ROLE_KEY" production development preview
vercel env add VITE_SUPABASE_URL "$SUPABASE_URL" production development preview
vercel env add VITE_SUPABASE_PUBLISHABLE_KEY "$SUPABASE_PUBLISHABLE_KEY" production development preview

echo
echo -e "${GREEN}✅ Variáveis configuradas com sucesso!${NC}"
echo -e "${GREEN}✅ Próximo passo: git push para fazer deploy com as novas variáveis${NC}"