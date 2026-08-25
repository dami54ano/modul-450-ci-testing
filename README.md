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
