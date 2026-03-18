#!/bin/bash
set -e

INSTALL_DIR="/opt/mike-games"
SERVICE_NAME="mike-games"
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
error() { echo -e "${RED}[FEHLER]${NC} $1"; exit 1; }

echo ""
echo "========================================"
echo "  MIKE Multiplayer Game System"
echo "  Installation"
echo "========================================"
echo ""

# Root-Pruefung
if [ "$EUID" -ne 0 ]; then
  error "Dieses Script muss als root ausgefuehrt werden (sudo)."
fi

# Debian-Pruefung
if ! grep -q "Debian" /etc/os-release 2>/dev/null; then
  warn "Dieses Script ist fuer Debian 12 optimiert. Andere Systeme werden nicht offiziell unterstuetzt."
fi

# Bereits installiert?
if [ -d "$INSTALL_DIR" ]; then
  error "MIKE ist bereits unter $INSTALL_DIR installiert. Bitte zuerst deinstallieren."
fi

# ================================
echo ""
echo "[1/4] Systemabhaengigkeiten"
echo "----------------------------"

info "System wird aktualisiert..."
apt-get update -qq
apt-get install -y -qq curl git nginx certbot python3-certbot-nginx build-essential > /dev/null 2>&1
success "Basissystem aktualisiert"

# Node.js 20 LTS
if ! command -v node &> /dev/null || [[ $(node -v | cut -d'.' -f1 | tr -d 'v') -lt 20 ]]; then
  info "Node.js 20 LTS wird installiert..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
  apt-get install -y -qq nodejs > /dev/null 2>&1
  success "Node.js $(node -v) installiert"
else
  success "Node.js $(node -v) bereits vorhanden"
fi

# PostgreSQL
if ! command -v psql &> /dev/null; then
  info "PostgreSQL wird installiert..."
  apt-get install -y -qq postgresql postgresql-contrib > /dev/null 2>&1
  systemctl enable postgresql
  systemctl start postgresql
  success "PostgreSQL installiert"
else
  success "PostgreSQL bereits vorhanden"
fi

# ================================
echo ""
echo "[2/4] Zugriffskonfiguration"
echo "----------------------------"

USE_DOMAIN="n"
DOMAIN=""

read -p "Soll das System ueber eine Domain erreichbar sein? (j/n): " USE_DOMAIN

if [[ "$USE_DOMAIN" == "j" || "$USE_DOMAIN" == "J" ]]; then
  read -p "Domain eingeben (z.B. games.example.com): " DOMAIN
  if [ -z "$DOMAIN" ]; then
    error "Keine Domain eingegeben."
  fi
  info "Domain: $DOMAIN"
else
  info "System wird nur ueber IP erreichbar sein (Port 3000)."
fi

# ================================
echo ""
echo "[3/4] Installation"
echo "----------------------------"

# Repository klonen
info "Repository wird geklont..."
git clone "$REPO_URL" "$INSTALL_DIR" > /dev/null 2>&1 || error "Repository konnte nicht geklont werden. Bitte REPO_URL in install.sh anpassen."
success "Repository geklont nach $INSTALL_DIR"

# Datenbank einrichten
info "Datenbank wird eingerichtet..."
DB_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)

sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>/dev/null || true
sudo -u postgres psql -d "$DB_NAME" -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";' 2>/dev/null || true
success "Datenbank eingerichtet"

# .env erstellen
info ".env wird generiert..."
SESSION_SECRET=$(openssl rand -base64 48 | tr -dc 'a-zA-Z0-9' | head -c 48)

cat > "$INSTALL_DIR/.env" << EOF
NODE_ENV=production
PORT=3000
HOST=127.0.0.1

DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD

SESSION_SECRET=$SESSION_SECRET

DOMAIN=$DOMAIN

CORE_VERSION=1.0.0
EOF

chmod 600 "$INSTALL_DIR/.env"
success ".env generiert"

# Abhaengigkeiten installieren
info "Abhaengigkeiten werden installiert..."
cd "$INSTALL_DIR"
npm install --production=false 2>&1 | tail -1
success "Abhaengigkeiten installiert"

# Shared Types bauen
info "Shared Types werden gebaut..."
npx tsc -p shared/tsconfig.json 2>/dev/null
success "Shared Types gebaut"

# Migrationen
info "Datenbank-Migrationen werden ausgefuehrt..."
cd "$INSTALL_DIR/backend"
npx knex migrate:latest --knexfile knexfile.ts 2>&1 | tail -1
success "Migrationen ausgefuehrt"

# Frontend bauen
info "Frontend wird gebaut..."
cd "$INSTALL_DIR/frontend"
npx vite build 2>&1 | tail -1
success "Frontend gebaut"

# ================================
echo ""
echo "[4/4] Admin-Benutzer"
echo "----------------------------"

ADMIN_PASSWORD=$(openssl rand -base64 16 | tr -dc 'a-zA-Z0-9' | head -c 12)

cd "$INSTALL_DIR/backend"
node -e "
import argon2 from 'argon2';
import knex from 'knex';
import 'dotenv/config';

const db = knex({
  client: 'pg',
  connection: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  },
});

const hash = await argon2.hash('$ADMIN_PASSWORD', {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
});

const existing = await db('users').where('username', 'admin').first();
if (!existing) {
  await db('users').insert({
    username: 'admin',
    password_hash: hash,
    role: 'admin',
  });
}

await db.destroy();
" 2>/dev/null

success "Admin-Benutzer erstellt"

# systemd Service
info "systemd-Service wird eingerichtet..."
cat > "/etc/systemd/system/${SERVICE_NAME}.service" << EOF
[Unit]
Description=MIKE Multiplayer Game System
After=network.target postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR
ExecStart=/usr/bin/node $INSTALL_DIR/backend/dist/server.js
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production
EnvironmentFile=$INSTALL_DIR/.env

[Install]
WantedBy=multi-user.target
EOF

# Backend bauen
info "Backend wird gebaut..."
cd "$INSTALL_DIR/backend"
npx tsc 2>/dev/null
success "Backend gebaut"

systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
systemctl start "$SERVICE_NAME"
success "Service gestartet"

# SSL / Nginx
if [ -n "$DOMAIN" ]; then
  info "Nginx und SSL werden konfiguriert..."

  cat > "/etc/nginx/sites-available/$SERVICE_NAME" << EOF
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
EOF

  ln -sf "/etc/nginx/sites-available/$SERVICE_NAME" "/etc/nginx/sites-enabled/"
  rm -f /etc/nginx/sites-enabled/default
  nginx -t 2>/dev/null && systemctl reload nginx

  info "SSL-Zertifikat wird eingerichtet..."
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email 2>&1 | tail -3
  success "SSL eingerichtet"

  ACCESS_URL="https://$DOMAIN"
else
  SERVER_IP=$(hostname -I | awk '{print $1}')
  ACCESS_URL="http://$SERVER_IP:3000"
fi

# Plugins-Verzeichnis
mkdir -p "$INSTALL_DIR/plugins"

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
