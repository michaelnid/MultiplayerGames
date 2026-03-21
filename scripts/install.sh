#!/bin/bash
set -euo pipefail

INSTALL_DIR="/opt/mike-games"
SERVICE_NAME="mike-games"
SERVICE_USER="mike-games"
DB_NAME="mike_games"
DB_USER="mike_games"
REPO_URL="https://github.com/michaelnid/MultiplayerGames.git"

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

run_as_service() {
  local cmd="$1"
  su -s /bin/bash -c "$cmd" "$SERVICE_USER"
}

echo ""
echo "========================================"
echo "  MIKE Multiplayer Game System"
echo "  Installation"
echo "========================================"
echo ""

if [ "$EUID" -ne 0 ]; then
  fail "Dieses Script muss als root ausgefuehrt werden (sudo)."
fi

if ! grep -q "Debian" /etc/os-release 2>/dev/null; then
  warn "Dieses Script ist für Debian 12 optimiert. Andere Systeme werden nicht offiziell unterstuetzt."
fi

if [ -d "$INSTALL_DIR" ]; then
  fail "MIKE ist bereits unter $INSTALL_DIR installiert. Bitte zuerst deinstallieren."
fi

# ================================
echo "[1/6] Systemabhaengigkeiten"
echo "----------------------------"

info "System wird aktualisiert..."
apt-get update -qq > /dev/null 2>&1
apt-get install -y -qq curl git nginx certbot python3-certbot-nginx build-essential > /dev/null 2>&1
success "Basissystem aktualisiert"

if ! command -v node &> /dev/null || [[ $(node -v | cut -d'.' -f1 | tr -d 'v') -lt 20 ]]; then
  info "Node.js 20 LTS wird installiert..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
  apt-get install -y -qq nodejs > /dev/null 2>&1
  success "Node.js $(node -v) installiert"
else
  success "Node.js $(node -v) bereits vorhanden"
fi

if ! command -v psql &> /dev/null; then
  info "PostgreSQL wird installiert..."
  apt-get install -y -qq postgresql postgresql-contrib > /dev/null 2>&1
  systemctl enable postgresql > /dev/null 2>&1
  systemctl start postgresql
  success "PostgreSQL installiert"
else
  success "PostgreSQL bereits vorhanden"
fi

# ================================
echo ""
echo "[2/6] Zugriffskonfiguration"
echo "----------------------------"
echo ""

USE_DOMAIN=""
DOMAIN=""
APP_HOST="0.0.0.0"

ask "Soll das System über eine Domain erreichbar sein? (j/n)" USE_DOMAIN

if [[ "$USE_DOMAIN" == "j" || "$USE_DOMAIN" == "J" ]]; then
  ask "Domain eingeben (z.B. games.example.com):" DOMAIN
  if [ -z "$DOMAIN" ]; then
    fail "Keine Domain eingegeben."
  fi
  info "Domain: $DOMAIN"
  info "Nginx und SSL werden nach der Installation eingerichtet."
  APP_HOST="127.0.0.1"
else
  info "System wird nur über IP erreichbar sein (Port 3000)."
  APP_HOST="0.0.0.0"
fi

# ================================
echo ""
echo "[3/6] Repository und Datenbank"
echo "----------------------------"

info "Service-Benutzer wird eingerichtet..."
if ! id -u "$SERVICE_USER" > /dev/null 2>&1; then
  useradd --system --home "$INSTALL_DIR" --shell /usr/sbin/nologin "$SERVICE_USER"
  success "Service-Benutzer $SERVICE_USER erstellt"
else
  success "Service-Benutzer $SERVICE_USER bereits vorhanden"
fi

info "Repository wird geklont..."
git clone --depth 1 "$REPO_URL" "$INSTALL_DIR" > /dev/null 2>&1 || fail "Repository konnte nicht geklont werden."
chown -R "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR"
success "Repository geklont nach $INSTALL_DIR"

info "Datenbank wird eingerichtet..."
DB_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)

sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>/dev/null || true
sudo -u postgres psql -d "$DB_NAME" -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";' 2>/dev/null || true
success "Datenbank eingerichtet"

info ".env wird generiert..."
SESSION_SECRET=$(openssl rand -base64 48 | tr -dc 'a-zA-Z0-9' | head -c 48)

cat > "$INSTALL_DIR/.env" << EOF
NODE_ENV=production
PORT=3000
HOST=$APP_HOST

DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD

SESSION_SECRET=$SESSION_SECRET

DOMAIN=$DOMAIN
PHPMYADMIN_URL=

CORE_VERSION=1.0.0
EOF

