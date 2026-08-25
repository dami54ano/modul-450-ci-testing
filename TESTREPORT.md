# Testreport

Stand: 25. August 2026

## Automatisierte Tests

| Test | Testart | Box-Ansatz | Begründung |
|---|---|---|---|
| `getAllGamesReturnsGamesFromRepository` | Unit | White-Box | Repository-Rückgabe und interner Aufruf sind bekannt. |
| `getGameByIdReturnsGameWhenItExists` | Unit | White-Box | `findById` wird gezielt vorbereitet. |
| `getGameByIdThrowsWhenIdDoesNotExist` | Unit | White-Box | Der leere Repository-Rückgabewert wird simuliert. |
| `createGameSavesAndReturnsSavedGame` | Unit | White-Box | Der Aufruf von `save` wird direkt geprüft. |
| `updateGameOverwritesAllFields` | Unit | White-Box | Alle internen Feldzuweisungen werden geprüft. |
| `updateGameThrowsWhenIdDoesNotExist` | Unit | White-Box | Der Fehlerpfad im Service wird gezielt ausgeführt. |
| `deleteGameDeletesWhenItExists` | Unit | White-Box | `existsById` und `deleteById` werden als Mock-Aufrufe geprüft. |
| `deleteGameThrowsWhenIdDoesNotExist` | Unit | White-Box | Der Fehlerpfad bei `existsById(false)` wird geprüft. |
| `searchByTitleDelegatesToRepository` | Unit | White-Box | Die Delegation an die bekannte Repository-Methode wird geprüft. |
| `createGameReturnsCreatedGameWithGeneratedId` | Integration | White-Box | Controller, Service, Repository und H2 laufen zusammen. |
| `createGameWithoutTitleReturnsValidationDetails` | Integration | White-Box | Bekannte Validierungsregeln und Fehlerstruktur werden geprüft. |
| `createGameWithFutureReleaseDateReturnsBadRequest` | Integration | White-Box | Die interne `PastOrPresent`-Regel wird gezielt getestet. |
| `getUnknownGameReturnsNotFoundResponse` | Integration | White-Box | Der bekannte Exception-Handler wird über HTTP geprüft. |
| `searchByTitleIgnoresCase` | Integration | White-Box | Die Suchmethode wird mit echten H2-Daten getestet. |
| `updateGamePersistsAllChanges` | Integration | White-Box | Die Änderung wird danach erneut über die API gelesen. |
| `deleteGameRemovesItAndSecondDeleteReturnsNotFound` | Integration | White-Box | Löschen und Fehlerpfad werden über alle Schichten geprüft. |
| `xssPayloadIsStoredAndReturnedAsPlainJsonText` | Security/Integration | Grey-Box | Die API wird von aussen angesprochen, die erwartete React-Behandlung ist bekannt. |
| `malformedJsonReturnsBadRequestInsteadOfServerError` | Security/Integration | Grey-Box | Ungültiges JSON wird gegen die bekannte Fehlerbehandlung getestet. |
| `missingRequiredFieldsReturnStructuredBadRequest` | Security/Integration | Grey-Box | Pflichtfelder und API-Antwort werden geprüft. |
| `corsAllowsConfiguredFrontendOrigin` | Security/Integration | Grey-Box | Der Test wurde aus der bekannten CORS-Konfiguration abgeleitet. |
| `corsRejectsUnknownOrigin` | Security/Integration | Grey-Box | Eine nicht erlaubte Origin wird gegen die Konfiguration geprüft. |
| `lädt Frontend und Backend` | Smoke/System | White-Box | Der Test kennt Frontend-, API-URL und Seitentitel. |
| `bricht das Bearbeiten ab und behält die ursprünglichen Daten` | System/E2E | Grey-Box | Bedienung über die UI, mit Kenntnis der Selektoren. |
| `zeigt eine Fehlermeldung bei einem Serverfehler` | System/E2E | Grey-Box | Der API-Fehler wird gezielt mit `cy.intercept` simuliert. |
| `zeigt No Image, wenn eine Bild-URL ungültig ist` | System/E2E | Grey-Box | Der bekannte Bild-Fallback wird über die UI geprüft. |
| `behandelt Sonderzeichen in der Suche korrekt` | System/E2E | Grey-Box | UI und übertragener API-Parameter werden gemeinsam geprüft. |

