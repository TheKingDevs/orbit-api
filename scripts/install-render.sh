#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
BIN_DIR="$ROOT_DIR/scripts/.tools/bin"
mkdir -p "$BIN_DIR"

if ! command -v curl >/dev/null 2>&1 || ! command -v unzip >/dev/null 2>&1; then
  echo "Render CLI installer precisa de curl e unzip." >&2
  exit 1
fi

OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
case "$OS" in linux|darwin) ;; *) echo "Sistema não suportado pelo instalador: $OS" >&2; exit 1 ;; esac
ARCH="$(uname -m)"
case "$ARCH" in x86_64|amd64) ARCH=amd64 ;; aarch64|arm64) ARCH=arm64 ;; *) echo "Arquitetura não suportada: $ARCH" >&2; exit 1 ;; esac

VERSION="$(curl -fsSL https://api.github.com/repos/render-oss/cli/releases/latest | sed -n 's/.*"tag_name": "\([^"]*\)".*/\1/p')"
[ -n "$VERSION" ] || { echo "Não foi possível obter a versão do Render CLI." >&2; exit 1; }
VERSION_NUM="${VERSION#v}"
ARCHIVE="cli_${VERSION_NUM}_${OS}_${ARCH}.zip"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT HUP INT TERM

printf 'Baixando Render CLI %s para %s/%s...\n' "$VERSION" "$OS" "$ARCH"
curl -fL "https://github.com/render-oss/cli/releases/download/${VERSION}/${ARCHIVE}" -o "$TMP_DIR/$ARCHIVE"
unzip -q "$TMP_DIR/$ARCHIVE" -d "$TMP_DIR"
BINARY="$(find "$TMP_DIR" -type f -name 'cli_v*' -print -quit)"
[ -n "$BINARY" ] || { echo "O binário não foi encontrado no pacote." >&2; exit 1; }
install -m 755 "$BINARY" "$BIN_DIR/render"
"$BIN_DIR/render" --version
printf 'Binário instalado em %s\n' "$BIN_DIR/render"
