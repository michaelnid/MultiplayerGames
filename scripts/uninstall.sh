#!/bin/bash
set -e

INSTALL_DIR="/opt/mike-games"
SERVICE_NAME="mike-games"
DB_NAME="mike_games"
DB_USER="mike_games"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info() { echo -e "${CYAN}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARNUNG]${NC} $1"; }
error() { echo -e "${RED}[FEHLER]${NC} $1"; exit 1; }

echo ""
echo "========================================"
echo "  MIKE Multiplayer Game System"
echo "  Deinstallation"
echo "========================================"
echo ""

if [ "$EUID" -ne 0 ]; then
  error "Dieses Script muss als root ausgefuehrt werden (sudo)."
fi

if [ ! -d "$INSTALL_DIR" ]; then
  error "MIKE ist nicht unter $INSTALL_DIR installiert."
fi

echo -e "${RED}WARNUNG: Alle Daten werden unwiderruflich geloescht!${NC}"
read -p "Wirklich deinstallieren? (ja/nein): " CONFIRM

if [[ "$CONFIRM" != "ja" ]]; then
  echo "Deinstallation abgebrochen."
  exit 0
fi

info "Service wird gestoppt..."
systemctl stop "$SERVICE_NAME" 2>/dev/null || true
systemctl disable "$SERVICE_NAME" 2>/dev/null || true
rm -f "/etc/systemd/system/${SERVICE_NAME}.service"
systemctl daemon-reload
success "Service entfernt"

# Datenbank
read -p "Datenbank und Benutzer ebenfalls loeschen? (j/n): " DEL_DB
if [[ "$DEL_DB" == "j" || "$DEL_DB" == "J" ]]; then
  info "Datenbank wird entfernt..."
  sudo -u postgres psql -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>/dev/null || true
  sudo -u postgres psql -c "DROP USER IF EXISTS $DB_USER;" 2>/dev/null || true
  success "Datenbank entfernt"
fi

# Nginx
if [ -f "/etc/nginx/sites-available/$SERVICE_NAME" ]; then
  info "Nginx-Konfiguration wird entfernt..."
  rm -f "/etc/nginx/sites-enabled/$SERVICE_NAME"
  rm -f "/etc/nginx/sites-available/$SERVICE_NAME"
  systemctl reload nginx 2>/dev/null || true
  success "Nginx-Konfiguration entfernt"
fi

# Certbot
read -p "SSL-Zertifikate entfernen? (j/n): " DEL_CERT
if [[ "$DEL_CERT" == "j" || "$DEL_CERT" == "J" ]]; then
  DOMAIN=$(grep "^DOMAIN=" "$INSTALL_DIR/.env" 2>/dev/null | cut -d'=' -f2)
  if [ -n "$DOMAIN" ]; then
    certbot delete --cert-name "$DOMAIN" --non-interactive 2>/dev/null || true
    success "SSL-Zertifikate entfernt"
  fi
fi

# Dateien
info "Dateien werden entfernt..."
rm -rf "$INSTALL_DIR"
success "Dateien entfernt"

echo ""
echo "========================================"
echo "  Deinstallation abgeschlossen"
echo "========================================"
echo ""
