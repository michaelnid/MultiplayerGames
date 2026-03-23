# MIKE Plugin-Entwicklungsguide

Dieses Dokument beschreibt vollständig, wie Plugins für das MIKE Multiplayer Game System entwickelt werden. Es ist verbindlich -- alle hier beschriebenen Regeln und Schnittstellen müssen eingehalten werden.

---

## Inhaltsverzeichnis

1. [Überblick](#überblick)
2. [Plugin-Struktur](#plugin-struktur)
3. [manifest.json -- Spezifikation](#manifestjson----spezifikation)
4. [Backend-API (context-Objekt)](#backend-api-context-objekt)
5. [Frontend-API](#frontend-api)
6. [Schnellstart für vollwertige Spiele](#schnellstart-für-vollwertige-spiele)
7. [Design-Richtlinien](#design-richtlinien)
8. [Statische Assets](#statische-assets)
9. [Admin-Einstellungskomponente](#admin-einstellungskomponente)
10. [WebSocket-Ereignisse und Namenskonventionen](#websocket-ereignisse-und-namenskonventionen)
11. [Lobby-Lebenszyklus](#lobby-lebenszyklus)
12. [Fehlerbehandlung](#fehlerbehandlung)
13. [Sicherheitsregeln](#sicherheitsregeln)
14. [Verbindliche Regeln für Plugin-Entwickler](#verbindliche-regeln-für-plugin-entwickler)
15. [Plugin-Limits und Einschraenkungen](#plugin-limits-und-einschraenkungen)
16. [ZIP-Paket erstellen und installieren](#zip-paket-erstellen-und-installieren)
17. [Versionierung und Kompatibilität](#versionierung-und-kompatibilität)
18. [Vollständiges Beispiel-Plugin](#vollständiges-beispiel-plugin)

---

## Überblick

MIKE-Plugins erweitern das System um neue Multiplayer-Spiele. Jedes Plugin besteht aus:

- **Backend-Modul** (JavaScript/ESM): Spiellogik, Zustandsverwaltung, Validierung
- **Frontend-Modul** (JavaScript/Vue-Komponente): Spielansicht im Browser
- **manifest.json**: Metadaten und Konfiguration
- **Assets** (optional): Bilder, Icons, Sounds, CSS

Plugins werden als ZIP-Datei im Admin-Bereich hochgeladen. Der Core entpackt, validiert und registriert das Plugin. Das Plugin erhaelt vom Core ein `context`-Objekt mit Zugriff auf alle bereitgestellten APIs. Direkter Zugriff auf die Datenbank, das Dateisystem oder andere Plugins ist laut Richtlinie nicht erlaubt und muss im Review geprüft werden.

### Geltungsbereich und Verbindlichkeit

Dieser Guide beschreibt:

- die offizielle Plugin-API (`context`, Events, Dateistruktur),
- den aktuell implementierten Core-Stand (`v1.0.0`) und
- Freigaberegeln für Plugins.

Wichtig:

- Nicht jede Richtlinie ist aktuell technisch durch den Core erzwungen.
- Wenn ein Punkt als "Richtlinie" markiert ist, gilt er weiterhin als Pflicht für Reviews/Freigaben.
- Wenn ein Punkt als "Erzwungen" markiert ist, blockiert der Core den Installations- oder Ladevorgang automatisch.

Single Source of Truth:

- Der kanonische Guide liegt unter `docs/plugin-dev-guide.md`.
- Etwaige Kopien in Plugin-Unterordnern sind nur Spiegel und können veraltet sein.

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
      icon.svg               # Optional: Icon für Bibliothek und Navigation
      cover.png              # Optional: Cover-Bild für Bibliothek
      spielbrett.png          # Optional: Spielgrafiken
      sounds/
        ding.mp3             # Optional: Audio-Dateien
```

Wichtiger Implementierungs-Hinweis (Core v1.0.0):

- Das Spielfrontend muss unter `frontend/index.js` liegen, da der Lobby-Loader derzeit diesen Pfad fest erwartet.

### Dateianforderungen

| Datei | Pflicht | Format | Beschreibung |
|-------|---------|--------|-------------|
| `manifest.json` | Ja | JSON | Metadaten und Plugin-Konfiguration |
| `backend/index.js` | Ja | ESM (JavaScript) | Backend-Einstiegspunkt |
| `frontend/index.js` | Ja | ESM (JavaScript) | Frontend-Vue-Komponente |
| `frontend/settings.js` | Nein | ESM (JavaScript) | Admin-Einstellungskomponente |
| Assets (Bilder, Audio, CSS) | Nein | Beliebig | Müssen im Plugin-Verzeichnis liegen |

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
      "description": "Ausführliche Beschreibung für die Spielebibliothek.",
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

Die folgenden Felder müssen in `manifest.json` vorhanden sein:

| Feld | Typ | Bedeutung |
|------|-----|-----------|
| `slug` | `string` | Eindeutiger Bezeichner für URL/Verzeichnis |
| `name` | `string` | Anzeigename in der UI |
| `version` | `string` | Plugin-Version |
| `description` | `string` | Kurzbeschreibung |
| `minPlayers` | `number` | Basis-Mindestanzahl Spieler (kann live über Admin-Einstellung `minPlayers` überschrieben werden) |
| `maxPlayers` | `number` | Basis-Maximalanzahl Spieler (kann live über Admin-Einstellung `maxPlayers` überschrieben werden) |
| `frontend.entry` | `string` | Frontend-Einstiegspunkt (Metadatum) |
| `backend.entry` | `string` | Backend-Einstiegspunkt |

### Optionale Felder

| Feld | Typ | Default | Beschreibung |
|------|-----|---------|-------------|
| `author` | `string` | `""` | Autor oder Team |
| `coreVersion` | `string` | Keine Prüfung | Benoetigte Core-Version als SemVer-Range (z.B. `>=1.0.0`, `^1.2.0`) |
| `icon` | `string` | Keins | Relativer Pfad zum Plugin-Icon (SVG empfohlen) |
| `frontend.bibliothek.title` | `string` | `name` | Titel in der Bibliothek |
| `frontend.bibliothek.description` | `string` | `description` | Beschreibungstext in der Bibliothek |
| `frontend.bibliothek.coverImage` | `string` | Keins | Relativer Pfad zum Cover-Bild |
| `frontend.adminSettings` | `string` | Keins | Relativer Pfad zur Admin-Einstellungskomponente |

### Technisch erzwungene Manifest-Validierung (Core v1.0.0)

Die folgende Tabelle beschreibt die **tatsaechlich implementierten** Prüfungen im Core:

| Prüfung | Status |
|----------|--------|
| `manifest.json` im ZIP-Root vorhanden | Erzwungen |
| `manifest.json` ist gültiges JSON | Erzwungen |
| Pflichtfelder vorhanden (`slug`, `name`, `version`, `description`, `minPlayers`, `maxPlayers`, `frontend`, `backend`) | Erzwungen |
| `slug` entspricht `^[a-z0-9-]+$` und hat 2-64 Zeichen | Erzwungen |
| `minPlayers >= 1` | Erzwungen |
| `maxPlayers >= minPlayers` | Erzwungen |
| `coreVersion` kompatibel (falls angegeben) | Erzwungen |
| `frontend.entry` ist String | Erzwungen |
| `backend.entry` ist String | Erzwungen |
| `frontend.entry` und `backend.entry` sind sichere relative Pfade (kein `..`, kein absoluter Pfad) | Erzwungen |
| Backend-Einstiegspunkt-Datei existiert auf Dateisystem | Erzwungen (beim Laden) |
| Frontend-Einstiegspunkt-Datei existiert auf Dateisystem | Erzwungen (bei Installation) |
| `icon` ist SVG und sicherer relativer Pfad (falls gesetzt) | Erzwungen |
| SemVer-Format von `version` | Erzwungen |
| `name` Laenge (1-128) und nicht-leere `description` | Erzwungen |

### Vorgabe für Bibliothek-Kachel und Spielerklärung

Die Bibliothek zeigt jedes Plugin als anklickbare Kachel. Beim Klick wird eine Detailansicht mit Spielerklärung geoeffnet. Damit diese Ansicht nutzbar ist, gelten folgende Regeln:

1. `frontend.bibliothek.description` soll eine **verstaendliche Spielerklärung** enthalten:
   - Spielziel
   - Grundregeln
   - Ablauf eines Zuges oder einer Runde
   - Gewinn- bzw. Endbedingungen
2. `frontend.bibliothek.title` soll eine kurze Unterzeile für die Kachel liefern.
3. Falls `frontend.bibliothek.description` fehlt, fällt der Core auf `description` zurück. Das ist nur ein Fallback und für produktive Plugins nicht ausreichend.
4. Die angezeigte Spieleranzahl (`Spieler: X-Y`) in Kachel und Detailansicht muss immer die **effektiven** Werte zeigen, nicht nur die Manifest-Basiswerte.
5. Priorität für effektive Werte:
   - Admin-Einstellungen `minPlayers` und `maxPlayers` (falls vorhanden und gültig)
   - sonst `manifest.minPlayers` und `manifest.maxPlayers`
6. Die Übernahme erfolgt live: Änderungen im Admin-Bereich müssen ohne Neuinstallation des Plugins in Bibliothek und Spielerklärung sichtbar sein.

Validierung der effektiven Werte:

- `minPlayers` muss eine ganze Zahl >= 1 sein.
- `maxPlayers` muss eine ganze Zahl >= `minPlayers` sein.
- Bei ungültigen Admin-Werten muss der Core automatisch auf die Manifest-Werte zurückfallen.

Empfohlene Laenge für `frontend.bibliothek.description`: 300-1200 Zeichen.

### Icon- und Cover-Anforderungen

- `icon` sollte auf eine SVG-Datei innerhalb des Plugin-ZIPs zeigen, z.B. `frontend/assets/icon.svg`.
- Wenn kein `icon` vorhanden ist, zeigt der Core als Fallback den ersten Buchstaben des Spielnamens.
- SVG sollte quadratisch sein (z.B. 128x128 oder 256x256), keine externen Referenzen enthalten und kein Script enthalten.
- Optional kann `frontend.bibliothek.coverImage` (PNG/JPG/SVG) gesetzt werden. Dieses Bild wird gross in der Detailansicht der Bibliothek angezeigt.
- Cover-Bilder dürfen **keinen Text** enthalten (kein Spieltitel, keine Untertitel, keine Labels). Titel und Beschreibung werden vom Core bereits separat angezeigt.
- Cover-SVGs müssen vollständig innerhalb der `viewBox` gezeichnet sein. Elemente, die über die `viewBox` hinausgehen, werden sichtbar abgeschnitten.
- **Pflicht** fuer Cover: Seitenverhältnis **16:9** (z.B. 1280x720 oder 640x360). Quadratische oder hochformatige Bilder werden im Banner-Bereich abgeschnitten (`object-fit: cover`). Ein Sicherheitsrand von mindestens 5 Prozent pro Seite fuer wichtige Inhalte ist empfohlen.

### Validierung bei Installation

Der Core prüft bei der Installation:

1. `manifest.json` muss im Root des ZIP liegen und gültiges JSON sein.
2. Alle Pflichtfelder müssen vorhanden sein.
3. `slug` muss dem Muster `/^[a-z0-9-]+$/` entsprechen (2-64 Zeichen).
4. `minPlayers` muss >= 1 sein.
5. `maxPlayers` muss >= `minPlayers` sein.
6. Falls `coreVersion` angegeben: Die installierte Core-Version muss die Anforderung erfuellen.
7. `frontend.entry` und `backend.entry` müssen Strings und sichere relative Pfade sein.
8. Ein Plugin mit dem gleichen `slug` darf nicht bereits installiert sein.
9. `version` muss gültiges SemVer sein.
10. `name` muss 1-128 Zeichen lang sein und `description` darf nicht leer sein.
11. Wenn `icon` gesetzt ist, muss es eine `.svg` mit sicherem relativem Pfad sein.
12. `frontend.entry` muss auf eine existierende Datei zeigen.
13. Beim Backend-Laden wird geprüft, ob `backend.entry` tatsaechlich existiert. Wenn nicht, bleibt das Plugin installiert, wird aber deaktiviert.

Hinweis zum Frontend-Einstiegspunkt:

- Der aktuelle Lobby-Loader laedt Frontends fest unter `/plugins/<slug>/frontend/index.js`.
- `frontend.entry` ist derzeit Metadatenfeld und wird für den Lobby-Loader nicht ausgewertet.
- Für maximale Kompatibilität muss die Spielkomponente unter `frontend/index.js` liegen.

### Bekannte Runtime-Einschraenkungen (Core v1.0.0)

1. Plugin-Backend-Code laeuft ohne echte Sandbox im Core-Prozess.
2. Einige Richtlinien (z.B. keine externen Netzwerkzugriffe) sind Review-Pflicht, aber nicht vollautomatisch technisch blockiert.
3. Einige optionale Manifest-Felder werden nur bei Vorhandensein geprüft (z.B. `icon`), aber nicht generell erzwungen.
4. Das Feld `frontend.entry` ist derzeit nicht der effektive Ladepfad für das Spiel-Frontend.

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

**Warnung:** Wenn das Backend-Modul weder `default` noch `register` exportiert, wird das Plugin stillschweigend nicht initialisiert. Es erscheint lediglich eine Warnung in der Server-Konsole. Stellen Sie sicher, dass der Einstiegspunkt eine der beiden Funktionen korrekt exportiert.

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

Sendet eine Nachricht an **einen einzelnen** Spieler (z.B. für geheime Informationen wie Handkarten).

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

Registriert einen Handler für eingehende Nachrichten von Spielern.

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
    return; // Ungültige Daten ignorieren
  }

  // Spielzug verarbeiten...
  context.ws.broadcast(lobbyId, 'spielzug-ergebnis', {
    spielerId: userId,
    position: { x: data.x, y: data.y },
    gültig: true,
  });
});
```

---

### context.stats -- Statistiken und Leaderboard

Der Core verwaltet Spielerstatistiken zentral. Plugins müssen Ergebnisse nur melden -- alles andere (Aggregation, Leaderboard, Anzeige) übernimmt der Core.

#### context.stats.recordResult(userId, result)

Speichert ein Spielergebnis. Muss fuer jeden Spieler am Ende einer Runde/eines Spiels aufgerufen werden.

**Einheitliche Punktevergabe durch den Core:**

| Ergebnis | Punkte |
|----------|--------|
| Sieg (`win: true`) | **+300** |
| Niederlage (weder `win` noch `draw`) | **-100** |
| Unentschieden (`draw: true`) | **0** |

Die Punktevergabe ist fest im Core definiert und kann nicht durch Plugins ueberschrieben werden. Der `score`-Parameter wird ignoriert -- Plugins muessen nur `win` oder `draw` setzen.

| Parameter | Typ | Beschreibung |
|-----------|-----|-------------|
| `userId` | `string` (UUID) | ID des Spielers |
| `result` | `object` | Ergebnis (siehe unten) |

Result-Objekt:

| Feld | Typ | Default | Beschreibung |
|------|-----|---------|-------------|
| `win` | `boolean` | `false` | Spieler hat gewonnen |
| `draw` | `boolean` | `false` | Unentschieden |

Logik: Wenn weder `win` noch `draw` gesetzt ist, wird es als Niederlage gewertet. `games_played` wird immer um 1 erhoeht. Die Punkte (+300/-100/0) werden automatisch vom Core vergeben und im Profil des Spielers angezeigt.

```javascript
// Sieg (+300 Punkte)
await context.stats.recordResult(gewinnerId, { win: true });

// Niederlage (-100 Punkte)
await context.stats.recordResult(verliererId, { win: false });

// Unentschieden (0 Punkte)
await context.stats.recordResult(spieler1Id, { draw: true });
await context.stats.recordResult(spieler2Id, { draw: true });
```

**Rueckgabe:** `Promise<void>` -- kein Rueckgabewert.

#### context.stats.getLeaderboard(options?)

Ruft das Leaderboard für dieses Plugin ab.

| Parameter | Typ | Default | Beschreibung |
|-----------|-----|---------|-------------|
| `options.limit` | `number` | `10` | Maximale Anzahl Eintraege |
| `options.period` | `string` | `undefined` (= allzeit) | Zeitraum: `'woche'`, `'monat'` oder weglassen für allzeit |

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

Ruft die Statistiken eines einzelnen Spielers für dieses Plugin ab.

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

Gibt alle Spieler in einer Lobby zurück.

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

Bei `'beendet'` oder `'geschlossen'` wird automatisch `closed_at` gesetzt und alle offenen `game_sessions` dieser Lobby erhalten ein `ended_at`. Beides ist noetig, damit Punkte (+/-) korrekt in den Highscores und Top-Movers angezeigt werden. Der Lobby-Code wird dadurch wieder frei.

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
  // Prüfen ob Spiel noch weitergehen kann
});
```

#### context.lobby.onGameRestart(handler)

Registriert einen Handler, der aufgerufen wird, wenn der Host "Erneut spielen" klickt und der Core die Lobby neu startet. Der Handler wird aufgerufen **bevor** das Frontend die Plugin-Komponente neu laedt und erneut `init-request` sendet.

Das Plugin **muss** in diesem Handler seinen internen Spielzustand fuer die betroffene Lobby zuruecksetzen (z.B. Spielfelder, Punktestaende, Rundenzaehler loeschen), damit der nachfolgende `init-request` ein frisches Spiel aufbaut.

| Parameter | Typ | Beschreibung |
|-----------|-----|-------------|
| `handler` | `function(lobbyId)` | Callback mit der Lobby-ID |

```javascript
context.lobby.onGameRestart((lobbyId) => {
  // Alten Spielzustand fuer diese Lobby loeschen
  games.delete(lobbyId);
  console.log(`Spiel in Lobby ${lobbyId} wird neu gestartet`);
});
```

**Wichtig:** Wenn ein Plugin `onGameRestart` nicht registriert, muss es sicherstellen, dass der `init-request`-Handler auch bei erneutem Aufruf fuer dieselbe Lobby korrekt funktioniert (z.B. bestehenden Zustand ueberschreibt statt einen Fehler zu werfen).

---

### context.storage -- Laufzeit-Speicher

Speichert beliebige JSON-Daten. Kann mit oder ohne `lobbyId` verwendet werden:

- **Mit lobbyId:** Daten gehoeren zu einer spezifischen Lobby/Spielsitzung.
- **Ohne lobbyId:** Globaler Plugin-Speicher, der über alle Lobbys hinweg verfügbar ist.

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

// Einstellung setzen (normalerweise über die Admin-UI, nicht im Spielcode)
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

Die Frontend-Datei (`frontend/index.js`) muss ein Vue-Options-Objekt als Default-Export bereitstellen. Die Komponente wird vom Core innerhalb der Lobby-Ansicht gerendert. Der Core übernimmt das Laden, Mounten und Zerstoeren der Komponente.

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
      this.error = 'Socket-Verbindung nicht verfügbar.';
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

### Aktueller Ladepfad des Spielfrontends

Der Lobby-Loader des Core laedt die Spielkomponente aktuell fest von:

`/plugins/<slug>/frontend/index.js`

Das bedeutet für Plugin-Autoren:

- Die eigentliche Spielkomponente muss unter `frontend/index.js` vorhanden sein.
- Das Feld `frontend.entry` im Manifest wird derzeit als Metadatum gespeichert, aber vom Lobby-Loader noch nicht dynamisch ausgewertet.
- `frontend.adminSettings` wird dagegen dynamisch ausgewertet und kann auf abweichende Pfade zeigen.

### Socket-Bereitstellung und Lebenszyklus

Der Core stellt die Socket.IO-Verbindung als globale Variable `socket` (= `window.socket`) bereit, **bevor** die Plugin-Komponente gemountet wird. Der Ablauf ist:

1. Spieler oeffnet die Lobby-Seite.
2. Core stellt die WebSocket-Verbindung her (falls nicht bereits verbunden) und authentifiziert den Spieler.
3. Core sendet `lobby:join` an den Server.
4. Core setzt `window.socket`, `window.currentUserId` und `window.lobbyId`.
5. Core laedt und mountet die Plugin-Komponente.

Das bedeutet: Wenn `mounted()` aufgerufen wird, ist die Socket-Verbindung bereits authentifiziert und der Spieler ist dem Lobby-Raum beigetreten. Die Plugin-Komponente kann sofort Events senden und empfangen.

### Spieler-ID und Lobby-ID

Der Core stellt zusaetzlich zur Socket-Verbindung zwei weitere globale Variablen bereit:

| Variable | Typ | Beschreibung |
|----------|-----|-------------|
| `window.currentUserId` | `string` (UUID) | ID des eingeloggten Spielers |
| `window.lobbyId` | `string` (UUID) | ID der aktuellen Lobby |

Beide werden **vor** dem Mounten der Plugin-Komponente gesetzt und beim Unmounten automatisch aufgeraeumt.

```javascript
// Eigene Spieler-ID ermitteln
const meineId = window.currentUserId;

// Prüfen ob ein Spieler "ich" ist
function binIchDran(state) {
  return state.currentPlayerId === window.currentUserId;
}
```

**Sicherheitsprüfung in `mounted()`:** Trotzdem sollte immer geprüft werden, ob `socket` verfügbar ist:

```javascript
mounted() {
  if (typeof socket === 'undefined' || !socket) {
    this.error = 'Socket-Verbindung nicht verfügbar.';
    return;
  }
  this.socketRef = socket;
  // Event-Listener registrieren und Init-Request senden
}
```

**Aufraeumen in `beforeUnmount()`:** Alle registrierten Event-Listener müssen entfernt werden, um Memory-Leaks zu vermeiden:

```javascript
beforeUnmount() {
  if (this.socketRef) {
    this.socketRef.off('plugin:mein-spiel:state');
    this.socketRef.off('plugin:mein-spiel:error');
  }
}
```

### Vollbild-Modus (Plugin-gesteuert)

Der Core stellt eine Fullscreen-API bereit, die Plugins **optional** nutzen koennen. Der Core rendert keinen eigenen Button -- das Plugin entscheidet selbst:

- **Ob** ein Vollbild-Modus angeboten wird
- **Wo** der Button platziert wird
- **Was** im Vollbild angezeigt wird (das gesamte Plugin wird im Overlay gerendert)

Wenn Fullscreen aktiviert wird, legt der Core den Spielcontainer als Overlay ueber die gesamte Seite (`position: fixed; inset: 0; z-index: 9999`). Der Nutzer kann das Overlay auch mit `Escape` verlassen.

**API (verfuegbar ueber `window`):**

| Funktion | Beschreibung |
|---|---|
| `window.enterFullscreen()` | Vollbild aktivieren |
| `window.exitFullscreen()` | Vollbild verlassen |
| `window.toggleFullscreen()` | Vollbild umschalten |
| `window.isFullscreen()` | Gibt `true`/`false` zurueck |

### Core-bereitgestellte Icons

Der Core stellt vorgefertigte SVG-Icons als HTML-Strings bereit, die Plugins direkt im Template verwenden koennen (via `v-html`). Dadurch haben alle Plugins ein einheitliches Icon-Design.

**API (verfuegbar ueber `window.icons`):**

| Icon | Beschreibung | Verwendung |
|------|-------------|------------|
| `window.icons.fullscreenEnter` | Expand/Vergroessern-Icon | Button zum Fullscreen aktivieren |
| `window.icons.fullscreenExit` | Minimize/Verkleinern-Icon | Button zum Fullscreen verlassen |
| `window.icons.close` | X/Schliessen-Icon | Allgemeines Schliessen-Icon |

**Beispiel-Implementation im Plugin:**

```javascript
// Im Template:
// <button @click="toggleFullscreen" class="fullscreen-btn">
//   <span v-html="fullscreenIcon"></span>
// </button>

computed: {
  fullscreenIcon() {
    if (!window.icons) return '';
    return window.isFullscreen()
      ? window.icons.fullscreenExit
      : window.icons.fullscreenEnter;
  },
},
methods: {
  toggleFullscreen() {
    window.toggleFullscreen();
  },
},
```

**Empfohlenes CSS fuer den Fullscreen-Button:**

```css
.fullscreen-btn {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 2px solid var(--color-border);
  border-radius: var(--radius);
  background-color: var(--color-bg-card);
  color: var(--color-text-muted);
  cursor: pointer;
}

.fullscreen-btn:hover {
  color: var(--color-text);
  background-color: var(--color-bg-hover);
}
```

**Hinweise:**

- Plugins sollten relative Groessen (`%`, `vw`, `vh`, `flex`, `grid`) statt fester Pixel verwenden, damit das Layout im Vollbild korrekt skaliert.
- Der Overlay-Container hat die CSS-Klasse `game-overlay` im aktiven Zustand.
- Es ist voellig in Ordnung, keinen Fullscreen-Button anzubieten -- nicht jedes Spiel braucht das.

### End-Screen (Spielende-Bildschirm)

Der Core stellt eine End-Screen API bereit, mit der Plugins nach Spielende ein einheitlich gestyltes Ergebnis-Overlay anzeigen koennen. Das Plugin entscheidet, **was** angezeigt wird -- der Core uebernimmt **Styling und Layout**.

**API (verfuegbar ueber `window`):**

| Funktion | Beschreibung |
|---|---|
| `window.showEndScreen(data)` | Zeigt den End-Screen mit den uebergebenen Daten an |
| `window.hideEndScreen()` | Blendet den End-Screen manuell aus |

**Datenobjekt (`data`):**

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `title` | `string` | Nein | Titel des End-Screens (Default: "Spiel beendet") |
| `players` | `EndScreenPlayer[]` | Ja | Platzierungsliste (in gewuenschter Reihenfolge) |
| `message` | `string` | Nein | Optionale Zusatz-Nachricht |

**`EndScreenPlayer`-Objekt:**

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `name` | `string` | Ja | Spielername |
| `score` | `number` | Nein | Punktzahl |
| `winner` | `boolean` | Nein | `true` markiert den Gewinner (gruenes Highlight + Stern-Icon) |
| `label` | `string` | Nein | Optionaler Rang-Text (Default: "#1", "#2", ...) |

**Beispiel-Implementation im Plugin:**

```javascript
// Im Backend (context.ts):
register(context) {
  context.ws.onMessage('spielzug', (data, userId, lobbyId) => {
    // ... Spiellogik ...

    if (spielVorbei) {
      // Statistik speichern
      context.stats.recordResult(lobbyId, gewinnerId, 'win');
      context.stats.recordResult(lobbyId, verliererId, 'loss');

      // Lobby beenden
      context.lobby.endGame(lobbyId);

      // Ergebnis an alle senden
      context.ws.broadcast(lobbyId, 'spiel-ende', {
        gewinner: gewinnerName,
        ergebnisse: [
          { name: gewinnerName, score: 150, winner: true },
          { name: verliererName, score: 80, winner: false },
        ],
      });
    }
  });
}
```

```javascript
// Im Frontend (Plugin-Komponente):
mounted() {
  this.socketRef.on('plugin:mein-spiel:spiel-ende', (data) => {
    // End-Screen anzeigen
    if (window.showEndScreen) {
      window.showEndScreen({
        title: 'Runde beendet',
        players: data.ergebnisse,
        message: `${data.gewinner} gewinnt die Runde!`,
      });
    }
  });
},
```

**Hinweise:**

- Der End-Screen wird bei "Erneut spielen" (`GAME_RESTART`) automatisch geschlossen.
- Der Host sieht im End-Screen einen "Erneut spielen"-Button, alle Spieler einen "Verlassen"-Button.
- Plugins koennen den End-Screen jederzeit mit `window.hideEndScreen()` manuell schliessen.
- Das Overlay wird ueber dem Spielfeld gerendert, nicht ueber der gesamten Seite.
- `players` sollte bereits in der gewuenschten Reihenfolge sortiert sein (Gewinner zuerst).

### Sound-System

Der Core stellt ein zentrales Sound-System bereit, das Plugins zum Abspielen von Sound-Effekten nutzen koennen. Der Benutzer kann Sounds ueber einen Mute-Button im Header global ein- und ausschalten. Die Mute-Einstellung wird im `localStorage` persistent gespeichert.

**API (verfuegbar ueber `window.soundSystem`):**

| Funktion | Rueckgabe | Beschreibung |
|---|---|---|
| `window.soundSystem.play(src)` | `Promise<void>` | Spielt eine Audio-Datei ab. Wird ignoriert wenn stummgeschaltet. |
| `window.soundSystem.isMuted()` | `boolean` | Gibt `true` zurueck wenn der Benutzer Sounds stummgeschaltet hat. |

**Parameter von `play(src)`:**

| Parameter | Typ | Beschreibung |
|-----------|-----|-------------|
| `src` | `string` | URL zur Audio-Datei. Fuer Plugin-Assets: `/plugins/<slug>/frontend/assets/sounds/<dateiname>` |

**Asset-Pfad-Konvention:**

Sound-Dateien muessen im Plugin-Verzeichnis liegen und werden ueber den statischen Asset-Pfad geladen:

```
mein-spiel/
  frontend/
    assets/
      sounds/
        ding.mp3
        gewonnen.mp3
        fehler.ogg
```

Die URL im Plugin lautet dann:

```javascript
window.soundSystem.play('/plugins/mein-spiel/frontend/assets/sounds/ding.mp3');
```

**Empfohlene Audio-Formate:**

| Format | Empfehlung | Kompatibilitaet |
|--------|-----------|-----------------|
| MP3 | Bevorzugt | Alle Browser |
| OGG | Alternative | Alle modernen Browser |
| WAV | Nur fuer sehr kurze Effekte | Alle Browser, grosse Dateien |

**Empfohlene Dateigroesse:** Maximal 500 KB pro Sound-Datei. Kurze Effekte (< 2 Sekunden) sollten unter 100 KB bleiben.

**Beispiel-Implementation im Plugin:**

```javascript
export default {
  template: `
    <div class="card">
      <h2>Mein Spiel</h2>
      <button class="btn-primary" @click="wuerfeln">Wuerfeln</button>
      <p v-if="ergebnis">Ergebnis: {{ ergebnis }}</p>
    </div>
  `,

  data() {
    return { ergebnis: null };
  },

  mounted() {
    if (typeof socket === 'undefined' || !socket) return;
    this.socketRef = socket;

    this.socketRef.on('plugin:mein-spiel:wurf-ergebnis', (data) => {
      this.ergebnis = data.wert;
      // Sound abspielen bei Ergebnis
      if (window.soundSystem) {
        window.soundSystem.play('/plugins/mein-spiel/frontend/assets/sounds/ding.mp3');
      }
    });
  },

  methods: {
    wuerfeln() {
      this.emitGameEvent('wurf', {});
    },
    emitGameEvent(event, data) {
      if (this.socketRef) {
        this.socketRef.emit('game:event', { event, data });
      }
    },
  },
};
```

**Regeln fuer Sound-Nutzung:**

1. **Kein Autoplay beim Laden.** Sounds duerfen erst als Reaktion auf Benutzer-Interaktion oder Spielereignisse abgespielt werden. Browser blockieren Autoplay ohne vorherige Interaktion.
2. **Keine Hintergrundmusik ohne User-Aktion.** Laengere Audio-Loops oder Musik duerfen nur abgespielt werden, nachdem der Benutzer aktiv einen "Musik an"-Button gedrueckt hat.
3. **Mute respektieren.** Das Sound-System prueft den Mute-Zustand automatisch. Plugins muessen ihn nicht selbst abfragen, koennen es aber optional tun (`window.soundSystem.isMuted()`), z.B. um einen visuellen Hinweis anzuzeigen.
4. **Sound-Dateien lokal im Plugin.** Keine externen URLs laden. Alle Sounds muessen als Assets im Plugin-ZIP enthalten sein.
5. **Sparsamer Einsatz.** Sound-Effekte sollen das Spielerlebnis verbessern, nicht stoeren. Nicht bei jeder Interaktion einen Sound abspielen.

**Fehlerbehandlung:**

`play()` gibt ein `Promise` zurueck. Wenn die Datei nicht gefunden wird oder der Browser das Abspielen blockiert, wird der Fehler still ignoriert (kein Crash). Optional kann der Fehler abgefangen werden:

```javascript
window.soundSystem.play('/plugins/mein-spiel/frontend/assets/sounds/ding.mp3')
  .catch(() => {
    // Sound konnte nicht abgespielt werden -- kein Problem
  });
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

Plugins senden Game-Events über den Core-Event `game:event`. Der Core leitet dieses Event an das Plugin-Backend weiter UND broadcastet es an alle Spieler in der Lobby:

```javascript
this.socketRef.emit('game:event', {
  event: 'spielzug',
  data: { x: 3, y: 5 },
});
```

Im Backend wird dieses Event über `context.ws.onMessage('spielzug', handler)` empfangen. Das `event`-Feld bestimmt, welcher Handler aufgerufen wird.

### Chat (Systemnachrichten)

Der Chat wird vom Core verwaltet. Plugins können über das Backend Systemnachrichten senden (`context.chat.sendSystem()`). Eingehende Systemnachrichten:

```javascript
this.socketRef.on('chat:system', (msg) => {
  // msg = { message, system: true, timestamp }
});
```

---

## Schnellstart für vollwertige Spiele

Dieser Abschnitt ist als direkte Umsetzungsanleitung gedacht. Wenn du ihn Schritt für Schritt befolgst, kannst du ein vollwertiges Spiel mit UI, Echtzeit-Logik, Statistiken und grafischem Spielbrett erstellen.

### 1. Minimalstruktur anlegen

```text
mein-brettspiel/
  manifest.json
  backend/
    index.js
  frontend/
    index.js
    settings.js            # optional
    assets/
      icon.svg
      cover.svg
      board.svg            # Spielbrett
      pieces/
        red.svg
        blue.svg
```

### 2. Manifest korrekt setzen

Pfadbeispiel für ein Brettspiel:

```json
{
  "slug": "mein-brettspiel",
  "name": "Mein Brettspiel",
  "version": "1.0.0",
  "description": "Rundenbasiertes Brettspiel für 2-4 Spieler.",
  "minPlayers": 2,
  "maxPlayers": 4,
  "coreVersion": ">=1.0.0",
  "icon": "frontend/assets/icon.svg",
  "frontend": {
    "entry": "frontend/index.js",
    "bibliothek": {
      "title": "Mein Brettspiel",
      "description": "Kurze und lange Spielerklärung für Bibliothek und Detailansicht.",
      "coverImage": "frontend/assets/cover.svg"
    },
    "adminSettings": "frontend/settings.js"
  },
  "backend": {
    "entry": "backend/index.js"
  }
}
```

### 3. Backend-Grundgeruest (Spielzustand + Zuege)

Das Backend sollte mindestens folgende Events behandeln:

1. `init-request`: initialen Spielzustand senden
2. `move`: Spielzug validieren und anwenden
3. `restart` (optional): neue Runde starten

Empfohlenes Muster:

```javascript
export default async function(context) {
  const games = new Map(); // key: lobbyId

  async function ensureGame(lobbyId) {
    let game = games.get(lobbyId);
    if (game) return game;

    const players = await context.lobby.getPlayers(lobbyId);
    game = {
      players,
      turnIndex: 0,
      board: createInitialBoard(),
      finished: false,
    };
    games.set(lobbyId, game);
    return game;
  }

  function currentPlayer(game) {
    return game.players[game.turnIndex];
  }

  context.ws.onMessage('init-request', async (_data, userId, lobbyId) => {
    const game = await ensureGame(lobbyId);
    context.ws.sendTo(lobbyId, userId, 'state', game);
  });

  context.ws.onMessage('move', async (data, userId, lobbyId) => {
    const game = await ensureGame(lobbyId);
    if (game.finished) return;
    if (currentPlayer(game)?.userId !== userId) return;
    if (!isValidMove(data, game)) return;

    applyMove(game, data);
    const winner = findWinner(game);

    if (winner) {
      game.finished = true;
      for (const p of game.players) {
        await context.stats.recordResult(p.userId, {
          win: p.userId === winner.userId,
        });
      }
      await context.lobby.setStatus(lobbyId, 'beendet');
    } else {
      game.turnIndex = (game.turnIndex + 1) % game.players.length;
    }

    context.ws.broadcast(lobbyId, 'state', game);
  });
}
```

### 4. Frontend-Grundgeruest (inkl. Spielbrett)

Die Frontend-Komponente rendert:

- Brett-Hintergrund (Bild/SVG),
- Figuren,
- Interaktionen (Klick/Touch),
- Status und Fehlermeldungen.

Einfaches Muster mit lokalem Brettbild:

```javascript
export default {
  template: `
    <div class="card">
      <h2>Mein Brettspiel</h2>
      <p v-if="error" style="color: var(--color-danger);">{{ error }}</p>

      <div class="board-wrap">
        <img class="board-bg" :src="boardImageUrl" alt="Spielbrett" />

        <button
          v-for="piece in pieces"
          :key="piece.id"
          class="piece"
          :style="{ left: piece.x + '%', top: piece.y + '%' }"
          @click="selectPiece(piece.id)"
        >
          <img :src="piece.spriteUrl" :alt="piece.id" />
        </button>
      </div>
    </div>
  `,

  data() {
    return {
      socketRef: null,
      error: '',
      pieces: [],
      boardImageUrl: '/plugins/mein-brettspiel/frontend/assets/board.svg',
    };
  },

  mounted() {
    if (typeof socket === 'undefined' || !socket) {
      this.error = 'Socket-Verbindung nicht verfügbar.';
      return;
    }

    this.socketRef = socket;
    this.onState = (state) => {
      this.pieces = mapStateToPieces(state);
    };

    this.socketRef.on('plugin:mein-brettspiel:state', this.onState);
    this.socketRef.emit('game:event', { event: 'init-request', data: {} });
  },

  beforeUnmount() {
    if (!this.socketRef) return;
    this.socketRef.off('plugin:mein-brettspiel:state', this.onState);
  },

  methods: {
    selectPiece(pieceId) {
      this.socketRef.emit('game:event', {
        event: 'move',
        data: { pieceId },
      });
    },
  },
};
```

Beispiel-CSS (im Style-Block oder via Style-Injection):

```css
.board-wrap {
  position: relative;
  width: min(90vw, 720px);
  aspect-ratio: 1 / 1;
  margin: 1rem auto 0;
}

.board-bg {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
}

.piece {
  position: absolute;
  width: 10%;
  height: 10%;
  transform: translate(-50%, -50%);
  background: transparent;
  padding: 0;
}

.piece img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
```

### 5. Grafik-Einbindung für Spielbrett und Figuren

Für grafische Spiele (z.B. Schachbrett, Mensch-aergere-dich-nicht, Kartenlayout) gilt:

1. Brett als lokale SVG/PNG in `frontend/assets/` ablegen.
2. Figuren ebenfalls lokal als SVG/PNG ablegen.
3. Positionen aus dem Server-State ableiten, nicht im DOM als Wahrheit pflegen.
4. Klicks immer als Event ans Backend senden, niemals nur clientseitig entscheiden.

### 6. Datenfluss für stabile Multiplayer-Synchronisation

Empfohlenes Modell:

1. Client sendet Input-Event (`move`).
2. Backend validiert turn/order/rules.
3. Backend aktualisiert den kanonischen Zustand.
4. Backend broadcastet neuen Zustand (`state`) an alle.
5. Clients rendern nur anhand dieses Zustands.

Damit bleiben alle Clients konsistent und Cheating durch reine UI-Manipulation wird reduziert.

### 7. Definition of Done für ein "vollwertiges" Spiel-Plugin

Ein Spiel ist erst fertig, wenn alle Punkte erfuellt sind:

1. Lobby-Start, laufendes Spiel, Spielende funktionieren.
2. Regeln werden serverseitig geprüft.
3. UI mit Spielbrett/Figuren reagiert auf Echtzeit-Updates.
4. Spielstand ist für alle Spieler konsistent.
5. `recordResult()` wird für alle Spieler aufgerufen.
6. Lobby wird am Ende auf `beendet` oder `geschlossen` gesetzt.
7. Plugin-Settings (optional) können gespeichert und geladen werden.
8. Event-Listener werden sauber deregistriert.
9. Keine externen Assets/CDNs.
10. ZIP installiert ohne manuelle Nacharbeit.

### 8. Typische Fehlerquellen

1. Frontend liegt nicht unter `frontend/index.js`.
2. `manifest.json` liegt nicht im ZIP-Root.
3. `game:event` wird gesendet, aber Backend-Eventname passt nicht.
4. Backend broadcastet nur Delta, Frontend erwartet Vollzustand.
5. `beforeUnmount()` entfernt Listener nicht.
6. Spiel endet, aber `context.lobby.setStatus(..., 'beendet')` fehlt.

---

## Design-Richtlinien

Plugins müssen sich optisch in das Core-Design einfuegen. Der Core verwendet ein **dunkles Neobrutalism-Farbschema** mit Gruen-Akzent, weichen Schatten und dicken Borders. Plugins, die ein eigenes helles oder inkompatibles Design verwenden, wirken visuell fremd und werden nicht akzeptiert.

### CSS-Variablen des Core

Der Core definiert folgende CSS Custom Properties auf `:root`. Diese stehen allen Plugin-Komponenten automatisch zur Verfügung:

| Variable | Wert | Verwendung |
|----------|------|------------|
| `--color-bg` | `#0E1117` | Seiten-Hintergrund (Dark Mode) |
| `--color-bg-secondary` | `#161B26` | Sekundaerer Hintergrund, Input-Felder |
| `--color-bg-card` | `#1C2333` | Kachel/Card-Hintergrund |
| `--color-bg-hover` | `#252D3F` | Hover-Zustand fuer Elemente |
| `--color-border` | `#3A4559` | Raender und Trennlinien |
| `--color-border-light` | `#2A3348` | Leichtere Trennlinien |
| `--color-text` | `#E8ECF4` | Primaere Textfarbe (hell auf dunkel) |
| `--color-text-muted` | `#8B93A6` | Sekundaerer/gedaempfter Text |
| `--color-primary` | `#00D26A` | Akzentfarbe (Gruen) |
| `--color-primary-hover` | `#00B85C` | Hover fuer Primaerfarbe |
| `--color-secondary` | `#0EA5A0` | Sekundaerfarbe (Teal) |
| `--color-success` | `#16A34A` | Erfolg, positiv |
| `--color-warning` | `#D97706` | Warnung |
| `--color-danger` | `#DC2626` | Fehler, Gefahr |
| `--color-info` | `#2563EB` | Info, Hinweis |
| `--radius` | `4px` | Standard-Eckenradius |
| `--radius-lg` | `8px` | Groesserer Eckenradius (Cards) |
| `--shadow` | `0 2px 8px rgba(0,0,0,0.3)` | Standard-Schatten (weich) |
| `--shadow-sm` | `0 1px 4px rgba(0,0,0,0.2)` | Kleiner Schatten |
| `--shadow-lg` | `0 4px 16px rgba(0,0,0,0.4)` | Grosser Schatten |
| `--transition` | `120ms ease` | Standard-Uebergangszeit |
| `--font-primary` | `System-Font-Stack` | Primaere Schriftfamilie (San Francisco, Segoe UI) |
| `--font-mono` | `JetBrains Mono, monospace` | Monospace-Schrift |

### Verfügbare CSS-Klassen

Der Core stellt globale CSS-Klassen bereit, die Plugins direkt verwenden können und sollen:

#### `.card` -- Kachel/Container

Hauptcontainer für Inhaltsabschnitte. Verwendet den dunklen Card-Hintergrund mit Rahmen, Schatten und abgerundeten Ecken.

```html
<div class="card">
  <h2>Spielfeld</h2>
  <p>Inhalt hier...</p>
</div>
```

Ergebnis: Kachel mit `background-color: var(--color-bg-card)`, `border: 2px solid var(--color-border)`, `border-radius: var(--radius-lg)`, `padding: 1.5rem`, `box-shadow: var(--shadow)`.

#### Buttons

| Klasse | Verwendung | Aussehen |
|--------|------------|----------|
| `btn-primary` | Hauptaktion (z.B. "Wuerfeln", "Spielen") | Gruener Hintergrund (#00D26A), dunkler Text |
| `btn-secondary` | Sekundaeraktion (z.B. "Abbrechen") | Dunkler Hintergrund, heller Text, sichtbarer Rand |
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

### Modale und Dialoge

Für Bestätigungen, Warnungen und Eingaben sollen Plugins **eigene Modale** verwenden. Browser-Dialoge wie `alert()`, `confirm()` oder `prompt()` sind für produktive Plugins nicht zulässig.

Verbindliche Struktur für Plugin-Dialoge:

```html
<div class="plugin-modal-overlay">
  <div class="plugin-modal plugin-modal--md card" role="dialog" aria-modal="true">
    <header class="plugin-modal__header">
      <h3>Aktion bestätigen</h3>
    </header>
    <section class="plugin-modal__content">
      <p>Möchtest du diese Runde wirklich aufgeben?</p>
    </section>
    <footer class="plugin-modal__actions">
      <button class="btn-secondary">Abbrechen</button>
      <button class="btn-danger">Aufgeben</button>
    </footer>
  </div>
</div>
```

Empfohlene Größenklassen:

| Klasse | Empfohlene max-width | Einsatz |
|--------|-----------------------|---------|
| `plugin-modal--sm` | `420px` | Kurze Bestätigungen |
| `plugin-modal--md` | `560px` | Standarddialoge |
| `plugin-modal--lg` | `720px` | Mehr Inhalt/Formulare |
| `plugin-modal--xl` | `920px` | Komplexe Einstellungen |

Beispiel-CSS (Core-konform):

```css
.plugin-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 1200;
}

.plugin-modal {
  width: 100%;
}

.plugin-modal--sm { max-width: 420px; }
.plugin-modal--md { max-width: 560px; }
.plugin-modal--lg { max-width: 720px; }
.plugin-modal--xl { max-width: 920px; }

.plugin-modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
```

Hinweis: Die Struktur soll einheitlich bleiben, die Größe darf je Use Case variieren.

### Inline-Styles mit CSS-Variablen

Wenn zusaetzliche Inline-Styles noetig sind (z.B. für dynamische Layouts), müssen die CSS-Variablen des Core verwendet werden. Keine hartcodierten Farbwerte verwenden.

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
// VERBOTEN: Externe Fonts oder CDNs
styles: {
  root: {
    fontFamily: 'Comic Sans MS',   // Externe Fonts nicht erlaubt
    border: 'none',                 // Bricht den Neobrutalism-Stil
  },
}
```

### Gestaltungsprinzipien

1. **Dark Neobrutalism-Design-System.** Der Core verwendet ein dunkles Design mit Gruen-Akzent (#00D26A), dicken Borders (2px) und weichen Schatten. Plugins sollten sich optisch einfuegen.

2. **Design-Freiheit fuer Plugins.** Plugins duerfen innerhalb ihrer Spielflaeche **eigene Farben, Layouts und Animationen** verwenden. Das Spielerlebnis soll kreativ und einzigartig sein. Die folgenden Punkte gelten als Empfehlung, nicht als harte Pflicht:
   - **Empfohlen:** `.card`-Klasse fuer Abschnitte, Core-Buttons fuer Standardaktionen, Core-Tokens fuer Hintergruende und Text
   - **Erlaubt:** Eigene Spielfarben, eigene Hover-Effekte, eigene Animationen, eigene Schriftgroessen innerhalb des Spielfelds
   - **Verboten:** Externe Fonts laden, externe CDNs einbinden, Core-CSS-Variablen global ueberschreiben

3. **Core-Tokens fuer Grundelemente nutzen.** Buttons, Inputs, Cards und Texte, die ausserhalb des Spielfelds liegen (z.B. Einstellungen, Info-Texte), muessen die CSS-Variablen des Core verwenden.

4. **Schriften.** Der Core liefert JetBrains Mono lokal aus (fuer Code-Elemente). Fliesstext verwendet den System-Font-Stack (San Francisco, Segoe UI). Plugins duerfen keine eigenen Schriften laden (DSGVO).

5. **Borders und Schatten.** Das Design nutzt `2px solid var(--color-border)` und `var(--shadow)` (weiche Schatten). Plugins duerfen innerhalb ihres Spielfelds abweichende Schatten und Borders verwenden.

6. **Responsive Layouts.** CSS Grid oder Flexbox verwenden. Absolute Positionierung und feste Pixelbreiten vermeiden.

7. **Interaktive Elemente muessen erkennbar sein.** Buttons und klickbare Elemente brauchen sichtbare Hover- und Focus-Zustaende.

8. **Querformat-Pflicht (Landscape).** Das gesamte MIKE Game Library Interface ist fuer Querformat optimiert. Der Core zeigt auf Mobilgeraeten im Hochformat automatisch einen Dreh-Hinweis. Plugins muessen ihr Layout so gestalten, dass es im Querformat ohne vertikales Scrollen nutzbar ist.

### Querformat-Anforderungen

Die MIKE Game Library ist primaer fuer den Landscape-Modus konzipiert. Auf Mobilgeraeten im Hochformat zeigt der Core automatisch einen Overlay-Hinweis, das Geraet zu drehen. Plugins muessen diese Vorgabe unterstuetzen.

**Pflicht:**

- Die Spielflaeche muss im Querformat **ohne vertikales Scrollen** vollstaendig nutzbar sein.
- Spielelemente sollen **horizontal nebeneinander** angeordnet werden, nicht vertikal untereinander.
- Buttons, Steuerungselemente und Spielinformationen muessen im sichtbaren Bereich liegen (kein Scrollen noetig).

**Empfohlen:**

- Viewport-relative Einheiten (`vh`, `vw`) oder `aspect-ratio` fuer die Spielfeld-Dimensionierung verwenden.
- CSS Grid oder Flexbox mit `flex-direction: row` fuer die Hauptstruktur.
- Maximale Hoehe des Spielfelds: `calc(100vh - 120px)` (abzueglich Header und Lobby-Info).
- Fuer Spielbretter: `aspect-ratio: 1` mit `max-height` statt fester Pixelwerte.

**Verboten:**

- Layouts, die nur im Hochformat funktionieren.
- Spielflaechen, die vertikal gescrollt werden muessen, um alle Informationen zu sehen.
- Feste Hoehen ueber `100vh` ohne Scroll-Alternative.

**Beispiel fuer querformat-optimiertes Layout:**

```javascript
template: `
  <div :style="{ display: 'flex', gap: '1rem', height: 'calc(100vh - 140px)' }">
    <!-- Spielfeld links -->
    <div :style="{ flex: '1', display: 'flex', alignItems: 'center', justifyContent: 'center' }">
      <div :style="{ aspectRatio: '1', maxHeight: '100%', maxWidth: '100%' }">
        <!-- Spielbrett hier -->
      </div>
    </div>
    <!-- Info/Steuerung rechts -->
    <div :style="{ width: '250px', flexShrink: 0 }">
      <!-- Spieler, Punkte, Buttons -->
    </div>
  </div>
`

### Vollständiges Design-Beispiel

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
                border: item.ausgewählt
                  ? '2px solid var(--color-primary)'
                  : '1px solid var(--color-border)',
                backgroundColor: item.ausgewählt
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
| Spielgrafiken | PNG oder SVG | PNG für Fotos/komplexe Grafiken, SVG für Vektoren |
| Cover-Bild | PNG | Empfohlen: 400x300 Pixel |
| Audio | MP3 | Breite Browser-Unterstuetzung |
| Schriften | WOFF2 | Nur wenn noetig, lokal einbinden |

### Verboten

- Keine Verlinkung auf externe CDNs oder Server für Assets.
- Keine Google Fonts oder andere extern geladene Schriften.
- Alle Assets müssen im Plugin-ZIP enthalten sein.

---

## Admin-Einstellungskomponente

Wenn in `manifest.json` das Feld `frontend.adminSettings` gesetzt ist, wird im Admin-Bereich unter "Spieleinstellungen" ein Eintrag für dieses Plugin angezeigt. Klickt der Admin darauf, wird die angegebene Vue-Komponente geladen.

Zugriffsmodell:

- Die Settings-API ist nur für Admin-Benutzer erreichbar.
- Requests müssen mit Session-Cookie und `credentials: 'include'` gesendet werden.
- Bei fehlender Berechtigung antwortet der Core mit `401` oder `403`.

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

Hinweise:

- `PUT` erwartet JSON-Body `{ key, value }`.
- `key` wird intern als `settings:<key>` gespeichert.
- `value` muss JSON-serialisierbar sein.

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

### Reservierte Settings-Schlüssel für Spieleranzahl

Für die zentrale Lobby- und Bibliotheksanzeige gelten zwei reservierte Schlüssel:

- `minPlayers`
- `maxPlayers`

Bedeutung und Verhalten:

- Diese Schlüssel überschreiben die Manifest-Basiswerte zur Laufzeit.
- Der Core verwendet die effektiven Werte für:
  - Spielkarten in der Bibliothek
  - Spielerklärung in der Detailansicht
  - Lobby-Regeln (z.B. Mindestanzahl beim Start)
- Änderungen über die Admin-Einstellungskomponente gelten sofort nach dem Speichern.
- Falls nur einer der beiden Schlüssel gesetzt ist oder Werte ungültig sind, muss der Core konsistent auf valide Werte zurückfallen (bevorzugt komplett auf Manifest-Basiswerte).

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
| `game:restart` | Server -> Client | `{ lobbyId }` | Spiel wird neu gestartet (Host hat "Erneut spielen" geklickt). Frontend laedt Plugin-Komponente neu. |
| `chat:message` | Bidirektional | `{ userId, username, message, system, timestamp }` | Chat-Nachricht |
| `chat:system` | Server -> Client | `{ message, system: true, timestamp }` | Systemnachricht |

### Plugin-Events

Plugin-Events werden automatisch mit `plugin:<slug>:` geprefixed:

| Backend-Aufruf | Event beim Client |
|---------------|------------------|
| `context.ws.broadcast(lobbyId, 'spielzug', data)` | `plugin:mein-spiel:spielzug` |
| `context.ws.sendTo(lobbyId, userId, 'karten', data)` | `plugin:mein-spiel:karten` |

### Game-Events (Client -> Server -> alle Clients)

Für einfache Weiterleitung ohne Backend-Logik:

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
    | GameMaster startet das Spiel (min. minPlayers müssen beigetreten sein)
    v
[LAEUFT] --- Spiel laeuft, Plugin-Logik aktiv
    |
    | Plugin ruft context.lobby.setStatus(lobbyId, 'beendet') auf
    v
[BEENDET] --- Ergebnisse gespeichert, Lobby-Code freigegeben
    |
    | (Optional) Host klickt "Erneut spielen"
    | Core ruft onGameRestart-Handler auf, neue game_session wird erstellt
    v
[LAEUFT] --- Neues Spiel mit denselben Spielern, Plugin-Frontend wird neu geladen
    |
    ...  (Zyklus kann beliebig oft wiederholt werden)
```

Alternativ:

```
[WARTEND] ---(Timeout: 30 Min. Inaktivitaet)---> [GESCHLOSSEN]
[WARTEND] ---(Abbruch durch Host)--------------> [GESCHLOSSEN]
```

### Pflichten des Plugins im Lebenszyklus

1. **Spiel starten:** Der Core setzt den Status auf `laeuft`, wenn der GameMaster startet. Anschliessend laedt der Core das Plugin-Frontend und mountet die Komponente. In `mounted()` sollte das Plugin einen `init-request` Game-Event senden, um den initialen Spielzustand vom Backend anzufordern. Das Backend erstellt daraufhin die Spielinstanz und sendet den Zustand an alle Spieler.
2. **Ergebnisse melden:** Am Ende des Spiels **muss** das Plugin für jeden Spieler `context.stats.recordResult()` aufrufen.
3. **Status beenden:** Das Plugin **muss** `context.lobby.setStatus(lobbyId, 'beendet')` aufrufen, wenn das Spiel vorbei ist. Ohne diesen Aufruf bleibt die Lobby aktiv.
4. **Neustart unterstuetzen:** Plugins **muessen** `context.lobby.onGameRestart(handler)` registrieren, um bei einem Neustart ihren internen Spielzustand fuer die betroffene Lobby zurueckzusetzen (z.B. `games.delete(lobbyId)`). Ohne diesen Handler bleibt veralteter Zustand im Speicher und kann zu Fehlern fuehren. Nach dem Neustart laedt der Core das Plugin-Frontend neu und der normale `init-request`-Flow beginnt von vorne.

### Neustart-Ablauf im Detail

Wenn der Host nach Spielende "Erneut spielen" klickt, passiert Folgendes:

1. **Core (Backend):**
   - Prueft, ob Lobby-Status `beendet` ist und der Anfragende der Host/Admin ist
   - Setzt Lobby-Status zurueck auf `laeuft`, setzt `closed_at` auf `null`
   - Erstellt eine neue `game_sessions`-Zeile (jede Runde wird einzeln getrackt)
   - Ruft `dispatch.gameRestart(lobbyId)` auf -- das loest den `onGameRestart`-Handler im Plugin aus
   - Sendet `game:restart`-Event an alle Spieler in der Lobby

2. **Plugin (Backend):**
   - Der `onGameRestart`-Handler wird aufgerufen
   - Das Plugin loescht den alten Spielzustand fuer die Lobby (z.B. `games.delete(lobbyId)`)
   - Danach ist das Plugin bereit, einen neuen `init-request` zu empfangen

3. **Core (Frontend):**
   - Empfaengt das `game:restart`-Event
   - Setzt `lobby.status` auf `laeuft`
   - Entlaedt die alte Plugin-Komponente und laedt sie neu
   - Die Plugin-Komponente wird erneut gemountet und sendet `init-request`

4. **Plugin (Frontend):**
   - Die Komponente wird neu gemountet (kompletter Neustart, frischer Zustand)
   - `mounted()` wird aufgerufen, Plugin sendet `init-request`
   - Backend antwortet mit neuem Spielzustand

**Wichtig fuer Plugin-Entwickler:** Da die Frontend-Komponente komplett neu geladen wird, muss das Frontend keinen Restart-spezifischen Code enthalten. Der gesamte Restart wird durch das erneute Mounten automatisch abgedeckt.

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
      return; // Ungültige Daten still ignorieren
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

Diese Regeln sind für die Plugin-Freigabe verbindlich.

### Sicherheitsrealitaet im aktuellen Core

- Plugins laufen im selben Node.js-Prozess wie der Core.
- Es gibt derzeit keine echte Sandbox/Isolation für Plugin-Backend-Code.
- Der Core verhindert aktuell **nicht automatisch** jeden unerwuenschten Import oder Netzwerkzugriff.

Folge:

- Sicherheitsregeln müssen bei Entwicklung und Review aktiv eingehalten werden.
- "Nicht erzwungen" bedeutet nicht "erlaubt", sondern "manuell zu prüfen".

### Muss-Regeln für sichere Plugins

1. **Alle Spielereingaben serverseitig validieren.** Vertraue niemals Daten, die über WebSocket oder API vom Client kommen. Prüfe Typen, Wertebereiche und Zulaessigkeit.
2. **XSS vermeiden.** Nutze im Frontend bevorzugt escaped Ausgabe (`{{ }}`), kein ungeprüftes `v-html`.
3. **Keine sensiblen Daten per Broadcast.** Geheime Spielinformationen nur mit `context.ws.sendTo()` an einzelne Spieler senden.
4. **Fehler robust behandeln.** Plugin-Handler müssen gegen Laufzeitfehler abgesichert sein, damit der Core-Prozess stabil bleibt.
5. **Keine externen CDNs/Remote-Assets im Frontend.** Assets lokal im ZIP ausliefern.
6. **Keine externen Netzwerkzugriffe im Backend.** Keine HTTP-Aufrufe an Drittserver.
7. **Keine Core-Manipulation.** Keine Überschreibung globaler Laufzeitobjekte, keine Eingriffe in Core-Routen, keine Seiteneffekte ausserhalb des Plugin-Zwecks.
8. **Datensparsamkeit beachten.** Keine unnötige Verarbeitung/Speicherung personenbezogener Daten in Plugin-Storage oder Logs.

---

## Verbindliche Regeln für Plugin-Entwickler

Die Einhaltung aller nachfolgenden Regeln ist Pflicht. Plugins, die gegen diese Regeln verstossen, werden nicht angenommen und muessen vor einer erneuten Einreichung entsprechend angepasst werden.

1. **Kein direkter Datenbankzugriff.** Ausschliesslich die bereitgestellten API-Methoden (`context.stats`, `context.storage`, `context.settings`) verwenden.
2. **Kein Dateisystemzugriff ausserhalb des Plugin-Ziels.**
3. **Keine externen Abhaengigkeiten im Backend.**
4. **Keine externen CDNs im Frontend.**
5. **`slug` ist unveraenderlich** nach der ersten Veröffentlichung.
6. **`coreVersion` angeben** für klare Kompatibilität.
7. **Spielergebnisse über `context.stats.recordResult()` melden.**
8. **Lobby-Status korrekt setzen** (`beendet` oder `geschlossen`), damit Ressourcen sauber freigegeben werden.
9. **Neustart unterstuetzen:** `context.lobby.onGameRestart()` **muss** registriert werden, um den internen Spielzustand bei Neustart zurueckzusetzen. Ohne diesen Handler funktioniert das Highscore-Tracking nach "Erneut spielen" nicht korrekt.
10. **Alle eingehenden Daten validieren** (WebSocket/API).
11. **Keine blockierenden Endlosschleifen.** Plugin-Code teilt sich CPU und Event-Loop mit dem Core.
12. **Maximale ZIP-Größe: 50 MB.**
13. **ESM-Format verwenden** (`default` oder `register` Export).
14. **Core-Design-System respektieren.** Neobrutalism-Tokens fuer Grundelemente nutzen (Buttons, Cards, Inputs). Spielfelder duerfen eigene Farben und Layouts verwenden.

### Regelstatus: Erzwungen vs Review

| Regel | Erzwungen | Review erforderlich |
|------|-----------|---------------------|
| ZIP-Größe <= 50 MB | Ja | Optional |
| Manifest-Pflichtfelder/Slug/min-max/coreVersion | Ja | Optional |
| Backend-Einstiegspunkt vorhanden | Ja (beim Laden) | Optional |
| Frontend-Einstiegspunkt vorhanden | Ja (bei Installation) | Optional |
| Keine externen Netzwerkzugriffe | Nein | Ja |
| Keine externen Abhaengigkeiten | Nein | Ja |
| Kein unkontrollierter Dateisystemzugriff | Nein | Ja |
| Input-Validierung in Spiel-Handlern | Nein | Ja |

---

## Plugin-Limits und Einschraenkungen

| Eigenschaft | Limit |
|-------------|-------|
| Maximale ZIP-Größe | 50 MB |
| Slug-Laenge | 2-64 Zeichen |
| Slug-Zeichen | `a-z`, `0-9`, `-` |
| maxPlayers Minimum | Gleich minPlayers |
| minPlayers Minimum | 1 |
| Chat-Nachrichtenlaenge | Max. 500 Zeichen |
| Lobby-Timeout (inaktiv) | 30 Minuten |
| Gleichzeitige Lobbys | Max. 10.000 (durch 4-Ziffern-Code begrenzt) |
| storage/settings Werte | Müssen JSON-serialisierbar sein |

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

### Release-Checkliste vor Upload

Vor dem Hochladen eines Plugins sollten mindestens folgende Punkte abgeprüft werden:

1. `manifest.json` enthaelt alle Pflichtfelder und einen stabilen `slug`.
2. Spiel-Frontend liegt unter `frontend/index.js`.
3. Backend exportiert `default` oder `register`.
4. Alle eingehenden Daten werden im Backend validiert.
5. Plugin entfernt Event-Listener in `beforeUnmount()`.
6. Bei Spielende werden Ergebnisse geschrieben und Lobby-Status gesetzt.
7. Plugin unterstuetzt Neustart (via `onGameRestart` oder robuster `init-request`-Handler).
8. Keine externen CDNs, keine externen Runtime-Abhaengigkeiten.
8. ZIP liegt unter 50 MB und hat `manifest.json` im Root.
9. Admin-Einstellungskomponente (falls vorhanden) ist robust gegen fehlende/ungültige Daten.
10. Mehrspieler-Fall wurde manuell mit mindestens 2 Clients getestet.

---

## Versionierung und Kompatibilität

### Core-Versionierung

Der Core folgt Semantic Versioning (SemVer):

- **Patch** (1.0.x): Bugfixes, keine API-Änderungen
- **Minor** (1.x.0): Neue API-Funktionen, abwaertskompatibel
- **Major** (x.0.0): Breaking Changes an der Plugin-API

### coreVersion im Manifest

Plugins deklarieren die benoetigte Core-Version als SemVer-Range:

```json
"coreVersion": ">=1.0.0"       // Jede Version ab 1.0.0
"coreVersion": "^1.0.0"        // 1.x.x (Minor + Patch Updates erlaubt)
"coreVersion": ">=1.2.0 <2.0.0" // Zwischen 1.2.0 und 2.0.0
```

Bei Installation und Aktivierung prüft der Core die `coreVersion`-Kompatibilität (falls im Manifest gesetzt). Eine eigene Admin-Warnlogik für "potenziell inkompatible, aber bereits installierte" Plugins ist derzeit nicht separat implementiert.

### Plugin-Updates

Um ein Plugin zu aktualisieren:

1. Altes Plugin deinstallieren.
2. Neues ZIP hochladen.

Dabei werden alle Plugin-Daten (Einstellungen, Statistiken) geloescht. Für ein Upgrade ohne Datenverlust muss ein Export/Import-Mechanismus im Plugin selbst implementiert werden.

---

## Vollständiges Beispiel-Plugin

### Referenz-Plugin: Kniffel

Das Kniffel-Plugin (`Kniffel/`) ist das produktionsreife Referenz-Plugin und demonstriert alle Context-API-Features:

- `context.ws.broadcast` und `context.ws.sendTo` -- Spielzustand an alle oder einzelne Spieler senden
- `context.ws.onMessage` -- Spielzuege empfangen und validieren
- `context.stats.recordResult` -- Ergebnisse am Spielende melden
- `context.lobby.getPlayers` und `context.lobby.setStatus` -- Lobby-Verwaltung
- `context.lobby.onPlayerJoin` und `context.lobby.onPlayerLeave` -- Spieler-Lifecycle
- `context.lobby.onGameRestart` -- Spielzustand bei Neustart zuruecksetzen
- `context.chat.sendSystem` -- Systemnachrichten im Chat

Das Kniffel-Plugin zeigt ausserdem:

- **Visuelle Wuerfel** mit CSS-Dot-Patterns und Roll-Animation
- **Inline-Scoring** direkt im Scoreboard (klickbare Zellen in der eigenen Spalte)
- **Style-Injection** mit `document.createElement('style')` für Plugin-spezifisches CSS
- **`window.currentUserId`** zur Identifikation der eigenen Spalte
- Vollständige Fehlerbehandlung mit `withErrorBoundary`-Pattern
- Korrekte Socket-Listener-Bereinigung in `beforeUnmount()`

Empfehlung: Das Kniffel-Plugin als Vorlage für neue Plugins verwenden. Das folgende Zahlenraten-Beispiel zeigt die minimale Grundstruktur.

### Zahlenraten -- Ein einfaches Multiplayer-Ratespiel

Der Spielleiter denkt sich eine Zahl zwischen 1 und 100 aus, die anderen Spieler raten abwechselnd.

#### manifest.json

```json
{
  "slug": "zahlenraten",
  "name": "Zahlenraten",
  "version": "1.0.0",
  "author": "MIKE Team",
  "description": "Rate die Zahl zwischen 1 und 100! Wer am nächsten dran ist, gewinnt.",
  "minPlayers": 2,
  "maxPlayers": 10,
  "coreVersion": ">=1.0.0",
  "icon": "frontend/assets/icon.svg",
  "frontend": {
    "entry": "frontend/index.js",
    "bibliothek": {
      "title": "Zahlenraten",
      "description": "Ein Spieler wählt eine geheime Zahl, die anderen raten. Wer am nächsten dran ist, gewinnt! Schnelles Partyspiel für 2-10 Spieler.",
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

  // Spielzustand zuruecksetzen wenn Host "Erneut spielen" klickt
  context.lobby.onGameRestart((lobbyId) => {
    spiele.delete(lobbyId);
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

    context.chat.sendSystem(lobbyId, 'Die Zahl wurde gewählt! Fangt an zu raten.');
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
        await context.stats.recordResult(s.userId, { win: true });
      } else if (s.userId !== spiel.spielleiter) {
        await context.stats.recordResult(s.userId, { win: false });
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
            Der Spielleiter wählt eine geheime Zahl zwischen 1 und 100.
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
      this.error = 'Socket-Verbindung nicht verfügbar.';
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
      return window.currentUserId || '';
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

*Letzte Aktualisierung: 21.03.2026 (MIKE Core v1.0.0)*
