# CI-Tests in GitHub Actions (Modul 450)

## Projekt und Ausgangszustand

Das Repository enthält ein React-/TypeScript-Frontend mit Create React App 5 und Jest 27.5.1 sowie ein separates Java-Backend. npm und das bestehende Lockfile bleiben erhalten. Der bisherige CRA-Beispieltest erwartete einen nicht mehr vorhandenen Learn-React-Link. Jetzt prüfen fünf Tests in drei Dateien die echte Überschrift, Suche und Spielkarten. Externe APIs werden im App-Test isoliert; kein laufendes Backend ist nötig.

Alle npm-Befehle werden in `frontend` ausgeführt. Node 22 entspricht der lokal vorhandenen Hauptversion und wird in `frontend/.nvmrc` festgelegt. Die vorhandene CRA-Jest-Konfiguration bleibt erhalten. Das Lockfile wurde mit npm 10.9.8 um den fehlenden optionalen yaml-Eintrag ergänzt, nachdem der erste GitHub-Lauf dies aufgedeckt hatte. Es gibt kein separates Lint-Script; `npm run build` beinhaltet die CRA-Prüfungen.

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

Echte GitHub-Actions-Laufzeiten vom 15.09.2026: je ein sequenzieller Lauf pro Modus am gleichen Commit, nach einem erfolgreichen Aufwärmlauf. Dies sind erste Vergleichswerte, keine statistisch abgesicherten Benchmarks.

| Variante | Laufzeit | Unterschied |
|---|---:|---:|
| Normal | 61 s | Basis |
| Sharding | 75 s | -23.0 % |
| mehrere CPU-Kerne | 69 s | -13.1 % |

Messgröße dieser Tabelle: Zeit von workflow.created_at bis zum Ende des letzten Jobs, einschließlich Startwartezeit und Setup. Test-Step-Zeiten stehen bei den Laufnachweisen unten.

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

Der Fehler-Versuch wurde auf dem neuen Repository durchgeführt und anschließend korrigiert. Der finale Stand enthält ausschließlich korrekte Erwartungen. Laufnachweise stehen unten.

## Reflexion

1. **Wie hat sich die Laufzeit durch Sharding verändert?** Normal: 61 s, Sharding: 75 s. Zeitersparnis: -23.0 %. Ein negativer Wert bedeutet eine Verlangsamung. Bei drei Testdateien ist die Verteilung 2:1; pro Runner fällt zusätzlich Setup an.
2. **Welche Methode brachte die beste Performance?** Im direkten Vergleich war die Worker-Variante mit 69 s schneller als Sharding mit 75 s. Insgesamt war Normal mit 61 s am schnellsten. Dies erlaubt wegen Runner- und Cache-Schwankungen keine allgemeine Aussage. Für eine belastbare Entscheidung jeden Modus mindestens dreimal messen und den Median vergleichen.
3. **Welche weiteren Optimierungen sind möglich?** Für diese kleine Suite den günstigsten Ein-Runner-Modus prüfen, Installations- und Setup-Dauer stärker beachten und erst bei wachsender Suite zusätzliche Shards oder eine nach Laufzeit balancierte Verteilung einsetzen. Die Step-Zeiten unten dienen als Ansatzpunkt; weitere Optimierungen müssen erneut gemessen werden.

## Git-Remotes

`ci-assignment` verweist auf das neue private Repository [dami54ano/modul-450-ci-testing](https://github.com/dami54ano/modul-450-ci-testing). Push vom aktuellen lokalen Branch: `git push ci-assignment HEAD:main`. `origin` und `submission` behalten ihre bisherigen Ziele. Bestehende uncommittete Cypress-Änderungen gehören nicht zu dieser CI-Umsetzung.

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

Kein separates Lint-Script vorhanden. GitHub-Runner, Upload/Download und alle Testmodi wurden anschließend erfolgreich ausgeführt; siehe Nachweise. Die Backend- und Cypress-Suites sind nicht Bestandteil dieser Frontend-Unit-Test-Pipeline.

## GitHub-Laufnachweise

### Normal

[Lauf 34970633043](https://github.com/dami54ano/modul-450-ci-testing/actions/runs/34970633043) — Commit `8e4541e342dc50bca600c9152bc9978e82f99cfe`, Ergebnis `success`.

| Job | Dauer | Jest-Step |
|---|---:|---:|
| Build frontend | 37 s | 0 s |
| Jest - normal - shard 1 | 17 s | 2 s |

Jest-Step umfasst den gesamten Testbefehl, bei Sharding auch die Dateiermittlung. Bei parallelen Shards werden die Zeiten nicht addiert, um eine Beschleunigung zu berechnen. GitHub-Step-Zeitstempel haben Sekundengenauigkeit.

### Sharding

[Lauf 34970748113](https://github.com/dami54ano/modul-450-ci-testing/actions/runs/34970748113) — Commit `8e4541e342dc50bca600c9152bc9978e82f99cfe`, Ergebnis `success`.

| Job | Dauer | Jest-Step |
|---|---:|---:|
| Build frontend | 35 s | 0 s |
| Jest - sharding - shard 1 | 25 s | 3 s |
| Jest - sharding - shard 2 | 31 s | 3 s |

Jest-Step umfasst den gesamten Testbefehl, bei Sharding auch die Dateiermittlung. Bei parallelen Shards werden die Zeiten nicht addiert, um eine Beschleunigung zu berechnen. GitHub-Step-Zeitstempel haben Sekundengenauigkeit.

### mehrere CPU-Kerne

[Lauf 34970895665](https://github.com/dami54ano/modul-450-ci-testing/actions/runs/34970895665) — Commit `8e4541e342dc50bca600c9152bc9978e82f99cfe`, Ergebnis `success`.

| Job | Dauer | Jest-Step |
|---|---:|---:|
| Build frontend | 32 s | 0 s |
| Jest - workers - shard 1 | 29 s | 5 s |

Jest-Step umfasst den gesamten Testbefehl, bei Sharding auch die Dateiermittlung. Bei parallelen Shards werden die Zeiten nicht addiert, um eine Beschleunigung zu berechnen. GitHub-Step-Zeitstempel haben Sekundengenauigkeit.

### Fehler-Versuch und Korrektur

- [Absichtlicher Fehler: Lauf 34971068306](https://github.com/dami54ano/modul-450-ci-testing/actions/runs/34971068306), Commit `24151427df840edde184d0e6cdf8c94062a56248`, Ergebnis `failure`.
- [Korrektur: Lauf 34971241445](https://github.com/dami54ano/modul-450-ci-testing/actions/runs/34971241445), Commit `71208e4c2dbb50815617f3a6451e3c77623524b5`, Ergebnis `success`.

Im fehlerhaften Lauf bestand der Build, während der Shard mit App.test.tsx die Überschrift Wrong Heading nicht finden konnte. Nach Wiederherstellung von Games Library bestanden beide Shards.

