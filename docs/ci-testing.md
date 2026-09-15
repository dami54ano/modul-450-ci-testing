# CI-Tests in GitHub Actions (Modul 450)

## Projekt und Ausgangszustand

Das Repository enthält ein React-/TypeScript-Frontend mit Create React App 5 und Jest 27.5.1 sowie ein separates Java-Backend. npm und das bestehende Lockfile bleiben erhalten. Der bisherige CRA-Beispieltest erwartete einen nicht mehr vorhandenen Learn-React-Link. Jetzt prüfen fünf Tests in drei Dateien die echte Überschrift, Suche und Spielkarten. Externe APIs werden im App-Test isoliert; kein laufendes Backend ist nötig.

Alle npm-Befehle werden in `frontend` ausgeführt. Node 22 entspricht der lokal vorhandenen Hauptversion und wird in `frontend/.nvmrc` festgelegt. Die vorhandene CRA-Jest-Konfiguration und Dependencies bleiben erhalten. Es gibt kein separates Lint-Script; `npm run build` beinhaltet die CRA-Prüfungen.

## Pipeline

`.github/workflows/ci.yml` startet bei Push und Pull Request auf `main`. Zusätzlich ist `workflow_dispatch` mit den Modi `normal`, `sharding` und `workers` verfügbar. Der aktuelle lokale Branch muss deshalb erst nach main übernommen werden oder einen Pull Request auf main öffnen. Für manuelle Starts muss die Workflow-Datei auf dem Standardbranch vorhanden sein.

1. `build`: Checkout, Node, npm-Cache, `npm ci`, Produktionsbuild, Artefakt hochladen.
2. `tests`: wartet mit `needs: build`, startet im Standardmodus zwei parallele Matrix-Jobs. Jeder installiert Dependencies, lädt das Build-Artefakt und prüft dessen HTML und referenzierte Einstiegspunkte. Danach laufen die zugeteilten Jest-Dateien.

Der echte CRA-Output `frontend/build` wird für drei Tage gespeichert; Source Maps werden nicht hochgeladen. Der zusätzliche Build-Smoke-Check verwendet das heruntergeladene Artefakt. Die React-Unit-Tests selbst prüfen Quellcode und benötigen den Build nicht.

`node_modules` wird nicht hochgeladen: viele kleine Dateien, plattformspezifische Inhalte und Übertragungsaufwand. `setup-node` cached stattdessen npm-Paketdownloads anhand des Lockfiles; `npm ci` erstellt in jedem Job reproduzierbar die Dependencies. Der Cypress-Binärdownload wird für diese Unit-Test-Pipeline deaktiviert. Es gibt nur `contents: read`, keine Secrets und kein `continue-on-error`.

