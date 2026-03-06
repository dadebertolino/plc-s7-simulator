<div id="plc-simulator" class="plc-container">
    <!-- Header -->
    <header class="plc-header">
        <div class="plc-logo">
            <svg viewBox="0 0 40 40" class="plc-icon">
                <rect x="2" y="2" width="36" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="2"/>
                <rect x="8" y="8" width="8" height="8" fill="currentColor"/>
                <rect x="24" y="8" width="8" height="8" fill="currentColor"/>
                <rect x="8" y="24" width="8" height="8" fill="currentColor"/>
                <rect x="24" y="24" width="8" height="8" fill="currentColor"/>
            </svg>
            <span>Unofficial S7/1200 Simulator by Prof D.Bertolino</span>
        </div>
        <div class="plc-controls">
            <button id="btn-new" class="plc-btn" title="Nuovo programma">
                <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg>
            </button>
            <button id="btn-load" class="plc-btn" title="Carica da file JSON">
                <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
            </button>
            <button id="btn-save" class="plc-btn" title="Salva su file JSON">
                <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M17 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7l-4-4zm2 16H5V5h11.17L19 7.83V19zm-7-7a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM6 6h9v4H6V6z"/></svg>
            </button>
            <div class="plc-divider"></div>
            <button id="btn-undo" class="plc-btn" title="Annulla (Ctrl+Z)" disabled>
                <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/></svg>
            </button>
            <button id="btn-redo" class="plc-btn" title="Ripeti (Ctrl+Y)" disabled>
                <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z"/></svg>
            </button>
            <div class="plc-divider"></div>
            <button id="btn-export" class="plc-btn" title="Esporta File">
                <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2v9.67z"/></svg>
            </button>
            <button id="btn-import" class="plc-btn" title="Importa (JSON, XML, TIA Portal .zap)">
                <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6-.67l2.59 2.58L17 12.5l-5-5-5 5 1.41 1.41L11 11.33V21h2v-9.67z"/></svg>
            </button>
            <input type="file" id="import-file" style="display:none;">
            <button id="btn-print" class="plc-btn" title="Stampa">
                <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/></svg>
            </button>
            <button id="btn-hmi" class="plc-btn" title="Pannello HMI">
                <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M21 2H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h7v2H8v2h8v-2h-2v-2h7c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H3V4h18v12z"/></svg>
                <span>HMI</span>
            </button>
            <button id="btn-scene" class="plc-btn" title="Impianto Virtuale">
                <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4 6h2v4h-2z"/></svg>
                <span>Scene</span>
            </button>
            <button id="btn-hardware" class="plc-btn" title="Configura Hardware PLC">
                <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
                <span>HW</span>
            </button>
            <div class="plc-divider"></div>
            <button id="btn-run" class="plc-btn plc-btn-run" title="Avvia">
                <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>
                <span>RUN</span>
            </button>
            <button id="btn-stop" class="plc-btn plc-btn-stop" title="Stop">
                <svg viewBox="0 0 24 24" width="18" height="18"><rect x="6" y="6" width="12" height="12" fill="currentColor"/></svg>
                <span>STOP</span>
            </button>
            <div class="plc-divider"></div>
            <button id="btn-fullscreen" class="plc-btn plc-btn-fullscreen" title="Schermo intero (F11)">
                <svg class="icon-expand" viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
                <svg class="icon-compress" viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>
            </button>
            <div class="plc-status">
                <span class="plc-status-led" id="status-led"></span>
                <span id="status-text">STOP</span>
            </div>
        </div>
    </header>

    <div class="plc-main">
        <!-- Toolbox -->
        <aside class="plc-toolbox" id="panel-toolbox">
            <div class="panel-header">
                <h3>Elementi Ladder</h3>
                <button class="panel-collapse-btn" data-panel="toolbox" title="Comprimi">&lt;</button>
            </div>
            <div class="panel-content">
            <div class="plc-tools">
                <div class="plc-tool" draggable="true" data-type="contact-no">
                    <div class="tool-symbol">-| |-</div>
                    <span>Contatto NA</span>
                </div>
                <div class="plc-tool" draggable="true" data-type="contact-nc">
                    <div class="tool-symbol">-|/|-</div>
                    <span>Contatto NC</span>
                </div>
                <div class="plc-tool" draggable="true" data-type="contact-p">
                    <div class="tool-symbol">-|P|-</div>
                    <span>Fronte salita</span>
                </div>
                <div class="plc-tool" draggable="true" data-type="contact-n">
                    <div class="tool-symbol">-|N|-</div>
                    <span>Fronte discesa</span>
                </div>
                <div class="plc-tool" draggable="true" data-type="coil">
                    <div class="tool-symbol">-( )-</div>
                    <span>Bobina</span>
                </div>
                <div class="plc-tool" draggable="true" data-type="coil-set">
                    <div class="tool-symbol">-(S)-</div>
                    <span>Set</span>
                </div>
                <div class="plc-tool" draggable="true" data-type="coil-reset">
                    <div class="tool-symbol">-(R)-</div>
                    <span>Reset</span>
                </div>
                <div class="plc-tool" draggable="true" data-type="timer-ton">
                    <div class="tool-symbol">[TON]</div>
                    <span>Timer ON</span>
                </div>
                <div class="plc-tool" draggable="true" data-type="timer-tof">
                    <div class="tool-symbol">[TOF]</div>
                    <span>Timer OFF</span>
                </div>
                <div class="plc-tool" draggable="true" data-type="timer-tp">
                    <div class="tool-symbol">[TP]</div>
                    <span>Timer Pulse</span>
                </div>
                <div class="plc-tool" draggable="true" data-type="counter-ctu">
                    <div class="tool-symbol">[CTU]</div>
                    <span>Counter Up</span>
                </div>
                <div class="plc-tool" draggable="true" data-type="counter-ctd">
                    <div class="tool-symbol">[CTD]</div>
                    <span>Counter Down</span>
                </div>
                <div class="plc-tool" draggable="true" data-type="counter-ctud">
                    <div class="tool-symbol">[CTUD]</div>
                    <span>Counter Up/Down</span>
                </div>
            </div>
            <div class="plc-section">
                <h3>Comparatori</h3>
                <div class="plc-tools">
                    <div class="plc-tool" draggable="true" data-type="cmp-eq">
                        <div class="tool-symbol">[==]</div>
                        <span>Uguale</span>
                    </div>
                    <div class="plc-tool" draggable="true" data-type="cmp-ne">
                        <div class="tool-symbol">[&lt;&gt;]</div>
                        <span>Diverso</span>
                    </div>
                    <div class="plc-tool" draggable="true" data-type="cmp-gt">
                        <div class="tool-symbol">[&gt;]</div>
                        <span>Maggiore</span>
                    </div>
                    <div class="plc-tool" draggable="true" data-type="cmp-lt">
                        <div class="tool-symbol">[&lt;]</div>
                        <span>Minore</span>
                    </div>
                    <div class="plc-tool" draggable="true" data-type="cmp-ge">
                        <div class="tool-symbol">[&gt;=]</div>
                        <span>Maggiore/Uguale</span>
                    </div>
                    <div class="plc-tool" draggable="true" data-type="cmp-le">
                        <div class="tool-symbol">[&lt;=]</div>
                        <span>Minore/Uguale</span>
                    </div>
                </div>
            </div>
            <div class="plc-section">
                <h3>Network</h3>
                <button id="btn-add-rung" class="plc-btn plc-btn-full">+ Aggiungi Network</button>
                <button id="btn-add-branch" class="plc-btn plc-btn-full">// Aggiungi Ramo</button>
            </div>
            </div><!-- /panel-content -->
        </aside>

        <!-- Editor Ladder -->
        <section class="plc-editor">
            <div class="plc-editor-header">
                <h2>Editor Ladder</h2>
                <input type="text" id="program-name" placeholder="Nome programma" value="Main [OB1]">
            </div>
            <div id="ladder-canvas" class="plc-ladder-canvas">
                <!-- I network vengono inseriti dinamicamente -->
            </div>
        </section>

        <!-- Pannello I/O -->
        <aside class="plc-io-panel" id="panel-io">
            <div class="panel-header">
                <h3>I/O Monitor</h3>
                <button class="panel-collapse-btn" data-panel="io" title="Comprimi">&gt;</button>
            </div>
            <div class="panel-content">
            <div class="plc-io-section">
                <h3>
                    <span class="io-indicator input"></span>
                    Ingressi (I)
                </h3>
                <div class="plc-io-grid" id="inputs-grid"></div>
            </div>
            <div class="plc-io-section">
                <h3>
                    <span class="io-indicator output"></span>
                    Uscite (Q)
                </h3>
                <div class="plc-io-grid" id="outputs-grid"></div>
            </div>
            <div class="plc-io-section">
                <h3>
                    <span class="io-indicator memory"></span>
                    Merker (M)
                </h3>
                <div class="plc-io-grid" id="merkers-grid"></div>
            </div>
            <div class="plc-io-section">
                <h3>Timers</h3>
                <div id="timers-display" class="plc-timers"></div>
            </div>
            <div class="plc-io-section">
                <h3>Counters</h3>
                <div id="counters-display" class="plc-counters"></div>
            </div>
            <div class="plc-io-section plc-analog-section">
                <h3>
                    <span class="io-indicator analog-in"></span>
                    Ingressi Analogici (AIW)
                </h3>
                <div id="analog-inputs-grid" class="plc-analog-grid"></div>
            </div>
            <div class="plc-io-section plc-analog-section">
                <h3>
                    <span class="io-indicator analog-out"></span>
                    Uscite Analogiche (AQW)
                </h3>
                <div id="analog-outputs-grid" class="plc-analog-grid"></div>
            </div>
            <div class="plc-io-section">
                <button id="btn-hardware-config" class="plc-btn plc-btn-full">
                    <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
                    Configura Hardware
                </button>
            </div>
            </div><!-- /panel-content -->
        </aside>
    </div>

    <!-- Indicatore selezione multipla -->
    <div id="selection-indicator"></div>

    <!-- Modal Caricamento -->
    <div id="load-modal" class="plc-modal">
        <div class="plc-modal-content">
            <h2>Carica Programma</h2>
            <div id="programs-list" class="plc-programs-list"></div>
            <div class="plc-modal-buttons">
                <button id="btn-load-confirm" class="plc-btn plc-btn-primary" disabled>Carica</button>
                <button class="plc-btn plc-btn-cancel" onclick="closeModal()">Annulla</button>
            </div>
        </div>
    </div>

    <!-- Modal Configurazione Elemento -->
    <div id="config-modal" class="plc-modal">
        <div class="plc-modal-content">
            <h2>Configura Elemento</h2>
            <div class="plc-form-group" id="address-config">
                <label>Indirizzo:</label>
                <select id="config-address-type">
                    <option value="I">I - Ingresso</option>
                    <option value="Q">Q - Uscita</option>
                    <option value="M">M - Merker</option>
                </select>
                <input type="number" id="config-address-byte" min="0" max="127" value="0" placeholder="Byte">
                <span>.</span>
                <input type="number" id="config-address-bit" min="0" max="7" value="0" placeholder="Bit">
            </div>
            <div class="plc-form-group" id="timer-config" style="display:none;">
                <label>Preset Time (ms):</label>
                <input type="number" id="config-timer-preset" min="0" value="1000">
            </div>
            <div class="plc-form-group" id="counter-config" style="display:none;">
                <label>Preset Value:</label>
                <input type="number" id="config-counter-preset" min="0" value="10">
            </div>
            <div class="plc-form-group" id="ctud-config" style="display:none;">
                <label>Ingresso Count Down (CD):</label>
                <select id="config-ctud-cd-type">
                    <option value="I">I</option>
                    <option value="M">M</option>
                </select>
                <input type="number" id="config-ctud-cd-byte" min="0" max="127" value="0" style="width:50px;">
                <span>.</span>
                <input type="number" id="config-ctud-cd-bit" min="0" max="7" value="1" style="width:50px;">
            </div>
            <div class="plc-form-group" id="compare-config" style="display:none;">
                <label>Operando 1:</label>
                <select id="config-cmp-op1-type">
                    <option value="const">Costante</option>
                    <option value="counter">Counter CV</option>
                    <option value="timer">Timer ET</option>
                    <option value="MW">Memory Word</option>
                </select>
                <input type="number" id="config-cmp-op1-value" value="0" style="width:80px;">
                <br><br>
                <label>Operando 2:</label>
                <select id="config-cmp-op2-type">
                    <option value="const">Costante</option>
                    <option value="counter">Counter CV</option>
                    <option value="timer">Timer ET</option>
                    <option value="MW">Memory Word</option>
                </select>
                <input type="number" id="config-cmp-op2-value" value="0" style="width:80px;">
            </div>
            <div class="plc-form-group">
                <label>Commento:</label>
                <input type="text" id="config-comment" placeholder="Descrizione">
            </div>
            <div class="plc-modal-buttons">
                <button class="plc-btn plc-btn-primary" id="config-save">Salva</button>
                <button class="plc-btn plc-btn-danger" id="config-delete">Elimina</button>
                <button class="plc-btn plc-btn-cancel" onclick="closeConfigModal()">Annulla</button>
            </div>
        </div>
    </div>

    <!-- Modal Configurazione Hardware -->
    <div id="hardware-modal" class="plc-modal">
        <div class="plc-modal-content hardware-config">
            <h2>⚙️ Configurazione Hardware PLC</h2>
            
            <div class="hardware-section">
                <h3>CPU</h3>
                <div class="plc-form-group">
                    <label>Modello CPU:</label>
                    <select id="hw-cpu-select">
                        <optgroup label="CPU 1211C">
                            <option value="1211C-DC">CPU 1211C DC/DC/DC (6 DI, 4 DQ, 2 AI)</option>
                            <option value="1211C-AC">CPU 1211C AC/DC/Relay (6 DI, 4 DQ, 2 AI)</option>
                        </optgroup>
                        <optgroup label="CPU 1212C">
                            <option value="1212C-DC">CPU 1212C DC/DC/DC (8 DI, 6 DQ, 2 AI)</option>
                            <option value="1212C-AC">CPU 1212C AC/DC/Relay (8 DI, 6 DQ, 2 AI)</option>
                        </optgroup>
                        <optgroup label="CPU 1214C">
                            <option value="1214C-DC">CPU 1214C DC/DC/DC (14 DI, 10 DQ, 2 AI)</option>
                            <option value="1214C-AC">CPU 1214C AC/DC/Relay (14 DI, 10 DQ, 2 AI)</option>
                        </optgroup>
                        <optgroup label="CPU 1215C">
                            <option value="1215C-DC">CPU 1215C DC/DC/DC (14 DI, 10 DQ, 2 AI, 2 AQ)</option>
                            <option value="1215C-AC" selected>CPU 1215C AC/DC/Relay (14 DI, 10 DQ, 2 AI, 2 AQ)</option>
                        </optgroup>
                        <optgroup label="CPU 1217C">
                            <option value="1217C-DC">CPU 1217C DC/DC/DC (14 DI, 10 DQ, 2 AI, 2 AQ)</option>
                        </optgroup>
                    </select>
                </div>
                <div id="hw-cpu-info" class="hardware-info"></div>
            </div>
            
            <div class="hardware-section">
                <h3>Espansioni Installate</h3>
                <div id="hw-expansions-list" class="expansions-list"></div>
                
                <div class="plc-form-group">
                    <label>Aggiungi Espansione:</label>
                    <select id="hw-expansion-select">
                        <option value="">-- Seleziona --</option>
                        <optgroup label="Moduli Digitali (SM)">
                            <option value="SM1221-8DI">SM 1221 DI x8</option>
                            <option value="SM1221-16DI">SM 1221 DI x16</option>
                            <option value="SM1222-8DQ">SM 1222 DQ x8</option>
                            <option value="SM1222-8DQR">SM 1222 DQ x8 Relay</option>
                            <option value="SM1223-8DI8DQ">SM 1223 DI x8 / DQ x8</option>
                        </optgroup>
                        <optgroup label="Moduli Analogici (SM)">
                            <option value="SM1231-4AI">SM 1231 AI x4</option>
                            <option value="SM1231-8AI">SM 1231 AI x8</option>
                            <option value="SM1232-2AQ">SM 1232 AQ x2</option>
                            <option value="SM1232-4AQ">SM 1232 AQ x4</option>
                            <option value="SM1234-4AI2AQ">SM 1234 AI x4 / AQ x2</option>
                        </optgroup>
                        <optgroup label="Signal Board (SB)">
                            <option value="SB1221-4DI">SB 1221 DI x4</option>
                            <option value="SB1222-4DQ">SB 1222 DQ x4</option>
                            <option value="SB1223-2DI2DQ">SB 1223 DI x2 / DQ x2</option>
                            <option value="SB1231-1AI">SB 1231 AI x1</option>
                            <option value="SB1232-1AQ">SB 1232 AQ x1</option>
                        </optgroup>
                    </select>
                    <button id="hw-add-expansion" class="plc-btn plc-btn-primary">+ Aggiungi</button>
                </div>
            </div>
            
            <div class="hardware-section">
                <h3>Riepilogo I/O</h3>
                <div id="hw-analog-summary" class="analog-summary">
                    <div class="summary-row">
                        <span class="summary-label">Ingressi Digitali (DI):</span>
                        <span id="hw-total-di" class="summary-value">14</span>
                    </div>
                    <div class="summary-row">
                        <span class="summary-label">Uscite Digitali (DQ):</span>
                        <span id="hw-total-dq" class="summary-value">10</span>
                    </div>
                    <div class="summary-row">
                        <span class="summary-label">Ingressi Analogici (AI):</span>
                        <span id="hw-total-ai" class="summary-value">2</span>
                    </div>
                    <div class="summary-row">
                        <span class="summary-label">Uscite Analogiche (AQ):</span>
                        <span id="hw-total-aq" class="summary-value">2</span>
                    </div>
                    <div class="summary-row">
                        <span class="summary-label">Range Analogico:</span>
                        <span class="summary-value">0 - 27648 (0-10V / 4-20mA)</span>
                    </div>
                </div>
                <div id="hw-address-map" class="address-map"></div>
            </div>
            
            <div class="plc-modal-buttons">
                <button class="plc-btn plc-btn-primary" id="hw-apply">Applica</button>
                <button class="plc-btn plc-btn-cancel" onclick="closeHardwareModal()">Chiudi</button>
            </div>
        </div>
    </div>
    <div id="hmi-panel" class="hmi-panel">
        <div class="hmi-header">
            <div class="hmi-header-top">
                <h2>HMI Panel</h2>
                <div class="hmi-model-selector">
                    <label>Modello:</label>
                    <select id="hmi-model-select">
                        <option value="KTP400">KTP400 Basic (4.3" - 480×272)</option>
                        <option value="KTP700" selected>KTP700 Basic (7" - 800×480)</option>
                        <option value="KTP900">KTP900 Basic (9" - 800×480)</option>
                        <option value="KTP1200">KTP1200 Basic (12" - 1280×800)</option>
                        <option value="TP700">TP700 Comfort (7" - 800×480)</option>
                        <option value="TP900">TP900 Comfort (9" - 800×480)</option>
                        <option value="TP1200">TP1200 Comfort (12" - 1280×800)</option>
                        <option value="TP1500">TP1500 Comfort (15" - 1280×800)</option>
                    </select>
                </div>
                <div class="hmi-zoom-control">
                    <label>Zoom:</label>
                    <button id="hmi-zoom-out" class="plc-btn plc-btn-sm" title="Riduci">−</button>
                    <span id="hmi-zoom-value">100%</span>
                    <button id="hmi-zoom-in" class="plc-btn plc-btn-sm" title="Ingrandisci">+</button>
                    <button id="hmi-zoom-fit" class="plc-btn plc-btn-sm" title="Adatta allo schermo">Fit</button>
                </div>
                <button id="hmi-close" class="panel-collapse-btn" title="Chiudi HMI">×</button>
            </div>
            <div class="hmi-toolbar" id="hmi-design-toolbar">
                <button id="hmi-add-led" class="plc-btn" title="Aggiungi LED">
                    <span class="hmi-tool-icon led-icon"></span> LED
                </button>
                <button id="hmi-add-button" class="plc-btn" title="Aggiungi Pulsante">
                    <span class="hmi-tool-icon btn-icon"></span> Pulsante
                </button>
                <button id="hmi-add-switch" class="plc-btn" title="Aggiungi Interruttore">
                    <span class="hmi-tool-icon switch-icon"></span> Switch
                </button>
                <button id="hmi-add-display" class="plc-btn" title="Aggiungi Display">
                    <span class="hmi-tool-icon display-icon"></span> Display
                </button>
                <button id="hmi-add-slider" class="plc-btn" title="Aggiungi Slider">
                    <span class="hmi-tool-icon slider-icon"></span> Slider
                </button>
                <button id="hmi-add-gauge" class="plc-btn" title="Aggiungi Gauge">
                    <span class="hmi-tool-icon gauge-icon"></span> Gauge
                </button>
                <div class="plc-divider"></div>
                <button id="hmi-add-motor" class="plc-btn" title="Aggiungi Motore">
                    <span class="hmi-tool-icon motor-icon"></span> Motore
                </button>
                <button id="hmi-add-valve" class="plc-btn" title="Aggiungi Valvola">
                    <span class="hmi-tool-icon valve-icon"></span> Valvola
                </button>
                <button id="hmi-add-pump" class="plc-btn" title="Aggiungi Pompa">
                    <span class="hmi-tool-icon pump-icon"></span> Pompa
                </button>
                <button id="hmi-add-tank" class="plc-btn" title="Aggiungi Serbatoio">
                    <span class="hmi-tool-icon tank-icon"></span> Tank
                </button>
                <button id="hmi-add-conveyor" class="plc-btn" title="Aggiungi Nastro">
                    <span class="hmi-tool-icon conveyor-icon"></span> Nastro
                </button>
                <button id="hmi-add-light" class="plc-btn" title="Aggiungi Semaforo">
                    <span class="hmi-tool-icon light-icon"></span> Semaforo
                </button>
                <div class="plc-divider"></div>
                <button id="hmi-add-bargraph" class="plc-btn" title="Aggiungi Bargraph">
                    <span class="hmi-tool-icon bargraph-icon"></span> Bargraph
                </button>
                <button id="hmi-add-text" class="plc-btn" title="Aggiungi Testo Dinamico">
                    <span class="hmi-tool-icon text-icon"></span> Testo
                </button>
                <button id="hmi-add-trend" class="plc-btn" title="Aggiungi Grafico Trend">
                    <span class="hmi-tool-icon trend-icon"></span> Trend
                </button>
                <div class="plc-divider"></div>
                <button id="hmi-show-alarms" class="plc-btn" title="Pannello Allarmi">
                    <span class="hmi-tool-icon alarm-icon"></span> Allarmi
                    <span id="alarm-badge" class="alarm-badge" style="display:none;">0</span>
                </button>
                <div class="plc-divider"></div>
                <label class="hmi-snap-label" title="Allinea elementi alla griglia">
                    <input type="checkbox" id="hmi-snap-grid" checked> Grid
                </label>
                <div class="plc-divider"></div>
                <button id="hmi-bg-btn" class="plc-btn" title="Carica immagine sfondo">
                    <svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
                    Sfondo
                </button>
                <input type="file" id="hmi-bg-input" accept="image/*" style="display:none;">
                <button id="hmi-bg-clear" class="plc-btn" title="Rimuovi sfondo" style="display:none;">X</button>
                <div id="hmi-bg-opacity-group" class="hmi-opacity-group" style="display:none;">
                    <input type="range" id="hmi-bg-opacity" min="0" max="1" step="0.1" value="0.5" title="Opacità sfondo">
                </div>
                <div class="plc-divider"></div>
                <button id="hmi-clear" class="plc-btn plc-btn-danger" title="Cancella tutto">Cancella</button>
            </div>
        </div>
        <div class="hmi-pages-bar">
            <div class="hmi-pages-tabs" id="hmi-pages-tabs">
                <!-- Tab pagine inseriti dinamicamente -->
            </div>
            <button id="hmi-add-page" class="plc-btn hmi-add-page-btn" title="Aggiungi pagina">+</button>
        </div>
        
        <!-- Contenitore pannello HMI realistico -->
        <div class="hmi-device-container">
            <div class="hmi-device-wrapper" id="hmi-device-wrapper">
                <div class="hmi-device" id="hmi-device" data-model="KTP700">
                    <!-- Cornice superiore con logo -->
                    <div class="hmi-device-top">
                        <div class="hmi-device-logo">SIEMENS</div>
                        <div class="hmi-device-model-label">SIMATIC HMI</div>
                    </div>
                    
                    <!-- Corpo principale -->
                    <div class="hmi-device-body">
                        <!-- Tasti funzione sinistri (per Comfort) -->
                        <div class="hmi-fkeys hmi-fkeys-left" id="hmi-fkeys-left">
                            <!-- Generati da JS per modelli Comfort -->
                        </div>
                        
                        <!-- Schermo -->
                        <div class="hmi-device-screen">
                            <div class="hmi-screen-bezel">
                                <div class="hmi-canvas" id="hmi-canvas">
                                    <!-- Elementi HMI inseriti dinamicamente -->
                                    <div class="hmi-empty-message">
                                        <p>Pannello HMI vuoto</p>
                                        <p>Usa i pulsanti sopra per aggiungere elementi</p>
                                        <p class="hmi-hint">💡 <strong>Click destro</strong> o <strong>doppio click</strong> su un elemento per configurarlo</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Tasti funzione destri -->
                        <div class="hmi-fkeys hmi-fkeys-right" id="hmi-fkeys-right">
                            <!-- Generati da JS -->
                    </div>
                </div>
                
                <!-- Tasti funzione inferiori (per Basic) -->
                <div class="hmi-fkeys hmi-fkeys-bottom" id="hmi-fkeys-bottom">
                    <!-- Generati da JS per modelli Basic -->
                </div>
                
                <!-- Etichetta modello -->
                <div class="hmi-device-bottom">
                    <span class="hmi-device-model-name" id="hmi-model-name">KTP700 Basic PN</span>
                </div>
            </div>
            </div> <!-- /hmi-device-wrapper -->
        </div>
    </div>

    <!-- Modal Configurazione HMI Element -->
    <div id="hmi-config-modal" class="plc-modal">
        <div class="plc-modal-content">
            <h2>Configura Elemento HMI</h2>
            <div class="plc-form-group">
                <label>Etichetta:</label>
                <input type="text" id="hmi-config-label" placeholder="Nome elemento">
            </div>
            <div class="plc-form-group">
                <label>Variabile PLC:</label>
                <select id="hmi-config-var-type">
                    <option value="I">I - Ingresso</option>
                    <option value="Q">Q - Uscita</option>
                    <option value="M">M - Merker</option>
                    <option value="T">T - Timer</option>
                    <option value="C">C - Counter</option>
                    <option value="MW">MW - Memory Word</option>
                </select>
                <input type="number" id="hmi-config-var-num" min="0" max="255" value="0" style="width:60px;">
                <span id="hmi-config-bit-group">
                    .
                    <input type="number" id="hmi-config-var-bit" min="0" max="7" value="0" style="width:50px;">
                </span>
            </div>
            <div class="plc-form-group" id="hmi-config-color-group">
                <label>Colore ON:</label>
                <select id="hmi-config-color">
                    <option value="green">Verde</option>
                    <option value="red">Rosso</option>
                    <option value="yellow">Giallo</option>
                    <option value="blue">Blu</option>
                    <option value="orange">Arancione</option>
                    <option value="white">Bianco</option>
                </select>
            </div>
            <div class="plc-form-group" id="hmi-config-range-group" style="display:none;">
                <label>Range:</label>
                <input type="number" id="hmi-config-min" value="0" style="width:70px;"> - 
                <input type="number" id="hmi-config-max" value="100" style="width:70px;">
            </div>
            <div class="plc-form-group" id="hmi-config-mode-group" style="display:none;">
                <label>Modalita:</label>
                <select id="hmi-config-mode">
                    <option value="momentary">Momentaneo (premi e rilascia)</option>
                    <option value="toggle">Toggle (clicca per cambiare)</option>
                </select>
            </div>
            <div class="plc-modal-buttons">
                <button class="plc-btn plc-btn-primary" id="hmi-config-save">Salva</button>
                <button class="plc-btn plc-btn-danger" id="hmi-config-delete">Elimina</button>
                <button class="plc-btn plc-btn-cancel" onclick="closeHmiConfigModal()">Annulla</button>
            </div>
        </div>
    </div>

    <!-- Modal Configurazione Tasti Funzione -->
    <div id="fkey-config-modal" class="plc-modal">
        <div class="plc-modal-content">
            <h2>Configura Tasto Funzione <span id="fkey-config-title"></span></h2>
            <input type="hidden" id="fkey-config-id">
            
            <div class="plc-form-group">
                <label>Etichetta tasto:</label>
                <input type="text" id="fkey-config-label" placeholder="F1" maxlength="4">
                <small>Max 4 caratteri</small>
            </div>
            
            <div class="plc-form-group">
                <label>Azione:</label>
                <select id="fkey-config-action">
                    <option value="none">Nessuna azione</option>
                    <option value="page">Cambia Pagina HMI</option>
                    <option value="set">SET bit (imposta a 1)</option>
                    <option value="reset">RESET bit (imposta a 0)</option>
                    <option value="toggle">TOGGLE bit (inverti)</option>
                    <option value="write">Scrivi valore in Word</option>
                </select>
            </div>
            
            <!-- Selezione pagina -->
            <div class="plc-form-group" id="fkey-config-page-group" style="display:none;">
                <label>Pagina destinazione:</label>
                <select id="fkey-config-page">
                    <!-- Popolato dinamicamente -->
                </select>
            </div>
            
            <!-- Selezione bit per SET/RESET/TOGGLE -->
            <div id="fkey-config-bit-group" style="display:none;">
                <div class="plc-form-group">
                    <label>Variabile Bit:</label>
                    <select id="fkey-config-var-type">
                        <option value="I">I - Ingresso</option>
                        <option value="Q">Q - Uscita</option>
                        <option value="M">M - Merker</option>
                    </select>
                    <input type="number" id="fkey-config-var-num" min="0" max="255" value="0" style="width:60px;">
                    .
                    <input type="number" id="fkey-config-var-bit" min="0" max="7" value="0" style="width:50px;">
                </div>
            </div>
            
            <!-- Selezione word per WRITE -->
            <div id="fkey-config-word-group" style="display:none;">
                <div class="plc-form-group">
                    <label>Variabile Word:</label>
                    <select id="fkey-config-word-type">
                        <option value="MW">MW - Memory Word</option>
                        <option value="IW">IW - Input Word</option>
                        <option value="QW">QW - Output Word</option>
                    </select>
                    <input type="number" id="fkey-config-word-num" min="0" max="255" value="0" style="width:60px;">
                </div>
                <div class="plc-form-group">
                    <label>Valore da scrivere:</label>
                    <input type="number" id="fkey-config-value" min="-32768" max="32767" value="0">
                </div>
            </div>
            
            <div class="plc-modal-buttons">
                <button class="plc-btn plc-btn-primary" id="fkey-config-save">Salva</button>
                <button class="plc-btn plc-btn-cancel" onclick="closeFkeyConfigModal()">Annulla</button>
            </div>
        </div>
    </div>

    <!-- Pannello Allarmi -->
    <div id="alarm-panel" class="alarm-panel">
        <div class="alarm-header">
            <h2>Gestione Allarmi</h2>
            <div class="alarm-toolbar">
                <button id="alarm-add" class="plc-btn" title="Aggiungi Allarme">+ Nuovo</button>
                <button id="alarm-ack-all" class="plc-btn" title="Riconosci tutti">ACK All</button>
                <button id="alarm-clear-history" class="plc-btn" title="Cancella storico">Clear</button>
                <button id="alarm-close" class="plc-btn">X</button>
            </div>
        </div>
        <div class="alarm-content">
            <div class="alarm-section">
                <h3>Allarmi Attivi <span id="active-alarm-count">(0)</span></h3>
                <div id="active-alarms" class="alarm-list">
                    <div class="alarm-empty">Nessun allarme attivo</div>
                </div>
            </div>
            <div class="alarm-section">
                <h3>Configurazione Allarmi</h3>
                <div id="alarm-config-list" class="alarm-config-list">
                    <!-- Lista allarmi configurati -->
                </div>
            </div>
            <div class="alarm-section">
                <h3>Storico <span id="alarm-history-count">(0)</span></h3>
                <div id="alarm-history" class="alarm-history">
                    <!-- Storico allarmi -->
                </div>
            </div>
        </div>
    </div>

    <!-- Modal Configurazione Allarme -->
    <div id="alarm-config-modal" class="plc-modal">
        <div class="plc-modal-content">
            <h2 id="alarm-modal-title">Nuovo Allarme</h2>
            <div class="plc-form-group">
                <label>Messaggio:</label>
                <input type="text" id="alarm-msg" placeholder="Descrizione allarme" style="width:100%;">
            </div>
            <div class="plc-form-group">
                <label>Variabile trigger:</label>
                <select id="alarm-var-type">
                    <option value="I">I - Ingresso</option>
                    <option value="Q">Q - Uscita</option>
                    <option value="M">M - Merker</option>
                    <option value="T">T - Timer</option>
                    <option value="C">C - Counter</option>
                    <option value="MW">MW - Memory Word</option>
                </select>
                <input type="number" id="alarm-var-num" min="0" max="255" value="0" style="width:60px;">
                <span id="alarm-bit-group">
                    .
                    <input type="number" id="alarm-var-bit" min="0" max="7" value="0" style="width:50px;">
                </span>
            </div>
            <div class="plc-form-group">
                <label>Condizione:</label>
                <select id="alarm-condition">
                    <option value="eq1">= 1 (ON)</option>
                    <option value="eq0">= 0 (OFF)</option>
                    <option value="gt">Maggiore di</option>
                    <option value="lt">Minore di</option>
                    <option value="ge">Maggiore o uguale</option>
                    <option value="le">Minore o uguale</option>
                </select>
                <input type="number" id="alarm-threshold" value="0" style="width:80px; display:none;">
            </div>
            <div class="plc-form-group">
                <label>Priorita:</label>
                <select id="alarm-priority">
                    <option value="high">Alta (Rosso)</option>
                    <option value="medium">Media (Arancione)</option>
                    <option value="low">Bassa (Giallo)</option>
                    <option value="info">Info (Blu)</option>
                </select>
            </div>
            <div class="plc-form-group">
                <label>
                    <input type="checkbox" id="alarm-ack-required" checked> Richiede riconoscimento
                </label>
            </div>
            <div class="plc-modal-buttons">
                <button class="plc-btn plc-btn-primary" id="alarm-save">Salva</button>
                <button class="plc-btn plc-btn-danger" id="alarm-delete" style="display:none;">Elimina</button>
                <button class="plc-btn plc-btn-cancel" onclick="closeAlarmConfigModal()">Annulla</button>
            </div>
        </div>
    </div>

    <!-- Modal Config Trend -->
    <div id="trend-config-modal" class="plc-modal">
        <div class="plc-modal-content">
            <h2>Configura Trend</h2>
            <div class="plc-form-group">
                <label>Etichetta:</label>
                <input type="text" id="trend-label" placeholder="Nome trend">
            </div>
            <div id="trend-variables">
                <label>Variabili da tracciare:</label>
                <div class="trend-var-list" id="trend-var-list">
                    <!-- Variabili aggiunte dinamicamente -->
                </div>
                <button id="trend-add-var" class="plc-btn" style="margin-top:8px;">+ Aggiungi Variabile</button>
            </div>
            <div class="plc-form-group">
                <label>Durata visibile (secondi):</label>
                <input type="number" id="trend-duration" min="5" max="300" value="30">
            </div>
            <div class="plc-form-group">
                <label>Range Y:</label>
                <input type="number" id="trend-y-min" value="0" style="width:60px;"> - 
                <input type="number" id="trend-y-max" value="100" style="width:60px;">
            </div>
            <div class="plc-modal-buttons">
                <button class="plc-btn plc-btn-primary" id="trend-config-save">Salva</button>
                <button class="plc-btn plc-btn-danger" id="trend-config-delete">Elimina</button>
                <button class="plc-btn plc-btn-cancel" onclick="closeTrendConfigModal()">Annulla</button>
            </div>
        </div>
    </div>

    <!-- ==================== PANNELLO IMPIANTO VIRTUALE ==================== -->
    <div id="scene-panel" class="scene-panel">
        <div class="scene-header">
            <h3>🏭 Impianto Virtuale</h3>
            <div class="scene-header-controls">
                <select id="scene-template" title="Carica template">
                    <option value="">-- Template --</option>
                    <option value="conveyor">Nastro Trasportatore</option>
                    <option value="tanks">Serbatoi e Pompe</option>
                    <option value="traffic">Semaforo Stradale</option>
                    <option value="robot">Cella Robotica</option>
                    <option value="bottling">Linea Imbottigliamento</option>
                </select>
                <button id="scene-clear" class="plc-btn plc-btn-small" title="Pulisci scena">🗑</button>
                <button id="scene-close" class="plc-btn plc-btn-small">×</button>
            </div>
        </div>
        <div class="scene-toolbar">
            <div class="scene-tools-label">Elementi:</div>
            <button class="scene-tool" data-type="conveyor" title="Nastro Trasportatore">
                <svg viewBox="0 0 60 30"><rect x="5" y="10" width="50" height="12" rx="6" fill="#555"/><circle cx="11" cy="16" r="5" fill="#333"/><circle cx="49" cy="16" r="5" fill="#333"/></svg>
            </button>
            <button class="scene-tool" data-type="tank" title="Serbatoio">
                <svg viewBox="0 0 40 50"><rect x="5" y="5" width="30" height="40" rx="3" fill="#3498db" opacity="0.3" stroke="#3498db" stroke-width="2"/><rect x="5" y="25" width="30" height="20" rx="0" fill="#3498db"/></svg>
            </button>
            <button class="scene-tool" data-type="motor" title="Motore">
                <svg viewBox="0 0 50 40"><rect x="5" y="10" width="30" height="20" rx="2" fill="#e74c3c"/><rect x="35" y="15" width="10" height="10" fill="#333"/><circle cx="20" cy="20" r="6" fill="#333"/></svg>
            </button>
            <button class="scene-tool" data-type="pump" title="Pompa">
                <svg viewBox="0 0 50 50"><circle cx="25" cy="25" r="18" fill="none" stroke="#9b59b6" stroke-width="3"/><circle cx="25" cy="25" r="8" fill="#9b59b6"/><path d="M25 7 L25 15 M25 35 L25 43 M7 25 L15 25 M35 25 L43 25" stroke="#9b59b6" stroke-width="3"/></svg>
            </button>
            <button class="scene-tool" data-type="valve" title="Valvola">
                <svg viewBox="0 0 40 50"><polygon points="5,20 20,10 35,20 35,30 20,40 5,30" fill="none" stroke="#27ae60" stroke-width="2"/><line x1="20" y1="5" x2="20" y2="10" stroke="#27ae60" stroke-width="3"/><circle cx="20" cy="5" r="3" fill="#27ae60"/></svg>
            </button>
            <button class="scene-tool" data-type="sensor" title="Sensore">
                <svg viewBox="0 0 30 40"><rect x="5" y="20" width="20" height="15" rx="2" fill="#f39c12"/><circle cx="15" cy="12" r="8" fill="none" stroke="#f39c12" stroke-width="2" stroke-dasharray="3,2"/></svg>
            </button>
            <button class="scene-tool" data-type="light" title="Lampada/Semaforo">
                <svg viewBox="0 0 30 60"><rect x="5" y="5" width="20" height="50" rx="3" fill="#333"/><circle cx="15" cy="15" r="6" fill="#e74c3c"/><circle cx="15" cy="30" r="6" fill="#f1c40f"/><circle cx="15" cy="45" r="6" fill="#27ae60"/></svg>
            </button>
            <button class="scene-tool" data-type="pipe-h" title="Tubo Orizzontale">
                <svg viewBox="0 0 60 20"><rect x="0" y="5" width="60" height="10" fill="#95a5a6"/></svg>
            </button>
            <button class="scene-tool" data-type="pipe-v" title="Tubo Verticale">
                <svg viewBox="0 0 20 60"><rect x="5" y="0" width="10" height="60" fill="#95a5a6"/></svg>
            </button>
            <button class="scene-tool" data-type="robot-arm" title="Braccio Robotico">
                <svg viewBox="0 0 60 60"><rect x="25" y="50" width="10" height="10" fill="#333"/><rect x="20" y="30" width="20" height="20" rx="2" fill="#e67e22"/><rect x="27" y="10" width="6" height="20" fill="#e67e22"/><circle cx="30" cy="8" r="5" fill="#333"/></svg>
            </button>
            <button class="scene-tool" data-type="box" title="Prodotto/Scatola">
                <svg viewBox="0 0 30 30"><rect x="5" y="5" width="20" height="20" fill="#8e44ad"/></svg>
            </button>
            <button class="scene-tool" data-type="label" title="Etichetta Testo">
                <svg viewBox="0 0 40 30"><text x="5" y="22" font-size="18" fill="#ecf0f1">Aa</text></svg>
            </button>
        </div>
        <div class="scene-canvas-container">
            <svg id="scene-canvas" class="scene-canvas" viewBox="0 0 800 500">
                <defs>
                    <pattern id="scene-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#2d323c" stroke-width="0.5"/>
                    </pattern>
                    <!-- Animazione flusso tubi -->
                    <pattern id="flow-pattern" width="20" height="10" patternUnits="userSpaceOnUse">
                        <rect width="20" height="10" fill="#3498db"/>
                        <rect x="0" y="3" width="8" height="4" fill="#5dade2">
                            <animate attributeName="x" from="-8" to="20" dur="0.5s" repeatCount="indefinite"/>
                        </rect>
                    </pattern>
                    <!-- Gradiente serbatoio -->
                    <linearGradient id="tank-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style="stop-color:#5dade2"/>
                        <stop offset="100%" style="stop-color:#2980b9"/>
                    </linearGradient>
                </defs>
                <rect width="100%" height="100%" fill="url(#scene-grid)"/>
                <!-- Elementi scena inseriti qui -->
                <g id="scene-elements"></g>
            </svg>
            <div class="scene-empty-message" id="scene-empty">
                <p>🏭 Trascina gli elementi dalla toolbar</p>
                <p>oppure carica un template</p>
                <p class="scene-hint">💡 <strong>Doppio click</strong> su un elemento per configurarlo</p>
            </div>
        </div>
    </div>

    <!-- Modal Configurazione Elemento Scena -->
    <div id="scene-config-modal" class="plc-modal">
        <div class="plc-modal-content">
            <h2>Configura Elemento</h2>
            <div class="plc-form-group">
                <label>Etichetta:</label>
                <input type="text" id="scene-config-label" placeholder="Nome elemento">
            </div>
            <div class="plc-form-group">
                <label>Variabile Controllo:</label>
                <select id="scene-config-var-type">
                    <option value="Q">Q - Uscita</option>
                    <option value="I">I - Ingresso</option>
                    <option value="M">M - Merker</option>
                    <option value="MW">MW - Memory Word</option>
                </select>
                <input type="number" id="scene-config-var-num" min="0" value="0" style="width:60px;">
                <span id="scene-config-bit-sep">.</span>
                <input type="number" id="scene-config-var-bit" min="0" max="7" value="0" style="width:50px;">
            </div>
            <div class="plc-form-group" id="scene-config-level-group" style="display:none;">
                <label>Range Livello (per serbatoi):</label>
                <input type="number" id="scene-config-min" value="0" style="width:60px;"> - 
                <input type="number" id="scene-config-max" value="100" style="width:60px;">
            </div>
            <div class="plc-form-group" id="scene-config-text-group" style="display:none;">
                <label>Testo:</label>
                <input type="text" id="scene-config-text" placeholder="Testo etichetta">
            </div>
            <div class="plc-form-group">
                <label>Colore:</label>
                <input type="color" id="scene-config-color" value="#00d4aa">
            </div>
            <div class="plc-modal-buttons">
                <button class="plc-btn plc-btn-primary" id="scene-config-save">Salva</button>
                <button class="plc-btn plc-btn-danger" id="scene-config-delete">Elimina</button>
                <button class="plc-btn plc-btn-cancel" onclick="closeSceneConfigModal()">Annulla</button>
            </div>
        </div>
    </div>
    
    <!-- Footer Credits -->
    <footer class="plc-footer">
        <div class="plc-footer-content">
            <span>© 2026 Davide "the Prof." Bertolino — <a href="https://www.davidebertolino.it" target="_blank">www.davidebertolino.it</a> — <a href="mailto:info@davidebertolino.it">info@davidebertolino.it</a></span>
            <span class="plc-footer-version">Control Systems Toolbox v2.7</span>
        </div>
    </footer>
</div>
