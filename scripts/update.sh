#!/bin/bash
set -euo pipefail

INSTALL_DIR="/opt/mike-games"
SERVICE_NAME="mike-games"

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

info() { echo -e "${CYAN}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
fail() { echo -e "${RED}[FEHLER]${NC} $1"; exit 1; }

echo ""
echo "========================================"
echo "  MIKE Multiplayer Game System"
echo "  Update"
echo "========================================"
echo ""

if [ "$EUID" -ne 0 ]; then
  fail "Dieses Script muss als root ausgefuehrt werden (sudo)."
fi

if [ ! -d "$INSTALL_DIR" ]; then
  fail "MIKE ist nicht unter $INSTALL_DIR installiert."
fi

cd "$INSTALL_DIR"

info "Service wird gestoppt..."
systemctl stop "$SERVICE_NAME" 2>/dev/null || true

info "Updates werden heruntergeladen..."
git pull origin main > /dev/null 2>&1 || fail "Git pull fehlgeschlagen."
success "Repository aktualisiert"

info "Abhaengigkeiten werden aktualisiert..."
npm install --production=false > /dev/null 2>&1 || fail "npm install fehlgeschlagen."
success "Abhaengigkeiten aktualisiert"

info "Shared Types werden gebaut..."
npx tsc -p shared/tsconfig.json > /dev/null 2>&1 || fail "Shared Types Build fehlgeschlagen."
success "Shared Types gebaut"

info "Datenbank-Migrationen werden ausgefuehrt..."
cd "$INSTALL_DIR/backend"
npx tsx ../node_modules/.bin/knex migrate:latest --knexfile knexfile.ts > /dev/null 2>&1 || {
  npx tsx ./node_modules/.bin/knex migrate:latest --knexfile knexfile.ts > /dev/null 2>&1 || fail "Datenbank-Migrationen fehlgeschlagen."
}
success "Migrationen ausgefuehrt"

info "Backend wird gebaut..."
cd "$INSTALL_DIR/backend"
npx tsc > /dev/null 2>&1 || fail "Backend Build fehlgeschlagen."
success "Backend gebaut"

info "Frontend wird gebaut..."
cd "$INSTALL_DIR/frontend"
npx vite build > /dev/null 2>&1 || fail "Frontend Build fehlgeschlagen."
success "Frontend gebaut"

info "Service wird gestartet..."
cd "$INSTALL_DIR"
systemctl start "$SERVICE_NAME"
success "Service gestartet"

echo ""
echo "========================================"
echo "  Update abgeschlossen"
echo "========================================"
echo ""
echo "  Service-Status: sudo systemctl status $SERVICE_NAME"
echo ""
