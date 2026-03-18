# Plugin-Entwicklungsguide

## Ueberblick

MIKE-Plugins erweitern das System um neue Spiele. Jedes Plugin liefert Frontend- und Backend-Code und wird als ZIP-Datei im Admin-Bereich installiert.

## Plugin-Struktur

```
mein-spiel/
  manifest.json         # Pflicht: Metadaten und Konfiguration
  backend/
    index.js            # Backend-Einstiegspunkt
  frontend/
    index.js            # Frontend-Einstiegspunkt (Vue-Komponente)
    settings.js         # Optional: Admin-Einstellungskomponente
    assets/
      cover.png         # Cover-Bild fuer die Bibliothek
      icon.svg          # Icon
```

## manifest.json

```json
{
  "slug": "mein-spiel",
  "name": "Mein Spiel",
  "version": "1.0.0",
  "author": "Dein Name",
  "description": "Kurze Beschreibung des Spiels",
  "minPlayers": 2,
  "maxPlayers": 8,
  "coreVersion": ">=1.0.0",
  "icon": "frontend/assets/icon.svg",
  "frontend": {
    "entry": "frontend/index.js",
    "bibliothek": {
      "title": "Mein Spiel",
      "description": "Ausfuehrliche Beschreibung fuer die Bibliothek",
      "coverImage": "frontend/assets/cover.png"
    },
    "adminSettings": "frontend/settings.js"
  },
  "backend": {
    "entry": "backend/index.js"
  }
}
```

### Pflichtfelder

| Feld | Typ | Beschreibung |
|------|-----|-------------|
| slug | string | Eindeutiger Bezeichner (Kleinbuchstaben, Zahlen, Bindestriche) |
| name | string | Anzeigename |
| version | string | SemVer-Version |
| description | string | Kurzbeschreibung |
| minPlayers | number | Mindestanzahl Spieler |
| maxPlayers | number | Maximale Spielerzahl |
| frontend.entry | string | Pfad zur Frontend-Komponente |
| backend.entry | string | Pfad zum Backend-Modul |

### Optionale Felder

| Feld | Typ | Beschreibung |
|------|-----|-------------|
| author | string | Autor |
| coreVersion | string | Benoetigte Core-Version (SemVer-Range) |
| icon | string | Pfad zum Icon (SVG) |
| frontend.adminSettings | string | Pfad zur Admin-Einstellungskomponente |

## Backend-API

Das Backend-Modul exportiert eine Funktion, die ein `context`-Objekt und die Fastify-Instanz erhaelt:

```javascript
export default async function(context, fastify) {
  // Plugin-Logik hier
}
```

### context.ws -- WebSocket-Kommunikation

```javascript
// Nachricht an alle Spieler in einer Lobby
context.ws.broadcast(lobbyId, 'spielzug', { x: 1, y: 2 });

// Nachricht an einen einzelnen Spieler
context.ws.sendTo(lobbyId, userId, 'geheime-karte', { karte: 'As' });

// Auf Nachrichten von Spielern hoeren
context.ws.onMessage('spielzug', (data, userId, lobbyId) => {
  // Spielzug verarbeiten
});
```

### context.stats -- Statistiken und Leaderboard

```javascript
// Spielergebnis speichern
await context.stats.recordResult(userId, { win: true, score: 150 });
await context.stats.recordResult(userId, { win: false, score: 30 });
await context.stats.recordResult(userId, { draw: true, score: 50 });

// Leaderboard abrufen
const leaderboard = await context.stats.getLeaderboard({ limit: 10, period: 'monat' });

// Statistiken eines Spielers
const stats = await context.stats.getPlayerStats(userId);
```

### context.lobby -- Lobby-Verwaltung

