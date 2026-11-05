#!/usr/bin/env bash

# ==============================================================================
# ORBIT DEPLOYMENT SCRIPT v2.0
# Build do backend (Render) + frontend (Vercel) com visual moderno e retry.
# ==============================================================================

set -o pipefail

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
GRAY='\033[0;90m'
BOLD='\033[1m'
NC='\033[0m'

# Configurações
SCRIPT_VERSION="2.0"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_FILE="$ROOT_DIR/deploy.log"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
MAX_RETRIES=3
RETRY_BASE_DELAY=2
RETRY_MAX_DELAY=30
WIDTH=62

# ------------------------------------------------------------------------------
# Utilitários de UI
# ------------------------------------------------------------------------------

log() {
  local ts
  ts="$(date '+%Y-%m-%d %H:%M:%S')"
  printf '[%s] %s\n' "$ts" "$*" >> "$LOG_FILE"
}

box_top()    { printf "${BLUE}╔%s╗${NC}\n" "$(printf '═%.0s' $(seq 1 $WIDTH))"; }
box_bottom() { printf "${BLUE}╚%s╝${NC}\n" "$(printf '═%.0s' $(seq 1 $WIDTH))"; }
box_line() {
  local text="$1"
  local color="${2:-$WHITE}"
  local content_width=$((WIDTH - 2))
  printf "${BLUE}║${NC} ${color}%-${content_width}s${NC} ${BLUE}║${NC}\n" "$text"
}
box_empty() {
  local content_width=$((WIDTH - 2))
  printf "${BLUE}║${NC} %-${content_width}s ${BLUE}║${NC}\n" ""
}

hr() {
  printf "${GRAY}%s${NC}\n" "$(printf '─%.0s' $(seq 1 $((WIDTH + 2))))"
}

step()    { printf "${CYAN}➜${NC} ${BOLD}%s${NC}\n" "$*"; }
ok()      { printf "${GREEN}✔${NC} %s\n" "$*"; }
warn()    { printf "${YELLOW}⚠${NC} %s\n" "$*"; }
fail()    { printf "${RED}✘${NC} %s\n" "$*"; }
info()    { printf "${PURPLE}ℹ${NC} %s\n" "$*"; }

progress_bar() {
  local current="$1" total="$2" width=28
  local filled=$(( current * width / total ))
  local empty=$(( width - filled ))
  local percent=$(( current * 100 / total ))
  local bar_fill="" bar_empty=""
  local i

  for ((i = 0; i < filled; i++)); do bar_fill+="█"; done
  for ((i = 0; i < empty; i++)); do bar_empty+="░"; done

  printf "\r${CYAN}[%s]${NC} ${GREEN}%s${GRAY}%s${NC} ${BOLD}%3d%%${NC} (%d/%d)" \
    "$(date '+%H:%M:%S')" "$bar_fill" "$bar_empty" "$percent" "$current" "$total"

  if [ "$current" -eq "$total" ]; then
    printf "\n"
  fi

  return 0
}

# ------------------------------------------------------------------------------
# Retry com backoff exponencial
# Uso: retry "<descrição>" <tentativas> <comando...>
# ------------------------------------------------------------------------------
retry() {
  local description="$1"; shift
  local attempts="$1"; shift
  local delay=$RETRY_BASE_DELAY
  local attempt=1

  while [ "$attempt" -le "$attempts" ]; do
    info "$description — tentativa $attempt/$attempts"
    log "RUN [$attempt/$attempts] $description: $*"

    if "$@"; then
      ok "$description concluído"
      log "OK  $description"
      return 0
    fi

    if [ "$attempt" -lt "$attempts" ]; then
      warn "Falhou. Aguardando ${delay}s antes de tentar novamente..."
      log "RETRY $description em ${delay}s"
      sleep "$delay"
      delay=$(( delay * 2 ))
      [ "$delay" -gt "$RETRY_MAX_DELAY" ] && delay=$RETRY_MAX_DELAY
    fi

    attempt=$(( attempt + 1 ))
  done

  fail "$description falhou após $attempts tentativas"
  log "FAIL $description"
  return 1
}

# ------------------------------------------------------------------------------
# Header
# ------------------------------------------------------------------------------
show_header() {
  clear 2>/dev/null || true
  printf "\n"
  box_top
  box_empty
  box_line "  ORBIT DEPLOYMENT SCRIPT  v$SCRIPT_VERSION" "$YELLOW"
  box_empty
  box_line "  Backend (Render) + Frontend (Vercel)" "$GREEN"
  box_line "  Proxy dinâmico: orbit-api.vercel.app" "$PURPLE"
  box_empty
  box_line "  Retry exponencial • Logs • Zero custo inicial" "$GRAY"
  box_empty
  box_bottom
  printf "\n"
}

