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

Das Script fuehrt interaktiv durch die Einrichtung (Domain/SSL, Admin-Benutzer).

## Update

```bash
sudo /opt/mike-games/scripts/update.sh
```

## Deinstallation

```bash
sudo /opt/mike-games/scripts/uninstall.sh
```

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

## Plugin-Entwicklung

Siehe `docs/plugin-dev-guide.md` fuer die vollstaendige Plugin-API-Dokumentation.
