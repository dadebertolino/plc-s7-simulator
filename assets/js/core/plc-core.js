/**
 * PLC S7-1200 Simulator - Motore PLC e Ladder
 *
 * Senza jQuery e senza DOM: lo usa simulator.js nel browser e i test in Node.
 * PLCSimCore.create() restituisce una nuova coppia { PLC, LadderEngine }.
 */

(function(root) {
    'use strict';

    function create() {
        // ==================== PLC Memory Model ====================
        const PLC = {
            // ==================== Hardware Configuration ====================
            hardware: {
                // Modelli CPU disponibili
                cpuModels: {
                    // CPU 1211C
                    '1211C-DC': { name: 'CPU 1211C DC/DC/DC', di: 6, dq: 4, ai: 2, aq: 0, aiStart: 64 },
                    '1211C-AC': { name: 'CPU 1211C AC/DC/Relay', di: 6, dq: 4, ai: 2, aq: 0, aiStart: 64 },
                    // CPU 1212C
                    '1212C-DC': { name: 'CPU 1212C DC/DC/DC', di: 8, dq: 6, ai: 2, aq: 0, aiStart: 64 },
                    '1212C-AC': { name: 'CPU 1212C AC/DC/Relay', di: 8, dq: 6, ai: 2, aq: 0, aiStart: 64 },
                    // CPU 1214C
                    '1214C-DC': { name: 'CPU 1214C DC/DC/DC', di: 14, dq: 10, ai: 2, aq: 0, aiStart: 64 },
                    '1214C-AC': { name: 'CPU 1214C AC/DC/Relay', di: 14, dq: 10, ai: 2, aq: 0, aiStart: 64 },
                    // CPU 1215C
                    '1215C-DC': { name: 'CPU 1215C DC/DC/DC', di: 14, dq: 10, ai: 2, aq: 2, aiStart: 64, aqStart: 64 },
                    '1215C-AC': { name: 'CPU 1215C AC/DC/Relay', di: 14, dq: 10, ai: 2, aq: 2, aiStart: 64, aqStart: 64 },
                    // CPU 1217C
                    '1217C-DC': { name: 'CPU 1217C DC/DC/DC', di: 14, dq: 10, ai: 2, aq: 2, aiStart: 64, aqStart: 64 }
                },
                // Espansioni disponibili
                expansions: {
                    'SM1221-8DI': { name: 'SM 1221 DI x8', di: 8, dq: 0, ai: 0, aq: 0 },
                    'SM1221-16DI': { name: 'SM 1221 DI x16', di: 16, dq: 0, ai: 0, aq: 0 },
                    'SM1222-8DQ': { name: 'SM 1222 DQ x8', di: 0, dq: 8, ai: 0, aq: 0 },
                    'SM1222-8DQR': { name: 'SM 1222 DQ x8 Relay', di: 0, dq: 8, ai: 0, aq: 0 },
                    'SM1223-8DI8DQ': { name: 'SM 1223 DI x8 / DQ x8', di: 8, dq: 8, ai: 0, aq: 0 },
                    'SM1231-4AI': { name: 'SM 1231 AI x4', di: 0, dq: 0, ai: 4, aq: 0 },
                    'SM1231-8AI': { name: 'SM 1231 AI x8', di: 0, dq: 0, ai: 8, aq: 0 },
                    'SM1232-2AQ': { name: 'SM 1232 AQ x2', di: 0, dq: 0, ai: 0, aq: 2 },
                    'SM1232-4AQ': { name: 'SM 1232 AQ x4', di: 0, dq: 0, ai: 0, aq: 4 },
                    'SM1234-4AI2AQ': { name: 'SM 1234 AI x4 / AQ x2', di: 0, dq: 0, ai: 4, aq: 2 },
                    'SB1221-4DI': { name: 'SB 1221 DI x4', di: 4, dq: 0, ai: 0, aq: 0 },
                    'SB1222-4DQ': { name: 'SB 1222 DQ x4', di: 0, dq: 4, ai: 0, aq: 0 },
                    'SB1223-2DI2DQ': { name: 'SB 1223 DI x2 / DQ x2', di: 2, dq: 2, ai: 0, aq: 0 },
                    'SB1231-1AI': { name: 'SB 1231 AI x1', di: 0, dq: 0, ai: 1, aq: 0 },
                    'SB1232-1AQ': { name: 'SB 1232 AQ x1', di: 0, dq: 0, ai: 0, aq: 1 }
                },
                // Configurazione corrente
                currentCPU: '1215C-AC',
                installedExpansions: [],
                // Range analogico S7-1200 (0-10V / 4-20mA unipolare)
                analogRange: { min: 0, max: 27648 }
            },

            // Aree di memoria indirizzate per byte, come in S7-1200:
            // I0.0-I1023.7, Q0.0-Q1023.7, M0.0-M8191.7. Le word sono due byte
            // della stessa area (MW10 = MB10 alto + MB11 basso, IW64 = IB64 + IB65).
            I: new Uint8Array(1024),
            Q: new Uint8Array(1024),
            M: new Uint8Array(8192),

            // Immagine di processo degli ingressi (PII): a inizio ciclo copia
            // degli ingressi del campo (I), che pulsanti, HMI e Scene scrivono.
            // Durante il ciclo il programma legge e scrive qui: una bobina su
            // un ingresso cambia l'immagine e non il campo, come in S7.
            PII: new Uint8Array(1024),
            scanning: false,

            // Timers
            timers: {},

            // Counters
            counters: {},

            // Edge detection memory
            edges: {},

            // Orologio in ms dei timer: i test lo sostituiscono con uno finto
            now: function() {
                return Date.now();
            },

            // Stato simulazione
            running: false,
            scanTime: 50, // ms
            scanInterval: null,

            // Tempo di ciclo in ms fra l'inizio di due cicli, come nella
            // diagnostica della CPU (attuale, minimo, massimo dall'ultimo RUN)
            cycle: { last: 0, min: 0, max: 0, start: null },

            // Programma Ladder
            program: {
                name: 'Main [OB1]',
                rungs: []
            },

            // ==================== Hardware Functions ====================

            // Moduli SM ammessi per CPU (la signal board e' sempre al massimo una)
            maxModules: { '1211C': 0, '1212C': 2, '1214C': 8, '1215C': 8, '1217C': 8 },

            // Indirizzi di default degli I/O come in TIA Portal:
            // CPU da I0.0/Q0.0 e IW64/QW64, signal board da I4.0/Q4.0 e IW80/QW80,
            // modulo SM nello slot n (2..9) da I(8+4(n-2)).0/Q... e IW(96+16(n-2))/QW...
            // di/dq: canali { byte, bit, module }; ai/aq: indirizzi delle word.
            // cpuId ed expansions (facoltativi) servono all'anteprima della
            // finestra hardware, prima di applicare la configurazione.
            getIOConfig: function(cpuId, expansions) {
                const hw = this.hardware;
                cpuId = cpuId || hw.currentCPU;
                expansions = expansions || hw.installedExpansions;
                const cpu = hw.cpuModels[cpuId] || hw.cpuModels['1215C-AC'];
                const cfg = { di: [], dq: [], ai: [], aq: [], errors: [] };
                const bits = (list, startByte, count, module) => {
                    for (let i = 0; i < count; i++) {
                        list.push({ byte: startByte + Math.floor(i / 8), bit: i % 8, module: module });
                    }
                };
                const words = (list, start, count) => {
                    for (let i = 0; i < count; i++) list.push(start + i * 2);
                };

                bits(cfg.di, 0, cpu.di, 'CPU');
                bits(cfg.dq, 0, cpu.dq, 'CPU');
                words(cfg.ai, cpu.aiStart || 64, cpu.ai);
                words(cfg.aq, cpu.aqStart || 64, cpu.aq);

                let boards = 0;
                let slot = 2;
                expansions.forEach(expId => {
                    const exp = hw.expansions[expId];
                    if (!exp) return;
                    if (expId.startsWith('SB')) {
                        if (++boards > 1) {
                            cfg.errors.push('Si puo\' installare una sola signal board (' + exp.name + ' in piu\').');
                            return;
                        }
                        bits(cfg.di, 4, exp.di, exp.name);
                        bits(cfg.dq, 4, exp.dq, exp.name);
                        words(cfg.ai, 80, exp.ai);
                        words(cfg.aq, 80, exp.aq);
                    } else {
                        if (slot - 2 >= this.maxModulesFor(cpuId)) {
                            cfg.errors.push(this.tooManyModules(cpuId) + ' (' + exp.name + ' in piu\').');
                            return;
                        }
                        bits(cfg.di, 8 + 4 * (slot - 2), exp.di, exp.name);
                        bits(cfg.dq, 8 + 4 * (slot - 2), exp.dq, exp.name);
                        words(cfg.ai, 96 + 16 * (slot - 2), exp.ai);
                        words(cfg.aq, 96 + 16 * (slot - 2), exp.aq);
                        slot++;
                    }
                });
                return cfg;
            },

            maxModulesFor: function(cpuId) {
                return this.maxModules[String(cpuId).slice(0, 5)] || 0;
            },

            tooManyModules: function(cpuId) {
                const max = this.maxModulesFor(cpuId);
                const name = 'CPU ' + String(cpuId).slice(0, 5);
                return max === 0 ? name + ' non accetta moduli di espansione' : name + ': al massimo ' + max + ' moduli di espansione';
            },

            // '' se l'espansione si puo' aggiungere, altrimenti il motivo
            canAddExpansion: function(expId, cpuId, expansions) {
                const hw = this.hardware;
                cpuId = cpuId || hw.currentCPU;
                if (!hw.expansions[expId]) return 'Espansione sconosciuta';
                const installed = (expansions || hw.installedExpansions).filter(id => hw.expansions[id]);
                if (expId.startsWith('SB')) {
                    return installed.some(id => id.startsWith('SB')) ? 'Si puo\' installare una sola signal board.' : '';
                }
                const modules = installed.filter(id => !id.startsWith('SB')).length;
                return modules >= this.maxModulesFor(cpuId) ? this.tooManyModules(cpuId) + '.' : '';
            },

            // Indirizzi analogici (per la griglia AI/AQ)
            getAnalogConfig: function() {
                const cfg = this.getIOConfig();
                return { totalAI: cfg.ai.length, totalAQ: cfg.aq.length, aiAddresses: cfg.ai, aqAddresses: cfg.aq };
            },

            // Area di un bit ('I', 'Q', 'M'), di una word ('IW', 'QW', 'MW')
            // o di una doppia word ('ID', 'QD', 'MD')
            area: function(type) {
                const name = type && type.length === 2 && (type[1] === 'W' || type[1] === 'D') ? type[0] : type;
                if (name === 'I') return this.scanning ? this.PII : this.I;
                return name === 'Q' || name === 'M' ? this[name] : null;
            },

            // Leggi bit
            readBit: function(type, byte, bit) {
                const arr = this.area(type);
                if (!arr || !(byte >= 0 && byte < arr.length)) return 0;
                return (arr[byte] >> bit) & 1;
            },

            // Scrivi bit
            writeBit: function(type, byte, bit, value) {
                const arr = this.area(type);
                if (!arr || !(byte >= 0 && byte < arr.length)) return;
                if (value) {
                    arr[byte] |= (1 << bit);
                } else {
                    arr[byte] &= ~(1 << bit);
                }
            },

            // Toggle bit (per ingressi)
            toggleBit: function(type, byte, bit) {
                const current = this.readBit(type, byte, bit);
                this.writeBit(type, byte, bit, current ? 0 : 1);
            },

            // ==================== Word Functions (Analog I/O) ====================

            // Leggi word INT (16 bit con segno, byte alto all'indirizzo piu' basso)
            // type: 'IW' per Input Word, 'QW' per Output Word, 'MW' per Memory Word
            readWord: function(type, address) {
                const arr = this.area(type);
                if (!arr || !(address >= 0 && address + 1 < arr.length)) return 0;
                const raw = (arr[address] << 8) | arr[address + 1];
                return raw >= 0x8000 ? raw - 0x10000 : raw;
            },

            // Scrivi word INT, saturata a -32768..32767
            writeWord: function(type, address, value) {
                const arr = this.area(type);
                if (!arr || !(address >= 0 && address + 1 < arr.length)) return;
                const v = Math.max(-32768, Math.min(32767, Math.round(Number(value) || 0))) & 0xFFFF;
                arr[address] = v >> 8;
                arr[address + 1] = v & 0xFF;
            },

            // Leggi doppia word REAL (IEEE 754 a 32 bit, byte alto all'indirizzo piu' basso)
            readReal: function(type, address) {
                const arr = this.area(type);
                if (!arr || !(address >= 0 && address + 3 < arr.length)) return 0;
                return new DataView(arr.buffer, arr.byteOffset + address, 4).getFloat32(0);
            },

            // Scrivi doppia word REAL
            writeReal: function(type, address, value) {
                const arr = this.area(type);
                if (!arr || !(address >= 0 && address + 3 < arr.length)) return;
                new DataView(arr.buffer, arr.byteOffset + address, 4).setFloat32(0, Number(value) || 0);
            },

            // Converti valore analogico in unità ingegneristiche
            // es: AIW 0-27648 -> 0-100% o 0-10V o 4-20mA
            analogToEngineering: function(rawValue, engMin, engMax) {
                const norm = this.NORM_X(rawValue, this.hardware.analogRange.min, this.hardware.analogRange.max);
                return this.SCALE_X(norm, engMin, engMax);
            },

            // Converti unità ingegneristiche in valore analogico
            engineeringToAnalog: function(engValue, engMin, engMax) {
                const norm = this.NORM_X(engValue, engMin, engMax);
                return this.SCALE_X(norm, this.hardware.analogRange.min, this.hardware.analogRange.max);
            },

            // Reset memoria
            reset: function() {
                this.I.fill(0);
                this.clearVolatile();
            },

            // Uscite, merker, timer, contatori e fronti a 0 (gli ingressi no)
            clearVolatile: function() {
                this.Q.fill(0);
                this.M.fill(0);
                this.edges = {};
                this.cycle = { last: 0, min: 0, max: 0, start: null };
                Object.keys(this.timers).forEach(k => {
                    const t = this.timers[k];
                    t.ET = 0;
                    t.Q = 0;
                    t.running = false;
                    t.wasON = false;
                    t.lastIN = 0;
                });
                Object.keys(this.counters).forEach(k => {
                    const c = this.counters[k];
                    c.CV = c.startAtPV ? c.PV : 0;
                    c.Q = 0;
                    this.counters[k].lastCU = 0;
                    this.counters[k].lastCD = 0;
                });
            },

            // Passaggio STOP -> RUN come in S7-1200: immagine delle uscite,
            // merker non ritentivi, timer, contatori e memorie dei fronti
            // ripartono da 0; gli ingressi restano quelli del campo.
            startup: function() {
                this.clearVolatile();
                this.running = true;
            },

            // Passaggio RUN -> STOP: le uscite vanno al valore sostitutivo 0,
            // il resto della memoria resta consultabile
            stop: function() {
                this.running = false;
                this.Q.fill(0);
            },

            // Timer TON
            timerTON: function(id, IN, PT) {
                if (!this.timers[id]) {
                    this.timers[id] = { ET: 0, Q: 0, PT: PT, running: false, lastTime: 0 };
                }
                const t = this.timers[id];
                t.PT = PT;

                if (IN) {
                    if (!t.running) {
                        t.running = true;
                        t.lastTime = this.now();
                    }
                    const elapsed = this.now() - t.lastTime;
                    t.ET = Math.min(t.ET + elapsed, t.PT);
                    t.lastTime = this.now();
                    t.Q = t.ET >= t.PT ? 1 : 0;
                } else {
                    t.ET = 0;
                    t.Q = 0;
                    t.running = false;
                }
                return t.Q;
            },

            // Timer TOF (Off-Delay Timer)
            // Q rimane ON finche IN e ON, poi ritarda lo spegnimento di PT ms
            timerTOF: function(id, IN, PT) {
                if (!this.timers[id]) {
                    this.timers[id] = { ET: 0, Q: 0, PT: PT, running: false, lastTime: 0, wasON: false };
                }
                const t = this.timers[id];
                t.PT = PT;

                if (IN) {
                    // Input ON: output ON, reset timer
                    t.ET = 0;
                    t.Q = 1;
                    t.wasON = true;
                    t.running = false;
                } else if (t.wasON) {
                    // Input OFF ma era ON: avvia conteggio ritardo
                    if (!t.running) {
                        t.running = true;
                        t.lastTime = this.now();
                    }
                    const elapsed = this.now() - t.lastTime;
                    t.ET = Math.min(t.ET + elapsed, t.PT);
                    t.lastTime = this.now();

                    // Output resta ON durante il ritardo
                    t.Q = 1;

                    if (t.ET >= t.PT) {
                        // Tempo scaduto: spegni output
                        t.Q = 0;
                        t.wasON = false;
                        t.running = false;
                    }
                } else {
                    // Mai stato ON o gia' scaduto: output OFF, ET resta a PT
                    // (o a 0) finche' IN non torna alto, come in TIA Portal
                    t.Q = 0;
                }
                return t.Q;
            },

            // Counter CTU
            counterCTU: function(id, CU, R, PV) {
                if (!this.counters[id]) {
                    this.counters[id] = { CV: 0, Q: 0, PV: PV, lastCU: 0, lastCD: 0 };
                }
                const c = this.counters[id];
                c.PV = PV;

                if (R) {
                    c.CV = 0;
                } else if (CU && !c.lastCU) {
                    c.CV = Math.min(c.CV + 1, 32767);
                }
                c.lastCU = CU;
                c.Q = c.CV >= c.PV ? 1 : 0;
                return c.Q;
            },

            // Timer TP (Pulse Timer)
            // Genera un impulso di durata PT quando IN passa da 0 a 1
            timerTP: function(id, IN, PT) {
                if (!this.timers[id]) {
                    this.timers[id] = { ET: 0, Q: 0, PT: PT, running: false, lastTime: 0, lastIN: 0 };
                }
                const t = this.timers[id];
                t.PT = PT;

                // Rileva fronte di salita
                if (IN && !t.lastIN && !t.running) {
                    t.running = true;
                    t.lastTime = this.now();
                    t.ET = 0;
                    t.Q = 1;
                }

                if (t.running) {
                    const elapsed = this.now() - t.lastTime;
                    t.ET = Math.min(t.ET + elapsed, t.PT);
                    t.lastTime = this.now();

                    if (t.ET >= t.PT) {
                        t.Q = 0;
                        t.running = false;
                    }
                }

                // Impulso finito: ET resta a PT finche' IN e' alto, poi torna a 0
                if (!t.running && !IN) {
                    t.ET = 0;
                }

                t.lastIN = IN;
                return t.Q;
            },

            // Counter CTD (Count Down)
            // Con LD collegato parte da 0 come in TIA Portal; senza LD (programmi
            // creati prima che LD fosse configurabile) parte da PV.
            counterCTD: function(id, CD, LD, PV, startAtPV) {
                if (!this.counters[id]) {
                    this.counters[id] = { CV: startAtPV ? PV : 0, Q: 0, PV: PV, lastCD: 0, lastCU: 0, startAtPV: !!startAtPV };
                }
                const c = this.counters[id];
                c.PV = PV;

                if (LD) {
                    c.CV = c.PV;
                } else if (CD && !c.lastCD) {
                    c.CV = Math.max(c.CV - 1, -32768);
                }
                c.lastCD = CD;
                c.Q = c.CV <= 0 ? 1 : 0;
                return c.Q;
            },

            // Counter CTUD (Count Up/Down)
            counterCTUD: function(id, CU, CD, R, LD, PV) {
                if (!this.counters[id]) {
                    this.counters[id] = { CV: 0, QU: 0, QD: 0, PV: PV, lastCU: 0, lastCD: 0 };
                }
                const c = this.counters[id];
                c.PV = PV;

                if (R) {
                    c.CV = 0;
                } else if (LD) {
                    c.CV = c.PV;
                } else {
                    // Fronti CU e CD nello stesso ciclo: CV invariato
                    const up = CU && !c.lastCU;
                    const down = CD && !c.lastCD;
                    if (up && !down) {
                        c.CV = Math.min(c.CV + 1, 32767);
                    } else if (down && !up) {
                        c.CV = Math.max(c.CV - 1, -32768);
                    }
                }
                c.lastCU = CU;
                c.lastCD = CD;
                c.QU = c.CV >= c.PV ? 1 : 0;
                c.QD = c.CV <= 0 ? 1 : 0;
                c.Q = c.QU; // Default output e QU
                return c.Q;
            },

            // Edge detection - Positive (Rising edge)
            edgeP: function(id, IN) {
                if (this.edges[id] === undefined) {
                    this.edges[id] = 0;
                }
                const result = (IN && !this.edges[id]) ? 1 : 0;
                this.edges[id] = IN;
                return result;
            },

            // Edge detection - Negative (Falling edge)
            edgeN: function(id, IN) {
                if (this.edges[id] === undefined) {
                    this.edges[id] = 0;
                }
                const result = (!IN && this.edges[id]) ? 1 : 0;
                this.edges[id] = IN;
                return result;
            },

            // Valore di un operando di comparatori e box: costante, CV, ET,
            // word INT (IW, QW, MW) o doppia word REAL (MD)
            getOperandValue: function(op) {
                if (!op) return 0;
                switch (op.type) {
                    case 'const':
                        return Number(op.value) || 0;
                    case 'counter':
                        const cid = 'C' + (op.value || 0);
                        return this.counters[cid] ? this.counters[cid].CV : 0;
                    case 'timer':
                        const tid = 'T' + (op.value || 0);
                        return this.timers[tid] ? this.timers[tid].ET : 0;
                    case 'MW':
                    case 'IW':
                    case 'QW':
                        return this.readWord(op.type, parseInt(op.value) || 0);
                    case 'MD':
                        return this.readReal(op.type, parseInt(op.value) || 0);
                    default:
                        return 0;
                }
            },

            // Scrive il risultato di un box nell'operando OUT. Una word e' un
            // INT: il valore si arrotonda e, se non ci sta, non si scrive e il
            // box restituisce ENO = 0, come per un risultato fuori campo in TIA.
            writeOperand: function(op, value) {
                if (!op || !Number.isFinite(value)) return 0;
                const address = parseInt(op.value) || 0;
                switch (op.type) {
                    case 'MW':
                    case 'QW':
                    case 'IW': {
                        const v = Math.round(value);
                        if (v < -32768 || v > 32767) return 0;
                        this.writeWord(op.type, address, v);
                        return 1;
                    }
                    case 'MD':
                        this.writeReal(op.type, address, value);
                        return 1;
                    default:
                        return 0;
                }
            },

            // Comparatori
            compare: function(op, val1, val2) {
                switch (op) {
                    case 'eq': return val1 === val2 ? 1 : 0;
                    case 'ne': return val1 !== val2 ? 1 : 0;
                    case 'gt': return val1 > val2 ? 1 : 0;
                    case 'lt': return val1 < val2 ? 1 : 0;
                    case 'ge': return val1 >= val2 ? 1 : 0;
                    case 'le': return val1 <= val2 ? 1 : 0;
                    default: return 0;
                }
            },

            // ==================== Analog Functions (NORM_X / SCALE_X) ====================

            // NORM_X: Normalizza valore da range [min,max] a [0.0, 1.0]
            // Come in TIA Portal: OUT = (VALUE - MIN) / (MAX - MIN)
            NORM_X: function(value, min, max) {
                if (max === min) return 0; // Evita divisione per zero
                const result = (value - min) / (max - min);
                return Math.max(0, Math.min(1, result)); // Clamp a 0-1
            },

            // SCALE_X: Scala valore normalizzato [0.0, 1.0] a range [min, max]
            // Come in TIA Portal: OUT = MIN + (VALUE * (MAX - MIN))
            SCALE_X: function(normalizedValue, min, max) {
                const result = min + (normalizedValue * (max - min));
                return Math.max(min, Math.min(max, result)); // Clamp al range
            },

            // Combinazione NORM + SCALE per conversione diretta tra range
            // Converte da [inMin, inMax] a [outMin, outMax]
            SCALE_RANGE: function(value, inMin, inMax, outMin, outMax) {
                const normalized = this.NORM_X(value, inMin, inMax);
                return this.SCALE_X(normalized, outMin, outMax);
            }
        };

        // ==================== Ladder Engine ====================
        const LadderEngine = {
            // Esegui programma
            execute: function() {
                if (!PLC.running) return;

                // Tempo di ciclo: dall'inizio del ciclo precedente a questo
                const now = PLC.now();
                const c = PLC.cycle;
                if (c.start !== null) {
                    c.last = now - c.start;
                    c.min = c.min ? Math.min(c.min, c.last) : c.last;
                    c.max = Math.max(c.max, c.last);
                }
                c.start = now;

                PLC.PII.set(PLC.I);
                PLC.scanning = true;
                try {
                    PLC.program.rungs.forEach((rung, idx) => {
                        this.executeRung(rung, idx);
                    });
                } finally {
                    PLC.scanning = false;
                }
            },

            // Esegui singolo rung
            executeRung: function(rung, rungIdx) {
                // Inizializza se necessario (compatibilita)
                if (!rung.inputs) rung.inputs = rung.elements || [];
                if (!rung.outputs) rung.outputs = [];

                // Valuta inputs (condizioni)
                let power = this.evaluateBranch(rung.inputs, rung, undefined, rungIdx + ':i');
                rung.inputPower = power;

                // Valuta outputs (azioni) - ricevono il power dagli inputs
                this.evaluateBranch(rung.outputs, rung, power, rungIdx + ':o');

                rung.power = power;
            },

            // Valuta branch/serie di elementi (supporta annidamento).
            // path identifica la posizione nel programma: e' la chiave della
            // memoria dei fronti, una per istruzione come in TIA Portal.
            evaluateBranch: function(elements, rung, initialPower, path) {
                let power = initialPower !== undefined ? initialPower : 1;

                for (let i = 0; i < elements.length; i++) {
                    const elem = elements[i];

                    if (elem.type === 'branch') {
                        // Parallelo - OR tra le linee (ricorsivo per sub-branch)
                        let branchPower = 0;
                        elem.lines.forEach((line, li) => {
                            const linePower = this.evaluateBranch(line, rung, power, `${path}.${i}/${li}`);
                            branchPower = branchPower || linePower;
                        });
                        elem.state = branchPower;
                        power = branchPower;
                    } else {
                        power = this.evaluateElement(elem, power, `${path}.${i}`);
                        elem.state = power;
                    }
                }

                return power;
            },

            // Valuta singolo elemento
            evaluateElement: function(elem, inputPower, path) {
                const addr = elem.address || {};
                const type = addr.type || 'M';
                const byte = addr.byte || 0;
                const bit = addr.bit || 0;

                switch (elem.type) {
                    case 'contact-no':
                        return inputPower && PLC.readBit(type, byte, bit);

                    case 'contact-nc':
                        return inputPower && !PLC.readBit(type, byte, bit);

                    case 'contact-p': {
                        // Fronte di salita dell'operando (la memoria si aggiorna
                        // anche senza potenza), in AND con la potenza
                        const edge = PLC.edgeP(`P@${path}`, PLC.readBit(type, byte, bit));
                        return inputPower && edge ? 1 : 0;
                    }

                    case 'contact-n': {
                        // Fronte di discesa dell'operando, in AND con la potenza
                        const edge = PLC.edgeN(`N@${path}`, PLC.readBit(type, byte, bit));
                        return inputPower && edge ? 1 : 0;
                    }

                    case 'coil':
                        PLC.writeBit(type, byte, bit, inputPower);
                        return inputPower;

                    case 'coil-set':
                        if (inputPower) PLC.writeBit(type, byte, bit, 1);
                        return inputPower;

                    case 'coil-reset':
                        if (inputPower) PLC.writeBit(type, byte, bit, 0);
                        return inputPower;

                    case 'timer-ton': {
                        const timerId = `T${elem.timerId || 0}`;
                        const preset = elem.preset || 1000;
                        const result = PLC.timerTON(timerId, inputPower, preset);
                        return result;
                    }

                    case 'timer-tof': {
                        const timerId = `T${elem.timerId || 0}`;
                        const preset = elem.preset || 1000;
                        const result = PLC.timerTOF(timerId, inputPower, preset);
                        return result;
                    }

                    case 'timer-tp': {
                        const timerId = `T${elem.timerId || 0}`;
                        const preset = elem.preset || 1000;
                        const result = PLC.timerTP(timerId, inputPower, preset);
                        return result;
                    }

                    case 'counter-ctu': {
                        const counterId = `C${elem.counterId || 0}`;
                        const preset = elem.preset || 10;
                        const reset = elem.resetAddr ? PLC.readBit(elem.resetAddr.type, elem.resetAddr.byte, elem.resetAddr.bit) : 0;
                        const result = PLC.counterCTU(counterId, inputPower, reset, preset);
                        return result;
                    }

                    case 'counter-ctd': {
                        const counterId = `C${elem.counterId || 0}`;
                        const preset = elem.preset || 10;
                        const load = elem.loadAddr ? PLC.readBit(elem.loadAddr.type, elem.loadAddr.byte, elem.loadAddr.bit) : 0;
                        const result = PLC.counterCTD(counterId, inputPower, load, preset, !elem.loadAddr);
                        return result;
                    }

                    case 'counter-ctud': {
                        const counterId = `C${elem.counterId || 0}`;
                        const preset = elem.preset || 10;
                        const cdAddr = elem.cdAddr || {};
                        const cd = cdAddr.type ? PLC.readBit(cdAddr.type, cdAddr.byte || 0, cdAddr.bit || 0) : 0;
                        const reset = elem.resetAddr ? PLC.readBit(elem.resetAddr.type, elem.resetAddr.byte, elem.resetAddr.bit) : 0;
                        const load = elem.loadAddr ? PLC.readBit(elem.loadAddr.type, elem.loadAddr.byte, elem.loadAddr.bit) : 0;
                        const result = PLC.counterCTUD(counterId, inputPower, cd, reset, load, preset);
                        // QU e' il flusso di potenza; QD va sull'operando, se configurato
                        if (elem.qdAddr && elem.qdAddr.type) {
                            PLC.writeBit(elem.qdAddr.type, elem.qdAddr.byte || 0, elem.qdAddr.bit || 0, PLC.counters[counterId].QD);
                        }
                        return result;
                    }

                    // Comparatori
                    case 'cmp-eq':
                    case 'cmp-ne':
                    case 'cmp-gt':
                    case 'cmp-lt':
                    case 'cmp-ge':
                    case 'cmp-le': {
                        if (!inputPower) return 0;
                        const op = elem.type.replace('cmp-', '');
                        const val1 = PLC.getOperandValue(elem.operand1);
                        const val2 = PLC.getOperandValue(elem.operand2);
                        return PLC.compare(op, val1, val2);
                    }

                    // Box di trasferimento e conversione: eseguiti con EN = 1,
                    // ENO = 1 se il risultato e' stato scritto
                    case 'move': {
                        if (!inputPower) return 0;
                        const pins = elem.pins || {};
                        return PLC.writeOperand(pins.OUT, PLC.getOperandValue(pins.IN));
                    }

                    case 'norm-x': {
                        // OUT = (VALUE - MIN) / (MAX - MIN), senza limitare a 0..1
                        if (!inputPower) return 0;
                        const pins = elem.pins || {};
                        const min = PLC.getOperandValue(pins.MIN);
                        const max = PLC.getOperandValue(pins.MAX);
                        if (max === min) return 0;
                        const value = PLC.getOperandValue(pins.VALUE);
                        return PLC.writeOperand(pins.OUT, (value - min) / (max - min));
                    }

                    case 'scale-x': {
                        // OUT = VALUE * (MAX - MIN) + MIN, senza limitare a MIN..MAX
                        if (!inputPower) return 0;
                        const pins = elem.pins || {};
                        const min = PLC.getOperandValue(pins.MIN);
                        const max = PLC.getOperandValue(pins.MAX);
                        const value = PLC.getOperandValue(pins.VALUE);
                        return PLC.writeOperand(pins.OUT, value * (max - min) + min);
                    }

                    default:
                        return inputPower;
                }
            }
        };

        return { PLC, LadderEngine };
    }

    // ==================== Dati importati ====================
    // Programmi JSON, progetti TIA, configurazioni HMI e scene arrivano da
    // file scelti dall'utente (o scambiati fra studenti) e finiscono in HTML.
    // sanitizeData lascia come testo solo i campi di testo libero, che vanno
    // escapati in uscita con escapeHtml; ogni altra stringa deve avere un
    // formato innocuo (tipi, indirizzi, colori), i campi numerici diventano
    // numeri e lo sfondo HMI e' accettato solo come immagine data: base64.

    const TEXT_KEYS = ['label', 'name', 'text', 'msg', 'message', 'comment', 'title', 'description', 'unit'];
    const NUMBER_KEYS = [
        'byte', 'bit', 'preset', 'timerId', 'counterId', 'x', 'y', 'width', 'height', 'min', 'max',
        'varNum', 'varBit', 'num', 'pageCounter', 'elementCounter', 'currentPageId', 'bgOpacity',
        'backgroundOpacity', 'state', 'power', 'inputPower', 'counter'
    ];
    const IMAGE_KEYS = ['background', 'backgroundImage'];
    const SAFE_STRING = /^[\w#.\-: +]*$/;
    const SAFE_COLOR = /^#?[A-Za-z0-9]+$/;
    const DATA_IMAGE = /^data:image\/(png|jpe?g|gif|webp|bmp|svg\+xml);base64,[A-Za-z0-9+\/=\s]+$/;
    const NUMBER_STRING = /^\s*-?\d+(\.\d+)?\s*$/;

    function sanitizeValue(key, value) {
        if (TEXT_KEYS.includes(key)) {
            return value === null || value === undefined || typeof value === 'object' ? '' : String(value);
        }
        if (IMAGE_KEYS.includes(key)) {
            return typeof value === 'string' && DATA_IMAGE.test(value) ? value : null;
        }
        if (NUMBER_KEYS.includes(key)) {
            if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
            if (typeof value === 'string' && NUMBER_STRING.test(value)) return Number(value);
            if (typeof value === 'boolean' || value === null) return value;
            return undefined;
        }
        if (typeof value === 'string') {
            const ok = key === 'color' ? SAFE_COLOR.test(value) : SAFE_STRING.test(value);
            return ok ? value : undefined;
        }
        if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
        if (Array.isArray(value)) return value.map(v => sanitizeValue('', v));
        if (value && typeof value === 'object') return sanitizeData(value);
        return value;
    }

    function sanitizeData(data) {
        if (Array.isArray(data)) return data.map(v => sanitizeValue('', v));
        if (!data || typeof data !== 'object') return data;
        const out = {};
        Object.keys(data).forEach(key => {
            if (key === '__proto__' || key === 'constructor' || key === 'prototype') return;
            const value = sanitizeValue(key, data[key]);
            if (value !== undefined) out[key] = value;
        });
        return out;
    }

    // Escape per contenuto e attributi HTML
    function escapeHtml(value) {
        if (value === null || value === undefined) return '';
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // Id unici per segmenti, elementi e diramazioni di un programma caricato:
    // l'editor li usa per trovare l'elemento da configurare o spostare.
    // Mancano nei file scritti a mano e possono ripetersi negli import
    // (Date.now() nello stesso millisecondo). Il primo id incontrato resta.
    function assignIds(program) {
        const seen = new Set();
        let next = 1;
        const fresh = () => {
            while (seen.has(next)) next++;
            return next;
        };
        const fix = (obj) => {
            if (typeof obj.id !== 'number' || !Number.isFinite(obj.id) || seen.has(obj.id)) {
                obj.id = fresh();
            }
            seen.add(obj.id);
        };
        const walk = (list) => (Array.isArray(list) ? list : []).forEach(e => {
            if (!e || typeof e !== 'object') return;
            fix(e);
            if (Array.isArray(e.lines)) e.lines.forEach(walk);
        });
        const rungIds = new Set();
        (program.rungs || []).forEach((rung, idx) => {
            if (typeof rung.id !== 'number' || !Number.isFinite(rung.id) || rungIds.has(rung.id)) {
                rung.id = Math.max(0, ...rungIds) + 1 + idx;
                while (rungIds.has(rung.id)) rung.id++;
            }
            rungIds.add(rung.id);
            walk(rung.inputs);
            walk(rung.outputs);
        });
        return program;
    }

    const PLCSimCore = { create, sanitizeData, escapeHtml, assignIds };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = PLCSimCore;
    } else {
        root.PLCSimCore = PLCSimCore;
    }
})(typeof window !== 'undefined' ? window : this);
