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

            // Programma Ladder
            program: {
                name: 'Main [OB1]',
                rungs: []
            },

            // ==================== Hardware Functions ====================

            // Calcola I/O totali in base a configurazione
            getAnalogConfig: function() {
                const cpu = this.hardware.cpuModels[this.hardware.currentCPU];
                let totalAI = cpu.ai;
                let totalAQ = cpu.aq;
                let aiAddresses = [];
                let aqAddresses = [];

                // AI integrati CPU (IW64, IW66 tipicamente)
                for (let i = 0; i < cpu.ai; i++) {
                    aiAddresses.push(cpu.aiStart + (i * 2));
                }

                // AQ integrati CPU (se presenti)
                if (cpu.aq > 0) {
                    for (let i = 0; i < cpu.aq; i++) {
                        aqAddresses.push(cpu.aqStart + (i * 2));
                    }
                }

                // Espansioni (partono da IW96/QW96)
                let expAIStart = 96;
                let expAQStart = 96;

                this.hardware.installedExpansions.forEach(expId => {
                    const exp = this.hardware.expansions[expId];
                    if (exp) {
                        for (let i = 0; i < exp.ai; i++) {
                            aiAddresses.push(expAIStart + (i * 2));
                        }
                        expAIStart += exp.ai * 2;
                        totalAI += exp.ai;

                        for (let i = 0; i < exp.aq; i++) {
                            aqAddresses.push(expAQStart + (i * 2));
                        }
                        expAQStart += exp.aq * 2;
                        totalAQ += exp.aq;
                    }
                });

                return { totalAI, totalAQ, aiAddresses, aqAddresses };
            },

            // Area di un bit ('I', 'Q', 'M') o di una word ('IW', 'QW', 'MW')
            area: function(type) {
                const name = type && type.length === 2 && type[1] === 'W' ? type[0] : type;
                return name === 'I' || name === 'Q' || name === 'M' ? this[name] : null;
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
                this.Q.fill(0);
                this.M.fill(0);
                this.edges = {};
                Object.keys(this.timers).forEach(k => {
                    this.timers[k].ET = 0;
                    this.timers[k].Q = 0;
                    this.timers[k].running = false;
                });
                Object.keys(this.counters).forEach(k => {
                    this.counters[k].CV = 0;
                    this.counters[k].Q = 0;
                    this.counters[k].lastCU = 0;
                    this.counters[k].lastCD = 0;
                });
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
                    // Mai stato ON o gia scaduto: output OFF
                    t.Q = 0;
                    t.ET = 0;
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

                t.lastIN = IN;
                return t.Q;
            },

            // Counter CTD (Count Down)
            counterCTD: function(id, CD, LD, PV) {
                if (!this.counters[id]) {
                    this.counters[id] = { CV: PV, Q: 0, PV: PV, lastCD: 0, lastCU: 0 };
                }
                const c = this.counters[id];
                c.PV = PV;

                if (LD) {
                    c.CV = c.PV;
                } else if (CD && !c.lastCD && c.CV > 0) {
                    c.CV = c.CV - 1;
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
                    if (CU && !c.lastCU) {
                        c.CV = Math.min(c.CV + 1, 32767);
                    }
                    if (CD && !c.lastCD && c.CV > 0) {
                        c.CV = c.CV - 1;
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

            // Ottieni valore operando per comparatori
            getOperandValue: function(op) {
                if (!op) return 0;
                switch (op.type) {
                    case 'const':
                        return parseInt(op.value) || 0;
                    case 'counter':
                        const cid = 'C' + (op.value || 0);
                        return this.counters[cid] ? this.counters[cid].CV : 0;
                    case 'timer':
                        const tid = 'T' + (op.value || 0);
                        return this.timers[tid] ? this.timers[tid].ET : 0;
                    case 'MW':
                        return this.readWord('MW', parseInt(op.value) || 0);
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

                PLC.program.rungs.forEach((rung, idx) => {
                    this.executeRung(rung, idx);
                });
            },

            // Esegui singolo rung
            executeRung: function(rung, rungIdx) {
                // Inizializza se necessario (compatibilita)
                if (!rung.inputs) rung.inputs = rung.elements || [];
                if (!rung.outputs) rung.outputs = [];

                // Valuta inputs (condizioni)
                let power = this.evaluateBranch(rung.inputs, rung);
                rung.inputPower = power;

                // Valuta outputs (azioni) - ricevono il power dagli inputs
                this.evaluateBranch(rung.outputs, rung, power);

                rung.power = power;
            },

            // Valuta branch/serie di elementi (supporta annidamento)
            evaluateBranch: function(elements, rung, initialPower) {
                let power = initialPower !== undefined ? initialPower : 1;

                for (let i = 0; i < elements.length; i++) {
                    const elem = elements[i];

                    if (elem.type === 'branch') {
                        // Parallelo - OR tra le linee (ricorsivo per sub-branch)
                        let branchPower = 0;
                        elem.lines.forEach(line => {
                            const linePower = this.evaluateBranch(line, rung, power);
                            branchPower = branchPower || linePower;
                        });
                        elem.state = branchPower;
                        power = branchPower;
                    } else {
                        power = this.evaluateElement(elem, power);
                        elem.state = power;
                    }
                }

                return power;
            },

            // Valuta singolo elemento
            evaluateElement: function(elem, inputPower) {
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
                        // Positive edge (fronte di salita)
                        const edgeId = `P_${type}${byte}.${bit}`;
                        const currentVal = inputPower && PLC.readBit(type, byte, bit);
                        return PLC.edgeP(edgeId, currentVal);
                    }

                    case 'contact-n': {
                        // Negative edge (fronte di discesa)
                        const edgeId = `N_${type}${byte}.${bit}`;
                        const currentVal = inputPower && PLC.readBit(type, byte, bit);
                        return PLC.edgeN(edgeId, currentVal);
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
                        const result = PLC.counterCTD(counterId, inputPower, load, preset);
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

                    default:
                        return inputPower;
                }
            }
        };

        return { PLC, LadderEngine };
    }

    const PLCSimCore = { create };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = PLCSimCore;
    } else {
        root.PLCSimCore = PLCSimCore;
    }
})(typeof window !== 'undefined' ? window : this);
