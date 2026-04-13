Unofficial S7-1200 Simulator
Simulatore PLC Siemens S7-1200 per WordPress
Un plugin didattico che simula un PLC Siemens S7-1200 direttamente nel browser. Programmazione Ladder, HMI touch, impianti virtuali animati. Nessun hardware richiesto.
Versione: 1.6.9
Autore: Davide Bertolino
Licenza: GPL v2 or later
Richiede WordPress: 5.0+
Richiede PHP: 7.4+

Descrizione
Unofficial S7-1200 Simulator porta l'automazione industriale in classe senza bisogno di hardware. Gli studenti possono programmare in linguaggio Ladder, creare pannelli HMI touch e vedere i loro programmi prendere vita in scene industriali animate.
Il simulatore riproduce fedelmente il comportamento di un PLC reale: le uscite non possono essere in serie (solo in parallelo), i timer funzionano come TON/TOF/TP, gli I/O analogici usano il range 0-27648 come in TIA Portal.

Caratteristiche
Programmazione Ladder

Editor drag & drop con contatti NA, NC, P, N
Bobine standard, Set (S), Reset (R)
Timer TON, TOF, TP con preset configurabile
Counter CTU, CTD, CTUD
Comparatori ==, <>, >, <, >=, <=
Branch paralleli e annidati
Regole ladder realistiche (uscite solo in parallelo)

HMI Touch

Modelli Siemens: KTP400, KTP700, KTP900, KTP1200 Basic
Modelli Comfort: TP700, TP900, TP1200, TP1500
Elementi: LED, pulsanti, switch, display, slider, gauge, bargraph
Simboli industriali: motori, valvole, pompe, serbatoi, nastri
Pagine multiple con navigazione
Tasti funzione F1-F18 configurabili
Trend real-time e gestione allarmi

Impianti Virtuali

Nastri trasportatori animati
Motori e pompe rotanti
Valvole con stato aperto/chiuso
Serbatoi con livello dinamico
Sensori con feedback visivo
Robot con braccio oscillante
Template preimpostati

Configurazione Hardware

CPU: 1211C, 1212C, 1214C, 1215C
Varianti: AC/DC/Relay
Espansioni I/O digitali e analogici
Signal Board integrata
Limiti I/O automatici

Gestione Progetti

Salvataggio/caricamento su file JSON
Persistenza automatica in localStorage
Compatibilità con struttura TIA Portal


Installazione

Scarica il file ZIP
WordPress Admin → Plugin → Aggiungi nuovo → Carica plugin
Attiva il plugin
Crea una pagina e inserisci lo shortcode [plc_simulator]
Pubblica


Utilizzo
Shortcode
[plc_simulator]
Inserisce il simulatore completo nella pagina. Consigliato usare un template a larghezza piena.
Scorciatoie da tastiera
TastoAzioneCtrl+ZAnnullaCtrl+YRipetiCancElimina elementoF5Avvia/Ferma simulazioneF11Schermo intero
Tipi di variabili
TipoDescrizioneRangeIIngresso digitaleI0.0 - I7.7QUscita digitaleQ0.0 - Q7.7MMerkerM0.0 - M255.7IWIngresso analogicoIW64 - IW78QWUscita analogicaQW64 - QW78MWMemory wordMW0 - MW255

Struttura cartelle
plc-s7-simulator/
├── plc-s7-simulator.php     # File principale
├── assets/
│   ├── css/
│   │   └── simulator.css    # Stili interfaccia
│   └── js/
│       └── simulator.js     # Logica simulatore
└── templates/
    └── simulator.php        # Template HTML

Changelog
1.6.9

Nuova palette colori "Slate" più elegante
Sfondo grigio-blu invece di nero puro

1.6.8

Regole ladder realistiche: uscite in serie bloccate
Menu contestuale aggiornato per outputs
Solo "Aggiungi in parallelo" per le uscite

1.6.7

Animazioni Scene migliorate con SVG nativo
Motori, pompe, nastri, sensori animati
LED di stato lampeggianti

1.6.6

Click destro per configurare elementi HMI
Label modello HMI sincronizzata sopra/sotto
Hint configurazione negli empty state

1.6.5

Fix layout Scene (canvas 800×500 fisso)
Tooltip elementi con variabile collegata

1.6.4

Salvataggio/caricamento su file JSON
Export completo: ladder + hardware + HMI

1.6.3

Configurazione tasti funzione F1-F18
Azioni: cambio pagina, set/reset/toggle bit, scrivi word

1.6.2

Controlli zoom HMI (−/+/Fit)
Scroll orizzontale per HMI grandi

1.6.1

Footer credits
Auto-open HMI in RUN mode
Tasto X chiusura pannelli

1.6.0

Modelli HMI Siemens realistici
KTP400/700/900/1200 Basic
TP700/900/1200/1500 Comfort


Limitazioni
Questo è un simulatore didattico:

Non sostituisce TIA Portal
Non genera codice per PLC fisici
Alcune funzioni avanzate non implementate
Tempi di ciclo approssimati


Licenza
GPL v2 or later
Sei libero di utilizzare, modificare e distribuire questo plugin.
Disclaimer: Questo progetto non è affiliato con Siemens AG. "S7-1200", "SIMATIC" e "TIA Portal" sono marchi registrati di Siemens AG.

Autore
Davide "the Prof." Bertolino

🌐 www.davidebertolino.it
✉️ info@davidebertolino.it