Verwendete stabile Actions (am 15.09.2026 geprüft): [checkout v7](https://github.com/actions/checkout/releases/tag/v7.0.1), [setup-node v7](https://github.com/actions/setup-node/releases/tag/v7.0.0), [upload-artifact v7](https://github.com/actions/upload-artifact/releases/tag/v7.0.1), [download-artifact v8](https://github.com/actions/download-artifact/releases/tag/v8.0.1).

## Lokal ausführen

```powershell
cd frontend
npm ci
npm test
npm run build
npm run test:build
npm run test:ci
npm run test:shard -- 1/2
npm run test:shard -- 2/2
npm run test:workers
```

`npm test` beendet sich nach allen Tests ohne Watch-Modus. Interaktiv: `npm test -- --watchAll`.

## Normale Ausführung und Laufzeiten

Der reproduzierbare Ausgangswert ist `npm run test:ci`: alle Tests in einem Prozess (`--runInBand`). Unter Repository → Actions → Frontend Build and Jest → Run workflow den Modus `normal` wählen. Im fertigen Lauf stehen die Gesamtdauer und die Dauer jedes Jobs und Steps. Die Jest-Ausgabe enthält zusätzlich `Time`.

## Sharding

Standard: zwei parallele Runner, mit `npm run test:shard -- 1/2` und `npm run test:shard -- 2/2`. Jest 27 besitzt noch kein natives `--shard`. Statt CRA/Jest blind zu aktualisieren, verwendet `scripts/test-shard.cjs` die vorhandene CRA-Testkonfiguration für `--listTests --json`, sortiert alle Testdateien und verteilt sie per Index modulo 2. Anschließend startet jeder Runner nur seine Dateien via `--runTestsByPath --runInBand`. Jede Datei läuft genau einmal; beide Shards zusammen enthalten die gesamte Suite. Ungültige Angaben, leere Shards und Testfehler führen zu Exitcode ungleich 0.

Die Matrix erzeugt unabhängige Runner nach erfolgreichem Build. `fail-fast: false` lässt den zweiten Shard bei einem Fehler weiterlaufen, damit beide Ergebnisse sichtbar bleiben; der Workflow schlägt trotzdem fehl. Bei wenigen Dateien kann der zusätzliche Setup-Aufwand den Nutzen übersteigen.

## CPU-Worker

`npm run test:workers` verwendet `--maxWorkers=2`. Jest darf damit bis zu zwei Worker-Prozesse für die drei Testdateien verwenden. Das ist eine explizite, vergleichbare Grenze und ermöglicht auch auf einem Runner mit zwei verfügbaren CPUs mehrere Worker; 50 % würde dort nur einen erlauben. Die tatsächliche Verteilung steuert Jest. Modus `workers` startet einen Matrix-Job mit der vollständigen Suite.

## Fair messen

Für alle drei Modi denselben Commit, dieselbe Node-Version und Runner-Klasse verwenden. Cache-Aufwärmläufe getrennt behandeln und jede Variante mehrfach messen (z. B. drei Läufe, Median). Keine parallelen Vergleichsläufe starten. Gesamte Pipeline und reine Testzeit getrennt notieren. Bei Sharding ist für die Testphase die verstrichene Zeit bis zum Ende beider Shards relevant, nicht deren Summe; die Summe entspricht eher dem Ressourcenverbrauch. Setup, Downloads und Runner-Wartezeiten können die Gesamtdauer beeinflussen.

Echte GitHub-Actions-Laufzeiten: **Noch zu messen.**

| Variante | Laufzeit | Unterschied |
|---|---:|---:|
| Normal | ___ s | Basis |
| Sharding | ___ s | ___ % |
| mehrere CPU-Kerne | ___ s | ___ % |

Messgröße dieser Tabelle: gesamte Pipeline-Dauer. Reine Test-Step-Zeiten separat festhalten.

```text
Zeitersparnis in % = ((alte Zeit - neue Zeit) / alte Zeit) × 100
```

Negative Werte bedeuten eine Verlangsamung.

## Fehler simulieren und korrigieren

1. In `frontend/src/App.test.tsx` in der Assertion `name: 'Games Library'` durch `name: 'Wrong Heading'` ersetzen.
2. `npm test` ausführen: der Überschriftentest muss fehlschlagen.
3. Nur diese Änderung committen und auf einen Branch mit Pull Request auf main oder auf main pushen.
4. Unter Actions den fehlgeschlagenen Jest-Shard öffnen. Der Build bleibt erfolgreich, der Test meldet, dass die erwartete Überschrift fehlt.
5. Assertion auf `Games Library` zurücksetzen und `npm test` erneut ausführen.
6. Korrektur committen und pushen; grünen Workflow kontrollieren.

Der ausgelieferte Stand enthält ausschließlich korrekte Erwartungen. Dieser Fehler-Commit wurde nicht automatisch erstellt oder gepusht.

## Reflexion

1. **Wie hat sich die Laufzeit durch Sharding verändert?** Noch zu messen. Vorlage: Normal ___ s, Sharding ___ s, Änderung ___ %. Mögliche Erklärung anhand der Logs: ___ (Testverteilung / zusätzlicher Setup-Aufwand).
2. **Welche Methode brachte die beste Performance?** Noch zu messen. Vorlage: ___ war mit ___ s am schnellsten. Gegenüber der Basis entspricht dies ___ %. Testzeit und Gesamtdauer unterscheiden sich um ___, weil ___ .
3. **Welche weiteren Optimierungen sind möglich?** Vorlage: Messungen zeigen den Engpass bei ___. Denkbar sind besser balancierte Shards, gezielte Mocks für langsame I/O-Aufrufe und passende Worker-Anzahl. Erst messen, dann optimieren; zusätzliche Shards erhöhen den Ressourcenverbrauch.

## Git-Remotes

`origin` verweist auf die Schulvorlage `bbw-md/GamesLibraryHandout`; `submission` auf `dami54ano/Unit-Tests`. Für die Abgabe das passende eigene Remote verwenden. Bestehende uncommittete Cypress-Änderungen gehören nicht zu dieser CI-Umsetzung.

## Lokale Verifikation am 15.09.2026

- `npm test`: 3 Suites, 5 Tests erfolgreich.
- `npm run test:ci`: 3 Suites, 5 Tests erfolgreich.
- `npm run test:shard -- 1/2`: 2 Suites, 3 Tests erfolgreich.
- `npm run test:shard -- 2/2`: 1 Suite, 2 Tests erfolgreich.
- `npm run test:workers`: 3 Suites, 5 Tests erfolgreich, maxWorkers=2.
- `npm run build` mit CI=true: erfolgreich, inklusive CRA-Prüfungen.
- `npm run test:build`: HTML und alle Build-Einstiegspunkte erfolgreich geprüft.
- YAML mit js-yaml geparst; main-Trigger und needs: build geprüft.
- `npm ci --dry-run --ignore-scripts --no-audit --no-fund`: erfolgreich. Keine vollständige Neuinstallation; geprüft wurde die Installationsplanung gegen das Lockfile.
- Ungültiger Shard 0/2 und leerer Shard 4/4: Exitcode 1 wie vorgesehen.
- `git diff --check`: erfolgreich.

Kein separates Lint-Script vorhanden. GitHub-Runner, Upload/Download auf GitHub und echte Pipeline-Laufzeiten wurden noch nicht ausgeführt. Die Backend- und Cypress-Suites sind nicht Bestandteil dieser Frontend-Unit-Test-Pipeline.
