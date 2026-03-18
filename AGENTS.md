# AGENTS.md

Diese Datei definiert die Arbeitsregeln für Agenten und Mitwirkende in diesem Repository. Ziel ist ein sicherer, DSGVO-konformer und reproduzierbarer Betrieb bei Fresh Install, Update und Deinstall.

## Allgemeine Regeln

- Antworte und dokumentiere auf Deutsch, einschließlich echter Umlaute wie ä, ö, ü.
- Keine Emojis verwenden.
- Icons grundsätzlich als eigene lokale SVG-Dateien umsetzen. Keine extern geladenen Icon-CDNs verwenden.
- DSGVO-Konformität für Deutschland ist Pflicht. Datenschutzfreundliche Voreinstellungen haben Vorrang.
- Keine Google Fonts oder andere unnötige externe Drittanbieter-Ressourcen einbinden. Schriften und Assets lokal ausliefern.
- Sicherheit hat Vorrang vor Bequemlichkeit und vor rein optischen Verbesserungen.
- Keine Quick-Fixes nur auf dem Server. Jede serverseitige Problemlösung muss als dauerhafte lokale Code- oder Konfigurationsänderung im Repository abgebildet werden.
- Jede Änderung muss so umgesetzt werden, dass ein Fresh Install weiterhin ohne manuelle Nacharbeit funktioniert.

## Authentifizierung und Benutzerverwaltung

- Logins grundsätzlich mit Nutzername und Passwort umsetzen.
- 2FA oder MFA ist optional für Benutzer, muss aber im Admin-Dashboard pro Benutzer oder global erzwingbar sein.
- Beim Einrichten von 2FA oder MFA müssen Notfallcodes angeboten werden, bevorzugt als PDF oder druckbare Ansicht.
- Passwörter niemals im Klartext speichern oder protokollieren.
- Passwörter nur mit einem etablierten, starken Hash-Verfahren wie Argon2id oder bcrypt speichern.
- Für Login, Passwort-Reset und 2FA-Verifikation sind Rate-Limits, Sperren oder Backoff-Mechanismen vorzusehen.
- Berechtigungen und Rollen immer serverseitig prüfen. Frontend-Prüfungen allein gelten nicht als Schutzmaßnahme.

## Sicherheit

- Alle Eingaben serverseitig validieren und bereinigen.
- Datenbankzugriffe nur mit sicheren, parameterisierten Queries oder einer gleichwertig sicheren ORM-Nutzung umsetzen.
- Schutz gegen SQL-Injection, XSS, CSRF, IDOR und Session-Fixation ist Pflicht.
- Sicherheitsrelevante Aktionen müssen nachvollziehbar protokolliert werden, jedoch ohne Passwörter, Tokens, 2FA-Secrets oder andere Geheimnisse in Logs zu schreiben.
- Secrets, API-Keys, Zertifikate, private Schlüssel und Zugangsdaten dürfen niemals ins Repository committed werden.
- Sicherheitsrelevante Konfigurationen müssen sichere Standardwerte haben.
- Uploads nur mit Dateityp-Prüfung, Größenlimit und sicherer Speicherung verarbeiten. Hochgeladene Dateien dürfen nicht ungeprüft ausführbar sein.

## Datenschutz und DSGVO

- So wenige personenbezogene Daten wie möglich speichern.
- Logs und Telemetrie datensparsam gestalten.
- Externe Dienste nur einsetzen, wenn sie technisch notwendig und datenschutzrechtlich vertretbar sind.
- Tracking oder Analysefunktionen standardmäßig deaktiviert halten, sofern sie nicht zwingend erforderlich sind.
- Wenn ein Feature personenbezogene Daten verarbeitet, müssen Löschung, Export und nachvollziehbare Zweckbindung mitgedacht werden.

## Installation, Update und Deinstall

- Es muss einen dokumentierten One-Line-Installationsbefehl geben, der den Server vollständig einrichtet.
- Wenn bei der Installation eine Domain verwendet wird, soll SSL mit Let's Encrypt und Certbot automatisch eingerichtet werden, ohne eine E-Mail-Adresse zwingend vorauszusetzen.
- Es muss einen vollständig selbständigen Update-Befehl geben.
- Es muss einen vollständig selbständigen Deinstall-Befehl geben.
- Installations-, Update- und Deinstall-Skripte müssen reproduzierbar und idempotent sein, soweit technisch sinnvoll.
- Änderungen an Infrastruktur, Abhängigkeiten, Konfiguration oder Datenbank müssen immer darauf geprüft werden, ob Install, Update und Deinstall weiterhin funktionieren.

