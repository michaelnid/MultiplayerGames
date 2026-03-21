#!/bin/bash
set -euo pipefail

INSTALL_DIR="/opt/mike-games"
SERVICE_NAME="mike-games"
SERVICE_USER="mike-games"
DB_NAME="mike_games"
DB_USER="mike_games"
PGADMIN_DIR="/opt/mike-pgadmin4"
PGADMIN_SERVICE_NAME="mike-pgadmin4"
PGADMIN_SERVICE_USER="mike-pgadmin4"
PGADMIN_DATA_DIR="/var/lib/mike-pgadmin4"
PGADMIN_LOG_DIR="/var/log/mike-pgadmin4"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info() { echo -e "${CYAN}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARNUNG]${NC} $1"; }
fail() { echo -e "${RED}[FEHLER]${NC} $1"; exit 1; }

ask() {
  local prompt="$1"
  local var_name="$2"
  local input=""
  echo -en "${CYAN}>>>${NC} ${prompt} " > /dev/tty
  read -r input < /dev/tty
  eval "$var_name=\"\$input\""
}

echo ""
echo "========================================"
echo "  MIKE Multiplayer Game System"
echo "  Deinstallation"
echo "========================================"
echo ""

if [ "$EUID" -ne 0 ]; then
  fail "Dieses Script muss als root ausgefuehrt werden (sudo)."
fi

if [ ! -d "$INSTALL_DIR" ]; then
  fail "MIKE ist nicht unter $INSTALL_DIR installiert."
fi

echo -e "${RED}WARNUNG: Alle Daten werden unwiderruflich gelöscht!${NC}"
CONFIRM=""
ask "Wirklich deinstallieren? (ja/nein)" CONFIRM

if [[ "$CONFIRM" != "ja" ]]; then
  echo "Deinstallation abgebrochen."
  exit 0
fi

info "Service wird gestoppt..."
systemctl stop "$SERVICE_NAME" 2>/dev/null || true
systemctl disable "$SERVICE_NAME" 2>/dev/null || true
rm -f "/etc/systemd/system/${SERVICE_NAME}.service"
systemctl stop "$PGADMIN_SERVICE_NAME" 2>/dev/null || true
systemctl disable "$PGADMIN_SERVICE_NAME" 2>/dev/null || true
rm -f "/etc/systemd/system/${PGADMIN_SERVICE_NAME}.service"
systemctl daemon-reload
success "Service entfernt"

DEL_DB=""
ask "Datenbank und Benutzer ebenfalls löschen? (j/n)" DEL_DB
if [[ "$DEL_DB" == "j" || "$DEL_DB" == "J" ]]; then
  info "Datenbank wird entfernt..."
  sudo -u postgres psql -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>/dev/null || true
  sudo -u postgres psql -c "DROP USER IF EXISTS $DB_USER;" 2>/dev/null || true
  success "Datenbank entfernt"
fi

if [ -f "/etc/nginx/sites-available/$SERVICE_NAME" ]; then
  info "Nginx-Konfiguration wird entfernt..."
  rm -f "/etc/nginx/sites-enabled/$SERVICE_NAME"
  rm -f "/etc/nginx/sites-available/$SERVICE_NAME"
  systemctl reload nginx 2>/dev/null || true
  success "Nginx-Konfiguration entfernt"
fi

DEL_CERT=""
ask "SSL-Zertifikate entfernen? (j/n)" DEL_CERT
if [[ "$DEL_CERT" == "j" || "$DEL_CERT" == "J" ]]; then
  DOMAIN=$(grep "^DOMAIN=" "$INSTALL_DIR/.env" 2>/dev/null | cut -d'=' -f2)
  if [ -n "$DOMAIN" ]; then
    certbot delete --cert-name "$DOMAIN" --non-interactive 2>/dev/null || true
    success "SSL-Zertifikate entfernt"
  else
    info "Keine Domain konfiguriert, übersprungen."
  fi
fi

info "Dateien werden entfernt..."
rm -rf "$INSTALL_DIR"
rm -rf "$PGADMIN_DIR" "$PGADMIN_DATA_DIR" "$PGADMIN_LOG_DIR"
success "Dateien entfernt"

DEL_SERVICE_USER=""
ask "Systembenutzer $SERVICE_USER ebenfalls entfernen? (j/n)" DEL_SERVICE_USER
if [[ "$DEL_SERVICE_USER" == "j" || "$DEL_SERVICE_USER" == "J" ]]; then
  if id -u "$SERVICE_USER" > /dev/null 2>&1; then
    userdel "$SERVICE_USER" 2>/dev/null || true
    success "Systembenutzer entfernt"
  else
    info "Systembenutzer nicht vorhanden, übersprungen."
  fi
fi

DEL_PGADMIN_USER=""
ask "Systembenutzer $PGADMIN_SERVICE_USER ebenfalls entfernen? (j/n)" DEL_PGADMIN_USER
if [[ "$DEL_PGADMIN_USER" == "j" || "$DEL_PGADMIN_USER" == "J" ]]; then
  if id -u "$PGADMIN_SERVICE_USER" > /dev/null 2>&1; then
    userdel "$PGADMIN_SERVICE_USER" 2>/dev/null || true
    success "pgAdmin-Systembenutzer entfernt"
  else
    info "pgAdmin-Systembenutzer nicht vorhanden, übersprungen."
  fi
fi

echo ""
echo "========================================"
echo "  Deinstallation abgeschlossen"
echo "========================================"
echo ""
