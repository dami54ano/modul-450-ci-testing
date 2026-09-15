# Games Library Tests

In diesem Projekt wird die Games-Library mit verschiedenen Tests geprüft.

Enthalten sind:

- Unit Tests für den `GameService`
- Integrationstests für die REST-API
- Security-Tests
- Cypress-Tests für das Frontend
- ein Smoke-Test

Die Ergebnisse und die Einteilung der Tests stehen im [TESTREPORT.md](TESTREPORT.md).

## Backend testen

```powershell
cd backend
.\mvnw.cmd test
```

Erwartetes Ergebnis: **22 Tests erfolgreich**.

## Anwendung starten

Backend:

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

Frontend in einem zweiten Terminal:

```powershell
cd frontend
npm install
npm start
```

Das Frontend läuft unter `http://localhost:3000` und das Backend unter `http://localhost:8080`.

## Cypress-Tests starten

Backend und Frontend müssen laufen. Danach im Frontend-Ordner:

```powershell
npm run cypress:run
```

Oder Backend und Cypress zusammen mit dem automatischen Frontend-Start:

```powershell
npm run e2e
```

Erwartetes Ergebnis: **27 Tests erfolgreich**.

Falls Cypress unter Windows nicht startet:

```powershell
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
npm run e2e
```

## Technologien

- Java 26 und Spring Boot
- JUnit 5 und Mockito
- React und TypeScript
- Cypress

## Frontend-CI (Modul 450)

Das neue private Abgabe-Repository ist https://github.com/dami54ano/modul-450-ci-testing.
Die GitHub-Actions-Pipeline baut das Frontend und führt Jest in zwei parallelen Shards aus.
Über Run workflow lassen sich auch die Modi normal und workers starten.

Messwerte, Reflexion, Fehler-Versuch und direkte Links zu den echten GitHub-Läufen:
[CI-Testing-Dokumentation](docs/ci-testing.md).

Lokal im frontend-Ordner: `npm test`. Push in das neue Repository:
`git push ci-assignment HEAD:main`.