## Repository- und GitHub-Regeln

- `.gitignore` stets pflegen, damit nur notwendige Projektdateien versioniert werden.
- Sensible Daten, lokale Dumps, Backups, Uploads, Build-Artefakte und temporäre Dateien dürfen nicht committed werden.
- Agent-Regeln anderer Tools oder lokaler Hilfssysteme dürfen nicht versehentlich mit gepusht werden, sofern sie nicht ausdrücklich Teil dieses Projekts sein sollen.
- Eine `README.md` ist Pflicht.
- Die `README.md` soll bewusst knapp bleiben und mindestens folgende Punkte enthalten: Tech-Stack, Mindestanforderungen an den Server, benötigte Ports, Betriebssystem, RAM, vCPU, Speicherplatz sowie die Befehle für Install, Update und Deinstall.

## Coding-Standards

- Änderungen so klein wie möglich und so vollständig wie nötig halten.
- Keine hartcodierten Secrets, Domains, Ports oder Umgebungswerte im Anwendungscode.
- Konfiguration über Umgebungsvariablen oder zentrale Konfigurationsdateien steuern.
- Neue Abhängigkeiten nur hinzufügen, wenn sie einen klaren Mehrwert haben und gepflegt erscheinen.
- Bestehende Projektstruktur und Stilrichtung respektieren, sofern sie nicht im Widerspruch zu Sicherheit, Wartbarkeit oder diesen Regeln stehen.
- Kommentare nur dort ergänzen, wo nicht offensichtliche Logik erklärt werden muss.
- Tote Codepfade, ungenutzte Konfiguration und veraltete Workarounds nach Möglichkeit mitbereinigen, wenn sie im betroffenen Bereich liegen.

## Datenbank und Migrationen

- Datenbankänderungen müssen über nachvollziehbare Migrationen oder ein gleichwertig reproduzierbares Verfahren erfolgen.
- Migrationen müssen Updates bestehender Installationen sicher unterstützen.
- Neue Felder und Tabellen mit sinnvollen Defaults oder sauberer Migrationslogik einführen, damit Bestandsdaten nicht brechen.
- Datenbankänderungen dürfen einen Fresh Install nicht verschlechtern.

## Workflow

- Vor Änderungen zuerst Ursache und Auswirkungen verstehen.
- Bei Fehlerbehebungen immer die eigentliche Ursache beheben, nicht nur Symptome kaschieren.
- Wenn ein Problem nur auf dem Server sichtbar wurde, muss die dauerhafte Lösung lokal umgesetzt und versioniert werden.
- Änderungen an Setup, Deployment, Datenbank oder Authentifizierung besonders vorsichtig behandeln und vollständig mit den angrenzenden Komponenten abgleichen.
- Wenn Konfigurationen geändert werden, müssen zugehörige Beispieldateien und Dokumentation mit aktualisiert werden.

## Tests und Validierung

- Jede relevante Änderung muss mindestens die betroffenen Tests, Builds, Linter oder vergleichbare Prüfungen bestehen.
- Wenn keine automatischen Tests existieren, ist mindestens eine nachvollziehbare manuelle Validierung der betroffenen Funktion erforderlich.
- Änderungen an Install, Update, Deinstall, Authentifizierung, Berechtigungen oder Migrationen sind besonders gründlich zu prüfen.
- Ein Task ist erst dann abgeschlossen, wenn die Änderung konsistent mit Fresh Install, Update-Pfad und bestehender Dokumentation ist.

## Definition of Done

- Codeänderung ist umgesetzt.
- Sicherheits- und Datenschutzanforderungen wurden berücksichtigt.
- Relevante Tests oder Validierungen wurden durchgeführt.
- Dokumentation, Konfigurationsbeispiele und Skripte wurden bei Bedarf aktualisiert.
- Fresh Install, Update und Deinstall wurden bei betroffenen Änderungen mitgedacht und nicht verschlechtert.