# ------------------------------------------------------------------------------
# Validação de ambiente
# ------------------------------------------------------------------------------
validate_environment() {
  step "Validando ambiente"
  local errors=0

  if command -v node >/dev/null 2>&1; then
    ok "Node.js $(node --version)"
  else
    fail "Node.js não encontrado"
    errors=$((errors + 1))
  fi

  if command -v npm >/dev/null 2>&1; then
    ok "npm $(npm --version)"
  else
    fail "npm não encontrado"
    errors=$((errors + 1))
  fi

  if command -v bun >/dev/null 2>&1; then
    ok "bun $(bun --version)"
  else
    warn "bun não encontrado (necessário para o build do backend)"
  fi

  if [ -f "$BACKEND_DIR/package.json" ]; then
    ok "backend/package.json encontrado"
  else
    fail "backend/package.json não encontrado"
    errors=$((errors + 1))
  fi

  if [ -f "$FRONTEND_DIR/package.json" ]; then
    ok "frontend/package.json encontrado"
  else
    fail "frontend/package.json não encontrado"
    errors=$((errors + 1))
  fi

  if [ -f "$BACKEND_DIR/render.yaml" ]; then
    ok "backend/render.yaml encontrado"
  else
    fail "backend/render.yaml não encontrado"
    errors=$((errors + 1))
  fi

  if [ -f "$FRONTEND_DIR/next.config.ts" ]; then
    ok "frontend/next.config.ts encontrado"
  else
    fail "frontend/next.config.ts não encontrado"
    errors=$((errors + 1))
  fi

  if [ "$errors" -gt 0 ]; then
    fail "Ambiente inválido ($errors erro(s))"
    return 1
  fi

  ok "Ambiente validado"
  return 0
}

# ------------------------------------------------------------------------------
# Build backend
# ------------------------------------------------------------------------------
build_backend() {
  step "Build do backend (Bun)"
  log "BUILD backend start"

  (
    cd "$BACKEND_DIR" || exit 1

    if ! retry "bun install" "$MAX_RETRIES" bun install; then
      exit 1
    fi

    if ! retry "bun run build" "$MAX_RETRIES" bun run build; then
      exit 1
    fi

    if [ ! -d "$BACKEND_DIR/dist" ]; then
      fail "Diretório dist/ não foi gerado"
      exit 1
    fi

    local size
    size="$(du -sh "$BACKEND_DIR/dist" | cut -f1)"
    ok "Build do backend pronto ($size)"
    log "BUILD backend ok ($size)"
    echo "backend: $(date '+%Y-%m-%d %H:%M:%S') — OK ($size)" > "$ROOT_DIR/backend-status.txt"
  )
}

# ------------------------------------------------------------------------------
# Build frontend
# ------------------------------------------------------------------------------
build_frontend() {
  step "Build do frontend (Next.js)"
  log "BUILD frontend start"

  (
    cd "$FRONTEND_DIR" || exit 1

    if ! retry "npm install" "$MAX_RETRIES" npm install; then
      exit 1
    fi

    if ! retry "npm run build" "$MAX_RETRIES" npm run build; then
      exit 1
    fi

    if [ ! -d "$FRONTEND_DIR/.next" ]; then
      fail "Diretório .next/ não foi gerado"
      exit 1
    fi

    local size
    size="$(du -sh "$FRONTEND_DIR/.next" | cut -f1)"
    ok "Build do frontend pronto ($size)"
    log "BUILD frontend ok ($size)"
    echo "frontend: $(date '+%Y-%m-%d %H:%M:%S') — OK ($size)" > "$ROOT_DIR/frontend-status.txt"
  )
}

# ------------------------------------------------------------------------------
# Resumo
# ------------------------------------------------------------------------------
show_summary() {
  printf "\n"
  box_top
  box_line "  DEPLOYMENT CONCLUÍDO" "$GREEN"
  box_empty
  box_line "  ✔ Backend  pronto para Render" "$GREEN"
  box_line "  ✔ Frontend pronto para Vercel" "$GREEN"
  box_line "  ✔ Proxy    orbit-api.vercel.app" "$PURPLE"
  box_empty
  box_line "  Arquivos gerados:" "$CYAN"
  box_line "    • backend-status.txt" "$GRAY"
  box_line "    • frontend-status.txt" "$GRAY"
  box_line "    • deployment-info.txt" "$GRAY"
  box_line "    • deploy.log" "$GRAY"
  box_empty
  box_line "  Próximos passos:" "$YELLOW"
  box_line "   1) vercel --prod        (em frontend/)" "$WHITE"
  box_line "   2) render deploy        (na raiz)" "$WHITE"
  box_line "   3) configure BACKEND_URL no Vercel" "$WHITE"
  box_empty
  box_bottom
  printf "\n"
}

save_info() {
  {
    echo "ORBIT DEPLOYMENT INFO"
    echo "====================="
    echo "Data: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "Host: $(hostname 2>/dev/null || echo n/a)"
    echo "Node: $(node --version 2>/dev/null || echo n/a)"
    echo
    echo "STATUS:"
    cat "$ROOT_DIR/backend-status.txt" 2>/dev/null || echo "backend: n/a"
    cat "$ROOT_DIR/frontend-status.txt" 2>/dev/null || echo "frontend: n/a"
    echo
    echo "PROXY: https://orbit-api.vercel.app"
    echo "BACKEND: https://orbit-backend.onrender.com"
  } > "$ROOT_DIR/deployment-info.txt"
}

# ------------------------------------------------------------------------------
# Main
# ------------------------------------------------------------------------------
main() {
  : > "$LOG_FILE"

  show_header
  log "=== ORBIT DEPLOY v$SCRIPT_VERSION ==="

  if ! validate_environment; then
    fail "Abortando: ambiente inválido."
    exit 1
  fi

  printf "\n"
  if ! build_backend; then
    fail "Build do backend falhou."
    exit 1
  fi

  printf "\n"
  progress_bar 1 2

  printf "\n"
  if ! build_frontend; then
    fail "Build do frontend falhou."
    exit 1
  fi

  printf "\n"
  progress_bar 2 2

  save_info
  show_summary
}

if [ "${BASH_SOURCE[0]}" = "$0" ]; then
  main "$@"
fi