```javascript
// Spieler in der Lobby
const players = await context.lobby.getPlayers(lobbyId);

// Lobby-Status aendern
await context.lobby.setStatus(lobbyId, 'laeuft');
await context.lobby.setStatus(lobbyId, 'beendet');

// Events
context.lobby.onPlayerJoin((userId, lobbyId) => {
  // Spieler ist beigetreten
});

context.lobby.onPlayerLeave((userId, lobbyId) => {
  // Spieler hat verlassen
});
```

### context.storage -- Laufzeit-Speicher (pro Lobby)

```javascript
// Spielstand speichern (pro Lobby)
await context.storage.set('spielstand', { runde: 3 }, lobbyId);
const spielstand = await context.storage.get('spielstand', lobbyId);

// Globaler Plugin-Speicher (ohne lobbyId)
await context.storage.set('highscores', []);
```

### context.settings -- Admin-Einstellungen (persistent)

```javascript
// Einstellungen lesen (vom Admin konfiguriert)
const schwierigkeit = await context.settings.get('schwierigkeit');
const zeitlimit = await context.settings.get('zeitlimit');

// Einstellungen setzen
await context.settings.set('schwierigkeit', 'mittel');

// Alle Einstellungen
const alle = await context.settings.getAll();
```

### context.chat -- Chat

```javascript
// System-Nachricht im Chat
context.chat.sendSystem(lobbyId, 'Runde 3 beginnt!');
```

### context.registerRoutes -- Eigene API-Routen

```javascript
context.registerRoutes((fastify) => {
  // Route wird unter /api/plugins/mein-spiel/ gemountet
  fastify.get('/highscores', async (request, reply) => {
    return { scores: [] };
  });
});
```

## Frontend-API

Im Frontend steht das globale `window.MIKE`-Objekt zur Verfuegung:

```javascript
// WebSocket
mike.ws.on('spielzug', (data) => { /* ... */ });
mike.ws.emit('spielzug', { x: 1, y: 2 });

// Lobby-Informationen
const players = mike.lobby.players;  // Reaktive Spielerliste
const status = mike.lobby.status;    // Aktueller Status

// Aktueller Benutzer
const user = mike.user;  // { id, username, role }

// Chat
mike.chat.send('Hallo!');
mike.chat.onMessage((msg) => { /* ... */ });
```

## Admin-Einstellungskomponente

Optional kann ein Plugin eine Vue-Komponente fuer die Admin-Einstellungen bereitstellen:

```javascript
// frontend/settings.js
export default {
  template: `
    <div>
      <h3>Spieleinstellungen</h3>
      <label>Schwierigkeit</label>
      <select v-model="schwierigkeit" @change="save">
        <option value="leicht">Leicht</option>
        <option value="mittel">Mittel</option>
        <option value="schwer">Schwer</option>
      </select>
    </div>
  `,
  data() {
    return { schwierigkeit: 'mittel' };
  },
  methods: {
    async save() {
      await fetch(`/api/plugins/${this.slug}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'schwierigkeit', value: this.schwierigkeit }),
      });
    },
  },
};
```

## Regeln fuer Plugin-Entwickler

1. **Kein direkter Datenbankzugriff.** Nur die bereitgestellte API nutzen.
2. **Kein Dateisystemzugriff** ausserhalb des eigenen Plugin-Verzeichnisses.
3. **Keine externen Abhaengigkeiten** im Backend. Nur Vanilla-JavaScript.
4. **Keine externen CDNs** im Frontend. Assets lokal ausliefern.
5. **slug** muss eindeutig sein und darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten.
6. **coreVersion** angeben, um Kompatibilitaet sicherzustellen.
7. **Spielergebnisse** ueber `context.stats.recordResult()` melden -- nicht eigene Statistiken fuehren.
8. **Eingaben validieren.** Alle Daten von Spielern serverseitig pruefen.

## ZIP-Paket erstellen

```bash
cd mein-spiel/
zip -r mein-spiel-v1.0.0.zip manifest.json backend/ frontend/
```

Die ZIP-Datei wird im Admin-Bereich unter "Plugins" hochgeladen.
