#!/usr/bin/env sh
# Compatibilidade com o comando antigo; toda a interface e lógica agora são TypeScript.
SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
exec "$SCRIPT_DIR/node_modules/.bin/tsx" "$SCRIPT_DIR/deploy.ts" "$@"
