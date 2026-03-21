#!/bin/bash
set -euo pipefail

INSTALL_DIR="/opt/mike-games"
SERVICE_NAME="mike-games"
SERVICE_USER="mike-games"

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

info() { echo -e "${CYAN}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
fail() { echo -e "${RED}[FEHLER]${NC} $1"; exit 1; }

run_as_service() {
  local cmd="$1"
  su -s /bin/bash -c "$cmd" "$SERVICE_USER"
}

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

if ! id -u "$SERVICE_USER" > /dev/null 2>&1; then
  info "Service-Benutzer $SERVICE_USER wird erstellt..."
  useradd --system --home "$INSTALL_DIR" --shell /usr/sbin/nologin "$SERVICE_USER"
fi

chown -R "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR"
if [ -f "$INSTALL_DIR/.env" ]; then
  chown "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR/.env"
  chmod 600 "$INSTALL_DIR/.env"
fi

cd "$INSTALL_DIR"

info "Service wird gestoppt..."
systemctl stop "$SERVICE_NAME" 2>/dev/null || true

info "Updates werden heruntergeladen..."
run_as_service "cd '$INSTALL_DIR' && git pull origin main > /dev/null 2>&1" || fail "Git pull fehlgeschlagen."
success "Repository aktualisiert"

info "Abhaengigkeiten werden aktualisiert..."
run_as_service "cd '$INSTALL_DIR' && npm install --production=false > /dev/null 2>&1" || fail "npm install fehlgeschlagen."
success "Abhaengigkeiten aktualisiert"

info "Shared Types werden gebaut..."
run_as_service "cd '$INSTALL_DIR' && npx tsc --build shared/tsconfig.json --force > /dev/null 2>&1" || fail "Shared Types Build fehlgeschlagen."
success "Shared Types gebaut"

info "Datenbank-Migrationen werden ausgefuehrt..."
if ! run_as_service "cd '$INSTALL_DIR/backend' && npx tsx ../node_modules/.bin/knex migrate:latest --knexfile knexfile.ts > /dev/null 2>&1"; then
  if ! run_as_service "cd '$INSTALL_DIR/backend' && npx tsx ./node_modules/.bin/knex migrate:latest --knexfile knexfile.ts > /dev/null 2>&1"; then
    fail "Datenbank-Migrationen fehlgeschlagen."
  fi
fi
success "Migrationen ausgefuehrt"

info "Backend wird gebaut..."
run_as_service "cd '$INSTALL_DIR/backend' && npx tsc > /dev/null 2>&1" || fail "Backend Build fehlgeschlagen."
success "Backend gebaut"

info "Frontend wird gebaut..."
run_as_service "cd '$INSTALL_DIR/frontend' && npx vite build > /dev/null 2>&1" || fail "Frontend Build fehlgeschlagen."
success "Frontend gebaut"

info "Service wird gestartet..."
cat > "/etc/systemd/system/${SERVICE_NAME}.service" << EOF
[Unit]
Description=MIKE Multiplayer Game System
After=network.target postgresql.service

[Service]
Type=simple
User=$SERVICE_USER
Group=$SERVICE_USER
WorkingDirectory=$INSTALL_DIR
ExecStart=/usr/bin/node $INSTALL_DIR/backend/dist/server.js
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production
EnvironmentFile=$INSTALL_DIR/.env

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable "$SERVICE_NAME" > /dev/null 2>&1

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