chmod 600 "$INSTALL_DIR/.env"
chown "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR/.env"
success ".env generiert"

# ================================
echo ""
echo "[4/6] Build"
echo "----------------------------"

info "Abhaengigkeiten werden installiert..."
if ! run_as_service "cd '$INSTALL_DIR' && npm install --production=false > /dev/null 2>&1"; then
  fail "npm install fehlgeschlagen."
fi
success "Abhaengigkeiten installiert"

info "Shared Types werden gebaut..."
if ! run_as_service "cd '$INSTALL_DIR' && npx tsc --build shared/tsconfig.json --force > /dev/null 2>&1"; then
  fail "Shared Types Build fehlgeschlagen."
fi
success "Shared Types gebaut"

info "Datenbank-Migrationen werden ausgefuehrt..."
if ! run_as_service "cd '$INSTALL_DIR/backend' && npx tsx ../node_modules/.bin/knex migrate:latest --knexfile knexfile.ts > /dev/null 2>&1"; then
  if ! run_as_service "cd '$INSTALL_DIR/backend' && npx tsx ./node_modules/.bin/knex migrate:latest --knexfile knexfile.ts > /dev/null 2>&1"; then
    fail "Datenbank-Migrationen fehlgeschlagen."
  fi
fi
success "Migrationen ausgefuehrt"

info "Backend wird gebaut..."
if ! run_as_service "cd '$INSTALL_DIR/backend' && npx tsc > /dev/null 2>&1"; then
  fail "Backend Build fehlgeschlagen."
fi
success "Backend gebaut"

info "Frontend wird gebaut..."
if ! run_as_service "cd '$INSTALL_DIR/frontend' && npx vite build > /dev/null 2>&1"; then
  fail "Frontend Build fehlgeschlagen."
fi
success "Frontend gebaut"

# ================================
echo ""
echo "[5/6] Admin-Benutzer"
echo "----------------------------"

ADMIN_PASSWORD=$(openssl rand -base64 16 | tr -dc 'a-zA-Z0-9' | head -c 12)

info "Admin-Benutzer wird erstellt..."
if ! run_as_service "cd '$INSTALL_DIR/backend' && npx tsx src/db/create-admin.ts '$ADMIN_PASSWORD' > /dev/null 2>&1"; then
  fail "Admin-Benutzer konnte nicht erstellt werden."
fi
success "Admin-Benutzer erstellt"

# ================================
echo ""
echo "[6/6] Service und Netzwerk"
echo "----------------------------"

info "systemd-Service wird eingerichtet..."
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
systemctl start "$SERVICE_NAME"
success "Service gestartet"

if [ -n "$DOMAIN" ]; then
  info "Nginx wird konfiguriert..."

  cat > "/etc/nginx/sites-available/$SERVICE_NAME" << NGINXEOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINXEOF

  ln -sf "/etc/nginx/sites-available/$SERVICE_NAME" "/etc/nginx/sites-enabled/"
  rm -f /etc/nginx/sites-enabled/default

  if nginx -t 2>/dev/null; then
    systemctl reload nginx
    success "Nginx konfiguriert"
  else
    warn "Nginx-Konfiguration fehlerhaft. Bitte manuell prüfen."
  fi

  info "SSL-Zertifikat wird eingerichtet (Let's Encrypt)..."
  if certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email 2>&1 | tail -3; then
    success "SSL eingerichtet"
  else
    warn "SSL-Einrichtung fehlgeschlagen. Ist die Domain auf diesen Server gerichtet?"
    warn "SSL kann spaeter manuell eingerichtet werden: sudo certbot --nginx -d $DOMAIN"
  fi

  ACCESS_URL="https://$DOMAIN"
else
  SERVER_IP=$(hostname -I | awk '{print $1}')
  ACCESS_URL="http://$SERVER_IP:3000"
fi

mkdir -p "$INSTALL_DIR/plugins"
chown -R "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR/plugins"

echo ""
echo "========================================"
echo "  Installation abgeschlossen"
echo "========================================"
echo ""
echo "  Admin-Benutzer:"
echo "    Benutzername: admin"
echo "    Passwort:     $ADMIN_PASSWORD"
echo ""
echo "  WICHTIG: Dieses Passwort wird nur"
echo "  einmal angezeigt! Bitte jetzt notieren."
echo ""
echo "  Erreichbar unter: $ACCESS_URL"
echo "  Service-Status:   sudo systemctl status $SERVICE_NAME"
echo "  Logs:             sudo journalctl -u $SERVICE_NAME -f"
echo ""
echo "========================================"
