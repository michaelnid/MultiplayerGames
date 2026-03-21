#!/bin/bash
set -euo pipefail

INSTALL_DIR="/opt/mike-games"
SERVICE_NAME="mike-games"
SERVICE_USER="mike-games"
PGADMIN_DIR="/opt/mike-pgadmin4"
PGADMIN_SERVICE_NAME="mike-pgadmin4"
PGADMIN_SERVICE_USER="mike-pgadmin4"
PGADMIN_DATA_DIR="/var/lib/mike-pgadmin4"
PGADMIN_LOG_DIR="/var/log/mike-pgadmin4"
PGADMIN_SOCKET_DIR="/run/mike-pgadmin4"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info() { echo -e "${CYAN}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARNUNG]${NC} $1"; }
fail() { echo -e "${RED}[FEHLER]${NC} $1"; exit 1; }

run_as_service() {
  local cmd="$1"
  su -s /bin/bash -c "$cmd" "$SERVICE_USER"
}

run_as_pgadmin() {
  local cmd="$1"
  su -s /bin/bash -c "$cmd" "$PGADMIN_SERVICE_USER"
}

set_env_key() {
  local key="$1"
  local value="$2"
  local file="$3"

  if grep -q "^${key}=" "$file"; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$file"
  else
    echo "${key}=${value}" >> "$file"
  fi
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

info "Systemabhaengigkeiten für pgAdmin werden geprüft..."
apt-get update -qq > /dev/null 2>&1
apt-get install -y -qq python3 python3-venv python3-pip nginx > /dev/null 2>&1 || fail "Systemabhaengigkeiten konnten nicht installiert werden."

if ! id -u "$SERVICE_USER" > /dev/null 2>&1; then
  info "Service-Benutzer $SERVICE_USER wird erstellt..."
  useradd --system --home "$INSTALL_DIR" --shell /usr/sbin/nologin "$SERVICE_USER"
fi

chown -R "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR"
if [ -f "$INSTALL_DIR/.env" ]; then
  chown "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR/.env"
  chmod 600 "$INSTALL_DIR/.env"
fi

DOMAIN=""
if [ -f "$INSTALL_DIR/.env" ]; then
  DOMAIN=$(grep '^DOMAIN=' "$INSTALL_DIR/.env" | cut -d'=' -f2- || true)
  if ! grep -q '^PGADMIN_URL=' "$INSTALL_DIR/.env"; then
    if [ -n "$DOMAIN" ]; then
      set_env_key "PGADMIN_URL" "/pgadmin4" "$INSTALL_DIR/.env"
    else
      set_env_key "PGADMIN_URL" "" "$INSTALL_DIR/.env"
    fi
  fi
fi

cd "$INSTALL_DIR"

info "Service wird gestoppt..."
systemctl stop "$SERVICE_NAME" 2>/dev/null || true
systemctl stop "$PGADMIN_SERVICE_NAME" 2>/dev/null || true

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

info "pgAdmin 4 wird aktualisiert..."
if ! id -u "$PGADMIN_SERVICE_USER" > /dev/null 2>&1; then
  useradd --system --home "$PGADMIN_DIR" --shell /usr/sbin/nologin "$PGADMIN_SERVICE_USER"
fi

mkdir -p "$PGADMIN_DIR" "$PGADMIN_DATA_DIR" "$PGADMIN_LOG_DIR"
chown -R "$PGADMIN_SERVICE_USER:$PGADMIN_SERVICE_USER" "$PGADMIN_DIR" "$PGADMIN_DATA_DIR" "$PGADMIN_LOG_DIR"

if [ ! -x "$PGADMIN_DIR/venv/bin/python" ]; then
  run_as_pgadmin "python3 -m venv '$PGADMIN_DIR/venv'"
fi

run_as_pgadmin "'$PGADMIN_DIR/venv/bin/pip' install --upgrade pip > /dev/null 2>&1" || fail "pip Upgrade für pgAdmin fehlgeschlagen."
run_as_pgadmin "'$PGADMIN_DIR/venv/bin/pip' install --upgrade pgadmin4 gunicorn > /dev/null 2>&1" || fail "pgAdmin Upgrade fehlgeschlagen."

PGADMIN_APP_DIR=$(run_as_pgadmin "'$PGADMIN_DIR/venv/bin/python' -c \"import importlib.util; spec = importlib.util.find_spec('pgadmin4'); paths = list(spec.submodule_search_locations or []); print(paths[0] if paths else '')\"")
if [ -z "$PGADMIN_APP_DIR" ] || [ ! -f "$PGADMIN_APP_DIR/setup.py" ]; then
  fail "pgAdmin-Paketpfad konnte nicht ermittelt werden."
fi

cat > "$PGADMIN_DIR/run-gunicorn.sh" << EOF
#!/bin/bash
set -euo pipefail
exec "$PGADMIN_DIR/venv/bin/gunicorn" \\
  --bind unix:$PGADMIN_SOCKET_DIR/pgadmin4.sock \\
  --workers=1 \\
  --threads=25 \\
  pgadmin4.pgAdmin4:app
EOF
chmod 750 "$PGADMIN_DIR/run-gunicorn.sh"
chown "$PGADMIN_SERVICE_USER:$PGADMIN_SERVICE_USER" "$PGADMIN_DIR/run-gunicorn.sh"

mkdir -p "$PGADMIN_DATA_DIR/sessions" "$PGADMIN_DATA_DIR/storage"
chown -R "$PGADMIN_SERVICE_USER:$PGADMIN_SERVICE_USER" "$PGADMIN_DATA_DIR"

# config_local.py erstellen (pgAdmin 9.x ignoriert PGADMIN_CONFIG_* Env-Vars)
cat > "$PGADMIN_APP_DIR/config_local.py" << 'PYEOF'
import os

SERVER_MODE = True
DATA_DIR = '/var/lib/mike-pgadmin4'
LOG_FILE = '/var/log/mike-pgadmin4/pgadmin4.log'
SQLITE_PATH = os.path.join(DATA_DIR, 'pgadmin4.db')
SESSION_DB_PATH = os.path.join(DATA_DIR, 'sessions')
STORAGE_DIR = os.path.join(DATA_DIR, 'storage')
ENHANCED_COOKIE_PROTECTION = True
PYEOF
chown "$PGADMIN_SERVICE_USER:$PGADMIN_SERVICE_USER" "$PGADMIN_APP_DIR/config_local.py"
chmod 640 "$PGADMIN_APP_DIR/config_local.py"

# Service-Datei IMMER erstellen, unabhängig vom Erfolg des DB-Setups
cat > "/etc/systemd/system/${PGADMIN_SERVICE_NAME}.service" << EOF
[Unit]
Description=MIKE pgAdmin 4
After=network.target

[Service]
Type=simple
User=$PGADMIN_SERVICE_USER
Group=$PGADMIN_SERVICE_USER
ExecStart=$PGADMIN_DIR/run-gunicorn.sh
Restart=on-failure
RestartSec=5
RuntimeDirectory=mike-pgadmin4
RuntimeDirectoryMode=0750
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
EOF

# Bootstrap-Prüfung VOR setup-db, da setup-db die Datei erst erstellt
PGADMIN_BOOTSTRAP_USER=0
if [ ! -f "$PGADMIN_DATA_DIR/pgadmin4.db" ]; then
  PGADMIN_BOOTSTRAP_USER=1
fi

PGADMIN_ADMIN_EMAIL="admin@localhost.local"
if [ -n "$DOMAIN" ]; then
  PGADMIN_ADMIN_EMAIL="admin@$DOMAIN"
fi
PGADMIN_ADMIN_PASSWORD=$(openssl rand -base64 20 | tr -dc 'a-zA-Z0-9' | head -c 20)

PGADMIN_SETUP_OK=1
if ! run_as_pgadmin "PGADMIN_SETUP_EMAIL='$PGADMIN_ADMIN_EMAIL' PGADMIN_SETUP_PASSWORD='$PGADMIN_ADMIN_PASSWORD' '$PGADMIN_DIR/venv/bin/python' '$PGADMIN_APP_DIR/setup.py' setup-db 2>&1"; then
  warn "pgAdmin-Konfigurationsdatenbank konnte nicht erstellt/aktualisiert werden."
  PGADMIN_SETUP_OK=0
fi

if [ "$PGADMIN_BOOTSTRAP_USER" -eq 1 ] && [ "$PGADMIN_SETUP_OK" -eq 1 ]; then
  success "pgAdmin-Benutzer initialisiert"
  echo ""
  echo "  Neuer pgAdmin-Benutzer (nur bei erstem Setup):"
  echo "    Benutzername: $PGADMIN_ADMIN_EMAIL"
  echo "    Passwort:     $PGADMIN_ADMIN_PASSWORD"
  echo ""

  # pgAdmin-Credentials in .env speichern
  if grep -q "^PGADMIN_ADMIN_EMAIL=" "$INSTALL_DIR/.env"; then
    sed -i "s|^PGADMIN_ADMIN_EMAIL=.*|PGADMIN_ADMIN_EMAIL=$PGADMIN_ADMIN_EMAIL|" "$INSTALL_DIR/.env"
    sed -i "s|^PGADMIN_ADMIN_PASSWORD=.*|PGADMIN_ADMIN_PASSWORD=$PGADMIN_ADMIN_PASSWORD|" "$INSTALL_DIR/.env"
  else
    echo "" >> "$INSTALL_DIR/.env"
    echo "PGADMIN_ADMIN_EMAIL=$PGADMIN_ADMIN_EMAIL" >> "$INSTALL_DIR/.env"
    echo "PGADMIN_ADMIN_PASSWORD=$PGADMIN_ADMIN_PASSWORD" >> "$INSTALL_DIR/.env"
  fi

  # PostgreSQL-Server in pgAdmin registrieren (mit Passwort fuer auto-connect)
  cat > /tmp/mike-pgadmin-servers.json << JSONEOF
{
  "Servers": {
    "1": {
      "Name": "MIKE Games",
      "Group": "Servers",
      "Host": "$DB_HOST",
      "Port": $DB_PORT,
      "MaintenanceDB": "$DB_NAME",
      "Username": "$DB_USER",
      "Password": "$DB_PASSWORD",
      "SSLMode": "prefer",
      "SavePassword": true
    }
  }
}
JSONEOF
  run_as_pgadmin "'$PGADMIN_DIR/venv/bin/python' '$PGADMIN_APP_DIR/setup.py' load-servers /tmp/mike-pgadmin-servers.json --user '$PGADMIN_ADMIN_EMAIL' 2>&1" || true
  rm -f /tmp/mike-pgadmin-servers.json
fi

success "pgAdmin 4 aktualisiert"

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
systemctl enable "$PGADMIN_SERVICE_NAME" > /dev/null 2>&1

if [ -n "$DOMAIN" ]; then
  info "Nginx-Konfiguration wird für pgAdmin 4 aktualisiert..."
  cat > "/etc/nginx/sites-available/$SERVICE_NAME" << EOF
server {
    listen 80;
    server_name $DOMAIN;

    location = /pgadmin4 {
        return 301 /pgadmin4/;
    }

    location /pgadmin4/ {
        proxy_pass http://unix:$PGADMIN_SOCKET_DIR/pgadmin4.sock:/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Script-Name /pgadmin4;
        proxy_set_header X-Scheme \$scheme;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

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
  usermod -aG mike-pgadmin4 www-data

  if nginx -t > /dev/null 2>&1; then
    systemctl reload nginx
    success "Nginx aktualisiert"
  else
    fail "Nginx-Konfiguration für pgAdmin ist fehlerhaft."
  fi

  info "SSL-Zertifikat wird erneuert..."
  if certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email 2>&1 | tail -3; then
    success "SSL aktualisiert"
  else
    warn "SSL-Erneuerung fehlgeschlagen. Bitte manuell pruefen: sudo certbot --nginx -d $DOMAIN"
  fi
fi

cd "$INSTALL_DIR"
systemctl start "$SERVICE_NAME"
systemctl start "$PGADMIN_SERVICE_NAME"
success "Service gestartet"

echo ""
echo "========================================"
echo "  Update abgeschlossen"
echo "========================================"
echo ""
echo "  Service-Status: sudo systemctl status $SERVICE_NAME"
echo "  pgAdmin-Status: sudo systemctl status $PGADMIN_SERVICE_NAME"
echo ""
