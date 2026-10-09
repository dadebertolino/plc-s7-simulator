# Unofficial S7-1200 Simulator

**Simulatore PLC Siemens S7-1200 per WordPress**

Un plugin didattico che simula un PLC Siemens S7-1200 direttamente nel browser. Programmazione Ladder, HMI touch, impianti virtuali animati. Nessun hardware richiesto.

**Versione:** 1.7.0  
**Autore:** Davide Bertolino  
**Licenza:** GPL v2 or later  
**Richiede WordPress:** 5.8+  
**Richiede PHP:** 7.4+  
**Demo:** [handsonstem.it/simulatore-s7-1200](https://handsonstem.it/simulatore-s7-1200/)  

---

## Descrizione

Unofficial S7-1200 Simulator porta l'automazione industriale in classe senza bisogno di hardware. Gli studenti possono programmare in linguaggio Ladder, creare pannelli HMI touch e vedere i loro programmi prendere vita in scene industriali animate.

Il simulatore riproduce fedelmente il comportamento di un PLC reale: le uscite non possono essere in serie (solo in parallelo), timer, contatori e fronti si comportano come le istruzioni di TIA Portal, la memoria è indirizzata per byte con word sovrapposte ai bit, gli I/O seguono la CPU e le espansioni configurate e quelli analogici usano il range 0-27648.

---

## Caratteristiche

### Programmazione Ladder
- Editor drag & drop con contatti NA, NC, P, N
- Bobine standard, Set (S), Reset (R)
- Contatti P e N con fronte sull'operando, una memoria per ogni istruzione
- Timer TON, TOF, TP con preset configurabile
- Counter CTU, CTD, CTUD con campo INT, ingressi R e LD e uscita QD configurabili
- Comparatori ==, <>, >, <, >=, <= anche su IW, QW e MD
- MOVE, NORM_X e SCALE_X per copiare e scalare i valori analogici, come in TIA Portal
- Branch paralleli e annidati
- Tempo di ciclo nella barra di stato: attuale, minimo e massimo
- Regole ladder realistiche (uscite solo in parallelo)

### HMI Touch
- Modelli Siemens: KTP400, KTP700, KTP900, KTP1200 Basic
- Modelli Comfort: TP700, TP900, TP1200, TP1500
- Elementi: LED, pulsanti, switch, display, slider, gauge, bargraph
- Simboli industriali: motori, valvole, pompe, serbatoi, nastri
- Pagine multiple con navigazione
- Tasti funzione F1-F18 configurabili
- Trend real-time e gestione allarmi

### Impianti Virtuali
- Nastri trasportatori animati
- Motori e pompe rotanti
- Valvole con stato aperto/chiuso
- Serbatoi con livello dinamico
- Sensori con feedback visivo
- Robot con braccio oscillante
- Template preimpostati

### Configurazione Hardware
- CPU: 1211C, 1212C, 1214C, 1215C
- Varianti: AC/DC/Relay
- Espansioni I/O digitali e analogici
- Signal Board integrata
- Indirizzi I/O di default come in TIA Portal, secondo CPU ed espansioni
- RUN e STOP come in S7-1200: in STOP le uscite vanno a 0, al passaggio in RUN si azzerano uscite, merker, timer e contatori

### Gestione Progetti
- Salvataggio/caricamento su file JSON, anche nel formato delle versioni precedenti
- Persistenza automatica in localStorage
- Export AWL, SCL e XML SimaticML per TIA Portal
- Import di XML SimaticML e progetti `.zap`

### Privacy
- I programmi restano sul computer dello studente: niente salvataggi sul server
- Nessuna richiesta a servizi esterni: font di sistema e JSZip incluso nel plugin
- I file importati vengono filtrati e il testo libero è mostrato come testo

---

## Installazione

1. Scarica il file ZIP
2. WordPress Admin → Plugin → Aggiungi nuovo → Carica plugin
3. Attiva il plugin
4. Crea una pagina e inserisci lo shortcode `[plc_simulator]`
5. Pubblica

Gli aggiornamenti arrivano dalle Release di GitHub e compaiono nella pagina Plugin di WordPress come per i plugin della directory ufficiale.

---

## Utilizzo

### Shortcode

```
[plc_simulator]
```

Inserisce il simulatore completo nella pagina. Consigliato usare un template a larghezza piena.

### Scorciatoie da tastiera

| Tasto | Azione |
|-------|--------|
| `Ctrl+Z` | Annulla |
| `Ctrl+Y` | Ripeti |
| `Canc` | Elimina elemento |
| `F5` | Avvia/Ferma simulazione |
| `F11` | Schermo intero |

### Tipi di variabili

| Tipo | Descrizione | Range |
|------|-------------|-------|
| `I` | Ingresso digitale | I0.0 - I7.7 |
| `Q` | Uscita digitale | Q0.0 - Q7.7 |
| `M` | Merker | M0.0 - M255.7 |
| `IW` | Ingresso analogico | IW64 - IW78 |
| `QW` | Uscita analogica | QW64 - QW78 |
| `MW` | Memory word (INT) | MW0 - MW8190 |
| `MD` | Memory double word (REAL) | MD0 - MD8188 |

---

## Struttura cartelle

```
plc-s7-simulator/
├── plc-s7-simulator.php     # File principale
├── uninstall.php            # Pulizia alla disinstallazione
├── inc/
│   └── class-updater.php    # Aggiornamenti da GitHub
├── assets/
│   ├── css/
│   │   └── simulator.css    # Stili interfaccia
│   └── js/
│       ├── core/
│       │   └── plc-core.js  # Motore PLC e Ladder (testabile in Node)
│       ├── vendor/
│       │   └── jszip.min.js # Import dei progetti .zap
│       └── simulator.js     # Interfaccia, HMI, Scene
└── templates/
    └── simulator.php        # Template HTML
```

Test e CI sono descritti in [TESTING.md](TESTING.md).

---

## Changelog

### 1.7.0
- Motore PLC in un modulo separato, coperto da unit test
- Memoria indirizzata per byte, con word sovrapposte ai bit come in S7
- Contatti P/N, TOF, TP e contatori fedeli a TIA Portal; contatori con R, LD e QD configurabili
- Comparatori con IW e QW come operandi
- I/O secondo CPU ed espansioni, con gli indirizzi di default di TIA Portal
- RUN e STOP come in S7-1200
- Export SCL: timer e contatori in serie vengono chiamati; P/N diventano R_TRIG/F_TRIG
- Import XML SimaticML senza network duplicati
- Salvataggi solo su file locale; i programmi rimasti nel database si vedono ed eliminano dalla pagina admin
- Import sicuri: filtro dei dati e escape del testo libero
- Nessuna richiesta esterna: font di sistema, JSZip incluso
- Aggiornamenti da GitHub, `uninstall.php`, licenza GPL v2 or later
- CI con test E2E su WordPress

### 1.6.9
- Nuova palette colori "Slate" più elegante
- Sfondo grigio-blu invece di nero puro

### 1.6.8
- Regole ladder realistiche: uscite in serie bloccate
- Menu contestuale aggiornato per outputs
- Solo "Aggiungi in parallelo" per le uscite

### 1.6.7
- Animazioni Scene migliorate con SVG nativo
- Motori, pompe, nastri, sensori animati
- LED di stato lampeggianti

### 1.6.6
- Click destro per configurare elementi HMI
- Label modello HMI sincronizzata sopra/sotto
- Hint configurazione negli empty state

### 1.6.5
- Fix layout Scene (canvas 800×500 fisso)
- Tooltip elementi con variabile collegata

### 1.6.4
- Salvataggio/caricamento su file JSON
- Export completo: ladder + hardware + HMI

### 1.6.3
- Configurazione tasti funzione F1-F18
- Azioni: cambio pagina, set/reset/toggle bit, scrivi word

### 1.6.2
- Controlli zoom HMI (−/+/Fit)
- Scroll orizzontale per HMI grandi

### 1.6.1
- Footer credits
- Auto-open HMI in RUN mode
- Tasto X chiusura pannelli

### 1.6.0
- Modelli HMI Siemens realistici
- KTP400/700/900/1200 Basic
- TP700/900/1200/1500 Comfort

---

## Limitazioni

Questo è un simulatore didattico:
- Non sostituisce TIA Portal
- Non genera codice per PLC fisici
- Alcune funzioni avanzate non implementate
- Tempi di ciclo approssimati

---

## Licenza

GPL v2 or later

Sei libero di utilizzare, modificare e distribuire questo plugin.

Include [JSZip](https://stuk.github.io/jszip/) 3.10.1 (licenza MIT) per l'import dei progetti TIA Portal.

**Disclaimer:** Questo progetto non è affiliato con Siemens AG. "S7-1200", "SIMATIC" e "TIA Portal" sono marchi registrati di Siemens AG.

---

## Autore

**Davide "the Prof." Bertolino**

- 🌐 [www.davidebertolino.it](https://www.davidebertolino.it)
- ✉️ info@davidebertolino.it
