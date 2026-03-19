# MIKE Plugin-Entwicklungsguide

Dieses Dokument beschreibt vollstaendig, wie Plugins fuer das MIKE Multiplayer Game System entwickelt werden. Es ist verbindlich -- alle hier beschriebenen Regeln und Schnittstellen muessen eingehalten werden.

---

## Inhaltsverzeichnis

1. [Ueberblick](#ueberblick)
2. [Plugin-Struktur](#plugin-struktur)
3. [manifest.json -- Spezifikation](#manifestjson----spezifikation)
4. [Backend-API (context-Objekt)](#backend-api-context-objekt)
5. [Frontend-API](#frontend-api)
6. [Design-Richtlinien](#design-richtlinien)
7. [Statische Assets](#statische-assets)
8. [Admin-Einstellungskomponente](#admin-einstellungskomponente)
9. [WebSocket-Ereignisse und Namenskonventionen](#websocket-ereignisse-und-namenskonventionen)
10. [Lobby-Lebenszyklus](#lobby-lebenszyklus)
11. [Fehlerbehandlung](#fehlerbehandlung)
12. [Sicherheitsregeln](#sicherheitsregeln)
13. [Verbindliche Regeln fuer Plugin-Entwickler](#verbindliche-regeln-fuer-plugin-entwickler)
14. [Plugin-Limits und Einschraenkungen](#plugin-limits-und-einschraenkungen)
15. [ZIP-Paket erstellen und installieren](#zip-paket-erstellen-und-installieren)
16. [Versionierung und Kompatibilitaet](#versionierung-und-kompatibilitaet)
17. [Vollstaendiges Beispiel-Plugin](#vollstaendiges-beispiel-plugin)

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
| `icon` | `string` | Pfad auf `.svg` im Plugin | Pflicht-Icon fuer Bibliothek, Lobby und Profil (SVG, idealerweise quadratisch, mind. 128x128px). |

### Optionale Felder

| Feld | Typ | Default | Beschreibung |
|------|-----|---------|-------------|
| `author` | `string` | `""` | Autor oder Team |
| `coreVersion` | `string` | Keine Pruefung | Benoetigte Core-Version als SemVer-Range (z.B. `>=1.0.0`, `^1.2.0`) |
| `frontend.bibliothek.title` | `string` | `name` | Titel in der Bibliothek |
| `frontend.bibliothek.description` | `string` | `description` | Beschreibungstext in der Bibliothek |
| `frontend.bibliothek.coverImage` | `string` | Keins | Relativer Pfad zum Cover-Bild |
| `frontend.adminSettings` | `string` | Keins | Relativer Pfad zur Admin-Einstellungskomponente |

### Vorgabe fuer Bibliothek-Kachel und Spielerklaerung

Die Bibliothek zeigt jedes Plugin als anklickbare Kachel. Beim Klick wird eine Detailansicht mit Spielerklaerung geoeffnet. Damit diese Ansicht nutzbar ist, gelten folgende Regeln:

1. `frontend.bibliothek.description` soll eine **verstaendliche Spielerklaerung** enthalten:
   - Spielziel
   - Grundregeln
   - Ablauf eines Zuges oder einer Runde
   - Gewinn- bzw. Endbedingungen
2. `frontend.bibliothek.title` soll eine kurze Unterzeile fuer die Kachel liefern.
3. Falls `frontend.bibliothek.description` fehlt, faellt der Core auf `description` zurueck. Das ist nur ein Fallback und fuer produktive Plugins nicht ausreichend.

Empfohlene Laenge fuer `frontend.bibliothek.description`: 300-1200 Zeichen.

### Icon- und Cover-Anforderungen

- `icon` **muss** auf eine SVG-Datei innerhalb des Plugin-ZIPs zeigen, z.B. `frontend/assets/icon.svg`.
- Das Icon wird
  - in der Startseite,
  - in der Spielebibliothek (Kacheln und Detailansicht) und
  - spaeter in Profil/Statistik-Ansichten
  verwendet.
- SVG sollte:
  - quadratisch sein (z.B. 128x128 oder 256x256),
  - keinen externen Font- oder Bild-Referenzen enthalten,
  - keine externen URLs oder Scripts enthalten.

Optional kann `frontend.bibliothek.coverImage` (PNG/JPG) gesetzt werden. Dieses Bild wird gross in der Detailansicht der Bibliothek angezeigt.

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
  userId: string,       // UUID des Spielers
  pluginId: string,     // UUID des Plugins
  wins: number,         // Anzahl Siege
  losses: number,       // Anzahl Niederlagen
  draws: number,        // Anzahl Unentschieden
  totalScore: number,   // Gesamtpunktzahl
  gamesPlayed: number,  // Anzahl gespielter Spiele
  lastPlayed: string    // ISO-Zeitstempel des letzten Spiels (oder null)
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
context.lobby.onPlayerJoin(async (userId, lobbyId) => {
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

### Komponentenformat

Die Frontend-Datei (`frontend/index.js`) muss ein Vue-Options-Objekt als Default-Export bereitstellen. Die Komponente wird vom Core innerhalb der Lobby-Ansicht gerendert. Der Core uebernimmt das Laden, Mounten und Zerstoeren der Komponente.

```javascript
export default {
  template: `
    <div class="card">
      <h2>Mein Spiel</h2>
      <p>Spielinhalt hier...</p>
    </div>
  `,

  data() {
    return {
      state: null,
      error: '',
    };
  },

  mounted() {
    if (typeof socket === 'undefined' || !socket) {
      this.error = 'Socket-Verbindung nicht verfuegbar.';
      return;
    }

    this.socketRef = socket;
    this.socketRef.on('plugin:mein-spiel:state', (data) => {
      this.state = data;
    });

    this.emitGameEvent('init-request', {});
  },

  beforeUnmount() {
    if (this.socketRef) {
      this.socketRef.off('plugin:mein-spiel:state');
    }
  },

  methods: {
    emitGameEvent(event, data) {
      if (!this.socketRef) return;
      this.socketRef.emit('game:event', { event, data });
    },
  },
};
```

**Wichtig:** Nur Vue Options API mit `template`-String verwenden. Single File Components (`.vue`-Dateien) werden nicht unterstuetzt, da Plugins als reines JavaScript ohne Build-Schritt ausgeliefert werden.

### Socket-Bereitstellung und Lebenszyklus

Der Core stellt die Socket.IO-Verbindung als globale Variable `socket` (= `window.socket`) bereit, **bevor** die Plugin-Komponente gemountet wird. Der Ablauf ist:

1. Spieler oeffnet die Lobby-Seite.
2. Core baut WebSocket-Verbindung auf und authentifiziert den Spieler.
3. Core sendet `lobby:join` an den Server.
4. Server bestaetigt den Beitritt.
5. Core setzt `window.socket` auf die verbundene Socket.IO-Instanz.
6. Core laedt und mountet die Plugin-Komponente.

Das bedeutet: Wenn `mounted()` aufgerufen wird, ist die Socket-Verbindung bereits authentifiziert und der Spieler ist dem Lobby-Raum beigetreten. Die Plugin-Komponente kann sofort Events senden und empfangen.

**Sicherheitspruefung in `mounted()`:** Trotzdem sollte immer geprueft werden, ob `socket` verfuegbar ist:

```javascript
mounted() {
  if (typeof socket === 'undefined' || !socket) {
    this.error = 'Socket-Verbindung nicht verfuegbar.';
    return;
  }
  this.socketRef = socket;
  // Event-Listener registrieren und Init-Request senden
}
```

**Aufraeumen in `beforeUnmount()`:** Alle registrierten Event-Listener muessen entfernt werden, um Memory-Leaks zu vermeiden:

```javascript
beforeUnmount() {
  if (this.socketRef) {
    this.socketRef.off('plugin:mein-spiel:state');
    this.socketRef.off('plugin:mein-spiel:error');
  }
}
```

### WebSocket-Events empfangen

Plugin-Events kommen beim Client mit dem Praefix `plugin:<slug>:` an:

```javascript
// Wenn das Backend context.ws.broadcast(lobbyId, 'spielzug', data) aufruft,
// kommt das Event als 'plugin:mein-spiel:spielzug' beim Client an.

this.socketRef.on('plugin:mein-spiel:spielzug', (data) => {
  // data = die im Backend gesendeten Daten
});
```

### WebSocket-Events senden

Plugins senden Game-Events ueber den Core-Event `game:event`. Der Core leitet dieses Event an das Plugin-Backend weiter UND broadcastet es an alle Spieler in der Lobby:

```javascript
this.socketRef.emit('game:event', {
  event: 'spielzug',
  data: { x: 3, y: 5 },
});
```

Im Backend wird dieses Event ueber `context.ws.onMessage('spielzug', handler)` empfangen. Das `event`-Feld bestimmt, welcher Handler aufgerufen wird.

### Chat (Systemnachrichten)

Der Chat wird vom Core verwaltet. Plugins koennen ueber das Backend Systemnachrichten senden (`context.chat.sendSystem()`). Eingehende Systemnachrichten:

```javascript
this.socketRef.on('chat:system', (msg) => {
  // msg = { message, system: true, timestamp }
});
```

---

## Design-Richtlinien

Plugins muessen sich optisch in das Core-Design einfuegen. Der Core verwendet ein dunkles Farbschema mit abgerundeten Kacheln (Cards). Plugins, die ein eigenes helles oder inkompatibles Design verwenden, wirken visuell fremd und werden nicht akzeptiert.

### CSS-Variablen des Core

Der Core definiert folgende CSS Custom Properties auf `:root`. Diese stehen allen Plugin-Komponenten automatisch zur Verfuegung:

| Variable | Wert | Verwendung |
|----------|------|------------|
| `--color-bg` | `#0f1117` | Seiten-Hintergrund (dunkel) |
| `--color-bg-secondary` | `#1a1d27` | Sekundaerer Hintergrund, Input-Felder |
| `--color-bg-card` | `#222533` | Kachel/Card-Hintergrund |
| `--color-bg-hover` | `#2a2d3e` | Hover-Zustand fuer Elemente |
| `--color-border` | `#333650` | Raender und Trennlinien |
| `--color-text` | `#e4e6f0` | Primaere Textfarbe (hell auf dunkel) |
| `--color-text-muted` | `#8b8fa3` | Sekundaerer/gedaempfter Text |
| `--color-primary` | `#6366f1` | Akzentfarbe (Indigo/Lila) |
| `--color-primary-hover` | `#5254cc` | Hover fuer Primaerfarbe |
| `--color-success` | `#22c55e` | Erfolg, positiv |
| `--color-warning` | `#f59e0b` | Warnung |
| `--color-danger` | `#ef4444` | Fehler, Gefahr |
| `--color-info` | `#3b82f6` | Info, Hinweis |
| `--radius` | `8px` | Standard-Eckenradius |
| `--radius-lg` | `12px` | Groesserer Eckenradius (Cards) |
| `--shadow` | `0 2px 8px rgba(0,0,0,0.3)` | Standard-Schatten |
| `--transition` | `150ms ease` | Standard-Uebergangszeit |

### Verfuegbare CSS-Klassen

Der Core stellt globale CSS-Klassen bereit, die Plugins direkt verwenden koennen und sollen:

#### `.card` -- Kachel/Container

Hauptcontainer fuer Inhaltsabschnitte. Verwendet den dunklen Card-Hintergrund mit Rahmen, Schatten und abgerundeten Ecken.

```html
<div class="card">
  <h2>Spielfeld</h2>
  <p>Inhalt hier...</p>
</div>
```

Ergebnis: Dunkle Kachel mit `background-color: var(--color-bg-card)`, `border: 1px solid var(--color-border)`, `border-radius: var(--radius-lg)`, `padding: 1.5rem`, `box-shadow: var(--shadow)`.

#### Buttons

| Klasse | Verwendung | Aussehen |
|--------|------------|----------|
| `btn-primary` | Hauptaktion (z.B. "Wuerfeln", "Spielen") | Lila Hintergrund, weisser Text |
| `btn-secondary` | Sekundaeraktion (z.B. "Abbrechen") | Dunkler Hintergrund, heller Rahmen |
| `btn-danger` | Destruktive Aktion (z.B. "Aufgeben") | Roter Hintergrund, weisser Text |

```html
<button class="btn-primary" @click="wuerfeln">Wuerfeln</button>
<button class="btn-secondary" @click="passen">Passen</button>
<button class="btn-danger" @click="aufgeben">Aufgeben</button>
```

#### Formulare

`input`, `select` und `textarea` werden global gestylt. Einfach die Standard-HTML-Elemente verwenden:

```html
<label>Anzahl Runden</label>
<input type="number" v-model.number="runden" min="1" max="20" />
```

### Inline-Styles mit CSS-Variablen

Wenn zusaetzliche Inline-Styles noetig sind (z.B. fuer dynamische Layouts), muessen die CSS-Variablen des Core verwendet werden. Keine hartcodierten Farbwerte verwenden.

**Richtig:**

```javascript
styles: {
  spielfeld: {
    padding: '1rem',
    borderRadius: 'var(--radius-lg)',
    backgroundColor: 'var(--color-bg-card)',
    border: '1px solid var(--color-border)',
  },
  spielerName: {
    color: 'var(--color-text)',
    fontWeight: '600',
  },
  hinweis: {
    color: 'var(--color-text-muted)',
    fontSize: '0.875rem',
  },
  fehler: {
    color: 'var(--color-danger)',
    fontWeight: '600',
  },
  aktiv: {
    color: 'var(--color-success)',
  },
  hervorgehoben: {
    backgroundColor: 'var(--color-bg-hover)',
    borderColor: 'var(--color-primary)',
  },
}
```

**Falsch -- niemals so:**

```javascript
// VERBOTEN: Hartcodierte helle Farben
styles: {
  root: {
    background: '#fff',           // Bricht das dunkle Theme
    color: '#333',                // Unlesbar auf dunklem Hintergrund
    border: '1px solid #d9d9d9', // Passt nicht zum Core-Farbschema
  },
}
```

### Gestaltungsprinzipien

1. **Dunkles Theme ist Pflicht.** Der Core verwendet ein dunkles Farbschema. Plugins muessen dieselben Farben nutzen. Helle Hintergruende (`#fff`, `#f5f5f5`, etc.) sind verboten.

2. **`.card`-Klasse fuer Abschnitte verwenden.** Jeder visuell abgegrenzte Bereich (Spielfeld, Scoreboard, Steuerung) soll in einer `.card`-Kachel liegen. Das sorgt fuer ein einheitliches Erscheinungsbild.

3. **Core-Buttons verwenden.** Statt eigene Button-Styles zu definieren, die Klassen `btn-primary`, `btn-secondary` und `btn-danger` nutzen.

4. **Schriftgroessen und Abstaende konsistent halten.** Der Core verwendet `0.875rem` fuer Standardtext und `1rem` als Basisgroesse. Abstaende in `rem` angeben, nicht in `px`.

5. **Keine externen Schriften.** Die Core-Schrift (System-Font-Stack) wird automatisch vererbt. Keine eigenen Schriften laden.

6. **Responsive Layouts.** CSS Grid oder Flexbox verwenden. Absolute Positionierung und feste Pixelbreiten vermeiden.

7. **Interaktive Elemente muessen erkennbar sein.** Hover-Zustaende mit `var(--color-bg-hover)` oder `var(--color-primary-hover)` kennzeichnen.

### Vollstaendiges Design-Beispiel

Ein typischer Plugin-Container, der sich korrekt in das Core-Design einfuegt:

```javascript
export default {
  template: `
    <div>
      <div class="card" style="margin-bottom: 1rem;">
        <h2 style="margin-bottom: 0.75rem; color: var(--color-text);">Spielfeld</h2>
        <p v-if="error" style="color: var(--color-danger); font-weight: 600;">{{ error }}</p>

        <div v-if="!state" style="text-align: center; padding: 2rem; color: var(--color-text-muted);">
          Lade Spielstand...
        </div>

        <div v-else>
          <p style="color: var(--color-text-muted); margin-bottom: 1rem;">
            Am Zug: <strong style="color: var(--color-text);">{{ state.aktuellerSpieler }}</strong>
          </p>

          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1rem;">
            <button
              v-for="(item, i) in state.felder"
              :key="i"
              @click="waehlen(i)"
              :style="{
                minWidth: '60px',
                padding: '0.5rem',
                borderRadius: 'var(--radius)',
                border: item.ausgewaehlt
                  ? '2px solid var(--color-primary)'
                  : '1px solid var(--color-border)',
                backgroundColor: item.ausgewaehlt
                  ? 'var(--color-bg-hover)'
                  : 'var(--color-bg-secondary)',
                color: 'var(--color-text)',
                cursor: 'pointer',
              }"
            >
              {{ item.wert }}
            </button>
          </div>

          <button class="btn-primary" @click="bestaetige">Bestaetigen</button>
        </div>
      </div>

      <div class="card">
        <h3 style="margin-bottom: 0.75rem; color: var(--color-text);">Punkte</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.75rem;">
          <div
            v-for="spieler in state?.spieler"
            :key="spieler.id"
            :style="{
              padding: '0.75rem',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg-secondary)',
            }"
          >
            <strong style="color: var(--color-text);">{{ spieler.name }}</strong>
            <span style="float: right; color: var(--color-primary);">{{ spieler.punkte }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  // ... data, mounted, methods wie oben beschrieben
};
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

1. **Spiel starten:** Der Core setzt den Status auf `laeuft`, wenn der GameMaster startet. Anschliessend laedt der Core das Plugin-Frontend und mountet die Komponente. In `mounted()` sollte das Plugin einen `init-request` Game-Event senden, um den initialen Spielzustand vom Backend anzufordern. Das Backend erstellt daraufhin die Spielinstanz und sendet den Zustand an alle Spieler.
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

13. **Core-Design einhalten.** Plugins muessen das dunkle Farbschema des Core verwenden. Alle Farben ueber CSS-Variablen (`var(--color-bg-card)`, `var(--color-text)`, etc.) referenzieren. Hartcodierte helle Farben (`#fff`, `#f5f5f5`, `#333`) sind verboten. Die `.card`-Klasse fuer Container und `btn-primary`/`btn-secondary`/`btn-danger` fuer Buttons verwenden. Details siehe Abschnitt [Design-Richtlinien](#design-richtlinien).

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

#### frontend/index.js

```javascript
export default {
  template: `
    <div>
      <div class="card" style="margin-bottom: 1rem;">
        <h2 style="margin-bottom: 0.75rem;">Zahlenraten</h2>

        <p v-if="error" style="color: var(--color-danger); font-weight: 600;">{{ error }}</p>

        <div v-if="!phase" style="text-align: center; padding: 2rem; color: var(--color-text-muted);">
          Lade Spielstand...
        </div>

        <div v-else-if="phase === 'waehlen'">
          <p style="color: var(--color-text-muted); margin-bottom: 0.75rem;">
            Der Spielleiter waehlt eine geheime Zahl zwischen 1 und 100.
          </p>
          <div v-if="istSpielleiter" style="display: flex; gap: 0.5rem; align-items: flex-end;">
            <div style="flex: 0 0 120px;">
              <label>Geheime Zahl</label>
              <input type="number" v-model.number="geheimeZahl" min="1" max="100" />
            </div>
            <button class="btn-primary" @click="zahlWaehlen" :disabled="geheimeZahl < 1 || geheimeZahl > 100">
              Zahl festlegen
            </button>
          </div>
          <p v-else style="color: var(--color-text-muted);">
            Warte auf den Spielleiter...
          </p>
        </div>

        <div v-else-if="phase === 'raten'">
          <p style="color: var(--color-text-muted); margin-bottom: 0.75rem;">
            Runden: {{ aktuelleRunde }} / {{ maxRunden }}
          </p>

          <div v-if="!istSpielleiter" style="display: flex; gap: 0.5rem; align-items: flex-end; margin-bottom: 1rem;">
            <div style="flex: 0 0 120px;">
              <label>Dein Tipp</label>
              <input type="number" v-model.number="meinTipp" min="1" max="100" />
            </div>
            <button class="btn-primary" @click="raten" :disabled="meinTipp < 1 || meinTipp > 100">
              Raten
            </button>
          </div>
          <p v-else style="color: var(--color-text-muted); margin-bottom: 1rem;">
            Du bist der Spielleiter. Warte auf die Tipps.
          </p>

          <div v-if="tipps.length > 0">
            <h3 style="margin-bottom: 0.5rem; font-size: 0.875rem; color: var(--color-text-muted);">Bisherige Tipps</h3>
            <div style="display: flex; flex-direction: column; gap: 0.4rem;">
              <div
                v-for="(tipp, i) in tipps"
                :key="i"
                :style="{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius)',
                  backgroundColor: tipp.treffer ? 'rgba(34, 197, 94, 0.15)' : 'var(--color-bg-secondary)',
                  border: tipp.treffer ? '1px solid var(--color-success)' : '1px solid var(--color-border)',
                }"
              >
                <span>{{ tipp.username }} tippte <strong>{{ tipp.tipp }}</strong></span>
                <span :style="{ color: hinweisfarbe(tipp.hinweis), fontWeight: '600' }">{{ tipp.hinweis }}</span>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="phase === 'beendet'" class="card" style="text-align: center; padding: 2rem;">
          <h3 style="color: var(--color-success); margin-bottom: 0.5rem;">Spiel beendet!</h3>
          <p>Die geheime Zahl war <strong style="color: var(--color-primary);">{{ ergebnis.geheimeZahl }}</strong>.</p>
        </div>
      </div>
    </div>
  `,

  data() {
    return {
      socketRef: null,
      error: '',
      phase: null,
      istSpielleiter: false,
      geheimeZahl: 50,
      meinTipp: 50,
      tipps: [],
      aktuelleRunde: 0,
      maxRunden: 5,
      ergebnis: null,
    };
  },

  mounted() {
    if (typeof socket === 'undefined' || !socket) {
      this.error = 'Socket-Verbindung nicht verfuegbar.';
      return;
    }

    this.socketRef = socket;

    this.onGestartet = (data) => {
      this.phase = 'raten';
      this.maxRunden = data.maxRunden;
      this.istSpielleiter = data.spielleiter === this.eigeneUserId();
    };

    this.onTippErgebnis = (data) => {
      this.tipps.push(data);
      this.aktuelleRunde++;
    };

    this.onBeendet = (data) => {
      this.phase = 'beendet';
      this.ergebnis = data;
    };

    this.socketRef.on('plugin:zahlenraten:spiel-gestartet', this.onGestartet);
    this.socketRef.on('plugin:zahlenraten:tipp-ergebnis', this.onTippErgebnis);
    this.socketRef.on('plugin:zahlenraten:spiel-beendet', this.onBeendet);

    this.phase = 'waehlen';
  },

  beforeUnmount() {
    if (!this.socketRef) return;
    this.socketRef.off('plugin:zahlenraten:spiel-gestartet', this.onGestartet);
    this.socketRef.off('plugin:zahlenraten:tipp-ergebnis', this.onTippErgebnis);
    this.socketRef.off('plugin:zahlenraten:spiel-beendet', this.onBeendet);
  },

  methods: {
    eigeneUserId() {
      return ''; // Wird vom Core nicht direkt bereitgestellt; alternativ aus dem State ablesen
    },

    zahlWaehlen() {
      this.emitGameEvent('zahl-waehlen', { zahl: this.geheimeZahl });
    },

    raten() {
      this.emitGameEvent('raten', { tipp: this.meinTipp });
    },

    emitGameEvent(event, data) {
      if (!this.socketRef) return;
      this.socketRef.emit('game:event', { event, data });
    },

    hinweisfarbe(hinweis) {
      const farben = {
        'Treffer!': 'var(--color-success)',
        'Sehr nah!': 'var(--color-warning)',
        'Warm': 'var(--color-info)',
        'Kalt': 'var(--color-text-muted)',
        'Weit daneben': 'var(--color-danger)',
      };
      return farben[hinweis] || 'var(--color-text)';
    },
  },
};
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
               style="width: 80px;" />
      </div>
      <p v-if="status" :style="{ color: status === 'Gespeichert' ? 'var(--color-success)' : 'var(--color-danger)' }">
        {{ status }}
      </p>
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
