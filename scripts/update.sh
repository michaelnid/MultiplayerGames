#!/bin/bash
set -e

INSTALL_DIR="/opt/mike-games"
SERVICE_NAME="mike-games"

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

info() { echo -e "${CYAN}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
error() { echo -e "${RED}[FEHLER]${NC} $1"; exit 1; }

echo ""
echo "========================================"
echo "  MIKE Multiplayer Game System"
echo "  Update"
echo "========================================"
echo ""

if [ "$EUID" -ne 0 ]; then
  error "Dieses Script muss als root ausgefuehrt werden (sudo)."
fi

if [ ! -d "$INSTALL_DIR" ]; then
  error "MIKE ist nicht unter $INSTALL_DIR installiert."
fi

cd "$INSTALL_DIR"

info "Service wird gestoppt..."
systemctl stop "$SERVICE_NAME" 2>/dev/null || true

info "Updates werden heruntergeladen..."
git pull origin main 2>&1 | tail -1
success "Repository aktualisiert"

info "Abhaengigkeiten werden aktualisiert..."
npm install --production=false 2>&1 | tail -1
success "Abhaengigkeiten aktualisiert"

info "Shared Types werden gebaut..."
npx tsc -p shared/tsconfig.json 2>/dev/null
success "Shared Types gebaut"

info "Datenbank-Migrationen werden ausgefuehrt..."
cd "$INSTALL_DIR/backend"
npx knex migrate:latest --knexfile knexfile.ts 2>&1 | tail -1
success "Migrationen ausgefuehrt"

info "Backend wird gebaut..."
npx tsc 2>/dev/null
success "Backend gebaut"

info "Frontend wird gebaut..."
cd "$INSTALL_DIR/frontend"
npx vite build 2>&1 | tail -1
success "Frontend gebaut"

info "Service wird gestartet..."
systemctl start "$SERVICE_NAME"
success "Service gestartet"

echo ""
echo "========================================"
echo "  Update abgeschlossen"
echo "========================================"
echo ""
echo "  Service-Status: sudo systemctl status $SERVICE_NAME"
echo ""
