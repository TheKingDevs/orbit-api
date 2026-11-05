#!/usr/bin/env bash

# ==============================================================================
# ORBIT BACKEND BUILD SCRIPT
# Build do backend com Bun (usado localmente e no Render).
# ==============================================================================

set -o pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"

printf "${BLUE}╔════════════════════════════════════════════════════╗${NC}\n"
printf "${BLUE}║${NC} ${YELLOW}ORBIT BACKEND BUILD${NC}                               ${BLUE}║${NC}\n"
printf "${BLUE}╚════════════════════════════════════════════════════╝${NC}\n\n"

log()   { printf "${GREEN}[%s]${NC} %s\n" "$(date '+%H:%M:%S')" "$*"; }
error() { printf "${RED}[%s] ERRO:${NC} %s\n" "$(date '+%H:%M:%S')" "$*"; }

[ -d "$BACKEND_DIR" ] || { error "diretório backend não encontrado"; exit 1; }
[ -f "$BACKEND_DIR/package.json" ] || { error "package.json não encontrado"; exit 1; }

cd "$BACKEND_DIR" || exit 1

if ! command -v bun >/dev/null 2>&1; then
  error "bun não encontrado. Instale com: curl -fsSL https://bun.sh/install | bash"
  exit 1
fi

log "bun $(bun --version)"
log "Instalando dependências..."
bun install || { error "falha no bun install"; exit 1; }

log "Compilando backend..."
bun run build || { error "falha no build"; exit 1; }

[ -d "$BACKEND_DIR/dist" ] || { error "dist/ não gerado"; exit 1; }

SIZE="$(du -sh "$BACKEND_DIR/dist" | cut -f1)"
printf "\n"
printf "${GREEN}✔ Backend buildado com sucesso${NC}\n"
printf "${CYAN}➜${NC} dist/ (%s)\n" "$SIZE"
