# Test & CI — Unofficial S7-1200 Simulator

Su GitHub Actions `.github/workflows/ci.yml` gira a ogni push su un branch e a ogni
PR, `.github/workflows/nightly.yml` ogni notte. Gli E2E stanno in un workflow
riutilizzabile (`.github/workflows/e2e.yml`) chiamato da entrambi.

## I job della CI

| Job | Cosa verifica | Quando |
|-----|---------------|--------|
| **php** | `php -l`, PHP 7.4–8.5 | ogni push/PR |
| **phpcs** | WordPress Coding Standards + PHPCompatibilityWP 7.4+ (`phpcs.xml.dist`) | ogni push/PR |
| **javascript** | `node --check` su `assets/js` e sugli script inline dei PHP; unit test del motore | ogni push/PR |
| **e2e** | Browser reale su wp-env con Playwright, desktop e telefono (Pixel 7) | dopo php, phpcs, javascript |

Il simulatore è tutto JavaScript: il motore è coperto dagli unit test, l'interfaccia e
il PHP (asset, shortcode, pagina admin) dagli E2E su un WordPress vero.

## Rilascio

`release.yml` parte con un tag `vX.Y.Z`:

1. esegue l'intera CI (`ci.yml`, E2E compresi);
2. verifica che tag, header `Version`, `PLC_SIM_VERSION` e `**Versione:**` del
   README coincidano e che il README abbia la voce di changelog `### X.Y.Z`;
3. costruisce `plc-s7-simulator-X.Y.Z.zip` con `git archive` (cartella radice
   `plc-s7-simulator/`) e controlla che contenga il plugin e nessun file di sviluppo;
4. pubblica la Release con lo ZIP e, come descrizione, la voce del changelog.

L'updater (`inc/class-updater.php`, `DB_GitHub_Updater_V2`) propone l'aggiornamento ai
siti leggendo l'ultima Release.

```bash
# dopo aver aggiornato le tre versioni e il changelog nel README
git tag v2.0.0
git push origin v2.0.0
```

## Run notturna

`nightly.yml` gira ogni notte (e a mano da *Actions → Nightly → Run workflow*): E2E su
WordPress trunk e su PHP più recente, per accorgersi prima che una nuova versione rompa
il plugin. GitHub sospende i workflow pianificati dopo 60 giorni senza attività.

## Eseguire i test in locale

### Unit (solo Node, nessuna dipendenza)

```bash
npm test
```

Stanno in `tests/unit/` e usano `node:test`. Il motore (`assets/js/core/plc-core.js`)
si carica con `require`: `PLCSimCore.create()` dà un PLC nuovo per ogni test.
`helpers.js` espone `newPlc()` (PLC in RUN con orologio finto: `scan(ms)` avanza il
tempo ed esegue un ciclo) e costruttori compatti degli elementi Ladder (`NO`, `NC`,
`P`, `N`, `COIL`, `SET`, `RESET`, `TON`, `TOF`, `TP`, `CTU`, `CTD`, `CTUD`, `CMP`,
`BRANCH`, `RUNG`) con la stessa forma di quelli creati dall'editor.

- `engine.test.js`: contatti, diramazioni, Set/Reset, timer, contatori, comparatori,
  NORM_X/SCALE_X, reset, passaggi RUN/STOP;
- `memory.test.js`: aree I/Q/M per byte, word IW/QW/MW sovrapposte ai bit, INT;
- `edges.test.js`: contatti P/N con memoria del fronte per istruzione;
- `hardware.test.js`: indirizzi di default di CPU, signal board e moduli, limiti;
- `sanitize.test.js`: filtro dei dati importati, escape, id dei programmi caricati.

### E2E con wp-env (Docker, Node 22)

```bash
npm ci
npx playwright install chromium
npx wp-env start
npm run env:setup
npx playwright test
```

### E2E con WordPress Playground (senza Docker)

```bash
npm ci
npx playwright install chromium
npm run env:playground     # in un altro terminale; resta in primo piano
npx playwright test
```

Playground gira in Node (PHP compilato in WebAssembly) e risponde sulla stessa porta di
wp-env (8888) con utente `admin` / `password`. Non provare lì la disinstallazione: il
plugin è montato dalla cartella del repository e verrebbe cancellato.

`npx playwright test --project=chromium` o `--project=mobile` per un solo progetto,
`npm run test:e2e:headed` per vedere il browser.

### Come sono fatti gli E2E

`auth.setup.js` fa il login come admin e crea (o riallinea) via REST le pagine di
prova: simulatore, pagina senza shortcode, shortcode in un blocco riutilizzabile.
Le pagine si aprono con `?pagename=`, quindi non dipendono dai permalink.

`helpers.js` espone `openSimulator()` (apre la pagina con localStorage pulito, aspetta
`window.plcSim` e raccoglie gli errori JavaScript), `loadProgramFile()` (Carica con un
file JSON costruito nel test), `dropTool()`, `setAddress()`, `run()`, `bit()` e
`ioBit()`.

| Spec | Cosa copre |
|------|------------|
| `infra.spec.js` | Smoke test: shortcode, ordine degli script, nessuna richiesta esterna, asset solo dove serve, blocco riutilizzabile |
| `simulator.spec.js` | Editor con drag & drop, RUN/STOP, timer reali, Salva e Carica (anche formato vecchio e file senza id), file con HTML nei commenti, finestra hardware, contatori |
| `hmi-scene.spec.js` | Pannelli HMI e Scene, configurazione HMI importata |
| `admin.spec.js` | Pagina admin, nonce dell'eliminazione dei programmi |
| `accessibilita.spec.js` | axe (WCAG 2.1 AA) in più stati |
| `infra.mobile.spec.js` | Telefono: uso, nessuno scorrimento orizzontale, axe |

`accessibilita.spec.js` e `infra.mobile.spec.js` sono ancora `fixme`: misurano i
problemi da correggere (contrasti, etichette, testata che sborda sul telefono).

## Lo ZIP di release

Lo ZIP nasce da `git archive`: tutto ciò che è sviluppo (test, workflow,
configurazioni di Composer, npm, wp-env e Playwright, questo documento) è escluso
con `export-ignore` in `.gitattributes`. Un file nuovo di sviluppo va aggiunto lì;
se ce ne si dimentica, il controllo del contenuto in `release.yml` blocca il
rilascio.
