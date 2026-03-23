# MIKE - Multiplayer Game System

Webbasiertes Multiplayer-Game-System mit Plugin-Architektur. Spiele werden als ZIP-Plugins installiert und liefern eigenes Frontend und Backend.

## Tech-Stack

- **Frontend:** Vue.js 3 + TypeScript + Vite + Pinia
- **Backend:** Node.js + Fastify + TypeScript
- **Datenbank:** PostgreSQL
- **WebSockets:** Socket.IO
- **Auth:** Argon2id + Sessions + optionale TOTP-2FA

## Mindestanforderungen

- Debian 12
- 4 vCPU
- 4 GB RAM
- 20 GB Speicherplatz
- Ports: 80, 443 (mit Domain) oder 3000 (ohne Domain)

## Installation

```bash
curl -sSL https://raw.githubusercontent.com/michaelnid/MultiplayerGames/main/scripts/install.sh | sudo bash
```

Das Script fuehrt interaktiv durch die Einrichtung (Domain/SSL, Admin-Benutzer) und:

- erstellt einen dedizierten Systembenutzer `mike-games` für den Servicebetrieb,
- konfiguriert bei Domainbetrieb Reverse Proxy + Let's Encrypt,
- setzt bei IP-only Betrieb `HOST=0.0.0.0` für direkten Zugriff auf Port `3000`.

## Update

```bash
sudo /opt/mike-games/scripts/update.sh
```

Das Update-Skript migriert bestehende Installationen ebenfalls auf den sicheren Service-Benutzerbetrieb.

## Deinstallation

```bash
sudo /opt/mike-games/scripts/uninstall.sh
```

## pgAdmin 4 (automatisch bei Fresh Install)

Bei einem Fresh Install wird pgAdmin 4 ohne Docker automatisch eingerichtet:

- eigener Systemdienst `mike-pgadmin4`,
- Reverse Proxy unter `/pgadmin4` (bei Domain-Setup),
- Direktlink im Adminbereich unter `Administration -> System`.

`PGADMIN_URL` wird im Domain-Betrieb automatisch auf `/pgadmin4` gesetzt.
Bei bestehenden Installationen ergänzt das Update-Skript den Schlüssel und migriert die Konfiguration.

## Entwicklung

```bash
# Abhaengigkeiten installieren
npm install

# Entwicklungsserver starten (Frontend + Backend)
npm run dev

# Frontend:  http://localhost:5173
# Backend:   http://localhost:3000
```

Voraussetzung: Lokale PostgreSQL-Instanz mit Datenbank `mike_games`. `.env` Datei anlegen (siehe `.env.example`).

Optionales Admin-Seed (lokal):

```bash
DEFAULT_ADMIN_PASSWORD='SicheresPasswort123' npm run seed --workspace=backend
```

Ohne `DEFAULT_ADMIN_PASSWORD` legt der Seed **keinen** Default-Admin an.

## Plugin-Entwicklung

Siehe `docs/plugin-dev-guide.md` für die vollständige Plugin-API-Dokumentation.