## Testergebnisse

### Backend

Ausgeführt mit:

```powershell
cd backend
.\mvnw.cmd test
```

Ergebnis: **22 Tests erfolgreich, 0 fehlgeschlagen.**

Die Maven-Konfiguration wurde so ergänzt, dass auch Klassen mit dem Suffix `IT` beim Befehl `test` ausgeführt werden.

### Frontend und E2E

Ausgeführt mit laufendem Backend:

```powershell
cd frontend
npm run e2e
```

Ergebnis: **27 Tests erfolgreich, 0 fehlgeschlagen.** Darin enthalten sind der neue Smoke-Test und vier eigene E2E-Tests.

Auf diesem Rechner muss vor Cypress eventuell die Umgebungsvariable `ELECTRON_RUN_AS_NODE` für das aktuelle Terminal entfernt werden:

```powershell
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
```

## Regressionstest

Vor den Erweiterungen liefen die vorhandenen 10 Backend-Tests erfolgreich. Nach dem Ergänzen der Integrations- und Security-Tests gab es einen Fehler: Ungültiges JSON lieferte den Status `500` statt `400`.

Der `GlobalExceptionHandler` behandelt `HttpMessageNotReadableException` jetzt als `400 Bad Request`. Danach liefen alle 22 Backend-Tests und alle 27 Cypress-Tests erfolgreich. Bestehende Funktionen wurden durch die Änderung nicht beschädigt.

## Security

### XSS

Der Titel `<script>alert(1)</script>` kann als Text gespeichert und über die API gelesen werden. React setzt normale Werte in JSX als Text ein und führt sie nicht als HTML oder JavaScript aus. Im Frontend wird an dieser Stelle kein `dangerouslySetInnerHTML` verwendet.

### Ungültige API-Eingaben

Fehlende Pflichtfelder liefern `400 Bad Request` mit Feldangaben. Kaputtes JSON lieferte zuerst fälschlich `500`. Dieser Fehler wurde behoben und durch einen Integrationstest abgesichert.

### CORS

Erlaubt ist `http://localhost:3000`. Der Test bestätigt den entsprechenden `Access-Control-Allow-Origin`-Header. Eine Anfrage von `http://boese-seite.ch` wird mit Status `403` abgelehnt.

## Accessibility

Folgende Punkte wurden am Code und mit der laufenden Anwendung geprüft:

- Die Formularfelder sind mit sichtbaren Labels verbunden, weil die Inputs innerhalb der jeweiligen `label`-Elemente liegen.
- Spielbilder verwenden den Spieltitel als `alt`-Text.
- Edit-, Delete-, Cancel- und Submit-Buttons haben sichtbaren Text.
- Der reine X-Button besitzt jetzt `aria-label="Formular schliessen"`.
- Das Formular ist als Dialog mit `role="dialog"`, `aria-modal` und einer Überschrift gekennzeichnet.
- Die Formularelemente und Buttons sind mit der Tab-Taste erreichbar.

Eine genaue Kontrastmessung mit einem Accessibility-Werkzeug wurde nicht durchgeführt.

## Manueller Usability-Test

Dieser Teil muss mit einer echten Testperson durchgeführt werden. Vor der Abgabe noch kurz ausfüllen:

- Testperson: ____________________
- Wo hat die Person beim Hinzufügen eines Spiels gezögert? ____________________
- War die Suche verständlich? ____________________
- Wurde die Datumssortierung verstanden? ____________________
- War das Löschen eindeutig? ____________________
- Verbesserungsvorschlag: ____________________

Aufgaben für die Testperson:

1. Ein neues Spiel hinzufügen.
2. Nach einem Spiel suchen.
3. Nach dem neuesten Erscheinungsdatum sortieren.
4. Das Spiel wieder löschen.

## Performance

Der Performance-Test ist ein freiwilliger Bonus und wurde nicht durchgeführt.
