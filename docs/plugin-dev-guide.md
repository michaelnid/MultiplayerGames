# MIKE Plugin-Entwicklungsguide

Dieses Dokument beschreibt vollstaendig, wie Plugins fuer das MIKE Multiplayer Game System entwickelt werden. Es ist verbindlich -- alle hier beschriebenen Regeln und Schnittstellen muessen eingehalten werden.

---

## Inhaltsverzeichnis

1. [Ueberblick](#ueberblick)
2. [Plugin-Struktur](#plugin-struktur)
3. [manifest.json -- Spezifikation](#manifestjson----spezifikation)
4. [Backend-API (context-Objekt)](#backend-api-context-objekt)
5. [Frontend-API](#frontend-api)
6. [Statische Assets](#statische-assets)
7. [Admin-Einstellungskomponente](#admin-einstellungskomponente)
8. [WebSocket-Ereignisse und Namenskonventionen](#websocket-ereignisse-und-namenskonventionen)
9. [Lobby-Lebenszyklus](#lobby-lebenszyklus)
10. [Fehlerbehandlung](#fehlerbehandlung)
11. [Sicherheitsregeln](#sicherheitsregeln)
12. [Verbindliche Regeln fuer Plugin-Entwickler](#verbindliche-regeln-fuer-plugin-entwickler)
13. [Plugin-Limits und Einschraenkungen](#plugin-limits-und-einschraenkungen)
14. [ZIP-Paket erstellen und installieren](#zip-paket-erstellen-und-installieren)
15. [Versionierung und Kompatibilitaet](#versionierung-und-kompatibilitaet)
16. [Vollstaendiges Beispiel-Plugin](#vollstaendiges-beispiel-plugin)

---

## Ueberblick

MIKE-Plugins erweitern das System um neue Multiplayer-Spiele. Jedes Plugin besteht aus:

- **Backend-Modul** (JavaScript/ESM): Spiellogik, Zustandsverwaltung, Validierung
- **Frontend-Modul** (JavaScript/Vue-Komponente): Spielansicht im Browser
- **manifest.json**: Metadaten und Konfiguration
- **Assets** (optional): Bilder, Icons, Sounds, CSS

Plugins werden als ZIP-Datei im Admin-Bereich hochgeladen. Der Core entpackt, validiert und registriert das Plugin. Das Plugin erhaelt vom Core ein `context`-Objekt mit Zugriff auf alle bereitgestellten APIs. Direkter Zugriff auf die Datenbank, das Dateisystem oder andere Plugins ist nicht erlaubt.

---

## Plugin-Struktur

```
mein-spiel/
  manifest.json              # Pflicht: Metadaten (siehe Spezifikation)
  backend/
    index.js                 # Pflicht: Backend-Einstiegspunkt (ESM)
  frontend/
    index.js                 # Pflicht: Frontend-Einstiegspunkt (Vue-Komponente)
    settings.js              # Optional: Admin-Einstellungskomponente
    assets/
      icon.svg               # Optional: Icon fuer Bibliothek und Navigation
      cover.png              # Optional: Cover-Bild fuer Bibliothek
      spielbrett.png          # Optional: Spielgrafiken
      sounds/
        ding.mp3             # Optional: Audio-Dateien
```

### Dateianforderungen

| Datei | Pflicht | Format | Beschreibung |
|-------|---------|--------|-------------|
| `manifest.json` | Ja | JSON | Metadaten und Plugin-Konfiguration |
| `backend/index.js` | Ja | ESM (JavaScript) | Backend-Einstiegspunkt |
| `frontend/index.js` | Ja | ESM (JavaScript) | Frontend-Vue-Komponente |
| `frontend/settings.js` | Nein | ESM (JavaScript) | Admin-Einstellungskomponente |
| Assets (Bilder, Audio, CSS) | Nein | Beliebig | Muessen im Plugin-Verzeichnis liegen |

---

## manifest.json -- Spezifikation

```json
{
  "slug": "mein-spiel",
  "name": "Mein Spiel",
  "version": "1.0.0",
  "author": "Max Mustermann",
  "description": "Kurze Beschreibung des Spiels",
  "minPlayers": 2,
  "maxPlayers": 8,
  "coreVersion": ">=1.0.0",
  "icon": "frontend/assets/icon.svg",
  "frontend": {
    "entry": "frontend/index.js",
    "bibliothek": {
      "title": "Mein Spiel",
      "description": "Ausfuehrliche Beschreibung fuer die Spielebibliothek.",
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

| Feld | Typ | Validierung | Beschreibung |
|------|-----|-------------|-------------|
| `slug` | `string` | 2-64 Zeichen, nur `a-z`, `0-9`, `-` | Eindeutiger Bezeichner. Wird als Verzeichnisname und in URLs verwendet. Darf nach Installation nicht geaendert werden. |
| `name` | `string` | Max. 128 Zeichen | Anzeigename in der UI |
| `version` | `string` | SemVer-Format (`1.0.0`) | Plugin-Version |
| `description` | `string` | Nicht leer | Kurzbeschreibung |
| `minPlayers` | `number` | >= 1 | Mindestanzahl Spieler zum Starten |
| `maxPlayers` | `number` | >= minPlayers | Maximale Spielerzahl pro Lobby |
| `frontend.entry` | `string` | Gueltiger Dateipfad | Relativer Pfad zur Frontend-Komponente |
| `backend.entry` | `string` | Gueltiger Dateipfad | Relativer Pfad zum Backend-Modul |

### Optionale Felder

| Feld | Typ | Default | Beschreibung |
|------|-----|---------|-------------|
| `author` | `string` | `""` | Autor oder Team |
| `coreVersion` | `string` | Keine Pruefung | Benoetigte Core-Version als SemVer-Range (z.B. `>=1.0.0`, `^1.2.0`) |
| `icon` | `string` | Keins | Relativer Pfad zum Plugin-Icon (SVG empfohlen) |
| `frontend.bibliothek.title` | `string` | `name` | Titel in der Bibliothek |
| `frontend.bibliothek.description` | `string` | `description` | Beschreibungstext in der Bibliothek |
| `frontend.bibliothek.coverImage` | `string` | Keins | Relativer Pfad zum Cover-Bild |
| `frontend.adminSettings` | `string` | Keins | Relativer Pfad zur Admin-Einstellungskomponente |

### Validierung bei Installation

Der Core prueft bei der Installation:

1. `manifest.json` muss im Root des ZIP liegen und gueltiges JSON sein.
2. Alle Pflichtfelder muessen vorhanden sein.
3. `slug` muss dem Muster `/^[a-z0-9-]+$/` entsprechen (2-64 Zeichen).
4. `minPlayers` muss >= 1 sein.
5. `maxPlayers` muss >= `minPlayers` sein.
6. Falls `coreVersion` angegeben: Die installierte Core-Version muss die Anforderung erfuellen.
7. `frontend.entry` und `backend.entry` muessen auf existierende Dateien im ZIP zeigen.
8. Ein Plugin mit dem gleichen `slug` darf nicht bereits installiert sein.

---

## Backend-API (context-Objekt)

Das Backend-Modul muss eine Funktion als Default-Export bereitstellen. Diese erhaelt ein `context`-Objekt:

```javascript
export default async function(context, fastify) {
  // context.slug     -- String: Der Plugin-Slug
  // context.pluginId -- String: Die interne UUID des Plugins

  // Spiellogik hier registrieren
}
```

Alternativ kann die Funktion als benannter Export `register` bereitgestellt werden:

```javascript
export async function register(context, fastify) {
  // ...
}
```

### context.ws -- WebSocket-Kommunikation

Alle WebSocket-Events des Plugins werden automatisch mit dem Praefix `plugin:<slug>:` versehen. Das heisst: Wenn das Plugin das Event `spielzug` sendet, kommt es beim Client als `plugin:mein-spiel:spielzug` an.

#### context.ws.broadcast(lobbyId, event, data)

Sendet eine Nachricht an **alle** Spieler in einer Lobby.

| Parameter | Typ | Beschreibung |
|-----------|-----|-------------|
| `lobbyId` | `string` (UUID) | ID der Lobby |
| `event` | `string` | Event-Name (wird automatisch geprefixed) |
| `data` | `any` | Beliebige JSON-serialisierbare Daten |

```javascript
context.ws.broadcast(lobbyId, 'neuer-spielzug', {
  spielerId: userId,
  position: { x: 3, y: 5 },
  zeitstempel: Date.now(),
});
```

#### context.ws.sendTo(lobbyId, userId, event, data)

Sendet eine Nachricht an **einen einzelnen** Spieler (z.B. fuer geheime Informationen wie Handkarten).

| Parameter | Typ | Beschreibung |
|-----------|-----|-------------|
| `lobbyId` | `string` (UUID) | ID der Lobby |
| `userId` | `string` (UUID) | ID des Empfaengers |
| `event` | `string` | Event-Name (wird automatisch geprefixed) |
| `data` | `any` | Beliebige JSON-serialisierbare Daten |

```javascript
context.ws.sendTo(lobbyId, userId, 'deine-karten', {
  karten: ['Herz As', 'Pik 7', 'Karo Dame'],
});
```

#### context.ws.onMessage(event, handler)

Registriert einen Handler fuer eingehende Nachrichten von Spielern.

| Parameter | Typ | Beschreibung |
|-----------|-----|-------------|
| `event` | `string` | Event-Name auf den gehoert wird |
| `handler` | `function(data, userId, lobbyId)` | Callback-Funktion |

Handler-Parameter:

| Parameter | Typ | Beschreibung |
|-----------|-----|-------------|
| `data` | `unknown` | Die vom Client gesendeten Daten -- **immer validieren!** |
| `userId` | `string` (UUID) | ID des sendenden Spielers |
| `lobbyId` | `string` (UUID) | ID der Lobby, aus der die Nachricht kommt |

```javascript
context.ws.onMessage('spielzug', (data, userId, lobbyId) => {
  // WICHTIG: data immer validieren, bevor es verwendet wird
  if (!data || typeof data.x !== 'number' || typeof data.y !== 'number') {
    return; // Ungueltige Daten ignorieren
  }

  // Spielzug verarbeiten...
  context.ws.broadcast(lobbyId, 'spielzug-ergebnis', {
    spielerId: userId,
    position: { x: data.x, y: data.y },
    gueltig: true,
  });
});
```

---

### context.stats -- Statistiken und Leaderboard

Der Core verwaltet Spielerstatistiken zentral. Plugins muessen Ergebnisse nur melden -- alles andere (Aggregation, Leaderboard, Anzeige) uebernimmt der Core.

#### context.stats.recordResult(userId, result)

Speichert ein Spielergebnis. Muss fuer jeden Spieler am Ende einer Runde/eines Spiels aufgerufen werden.

| Parameter | Typ | Beschreibung |
|-----------|-----|-------------|
| `userId` | `string` (UUID) | ID des Spielers |
| `result` | `object` | Ergebnis (siehe unten) |

Result-Objekt:

| Feld | Typ | Default | Beschreibung |
|------|-----|---------|-------------|
| `win` | `boolean` | `false` | Spieler hat gewonnen |
| `draw` | `boolean` | `false` | Unentschieden |
| `score` | `number` | `0` | Erreichte Punktzahl (wird zum Gesamtscore addiert) |

Logik: Wenn weder `win` noch `draw` gesetzt ist, wird es als Niederlage gewertet. `games_played` wird immer um 1 erhoeht.

```javascript
// Sieg mit 150 Punkten
await context.stats.recordResult(gewinnerId, { win: true, score: 150 });

// Niederlage mit 30 Punkten
await context.stats.recordResult(verliererId, { win: false, score: 30 });

// Unentschieden
await context.stats.recordResult(spieler1Id, { draw: true, score: 50 });
await context.stats.recordResult(spieler2Id, { draw: true, score: 50 });
```

**Rueckgabe:** `Promise<void>` -- kein Rueckgabewert.

#### context.stats.getLeaderboard(options?)

Ruft das Leaderboard fuer dieses Plugin ab.

| Parameter | Typ | Default | Beschreibung |
|-----------|-----|---------|-------------|
| `options.limit` | `number` | `10` | Maximale Anzahl Eintraege |
| `options.period` | `string` | `undefined` (= allzeit) | Zeitraum: `'woche'`, `'monat'` oder weglassen fuer allzeit |

**Rueckgabe:** `Promise<LeaderboardEntry[]>`

```javascript
// LeaderboardEntry:
{
  userId: string,      // UUID des Spielers
  username: string,    // Benutzername
  wins: number,        // Anzahl Siege
  losses: number,      // Anzahl Niederlagen
  draws: number,       // Anzahl Unentschieden
  totalScore: number,  // Gesamtpunktzahl
  gamesPlayed: number  // Anzahl gespielter Spiele
}
```

Sortierung: Absteigend nach `totalScore`.

```javascript
const top10 = await context.stats.getLeaderboard({ limit: 10 });
const monatsTop5 = await context.stats.getLeaderboard({ limit: 5, period: 'monat' });
```

#### context.stats.getPlayerStats(userId)

Ruft die Statistiken eines einzelnen Spielers fuer dieses Plugin ab.

| Parameter | Typ | Beschreibung |
|-----------|-----|-------------|
| `userId` | `string` (UUID) | ID des Spielers |

**Rueckgabe:** `Promise<PlayerStats | null>` -- `null` wenn der Spieler noch nie gespielt hat.

```javascript
// PlayerStats:
{
  user_id: string,      // UUID des Spielers
  plugin_id: string,    // UUID des Plugins
  wins: number,         // Anzahl Siege
  losses: number,       // Anzahl Niederlagen
  draws: number,        // Anzahl Unentschieden
  total_score: number,  // Gesamtpunktzahl
  games_played: number, // Anzahl gespielter Spiele
  last_played: string   // ISO-Zeitstempel des letzten Spiels (oder null)
}
```

```javascript
const stats = await context.stats.getPlayerStats(userId);
if (stats) {
  console.log(`${stats.wins} Siege, ${stats.losses} Niederlagen`);
}
```

---

### context.lobby -- Lobby-Verwaltung

#### context.lobby.getPlayers(lobbyId)

Gibt alle Spieler in einer Lobby zurueck.

| Parameter | Typ | Beschreibung |
|-----------|-----|-------------|
| `lobbyId` | `string` (UUID) | ID der Lobby |

**Rueckgabe:** `Promise<Player[]>`

```javascript
// Player:
{
  userId: string,    // UUID des Spielers
  username: string   // Benutzername
}
```

```javascript
const spieler = await context.lobby.getPlayers(lobbyId);
// spieler = [{ userId: "abc-123", username: "max" }, ...]
```

#### context.lobby.setStatus(lobbyId, status)

Aendert den Status einer Lobby. Sendet automatisch ein `lobby:status-changed`-Event an alle Spieler in der Lobby.

| Parameter | Typ | Beschreibung |
|-----------|-----|-------------|
| `lobbyId` | `string` (UUID) | ID der Lobby |
| `status` | `string` | Neuer Status (siehe erlaubte Werte) |

Erlaubte Status-Werte:

| Status | Beschreibung |
|--------|-------------|
| `'wartend'` | Lobby wartet auf Spieler (Anfangszustand) |
| `'laeuft'` | Spiel laeuft |
| `'beendet'` | Spiel ist regulaer beendet |
| `'geschlossen'` | Lobby wurde abgebrochen/geschlossen |

Bei `'beendet'` oder `'geschlossen'` wird automatisch `closed_at` gesetzt. Der Lobby-Code wird dadurch wieder frei.

```javascript
// Spiel starten
await context.lobby.setStatus(lobbyId, 'laeuft');

// Spiel beenden
await context.lobby.setStatus(lobbyId, 'beendet');
```

**Rueckgabe:** `Promise<void>`

#### context.lobby.onPlayerJoin(handler)

Registriert einen Handler, der aufgerufen wird, wenn ein Spieler der Lobby beitritt.

| Parameter | Typ | Beschreibung |
|-----------|-----|-------------|
| `handler` | `function(userId, lobbyId)` | Callback |

```javascript
context.lobby.onPlayerJoin((userId, lobbyId) => {
  const spieler = await context.lobby.getPlayers(lobbyId);
  context.chat.sendSystem(lobbyId, `Spieler beigetreten (${spieler.length} insgesamt)`);
});
```

#### context.lobby.onPlayerLeave(handler)

Registriert einen Handler, der aufgerufen wird, wenn ein Spieler die Lobby verlaesst.

| Parameter | Typ | Beschreibung |
|-----------|-----|-------------|
| `handler` | `function(userId, lobbyId)` | Callback |

```javascript
context.lobby.onPlayerLeave((userId, lobbyId) => {
  // Pruefen ob Spiel noch weitergehen kann
});
```

---

### context.storage -- Laufzeit-Speicher

Speichert beliebige JSON-Daten. Kann mit oder ohne `lobbyId` verwendet werden:

- **Mit lobbyId:** Daten gehoeren zu einer spezifischen Lobby/Spielsitzung.
- **Ohne lobbyId:** Globaler Plugin-Speicher, der ueber alle Lobbys hinweg verfuegbar ist.

Intern werden die Daten in der Tabelle `plugin_settings` mit dem Praefix `storage:` gespeichert.

#### context.storage.get(key, lobbyId?)

| Parameter | Typ | Beschreibung |
|-----------|-----|-------------|
| `key` | `string` | Schluessel |
| `lobbyId` | `string` (UUID), optional | Lobby-Kontext |

**Rueckgabe:** `Promise<any>` -- der gespeicherte Wert, oder `null` wenn nicht vorhanden.

#### context.storage.set(key, value, lobbyId?)

| Parameter | Typ | Beschreibung |
|-----------|-----|-------------|
| `key` | `string` | Schluessel |
| `value` | `any` | JSON-serialisierbarer Wert |
| `lobbyId` | `string` (UUID), optional | Lobby-Kontext |

**Rueckgabe:** `Promise<void>`

```javascript
// Spielzustand pro Lobby speichern
await context.storage.set('spielstand', {
  runde: 3,
  aktuellerSpieler: 0,
  brett: [[0, 1], [2, 0]],
}, lobbyId);

// Spielzustand laden
const stand = await context.storage.get('spielstand', lobbyId);
// stand = { runde: 3, aktuellerSpieler: 0, brett: [[0, 1], [2, 0]] }

// Globaler Speicher (ohne lobbyId)
await context.storage.set('gesamtstatistik', { gespielt: 42 });
const global = await context.storage.get('gesamtstatistik');
```

---

### context.settings -- Admin-Einstellungen

Persistente Einstellungen, die vom Administrator im Admin-Bereich konfiguriert werden. Getrennt von `context.storage` (Laufzeitdaten).

Intern werden die Daten in der Tabelle `plugin_settings` mit dem Praefix `settings:` gespeichert.

#### context.settings.get(key)

| Parameter | Typ | Beschreibung |
|-----------|-----|-------------|
| `key` | `string` | Einstellungsschluessel |

**Rueckgabe:** `Promise<any>` -- der konfigurierte Wert, oder `null` wenn nicht gesetzt.

#### context.settings.set(key, value)

| Parameter | Typ | Beschreibung |
|-----------|-----|-------------|
| `key` | `string` | Einstellungsschluessel |
| `value` | `any` | JSON-serialisierbarer Wert |

**Rueckgabe:** `Promise<void>`

#### context.settings.getAll()

**Rueckgabe:** `Promise<Record<string, any>>` -- Objekt mit allen Einstellungen als Key-Value-Paare.

```javascript
// Einstellung lesen
const schwierigkeit = await context.settings.get('schwierigkeit');
// schwierigkeit = 'mittel' oder null

// Alle Einstellungen auf einmal laden
const alle = await context.settings.getAll();
// alle = { schwierigkeit: 'mittel', zeitlimit: 30, kategorien: ['sport', 'musik'] }

// Einstellung setzen (normalerweise ueber die Admin-UI, nicht im Spielcode)
await context.settings.set('schwierigkeit', 'schwer');
```

---

### context.chat -- Chat-System

#### context.chat.sendSystem(lobbyId, message)

Sendet eine Systemnachricht in den Chat einer Lobby. Die Nachricht wird automatisch als Systemnachricht gekennzeichnet (kein Benutzername, andere Darstellung).

| Parameter | Typ | Beschreibung |
|-----------|-----|-------------|
| `lobbyId` | `string` (UUID) | ID der Lobby |
| `message` | `string` | Nachrichtentext |

Das Event, das an die Clients gesendet wird:

```javascript
{
  message: string,            // Der Nachrichtentext
  system: true,               // Immer true bei Systemnachrichten
  timestamp: string           // ISO-8601-Zeitstempel
}
```

```javascript
context.chat.sendSystem(lobbyId, 'Runde 3 beginnt!');
context.chat.sendSystem(lobbyId, `${gewinnerName} hat gewonnen!`);
```

---

## Frontend-API

Im Frontend koennen Plugins die Core-WebSocket-Verbindung und Lobby-Daten nutzen. Die Kommunikation laeuft ueber die Socket.IO-Verbindung des Core.

### WebSocket-Events empfangen

Plugin-Events kommen beim Client mit dem Praefix `plugin:<slug>:` an:

```javascript
// Im Plugin-Frontend:
// Wenn das Backend context.ws.broadcast(lobbyId, 'spielzug', data) aufruft,
// kommt das Event als 'plugin:mein-spiel:spielzug' beim Client an.

socket.on('plugin:mein-spiel:spielzug', (data) => {
  // data = die im Backend gesendeten Daten
});
```

### WebSocket-Events senden

Plugins senden Game-Events ueber den Core-Event `game:event`:

```javascript
socket.emit('game:event', {
  event: 'spielzug',
  data: { x: 3, y: 5 },
});
```

Dieses Event wird vom Core an alle Spieler in der gleichen Lobby weitergeleitet.

### Chat

Der Chat wird vom Core verwaltet. Spieler senden Nachrichten ueber:

```javascript
socket.emit('chat:message', { message: 'Hallo!' });
```

Eingehende Nachrichten:

```javascript
// Spielernachrichten
socket.on('chat:message', (msg) => {
  // msg = { userId, username, message, system: false, timestamp }
});

// Systemnachrichten (vom Plugin-Backend via context.chat.sendSystem)
socket.on('chat:system', (msg) => {
  // msg = { message, system: true, timestamp }
});
```

---

## Statische Assets

Alle Dateien im Plugin-Verzeichnis werden nach der Installation statisch ausgeliefert. Die URL-Struktur ist:

```
/plugins/<slug>/<pfad-im-plugin>
```

### Beispiele

Angenommen das Plugin mit slug `schach` hat folgende Struktur:

```
schach/
  frontend/
    assets/
      brett.png
      figuren/
        koenig-weiss.svg
        dame-schwarz.svg
      sounds/
        zug.mp3
```

Die Assets sind dann erreichbar unter:

| Datei im ZIP | URL |
|-------------|-----|
| `frontend/assets/brett.png` | `/plugins/schach/frontend/assets/brett.png` |
| `frontend/assets/figuren/koenig-weiss.svg` | `/plugins/schach/frontend/assets/figuren/koenig-weiss.svg` |
| `frontend/assets/sounds/zug.mp3` | `/plugins/schach/frontend/assets/sounds/zug.mp3` |

### Verwendung im Frontend

```html
<!-- Bild einbinden -->
<img src="/plugins/schach/frontend/assets/brett.png" alt="Spielbrett" />

<!-- SVG-Icon -->
<img src="/plugins/schach/frontend/assets/figuren/koenig-weiss.svg" />

<!-- CSS-Hintergrundbild -->
<div style="background-image: url('/plugins/schach/frontend/assets/brett.png')"></div>
```

```javascript
// Audio abspielen
const sound = new Audio('/plugins/schach/frontend/assets/sounds/zug.mp3');
sound.play();
```

### Empfohlene Asset-Formate

| Typ | Empfohlenes Format | Hinweise |
|-----|-------------------|----------|
| Icons | SVG | Skalierbar, klein, keine externen Abhaengigkeiten |
| Spielgrafiken | PNG oder SVG | PNG fuer Fotos/komplexe Grafiken, SVG fuer Vektoren |
| Cover-Bild | PNG | Empfohlen: 400x300 Pixel |
| Audio | MP3 | Breite Browser-Unterstuetzung |
| Schriften | WOFF2 | Nur wenn noetig, lokal einbinden |

### Verboten

- Keine Verlinkung auf externe CDNs oder Server fuer Assets.
- Keine Google Fonts oder andere extern geladene Schriften.
- Alle Assets muessen im Plugin-ZIP enthalten sein.

---

## Admin-Einstellungskomponente

Wenn in `manifest.json` das Feld `frontend.adminSettings` gesetzt ist, wird im Admin-Bereich unter "Spieleinstellungen" ein Eintrag fuer dieses Plugin angezeigt. Klickt der Admin darauf, wird die angegebene Vue-Komponente geladen.

### Schnittstelle

Die Einstellungskomponente muss ein Vue-Options-Objekt als Default-Export liefern:

```javascript
// frontend/settings.js
export default {
  template: `
    <div>
      <h3>Spieleinstellungen</h3>

      <div class="form-group">
        <label>Schwierigkeit</label>
        <select v-model="schwierigkeit" @change="save('schwierigkeit', schwierigkeit)">
          <option value="leicht">Leicht</option>
          <option value="mittel">Mittel</option>
          <option value="schwer">Schwer</option>
        </select>
      </div>

      <div class="form-group">
        <label>Zeitlimit (Sekunden)</label>
        <input type="number" v-model.number="zeitlimit" @change="save('zeitlimit', zeitlimit)" min="5" max="300" />
      </div>

      <p v-if="status" :style="{ color: status === 'Gespeichert' ? 'green' : 'red' }">{{ status }}</p>
    </div>
  `,

  data() {
    return {
      schwierigkeit: 'mittel',
      zeitlimit: 30,
      status: '',
    };
  },

  async mounted() {
    await this.load();
  },

  methods: {
    async load() {
      try {
        const res = await fetch('/api/plugins/SLUG/settings', { credentials: 'include' });
        const json = await res.json();
        if (json.data) {
          if (json.data.schwierigkeit) this.schwierigkeit = json.data.schwierigkeit;
          if (json.data.zeitlimit) this.zeitlimit = json.data.zeitlimit;
        }
      } catch (e) {
        this.status = 'Laden fehlgeschlagen';
      }
    },

    async save(key, value) {
      try {
        await fetch('/api/plugins/SLUG/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ key, value }),
        });
        this.status = 'Gespeichert';
        setTimeout(() => { this.status = ''; }, 2000);
      } catch (e) {
        this.status = 'Speichern fehlgeschlagen';
      }
    },
  },
};
```

### Settings-REST-API

| Methode | URL | Beschreibung |
|---------|-----|-------------|
| `GET` | `/api/plugins/<slug>/settings` | Alle Einstellungen laden |
| `PUT` | `/api/plugins/<slug>/settings` | Eine Einstellung speichern |

**GET-Antwort:**

```json
{
  "success": true,
  "data": {
    "schwierigkeit": "mittel",
    "zeitlimit": 30
  }
}
```

**PUT-Body:**

```json
{
  "key": "schwierigkeit",
  "value": "schwer"
}
```

Beide Endpunkte erfordern Admin-Authentifizierung.

---

## WebSocket-Ereignisse und Namenskonventionen

### Core-Events (vom System verwaltet)

Diese Events werden vom Core gesendet und empfangen. Plugins sollen sie **nicht** selbst emittieren.

| Event | Richtung | Daten | Beschreibung |
|-------|----------|-------|-------------|
| `lobby:join` | Client -> Server | `{ lobbyId }` | Spieler tritt WebSocket-Raum bei |
| `lobby:leave` | Client -> Server | -- | Spieler verlaesst WebSocket-Raum |
| `lobby:player-joined` | Server -> Client | `{ userId, username }` | Spieler ist beigetreten |
| `lobby:player-left` | Server -> Client | `{ userId, username }` | Spieler hat verlassen |
| `lobby:status-changed` | Server -> Client | `{ lobbyId, status }` | Lobby-Status hat sich geaendert |
| `chat:message` | Bidirektional | `{ userId, username, message, system, timestamp }` | Chat-Nachricht |
| `chat:system` | Server -> Client | `{ message, system: true, timestamp }` | Systemnachricht |

### Plugin-Events

Plugin-Events werden automatisch mit `plugin:<slug>:` geprefixed:

| Backend-Aufruf | Event beim Client |
|---------------|------------------|
| `context.ws.broadcast(lobbyId, 'spielzug', data)` | `plugin:mein-spiel:spielzug` |
| `context.ws.sendTo(lobbyId, userId, 'karten', data)` | `plugin:mein-spiel:karten` |

### Game-Events (Client -> Server -> alle Clients)

Fuer einfache Weiterleitung ohne Backend-Logik:

| Event | Richtung | Daten |
|-------|----------|-------|
| `game:event` | Client -> Server -> alle in Lobby | `{ event, data }` |

Wird an alle Spieler in der Lobby weitergeleitet als:

```javascript
{ userId, event, data }
```

---

## Lobby-Lebenszyklus

```
Lobby erstellt (GameMaster/Admin)
    |
    v
[WARTEND] --- Spieler treten bei (per 4-Ziffern-Code)
    |
    | GameMaster startet das Spiel (min. minPlayers muessen beigetreten sein)
    v
[LAEUFT] --- Spiel laeuft, Plugin-Logik aktiv
    |
    | Plugin ruft context.lobby.setStatus(lobbyId, 'beendet') auf
    v
[BEENDET] --- Ergebnisse gespeichert, Lobby-Code freigegeben
```

Alternativ:

```
[WARTEND] ---(Timeout: 30 Min. Inaktivitaet)---> [GESCHLOSSEN]
[WARTEND] ---(Abbruch durch Host)--------------> [GESCHLOSSEN]
```

### Pflichten des Plugins im Lebenszyklus

1. **Spiel starten:** Der Core setzt den Status auf `laeuft`, wenn der GameMaster startet. Das Plugin erhaelt dieses Signal nicht direkt -- es muss auf eingehende Game-Events reagieren.
2. **Ergebnisse melden:** Am Ende des Spiels **muss** das Plugin fuer jeden Spieler `context.stats.recordResult()` aufrufen.
3. **Status beenden:** Das Plugin **muss** `context.lobby.setStatus(lobbyId, 'beendet')` aufrufen, wenn das Spiel vorbei ist. Ohne diesen Aufruf bleibt die Lobby aktiv.

---

## Fehlerbehandlung

### Im Backend

- Fehler in Plugin-Handlern duerfen den Core-Server **nicht** zum Absturz bringen.
- Alle async-Funktionen mit try/catch schuetzen.
- Fehler loggen, aber keine sensiblen Daten (Paswoerter, Tokens) in Logs schreiben.

```javascript
context.ws.onMessage('spielzug', async (data, userId, lobbyId) => {
  try {
    // Daten validieren
    if (!data || typeof data.position !== 'number') {
      return; // Ungueltige Daten still ignorieren
    }

    // Spiellogik
    await verarbeiteSpielzug(data, userId, lobbyId);
  } catch (err) {
    console.error(`[${context.slug}] Fehler bei Spielzug:`, err.message);
    context.chat.sendSystem(lobbyId, 'Ein Fehler ist aufgetreten. Bitte erneut versuchen.');
  }
});
```

### Im Frontend

- Netzwerk-Fehler (fetch, WebSocket) abfangen.
- Dem Benutzer eine verstaendliche Fehlermeldung anzeigen.
- Keine technischen Details (Stack-Traces) dem Benutzer zeigen.

---

## Sicherheitsregeln

Diese Regeln sind verbindlich. Plugins, die sie verletzen, koennen vom System abgelehnt oder deaktiviert werden.

1. **Alle Spielereingaben serverseitig validieren.** Vertraue niemals Daten, die ueber WebSocket oder API vom Client kommen. Pruefe Typen, Wertebereiche und Zulaessigkeit.

2. **Keine SQL-Injection.** Plugins haben keinen direkten DB-Zugriff, daher kein Risiko -- aber eigene API-Routen muessen parametrisierte Queries verwenden.

3. **Keine XSS-Angriffe ermoeglichen.** Spielernamen und Chat-Nachrichten, die im Frontend angezeigt werden, muessen escaped werden. Vue tut dies standardmaessig bei `{{ }}` -- aber Vorsicht bei `v-html`.

4. **Keine sensiblen Daten im Frontend.** Geheime Spielinformationen (z.B. verdeckte Karten) nur ueber `context.ws.sendTo()` an den betroffenen Spieler senden, nicht per Broadcast.

5. **Keine externen Netzwerkzugriffe.** Plugins duerfen keine HTTP-Requests an externe Server senden.

6. **Keine Manipulation von Core-Funktionalitaet.** Plugins duerfen keine globalen Node.js-Objekte ueberschreiben, keine Core-Routen registrieren und nicht auf `process` zugreifen.

---

## Verbindliche Regeln fuer Plugin-Entwickler

1. **Kein direkter Datenbankzugriff.** Ausschliesslich die bereitgestellten API-Methoden (`context.stats`, `context.storage`, `context.settings`) verwenden.

2. **Kein Dateisystemzugriff** ausserhalb des eigenen Plugin-Verzeichnisses. Keine `fs`-Module importieren.

3. **Keine externen Abhaengigkeiten** im Backend. Kein `require()` oder `import` von npm-Paketen. Nur Vanilla-JavaScript verwenden. Die Node.js-Standard-APIs (Math, JSON, Array, etc.) sind erlaubt.

4. **Keine externen CDNs** im Frontend. Alle Assets (Bilder, Schriften, CSS, JavaScript) muessen im Plugin-ZIP enthalten sein.

5. **slug ist unveraenderlich.** Der `slug` identifiziert das Plugin dauerhaft und darf nach der ersten Veroeffentlichung nicht mehr geaendert werden, da er in der Datenbank, in URLs und in der Settings-Tabelle verwendet wird.

6. **coreVersion angeben.** Damit bei Core-Updates geprueft werden kann, ob das Plugin noch kompatibel ist.

7. **Spielergebnisse ueber die Stats-API melden.** Keine eigenen Statistik-Systeme implementieren. Der Core stellt Leaderboards, Spielerstatistiken und die Profilansicht bereit.

8. **Lobby-Status korrekt setzen.** Am Ende eines Spiels `context.lobby.setStatus(lobbyId, 'beendet')` aufrufen. Andernfalls bleibt die Lobby aktiv und blockiert einen Lobby-Code.

9. **Daten validieren.** Alle eingehenden WebSocket-Nachrichten und API-Daten serverseitig auf Typ, Format und Zulaessigkeit pruefen.

10. **Keine Endlosschleifen oder blockierende Operationen.** Plugin-Code laeuft im selben Node.js-Prozess wie der Core. Blockierende Operationen beeintraechtigen alle anderen Lobbys und Plugins.

11. **Maximale ZIP-Groesse: 50 MB.** Plugins, die groesser sind, werden bei der Installation abgelehnt.

12. **ESM-Format verwenden.** Backend-Module muessen `export default` oder `export function register` verwenden. CommonJS (`module.exports`) wird nicht unterstuetzt.

---

## Plugin-Limits und Einschraenkungen

| Eigenschaft | Limit |
|-------------|-------|
| Maximale ZIP-Groesse | 50 MB |
| Slug-Laenge | 2-64 Zeichen |
| Slug-Zeichen | `a-z`, `0-9`, `-` |
| maxPlayers Minimum | Gleich minPlayers |
| minPlayers Minimum | 1 |
| Chat-Nachrichtenlaenge | Max. 500 Zeichen |
| Lobby-Timeout (inaktiv) | 30 Minuten |
| Gleichzeitige Lobbys | Max. 10.000 (durch 4-Ziffern-Code begrenzt) |
| storage/settings Werte | Muessen JSON-serialisierbar sein |

---

## ZIP-Paket erstellen und installieren

### Erstellen

```bash
cd mein-spiel/
zip -r mein-spiel-v1.0.0.zip manifest.json backend/ frontend/
```

Wichtig: Die `manifest.json` muss im **Root** des ZIP liegen, nicht in einem Unterordner.

Korrekt:

```
mein-spiel-v1.0.0.zip
  manifest.json
  backend/
    index.js
  frontend/
    index.js
    assets/
      ...
```

Falsch:

```
mein-spiel-v1.0.0.zip
  mein-spiel/        <-- Dieser Unterordner darf NICHT existieren
    manifest.json
    backend/
    frontend/
```

### Installieren

1. Im Admin-Bereich auf "Plugins" navigieren.
2. "Plugin installieren (ZIP)" klicken.
3. ZIP-Datei auswaehlen.
4. Der Core validiert das Manifest, entpackt die Dateien und registriert das Plugin.
5. Das Plugin ist sofort aktiv und in der Bibliothek sichtbar.

### Deinstallieren

1. Im Admin-Bereich auf "Plugins" navigieren.
2. "Deinstallieren" beim gewuenschten Plugin klicken.
3. Alle Plugin-Daten werden geloescht: Dateien, Einstellungen, Statistiken, Lobbys.

---

## Versionierung und Kompatibilitaet

### Core-Versionierung

Der Core folgt Semantic Versioning (SemVer):

- **Patch** (1.0.x): Bugfixes, keine API-Aenderungen
- **Minor** (1.x.0): Neue API-Funktionen, abwaertskompatibel
- **Major** (x.0.0): Breaking Changes an der Plugin-API

### coreVersion im Manifest

Plugins deklarieren die benoetigte Core-Version als SemVer-Range:

```json
"coreVersion": ">=1.0.0"       // Jede Version ab 1.0.0
"coreVersion": "^1.0.0"        // 1.x.x (Minor + Patch Updates erlaubt)
"coreVersion": ">=1.2.0 <2.0.0" // Zwischen 1.2.0 und 2.0.0
```

Bei Core-Updates prueft das System, ob installierte Plugins kompatibel sind. Inkompatible Plugins werden im Admin-Bereich als Warnung angezeigt.

### Plugin-Updates

Um ein Plugin zu aktualisieren:

1. Altes Plugin deinstallieren.
2. Neues ZIP hochladen.

Dabei werden alle Plugin-Daten (Einstellungen, Statistiken) geloescht. Fuer ein Upgrade ohne Datenverlust muss ein Export/Import-Mechanismus im Plugin selbst implementiert werden.

---

## Vollstaendiges Beispiel-Plugin

### Zahlenraten -- Ein einfaches Multiplayer-Ratespiel

Der Spielleiter denkt sich eine Zahl zwischen 1 und 100 aus, die anderen Spieler raten abwechselnd.

#### manifest.json

```json
{
  "slug": "zahlenraten",
  "name": "Zahlenraten",
  "version": "1.0.0",
  "author": "MIKE Team",
  "description": "Rate die Zahl zwischen 1 und 100! Wer am naechsten dran ist, gewinnt.",
  "minPlayers": 2,
  "maxPlayers": 10,
  "coreVersion": ">=1.0.0",
  "icon": "frontend/assets/icon.svg",
  "frontend": {
    "entry": "frontend/index.js",
    "bibliothek": {
      "title": "Zahlenraten",
      "description": "Ein Spieler waehlt eine geheime Zahl, die anderen raten. Wer am naechsten dran ist, gewinnt! Schnelles Partyspiel fuer 2-10 Spieler.",
      "coverImage": "frontend/assets/cover.png"
    },
    "adminSettings": "frontend/settings.js"
  },
  "backend": {
    "entry": "backend/index.js"
  }
}
```

#### backend/index.js

```javascript
export default async function(context) {
  const spiele = new Map();

  context.lobby.onPlayerJoin((userId, lobbyId) => {
    context.chat.sendSystem(lobbyId, 'Ein neuer Spieler ist bereit!');
  });

  context.ws.onMessage('zahl-waehlen', async (data, userId, lobbyId) => {
    if (!data || typeof data.zahl !== 'number') return;
    if (data.zahl < 1 || data.zahl > 100) return;

    const maxRunden = await context.settings.get('maxRunden') || 5;

    spiele.set(lobbyId, {
      geheimeZahl: data.zahl,
      spielleiter: userId,
      raten: [],
      maxRunden: maxRunden,
      aktuelleRunde: 0,
    });

    context.chat.sendSystem(lobbyId, 'Die Zahl wurde gewaehlt! Fangt an zu raten.');
    context.ws.broadcast(lobbyId, 'spiel-gestartet', {
      spielleiter: userId,
      maxRunden: maxRunden,
    });
  });

  context.ws.onMessage('raten', async (data, userId, lobbyId) => {
    const spiel = spiele.get(lobbyId);
    if (!spiel) return;
    if (userId === spiel.spielleiter) return;
    if (!data || typeof data.tipp !== 'number') return;
    if (data.tipp < 1 || data.tipp > 100) return;

    spiel.raten.push({ userId, tipp: data.tipp });

    const differenz = Math.abs(data.tipp - spiel.geheimeZahl);
    let hinweis = 'Weit daneben';
    if (differenz === 0) hinweis = 'Treffer!';
    else if (differenz <= 5) hinweis = 'Sehr nah!';
    else if (differenz <= 15) hinweis = 'Warm';
    else if (differenz <= 30) hinweis = 'Kalt';

    context.ws.broadcast(lobbyId, 'tipp-ergebnis', {
      userId,
      tipp: data.tipp,
      hinweis,
      treffer: differenz === 0,
    });

    if (differenz === 0) {
      await spielBeenden(lobbyId, userId, spiel);
    }

    spiel.aktuelleRunde++;
    if (spiel.aktuelleRunde >= spiel.maxRunden * (spiel.raten.length || 1)) {
      const bester = spiel.raten.reduce((best, r) =>
        Math.abs(r.tipp - spiel.geheimeZahl) < Math.abs(best.tipp - spiel.geheimeZahl) ? r : best
      );
      await spielBeenden(lobbyId, bester.userId, spiel);
    }
  });

  async function spielBeenden(lobbyId, gewinnerId, spiel) {
    const spieler = await context.lobby.getPlayers(lobbyId);

    for (const s of spieler) {
      if (s.userId === gewinnerId) {
        await context.stats.recordResult(s.userId, { win: true, score: 100 });
      } else if (s.userId !== spiel.spielleiter) {
        await context.stats.recordResult(s.userId, { win: false, score: 10 });
      }
    }

    context.ws.broadcast(lobbyId, 'spiel-beendet', {
      gewinner: gewinnerId,
      geheimeZahl: spiel.geheimeZahl,
    });

    context.chat.sendSystem(lobbyId, `Spiel beendet! Die Zahl war ${spiel.geheimeZahl}.`);

    spiele.delete(lobbyId);
    await context.lobby.setStatus(lobbyId, 'beendet');
  }
}
```

#### frontend/settings.js

```javascript
export default {
  template: `
    <div>
      <h3>Zahlenraten -- Einstellungen</h3>
      <div style="margin-bottom: 1rem;">
        <label>Maximale Runden pro Spieler</label>
        <input type="number" v-model.number="maxRunden" @change="save" min="1" max="20"
               style="width: 80px; padding: 0.4rem;" />
      </div>
      <p v-if="status">{{ status }}</p>
    </div>
  `,
  data() {
    return { maxRunden: 5, status: '' };
  },
  async mounted() {
    try {
      const res = await fetch('/api/plugins/zahlenraten/settings', { credentials: 'include' });
      const json = await res.json();
      if (json.data?.maxRunden) this.maxRunden = json.data.maxRunden;
    } catch {}
  },
  methods: {
    async save() {
      try {
        await fetch('/api/plugins/zahlenraten/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ key: 'maxRunden', value: this.maxRunden }),
        });
        this.status = 'Gespeichert';
        setTimeout(() => { this.status = ''; }, 2000);
      } catch {
        this.status = 'Fehler';
      }
    },
  },
};
```

### ZIP erstellen

```bash
cd zahlenraten/
zip -r zahlenraten-v1.0.0.zip manifest.json backend/ frontend/
```

---

*Letzte Aktualisierung: MIKE Core v1.0.0*
