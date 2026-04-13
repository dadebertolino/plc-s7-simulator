/**
 * PLC S7-1200 Simulator
 * Ladder Logic Engine & UI
 */

(function($) {
    'use strict';

    // ==================== Session Manager ====================
    const Session = {
        id: null,
        
        init: function() {
            // Genera o recupera session ID univoco per questo browser
            this.id = localStorage.getItem('plc_session_id');
            if (!this.id || !this.isValidSessionId(this.id)) {
                this.id = this.generateSessionId();
                localStorage.setItem('plc_session_id', this.id);
            }
            console.log('Session ID:', this.id);
        },
        
        generateSessionId: function() {
            // ID univoco: timestamp + random
            const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
            let id = '';
            for (let i = 0; i < 16; i++) {
                id += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return id;
        },
        
        isValidSessionId: function(id) {
            return /^[a-z0-9]{16}$/.test(id);
        }
    };

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
        
        // I/O Digitali
        I: new Array(16).fill(0),  // Ingressi: I0.0-I1.7
        Q: new Array(16).fill(0),  // Uscite: Q0.0-Q1.7
        M: new Array(32).fill(0),  // Merker: M0.0-M3.7
        MW: new Array(256).fill(0), // Memory Words
        
        // I/O Analogici (Word)
        IW: new Array(128).fill(0),  // Input Word (AIW): IW64, IW66, IW96...
        QW: new Array(128).fill(0),  // Output Word (AQW): QW64, QW66...
        
        // Timers
        timers: {},
        
        // Counters
        counters: {},
        
        // Edge detection memory
        edges: {},
        
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

        // Leggi bit
        readBit: function(type, byte, bit) {
            const arr = this[type];
            if (!arr) return 0;
            const index = byte * 8 + bit;
            return arr[index] || 0;
        },

        // Scrivi bit
        writeBit: function(type, byte, bit, value) {
            const arr = this[type];
            if (!arr) return;
            const index = byte * 8 + bit;
            arr[index] = value ? 1 : 0;
        },

        // Toggle bit (per ingressi)
        toggleBit: function(type, byte, bit) {
            const current = this.readBit(type, byte, bit);
            this.writeBit(type, byte, bit, current ? 0 : 1);
        },
        
        // ==================== Word Functions (Analog I/O) ====================
        
        // Leggi word (16 bit) - per I/O analogici
        readWord: function(type, address) {
            // type: 'IW' per Input Word, 'QW' per Output Word, 'MW' per Memory Word
            const arr = this[type];
            if (!arr) return 0;
            return arr[address] || 0;
        },
        
        // Scrivi word (16 bit)
        writeWord: function(type, address, value) {
            const arr = this[type];
            if (!arr) return;
            // Clamp a range 16-bit signed (-32768 to 32767) o unsigned (0 to 65535)
            const range = this.hardware.analogRange;
            arr[address] = Math.max(range.min, Math.min(range.max, Math.round(value)));
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
            this.MW.fill(0);
            this.IW.fill(0);
            this.QW.fill(0);
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
                    t.lastTime = Date.now();
                }
                const elapsed = Date.now() - t.lastTime;
                t.ET = Math.min(t.ET + elapsed, t.PT);
                t.lastTime = Date.now();
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
                    t.lastTime = Date.now();
                }
                const elapsed = Date.now() - t.lastTime;
                t.ET = Math.min(t.ET + elapsed, t.PT);
                t.lastTime = Date.now();
                
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
                t.lastTime = Date.now();
                t.ET = 0;
                t.Q = 1;
            }
            
            if (t.running) {
                const elapsed = Date.now() - t.lastTime;
                t.ET = Math.min(t.ET + elapsed, t.PT);
                t.lastTime = Date.now();
                
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
                    return this.MW[parseInt(op.value) || 0] || 0;
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
            
            UI.updateDisplay();
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

    // ==================== History Manager (Undo/Redo) ====================
    const History = {
        undoStack: [],
        redoStack: [],
        maxSize: 50,
        
        // Salva stato corrente
        save: function() {
            const state = JSON.stringify(PLC.program);
            this.undoStack.push(state);
            if (this.undoStack.length > this.maxSize) {
                this.undoStack.shift();
            }
            this.redoStack = []; // Clear redo on new action
            this.updateButtons();
        },
        
        // Undo
        undo: function() {
            if (this.undoStack.length === 0) return;
            
            const currentState = JSON.stringify(PLC.program);
            this.redoStack.push(currentState);
            
            const prevState = this.undoStack.pop();
            PLC.program = JSON.parse(prevState);
            
            UI.rebuildAllRungs();
            this.updateButtons();
        },
        
        // Redo
        redo: function() {
            if (this.redoStack.length === 0) return;
            
            const currentState = JSON.stringify(PLC.program);
            this.undoStack.push(currentState);
            
            const nextState = this.redoStack.pop();
            PLC.program = JSON.parse(nextState);
            
            UI.rebuildAllRungs();
            this.updateButtons();
        },
        
        // Aggiorna stato pulsanti
        updateButtons: function() {
            $('#btn-undo').prop('disabled', this.undoStack.length === 0);
            $('#btn-redo').prop('disabled', this.redoStack.length === 0);
        },
        
        // Reset history
        clear: function() {
            this.undoStack = [];
            this.redoStack = [];
            this.updateButtons();
        }
    };

    // ==================== UI Controller ====================
    const UI = {
        selectedElement: null,
        selectedElements: [], // Multi-selezione
        selectedProgramId: null, // Per modal caricamento
        draggedType: null,
        dragSource: null,
        draggedElement: null,
        rungCounter: 0,
        timerCounter: 0,
        counterCounter: 0,
        contextMenuTarget: null, // Per context menu

        init: function() {
            this.setupEventListeners();
            this.setupPanels();
            this.createIOGrid();
            this.createContextMenu();
            this.setupHardwareModal();
            this.addRung(); // Rung iniziale
            this.updateDisplay();
            this.setMode('stop'); // Inizia in STOP
            History.updateButtons();
        },

        setupEventListeners: function() {
            // Controlli principali
            $('#btn-run').on('click', () => this.startSimulation());
            $('#btn-stop').on('click', () => this.stopSimulation());
            $('#btn-new').on('click', () => this.newProgram());
            $('#btn-save').on('click', () => this.saveProgram());
            $('#btn-load').on('click', () => this.showLoadModal());
            $('#btn-add-rung').on('click', () => this.addRung());
            $('#btn-add-branch').on('click', () => this.addBranch());
            $('#btn-export').on('click', () => this.exportProgram());
            $('#btn-import').on('click', () => $('#import-file').click());
            $('#import-file').on('change', (e) => this.importProgram(e));
            $('#btn-print').on('click', () => this.printLadder());
            
            // Undo/Redo
            $('#btn-undo').on('click', () => History.undo());
            $('#btn-redo').on('click', () => History.redo());
            
            // Fullscreen
            $('#btn-fullscreen').on('click', () => this.toggleFullscreen());

            // Drag & Drop tools
            $('.plc-tool').on('dragstart', function(e) {
                UI.draggedType = $(this).data('type');
                UI.dragSource = 'toolbox';
                e.originalEvent.dataTransfer.effectAllowed = 'copy';
            });

            // Config modal
            $('#config-save').on('click', () => this.saveElementConfig());
            $('#config-delete').on('click', () => this.deleteElement());

            // Program name
            $('#program-name').on('change', function() {
                PLC.program.name = $(this).val();
            });

            // Keyboard shortcuts
            $(document).on('keydown', function(e) {
                // Delete
                if (e.key === 'Delete' && UI.selectedElement) {
                    e.preventDefault();
                    UI.deleteSelectedElement();
                }
                // ESC per pulire selezione, chiudere context menu e uscire da fullscreen
                if (e.key === 'Escape') {
                    UI.clearSelection();
                    UI.hideContextMenu();
                    // Esci da fullscreen se attivo
                    if ($('#plc-simulator').hasClass('fullscreen')) {
                        UI.toggleFullscreen();
                    }
                }
                // F11 = Toggle Fullscreen
                if (e.key === 'F11') {
                    e.preventDefault();
                    UI.toggleFullscreen();
                }
                // Ctrl+Z = Undo
                if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
                    e.preventDefault();
                    History.undo();
                }
                // Ctrl+Y o Ctrl+Shift+Z = Redo
                if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
                    e.preventDefault();
                    History.redo();
                }
            });

            // Click sul canvas pulisce la selezione e nasconde context menu
            $('#ladder-canvas').on('click', function(e) {
                if ($(e.target).hasClass('plc-ladder-canvas') || $(e.target).hasClass('rung-content')) {
                    UI.clearSelection();
                }
                UI.hideContextMenu();
            });
            
            // Nascondi context menu su click globale
            $(document).on('click', function(e) {
                if (!$(e.target).closest('#context-menu').length) {
                    UI.hideContextMenu();
                }
            });
            
            // Chiudi modal al click sullo sfondo (non sul contenuto)
            $('.plc-modal').on('click', function(e) {
                if ($(e.target).hasClass('plc-modal')) {
                    $(this).removeClass('active');
                }
            });
            
            // Previeni propagazione click dal contenuto del modal
            $('.plc-modal-content').on('click', function(e) {
                e.stopPropagation();
            });
            
            // Event handlers per modal caricamento (event delegation)
            $('#programs-list').on('click', '.program-item', function(e) {
                e.stopPropagation();
                $('.program-item').removeClass('selected');
                $(this).addClass('selected');
                UI.selectedProgramId = $(this).data('id');
                $('#btn-load-confirm').prop('disabled', false);
                console.log('Selezionato programma ID:', UI.selectedProgramId);
            });
            
            $('#programs-list').on('dblclick', '.program-item', function(e) {
                e.stopPropagation();
                const id = $(this).data('id');
                console.log('Doppio click, carico programma ID:', id);
                UI.loadProgram(id);
            });
            
            $('#btn-load-confirm').on('click', function() {
                console.log('Click Carica, ID:', UI.selectedProgramId);
                if (UI.selectedProgramId) {
                    UI.loadProgram(UI.selectedProgramId);
                }
            });
        },
        
        // ==================== Panel Collapse & RUN/STOP Mode ====================
        setupPanels: function() {
            // Collapse/Expand pannelli con pulsante
            $('.panel-collapse-btn').on('click', function(e) {
                e.stopPropagation();
                const panel = $(this).data('panel');
                UI.togglePanel(panel);
            });
            
            // Click su header quando collapsed per espandere
            $('#panel-toolbox .panel-header').on('click', function() {
                if ($('#panel-toolbox').hasClass('collapsed')) {
                    UI.togglePanel('toolbox');
                }
            });
            
            $('#panel-io .panel-header').on('click', function() {
                if ($('#panel-io').hasClass('collapsed')) {
                    UI.togglePanel('io');
                }
            });
        },
        
        togglePanel: function(panel) {
            const $main = $('.plc-main');
            
            if (panel === 'toolbox') {
                $('#panel-toolbox').toggleClass('collapsed');
                $main.toggleClass('toolbox-collapsed');
                // Aggiorna icona
                const $btn = $('#panel-toolbox .panel-collapse-btn');
                $btn.html($('#panel-toolbox').hasClass('collapsed') ? '&gt;' : '&lt;');
            } else if (panel === 'io') {
                $('#panel-io').toggleClass('collapsed');
                $main.toggleClass('io-collapsed');
                // Aggiorna icona
                const $btn = $('#panel-io .panel-collapse-btn');
                $btn.html($('#panel-io').hasClass('collapsed') ? '&lt;' : '&gt;');
            }
        },
        
        setMode: function(mode) {
            const $container = $('#plc-simulator');
            $container.removeClass('mode-run mode-stop');
            $container.addClass('mode-' + mode);
            
            // In RUN, disabilita drag&drop sugli elementi
            if (mode === 'run') {
                $('.plc-tool').attr('draggable', 'false');
                $('.ladder-element').attr('draggable', 'false');
            } else {
                $('.plc-tool').attr('draggable', 'true');
                $('.ladder-element').attr('draggable', 'true');
            }
        },
        
        // Crea context menu
        createContextMenu: function() {
            const menuHtml = `
                <div id="context-menu" class="plc-context-menu">
                    <div class="context-menu-item" data-action="edit">
                        <span class="ctx-icon">+</span> Modifica
                    </div>
                    <div class="context-menu-item" data-action="change-type">
                        <span class="ctx-icon">></span> Cambia tipo
                        <span class="ctx-arrow">></span>
                        <div class="context-submenu" id="submenu-types"></div>
                    </div>
                    <div class="context-menu-divider"></div>
                    <div class="context-menu-item" data-action="add-series">
                        <span class="ctx-icon">^</span> Aggiungi in serie
                        <span class="ctx-arrow">></span>
                        <div class="context-submenu" id="submenu-series"></div>
                    </div>
                    <div class="context-menu-item" data-action="add-parallel">
                        <span class="ctx-icon"><></span> Aggiungi in parallelo
                        <span class="ctx-arrow">></span>
                        <div class="context-submenu" id="submenu-parallel"></div>
                    </div>
                    <div class="context-menu-divider"></div>
                    <div class="context-menu-item danger" data-action="delete">
                        <span class="ctx-icon">+</span> Elimina
                    </div>
                </div>
            `;
            $('body').append(menuHtml);
            
            // Eventi context menu
            $('#context-menu .context-menu-item[data-action="edit"]').on('click', () => {
                if (UI.contextMenuTarget) {
                    UI.openConfigModal(UI.contextMenuTarget.elemId, UI.contextMenuTarget.rungId);
                }
                UI.hideContextMenu();
            });
            
            $('#context-menu .context-menu-item[data-action="delete"]').on('click', () => {
                if (UI.contextMenuTarget) {
                    UI.selectedElement = UI.contextMenuTarget;
                    UI.deleteSelectedElement();
                }
                UI.hideContextMenu();
            });
        },
        
        // Mostra context menu
        showContextMenu: function(e, elemId, rungId, section) {
            e.preventDefault();
            e.stopPropagation();
            
            this.contextMenuTarget = { elemId, rungId, section };
            
            // Popola submenu per cambio tipo
            this.populateTypeSubmenu(section);
            // Popola submenu per aggiungi in serie/parallelo
            this.populateAddSubmenus(section);
            
            const $menu = $('#context-menu');
            $menu.css({
                left: e.pageX + 'px',
                top: e.pageY + 'px'
            }).addClass('visible');
        },
        
        // Nascondi context menu
        hideContextMenu: function() {
            $('#context-menu').removeClass('visible');
            this.contextMenuTarget = null;
        },
        
        // Popola submenu tipi
        populateTypeSubmenu: function(section) {
            const $submenu = $('#submenu-types');
            $submenu.empty();
            
            let types = [];
            if (section === 'inputs') {
                types = [
                    { type: 'contact-no', label: 'Contatto NA' },
                    { type: 'contact-nc', label: 'Contatto NC' },
                    { type: 'contact-p', label: 'Fronte salita (P)' },
                    { type: 'contact-n', label: 'Fronte discesa (N)' },
                    { type: 'timer-ton', label: 'Timer TON' },
                    { type: 'timer-tof', label: 'Timer TOF' },
                    { type: 'timer-tp', label: 'Timer TP' },
                    { type: 'counter-ctu', label: 'Counter CTU' },
                    { type: 'counter-ctd', label: 'Counter CTD' },
                    { type: 'counter-ctud', label: 'Counter CTUD' },
                    { type: 'cmp-eq', label: 'Comparatore ==' },
                    { type: 'cmp-ne', label: 'Comparatore <>' },
                    { type: 'cmp-gt', label: 'Comparatore >' },
                    { type: 'cmp-lt', label: 'Comparatore <' },
                    { type: 'cmp-ge', label: 'Comparatore >=' },
                    { type: 'cmp-le', label: 'Comparatore <=' }
                ];
            } else {
                types = [
                    { type: 'coil', label: 'Bobina' },
                    { type: 'coil-set', label: 'Set (S)' },
                    { type: 'coil-reset', label: 'Reset (R)' }
                ];
            }
            
            types.forEach(t => {
                $submenu.append(`<div class="context-submenu-item" data-newtype="${t.type}">${t.label}</div>`);
            });
            
            $submenu.find('.context-submenu-item').on('click', function() {
                const newType = $(this).data('newtype');
                UI.changeElementType(newType);
                UI.hideContextMenu();
            });
        },
        
        // Popola submenu aggiungi
        populateAddSubmenus: function(section) {
            const inputTypes = [
                { type: 'contact-no', label: 'Contatto NA' },
                { type: 'contact-nc', label: 'Contatto NC' },
                { type: 'contact-p', label: 'Fronte salita' },
                { type: 'contact-n', label: 'Fronte discesa' },
                { type: 'timer-ton', label: 'Timer TON' },
                { type: 'counter-ctu', label: 'Counter CTU' },
                { type: 'cmp-eq', label: 'Comparatore' }
            ];
            
            const outputTypes = [
                { type: 'coil', label: 'Bobina' },
                { type: 'coil-set', label: 'Set (S)' },
                { type: 'coil-reset', label: 'Reset (R)' }
            ];
            
            const types = section === 'inputs' ? inputTypes : outputTypes;
            
            // Nel ladder reale: uscite in serie NON permesse, solo in parallelo
            const $seriesItem = $('[data-action="add-series"]');
            const $parallelItem = $('[data-action="add-parallel"]');
            
            if (section === 'outputs') {
                // Nascondi "aggiungi in serie" per le uscite
                $seriesItem.hide();
                $parallelItem.show();
            } else {
                $seriesItem.show();
                $parallelItem.show();
            }
            
            ['#submenu-series', '#submenu-parallel'].forEach(sel => {
                const $sub = $(sel);
                $sub.empty();
                types.forEach(t => {
                    const action = sel.includes('series') ? 'series' : 'parallel';
                    $sub.append(`<div class="context-submenu-item" data-addtype="${t.type}" data-addaction="${action}">${t.label}</div>`);
                });
                
                $sub.find('.context-submenu-item').on('click', function() {
                    const type = $(this).data('addtype');
                    const action = $(this).data('addaction');
                    if (action === 'series') {
                        UI.addElementInSeries(type);
                    } else {
                        UI.addElementInParallel(type);
                    }
                    UI.hideContextMenu();
                });
            });
        },
        
        // Cambia tipo elemento
        changeElementType: function(newType) {
            if (!this.contextMenuTarget) return;
            
            History.save();
            
            const rung = PLC.program.rungs.find(r => r.id === this.contextMenuTarget.rungId);
            if (!rung) return;
            
            const section = this.contextMenuTarget.section;
            const elements = section === 'inputs' ? rung.inputs : rung.outputs;
            const found = this.findElementInArray(elements, this.contextMenuTarget.elemId);
            if (!found) return;
            
            const elem = found.element;
            const oldType = elem.type;
            elem.type = newType;
            
            // Aggiorna proprieta specifiche del tipo
            if (newType.startsWith('timer') && !oldType.startsWith('timer')) {
                elem.timerId = this.timerCounter++;
                elem.preset = elem.preset || 1000;
            }
            if (newType.startsWith('counter') && !oldType.startsWith('counter')) {
                elem.counterId = this.counterCounter++;
                elem.preset = elem.preset || 10;
            }
            if (newType === 'counter-ctud') {
                elem.cdAddr = elem.cdAddr || { type: 'I', byte: 0, bit: 1 };
            }
            if (newType.startsWith('cmp-') && !oldType.startsWith('cmp-')) {
                elem.operand1 = { type: 'const', value: 0 };
                elem.operand2 = { type: 'const', value: 0 };
            }
            if (newType.startsWith('coil') && !oldType.startsWith('coil')) {
                elem.address = elem.address || {};
                elem.address.type = 'Q';
            }
            
            this.rerenderRung(rung);
        },
        
        // Aggiungi elemento in serie (dopo l'elemento selezionato)
        addElementInSeries: function(type) {
            if (!this.contextMenuTarget) return;
            
            // Blocca aggiunta in serie nella sezione outputs (regola ladder)
            if (this.contextMenuTarget.section === 'outputs') {
                alert('⚠️ Nel ladder reale le uscite non possono essere in serie!\n\nUsa "Aggiungi in parallelo" per più uscite.');
                return;
            }
            
            History.save();
            
            const rung = PLC.program.rungs.find(r => r.id === this.contextMenuTarget.rungId);
            if (!rung) return;
            
            const section = this.contextMenuTarget.section;
            const elements = section === 'inputs' ? rung.inputs : rung.outputs;
            const found = this.findElementInArray(elements, this.contextMenuTarget.elemId);
            if (!found) return;
            
            const newElem = this.createElement(type);
            elements.splice(found.index + 1, 0, newElem);
            
            this.rerenderRung(rung);
        },
        
        // Aggiungi elemento in parallelo (crea branch)
        addElementInParallel: function(type) {
            if (!this.contextMenuTarget) return;
            
            History.save();
            
            const rung = PLC.program.rungs.find(r => r.id === this.contextMenuTarget.rungId);
            if (!rung) return;
            
            const section = this.contextMenuTarget.section;
            const elements = section === 'inputs' ? rung.inputs : rung.outputs;
            const found = this.findElementInArray(elements, this.contextMenuTarget.elemId);
            if (!found) return;
            
            const elem = found.element;
            const newElem = this.createElement(type);
            
            if (elem.type === 'branch') {
                // Aggiungi linea al branch esistente
                elem.lines.push([newElem]);
            } else {
                // Crea nuovo branch
                const branch = {
                    id: Date.now(),
                    type: 'branch',
                    lines: [[elem], [newElem]],
                    state: 0
                };
                elements[found.index] = branch;
            }
            
            this.rerenderRung(rung);
        },
        
        // Helper: trova elemento in array (anche in branch)
        findElementInArray: function(elements, elemId) {
            for (let i = 0; i < elements.length; i++) {
                if (elements[i].id === elemId) {
                    return { element: elements[i], index: i, inBranch: false };
                }
                if (elements[i].type === 'branch') {
                    for (let li = 0; li < elements[i].lines.length; li++) {
                        for (let ei = 0; ei < elements[i].lines[li].length; ei++) {
                            if (elements[i].lines[li][ei].id === elemId) {
                                return {
                                    element: elements[i].lines[li][ei],
                                    index: ei,
                                    inBranch: true,
                                    branch: elements[i],
                                    lineIdx: li
                                };
                            }
                        }
                    }
                }
            }
            return null;
        },
        
        // Helper: crea nuovo elemento
        createElement: function(type) {
            const element = {
                id: Date.now() + Math.random(),
                type: type,
                address: { type: type.startsWith('coil') ? 'Q' : 'I', byte: 0, bit: 0 },
                comment: '',
                state: 0
            };
            
            if (type.startsWith('timer')) {
                element.timerId = this.timerCounter++;
                element.preset = 1000;
            }
            if (type.startsWith('counter')) {
                element.counterId = this.counterCounter++;
                element.preset = 10;
                if (type === 'counter-ctud') {
                    element.cdAddr = { type: 'I', byte: 0, bit: 1 };
                }
            }
            if (type.startsWith('cmp-')) {
                element.operand1 = { type: 'const', value: 0 };
                element.operand2 = { type: 'const', value: 0 };
            }
            
            return element;
        },

        // Elimina elemento selezionato (chiamato da DELETE o dal modal)
        deleteSelectedElement: function() {
            if (!this.selectedElement) return;
            
            History.save();

            const rung = PLC.program.rungs.find(r => r.id === this.selectedElement.rungId);
            if (!rung) return;
            
            // Inizializza se necessario
            if (!rung.inputs) rung.inputs = [];
            if (!rung.outputs) rung.outputs = [];

            const section = this.selectedElement.section || 'inputs';
            const elements = section === 'outputs' ? rung.outputs : rung.inputs;
            
            const found = this.findElementInArray(elements, this.selectedElement.elemId);
            if (!found) return;

            if (found.inBranch) {
                found.branch.lines[found.lineIdx].splice(found.index, 1);
                
                if (found.branch.lines[found.lineIdx].length === 0) {
                    found.branch.lines.splice(found.lineIdx, 1);
                }
                
                if (found.branch.lines.length === 1) {
                    const branchIdx = elements.findIndex(e => e.id === found.branch.id);
                    if (branchIdx !== -1) {
                        const remainingElements = found.branch.lines[0];
                        elements.splice(branchIdx, 1, ...remainingElements);
                    }
                } else if (found.branch.lines.length === 0) {
                    const idx = elements.findIndex(e => e.id === found.branch.id);
                    if (idx !== -1) elements.splice(idx, 1);
                }
            } else {
                const idx = elements.findIndex(e => e.id === this.selectedElement.elemId);
                if (idx !== -1) elements.splice(idx, 1);
            }

            this.selectedElement = null;
            this.rerenderRung(rung);
        },

        // Crea griglia I/O
        createIOGrid: function() {
            // Ingressi
            const inputsGrid = $('#inputs-grid');
            for (let byte = 0; byte < 2; byte++) {
                for (let bit = 0; bit < 8; bit++) {
                    inputsGrid.append(`
                        <div class="io-bit input-bit" data-type="I" data-byte="${byte}" data-bit="${bit}">
                            <span class="io-bit-label">I${byte}.${bit}</span>
                            <span class="io-bit-state">0</span>
                        </div>
                    `);
                }
            }

            // Uscite
            const outputsGrid = $('#outputs-grid');
            for (let byte = 0; byte < 2; byte++) {
                for (let bit = 0; bit < 8; bit++) {
                    outputsGrid.append(`
                        <div class="io-bit output-bit" data-type="Q" data-byte="${byte}" data-bit="${bit}">
                            <span class="io-bit-label">Q${byte}.${bit}</span>
                            <span class="io-bit-state">0</span>
                        </div>
                    `);
                }
            }

            // Merker
            const merkersGrid = $('#merkers-grid');
            for (let byte = 0; byte < 2; byte++) {
                for (let bit = 0; bit < 8; bit++) {
                    merkersGrid.append(`
                        <div class="io-bit merker-bit" data-type="M" data-byte="${byte}" data-bit="${bit}">
                            <span class="io-bit-label">M${byte}.${bit}</span>
                            <span class="io-bit-state">0</span>
                        </div>
                    `);
                }
            }

            // Click su ingressi per toggle
            $('.input-bit').on('click', function() {
                const byte = $(this).data('byte');
                const bit = $(this).data('bit');
                PLC.toggleBit('I', byte, bit);
                UI.updateDisplay();
            });
            
            // Crea anche I/O analogici
            this.createAnalogIOGrid();
        },

        // ==================== Analog I/O Grid ====================
        
        createAnalogIOGrid: function() {
            const config = PLC.getAnalogConfig();
            
            // Ingressi Analogici (AIW)
            const aiGrid = $('#analog-inputs-grid');
            aiGrid.empty();
            
            if (config.aiAddresses.length === 0) {
                aiGrid.html('<div class="no-analog">Nessun AI configurato</div>');
            } else {
                config.aiAddresses.forEach(addr => {
                    aiGrid.append(`
                        <div class="analog-io-item ai" data-address="${addr}">
                            <div class="analog-io-header">
                                <span class="analog-io-label">IW${addr}</span>
                                <span>
                                    <span class="analog-io-value" id="ai-val-${addr}">0</span>
                                    <span class="analog-io-eng" id="ai-eng-${addr}">(0.0%)</span>
                                </span>
                            </div>
                            <div class="analog-slider-container">
                                <input type="range" class="analog-slider ai-slider" 
                                       data-address="${addr}" 
                                       min="0" max="27648" value="0">
                            </div>
                        </div>
                    `);
                });
                
                // Eventi slider AI
                $('.ai-slider').on('input', function() {
                    const addr = parseInt($(this).data('address'));
                    const value = parseInt($(this).val());
                    PLC.writeWord('IW', addr, value);
                    UI.updateAnalogDisplay();
                });
            }
            
            // Uscite Analogiche (AQW)
            const aqGrid = $('#analog-outputs-grid');
            aqGrid.empty();
            
            if (config.aqAddresses.length === 0) {
                aqGrid.html('<div class="no-analog">Nessun AQ configurato</div>');
            } else {
                config.aqAddresses.forEach(addr => {
                    aqGrid.append(`
                        <div class="analog-io-item aq" data-address="${addr}">
                            <div class="analog-io-header">
                                <span class="analog-io-label">QW${addr}</span>
                                <span>
                                    <span class="analog-io-value" id="aq-val-${addr}">0</span>
                                    <span class="analog-io-eng" id="aq-eng-${addr}">(0.0%)</span>
                                </span>
                            </div>
                            <div class="analog-bar">
                                <div class="analog-bar-fill" id="aq-bar-${addr}" style="width: 0%"></div>
                            </div>
                        </div>
                    `);
                });
            }
        },
        
        // Aggiorna display I/O analogici
        updateAnalogDisplay: function() {
            const config = PLC.getAnalogConfig();
            const range = PLC.hardware.analogRange;
            
            // Aggiorna AI
            config.aiAddresses.forEach(addr => {
                const value = PLC.readWord('IW', addr);
                const percent = ((value - range.min) / (range.max - range.min) * 100).toFixed(1);
                $(`#ai-val-${addr}`).text(value);
                $(`#ai-eng-${addr}`).text(`(${percent}%)`);
                $(`.ai-slider[data-address="${addr}"]`).val(value);
            });
            
            // Aggiorna AQ
            config.aqAddresses.forEach(addr => {
                const value = PLC.readWord('QW', addr);
                const percent = ((value - range.min) / (range.max - range.min) * 100).toFixed(1);
                $(`#aq-val-${addr}`).text(value);
                $(`#aq-eng-${addr}`).text(`(${percent}%)`);
                $(`#aq-bar-${addr}`).css('width', percent + '%');
            });
        },
        
        // ==================== Hardware Configuration ====================
        
        setupHardwareModal: function() {
            // Pulsante apertura modal
            $('#btn-hardware-config, #btn-hardware').on('click', () => {
                this.openHardwareModal();
            });
            
            // Selezione CPU
            $('#hw-cpu-select').on('change', () => {
                this.updateHardwarePreview();
            });
            
            // Aggiungi espansione
            $('#hw-add-expansion').on('click', () => {
                const expId = $('#hw-expansion-select').val();
                if (expId && !PLC.hardware.installedExpansions.includes(expId)) {
                    PLC.hardware.installedExpansions.push(expId);
                    this.updateHardwarePreview();
                    $('#hw-expansion-select').val('');
                }
            });
            
            // Applica configurazione
            $('#hw-apply').on('click', () => {
                this.applyHardwareConfig();
            });
        },
        
        openHardwareModal: function() {
            // Sincronizza UI con configurazione corrente
            $('#hw-cpu-select').val(PLC.hardware.currentCPU);
            this.updateHardwarePreview();
            $('#hardware-modal').addClass('active');
        },
        
        updateHardwarePreview: function() {
            const cpuId = $('#hw-cpu-select').val();
            const cpu = PLC.hardware.cpuModels[cpuId];
            
            // Info CPU
            $('#hw-cpu-info').html(`
                <div class="hardware-info-row"><span>Digital Inputs:</span><span>${cpu.di}</span></div>
                <div class="hardware-info-row"><span>Digital Outputs:</span><span>${cpu.dq}</span></div>
                <div class="hardware-info-row"><span>Analog Inputs:</span><span>${cpu.ai}</span></div>
                <div class="hardware-info-row"><span>Analog Outputs:</span><span>${cpu.aq}</span></div>
            `);
            
            // Lista espansioni
            const expList = $('#hw-expansions-list');
            expList.empty();
            
            if (PLC.hardware.installedExpansions.length === 0) {
                expList.html('<div class="no-expansions" style="color: var(--plc-text-dim); font-size: 12px; padding: 8px 0;">Nessuna espansione installata</div>');
            } else {
                PLC.hardware.installedExpansions.forEach((expId, idx) => {
                    const exp = PLC.hardware.expansions[expId];
                    if (exp) {
                        let specs = [];
                        if (exp.di > 0) specs.push(`${exp.di} DI`);
                        if (exp.dq > 0) specs.push(`${exp.dq} DQ`);
                        if (exp.ai > 0) specs.push(`${exp.ai} AI`);
                        if (exp.aq > 0) specs.push(`${exp.aq} AQ`);
                        
                        expList.append(`
                            <div class="expansion-item" data-idx="${idx}">
                                <div class="expansion-item-info">
                                    <div class="expansion-item-icon">${expId.includes('SB') ? 'SB' : 'SM'}</div>
                                    <div>
                                        <div class="expansion-item-name">${exp.name}</div>
                                        <div class="expansion-item-specs">${specs.join(' / ')}</div>
                                    </div>
                                </div>
                                <button class="expansion-remove" data-idx="${idx}" title="Rimuovi">×</button>
                            </div>
                        `);
                    }
                });
                
                // Eventi rimozione
                expList.find('.expansion-remove').on('click', function() {
                    const idx = parseInt($(this).data('idx'));
                    PLC.hardware.installedExpansions.splice(idx, 1);
                    UI.updateHardwarePreview();
                });
            }
            
            // Calcola totali (preview, non ancora applicata)
            let totalDI = cpu.di;
            let totalDQ = cpu.dq;
            let totalAI = cpu.ai;
            let totalAQ = cpu.aq;
            let aiAddrs = [];
            let aqAddrs = [];
            
            // AI CPU
            for (let i = 0; i < cpu.ai; i++) {
                aiAddrs.push(`IW${cpu.aiStart + (i * 2)}`);
            }
            // AQ CPU
            if (cpu.aq > 0) {
                for (let i = 0; i < cpu.aq; i++) {
                    aqAddrs.push(`QW${cpu.aqStart + (i * 2)}`);
                }
            }
            
            // Espansioni
            let expAIStart = 96;
            let expAQStart = 96;
            PLC.hardware.installedExpansions.forEach(expId => {
                const exp = PLC.hardware.expansions[expId];
                if (exp) {
                    totalDI += exp.di || 0;
                    totalDQ += exp.dq || 0;
                    
                    for (let i = 0; i < (exp.ai || 0); i++) {
                        aiAddrs.push(`IW${expAIStart + (i * 2)}`);
                    }
                    expAIStart += (exp.ai || 0) * 2;
                    totalAI += exp.ai || 0;
                    
                    for (let i = 0; i < (exp.aq || 0); i++) {
                        aqAddrs.push(`QW${expAQStart + (i * 2)}`);
                    }
                    expAQStart += (exp.aq || 0) * 2;
                    totalAQ += exp.aq || 0;
                }
            });
            
            // Aggiorna summary
            $('#hw-total-di').text(totalDI);
            $('#hw-total-dq').text(totalDQ);
            $('#hw-total-ai').text(totalAI);
            $('#hw-total-aq').text(totalAQ);
            
            // Mappa indirizzi
            let addrMap = '<div class="address-map-title">Mappa Indirizzi Analogici:</div>';
            if (aiAddrs.length > 0) {
                addrMap += '<div class="address-map-row"><span class="addr">AI:</span><span class="desc">' + aiAddrs.join(', ') + '</span></div>';
            }
            if (aqAddrs.length > 0) {
                addrMap += '<div class="address-map-row"><span class="addr">AQ:</span><span class="desc">' + aqAddrs.join(', ') + '</span></div>';
            }
            $('#hw-address-map').html(addrMap);
        },
        
        applyHardwareConfig: function() {
            // Applica CPU selezionata
            PLC.hardware.currentCPU = $('#hw-cpu-select').val();
            
            // Ricrea griglia I/O analogici
            this.createAnalogIOGrid();
            
            // Chiudi modal
            closeHardwareModal();
            
            // Notifica
            this.showToast('Configurazione hardware applicata');
        },
        
        showToast: function(message) {
            // Toast semplice
            const toast = $('<div class="plc-toast">' + message + '</div>');
            $('body').append(toast);
            setTimeout(() => toast.addClass('show'), 10);
            setTimeout(() => {
                toast.removeClass('show');
                setTimeout(() => toast.remove(), 300);
            }, 2000);
        },

        // Aggiungi rung
        addRung: function() {
            History.save();
            const rungId = ++this.rungCounter;
            const rung = {
                id: rungId,
                inputs: [],   // Elementi input (sinistra)
                outputs: [],  // Elementi output (destra)
                comment: '',
                power: 0
            };
            PLC.program.rungs.push(rung);
            this.renderRung(rung);
        },
        
        // Rebuild tutti i rung (per undo/redo)
        rebuildAllRungs: function() {
            $('#ladder-canvas').empty();
            this.rungCounter = 0;
            PLC.program.rungs.forEach(rung => {
                this.rungCounter = Math.max(this.rungCounter, rung.id);
                this.renderRung(rung);
                this.rerenderRung(rung);
            });
        },

        // Render rung con sezioni inputs/outputs separate
        renderRung: function(rung) {
            const html = `
                <div class="ladder-rung" data-rung-id="${rung.id}">
                    <div class="rung-header">
                        <span class="rung-number">Network ${rung.id}</span>
                        <input type="text" class="rung-comment" placeholder="Commento..." value="${rung.comment || ''}">
                        <div class="rung-actions">
                            <button class="rung-move-up" title="Sposta su">^</button>
                            <button class="rung-move-down" title="Sposta giu">v</button>
                            <button class="rung-delete" title="Elimina">x</button>
                        </div>
                    </div>
                    <div class="rung-content">
                        <div class="rung-rail-left"></div>
                        <div class="rung-section rung-inputs" data-section="inputs">
                            <div class="section-label">IN</div>
                            <div class="rung-elements">
                                <div class="drop-zone" data-rung-id="${rung.id}" data-section="inputs" data-position="0"></div>
                            </div>
                        </div>
                        <div class="rung-connector">-----</div>
                        <div class="rung-section rung-outputs" data-section="outputs">
                            <div class="section-label">OUT</div>
                            <div class="rung-elements">
                                <div class="drop-zone" data-rung-id="${rung.id}" data-section="outputs" data-position="0"></div>
                            </div>
                        </div>
                        <div class="rung-rail-right"></div>
                    </div>
                </div>
            `;
            $('#ladder-canvas').append(html);
            this.setupRungEvents(rung.id);
        },

        // Setup eventi rung
        setupRungEvents: function(rungId) {
            const $rung = $(`.ladder-rung[data-rung-id="${rungId}"]`);
            
            // Comment
            $rung.find('.rung-comment').on('change', function() {
                const rung = PLC.program.rungs.find(r => r.id === rungId);
                if (rung) rung.comment = $(this).val();
            });

            // Delete rung
            $rung.find('.rung-delete').on('click', () => {
                History.save();
                PLC.program.rungs = PLC.program.rungs.filter(r => r.id !== rungId);
                $rung.remove();
            });
            
            // Move up
            $rung.find('.rung-move-up').on('click', () => {
                const idx = PLC.program.rungs.findIndex(r => r.id === rungId);
                if (idx > 0) {
                    History.save();
                    [PLC.program.rungs[idx-1], PLC.program.rungs[idx]] = 
                    [PLC.program.rungs[idx], PLC.program.rungs[idx-1]];
                    this.rebuildAllRungs();
                }
            });
            
            // Move down
            $rung.find('.rung-move-down').on('click', () => {
                const idx = PLC.program.rungs.findIndex(r => r.id === rungId);
                if (idx < PLC.program.rungs.length - 1) {
                    History.save();
                    [PLC.program.rungs[idx], PLC.program.rungs[idx+1]] = 
                    [PLC.program.rungs[idx+1], PLC.program.rungs[idx]];
                    this.rebuildAllRungs();
                }
            });

            // Drop zone per sezioni
            $rung.find('.drop-zone').on('dragover', function(e) {
                e.preventDefault();
                $(this).addClass('drag-over');
            }).on('dragleave', function() {
                $(this).removeClass('drag-over');
            }).on('drop', function(e) {
                e.preventDefault();
                $(this).removeClass('drag-over');
                const position = parseInt($(this).data('position'));
                const section = $(this).data('section') || 'inputs';
                
                if (UI.dragSource === 'toolbox' && UI.draggedType) {
                    // Verifica che il tipo sia corretto per la sezione
                    const isOutput = UI.draggedType.startsWith('coil');
                    const targetSection = isOutput ? 'outputs' : 'inputs';
                    
                    // Se il tipo non corrisponde alla sezione, usa la sezione corretta
                    UI.addElement(rungId, position, UI.draggedType, targetSection);
                } else if (UI.dragSource === 'element' && UI.draggedElement) {
                    UI.moveElement(UI.draggedElement.rungId, UI.draggedElement.elemId, 
                                   UI.draggedElement.section, rungId, section, position);
                }
                
                UI.draggedType = null;
                UI.draggedElement = null;
                UI.dragSource = null;
            });
        },

        // Sposta elemento da una posizione a un'altra
        moveElement: function(fromRungId, elemId, fromSection, toRungId, toSection, toPosition) {
            History.save();
            
            const fromRung = PLC.program.rungs.find(r => r.id === fromRungId);
            const toRung = PLC.program.rungs.find(r => r.id === toRungId);
            if (!fromRung || !toRung) return;

            const fromElements = fromSection === 'outputs' ? fromRung.outputs : fromRung.inputs;
            const toElements = toSection === 'outputs' ? toRung.outputs : toRung.inputs;
            
            const found = this.findElementInArray(fromElements, elemId);
            if (!found || found.inBranch) return;

            const elem = found.element;
            const fromIdx = found.index;

            fromElements.splice(fromIdx, 1);

            let newPos = toPosition;
            if (fromRungId === toRungId && fromSection === toSection && fromIdx < toPosition) {
                newPos = Math.max(0, toPosition - 1);
            }

            toElements.splice(newPos, 0, elem);

            this.rerenderRung(fromRung);
            if (fromRungId !== toRungId) {
                this.rerenderRung(toRung);
            }
        },

        // Aggiungi elemento
        addElement: function(rungId, position, type, section) {
            History.save();
            
            const rung = PLC.program.rungs.find(r => r.id === rungId);
            if (!rung) return;
            
            // Inizializza arrays se non esistono (compatibilita)
            if (!rung.inputs) rung.inputs = [];
            if (!rung.outputs) rung.outputs = [];

            // Determina sezione automaticamente se non specificata
            const targetSection = section || (type.startsWith('coil') ? 'outputs' : 'inputs');
            
            // === REGOLA LADDER: nella sezione OUTPUTS non si possono mettere coil in serie ===
            if (targetSection === 'outputs' && rung.outputs.length > 0) {
                alert('⚠️ Nel ladder reale le uscite non possono essere in serie!\n\nUsa "Aggiungi in parallelo" (click destro sull\'uscita esistente) per aggiungere più uscite.');
                return;
            }

            const element = {
                id: Date.now(),
                type: type,
                address: { type: 'I', byte: 0, bit: 0 },
                comment: '',
                state: 0
            };

            // Preset per timer
            if (type.startsWith('timer')) {
                element.timerId = this.timerCounter++;
                element.preset = 1000;
            }
            
            // Preset per counter
            if (type.startsWith('counter')) {
                element.counterId = this.counterCounter++;
                element.preset = 10;
                if (type === 'counter-ctud') {
                    element.cdAddr = { type: 'I', byte: 0, bit: 1 };
                }
            }

            // Default per coil -> output
            if (type.startsWith('coil')) {
                element.address.type = 'Q';
            }
            
            // Comparatori
            if (type.startsWith('cmp-')) {
                element.operand1 = { type: 'const', value: 0 };
                element.operand2 = { type: 'const', value: 0 };
            }

            const elements = targetSection === 'outputs' ? rung.outputs : rung.inputs;
            
            elements.splice(position, 0, element);
            this.rerenderRung(rung);
        },

        // Re-render rung completo con sezioni inputs/outputs
        rerenderRung: function(rung) {
            const $rung = $(`.ladder-rung[data-rung-id="${rung.id}"]`);
            
            // Inizializza arrays se non esistono (compatibilita)
            if (!rung.inputs) rung.inputs = rung.elements || [];
            if (!rung.outputs) rung.outputs = [];
            
            // Render sezione inputs
            const $inputs = $rung.find('.rung-inputs .rung-elements');
            $inputs.empty();
            this.renderSectionElements($inputs, rung.inputs, rung.id, 'inputs');
            
            // Render sezione outputs
            const $outputs = $rung.find('.rung-outputs .rung-elements');
            $outputs.empty();
            this.renderSectionElements($outputs, rung.outputs, rung.id, 'outputs');

            // Setup eventi
            this.setupRungEvents(rung.id);
            this.setupElementEvents(rung.id);
            this.setupBranchEvents(rung.id);
            this.setupElementDrag(rung.id);
        },
        
        // Render elementi di una sezione
        renderSectionElements: function($container, elements, rungId, section) {
            elements.forEach((elem, idx) => {
                // Wire prima
                $container.append(`<div class="wire-segment" data-idx="${idx}"></div>`);
                
                // Elemento o Branch
                if (elem.type === 'branch') {
                    $container.append(this.renderBranch(elem, rungId, idx, section));
                } else {
                    $container.append(this.renderElement(elem, rungId, idx, section));
                }
            });

            // Drop zone finale (ma non per outputs se già presente un'uscita)
            $container.append(`<div class="wire-segment"></div>`);
            
            // Nella sezione outputs, se c'è già un elemento, non mostrare drop zone
            // (le uscite in serie non sono permesse nel ladder reale)
            if (section === 'outputs' && elements.length > 0) {
                // Niente drop zone - usa "aggiungi in parallelo" per più uscite
            } else {
                $container.append(`<div class="drop-zone" data-rung-id="${rungId}" data-section="${section}" data-position="${elements.length}"></div>`);
            }
        },

        // Render singolo elemento
        renderElement: function(elem, rungId, idx, section) {
            const addr = elem.address || {};
            const addrStr = `${addr.type || 'I'}${addr.byte || 0}.${addr.bit || 0}`;
            let symbolHtml = '';
            let displayAddr = addrStr;

            switch (elem.type) {
                case 'contact-no':
                    symbolHtml = '<div class="contact-symbol"></div>';
                    break;
                case 'contact-nc':
                    symbolHtml = '<div class="contact-symbol"></div>';
                    break;
                case 'contact-p':
                    symbolHtml = '<div class="contact-symbol edge-p">P</div>';
                    break;
                case 'contact-n':
                    symbolHtml = '<div class="contact-symbol edge-n">N</div>';
                    break;
                case 'coil':
                    symbolHtml = '<div class="coil-symbol"></div>';
                    break;
                case 'coil-set':
                    symbolHtml = '<div class="coil-symbol">S</div>';
                    break;
                case 'coil-reset':
                    symbolHtml = '<div class="coil-symbol">R</div>';
                    break;
                case 'timer-ton':
                    symbolHtml = `<div class="timer-box"><div class="box-type">TON</div><div>T${elem.timerId}</div><div>${elem.preset}ms</div></div>`;
                    break;
                case 'timer-tof':
                    symbolHtml = `<div class="timer-box"><div class="box-type">TOF</div><div>T${elem.timerId}</div><div>${elem.preset}ms</div></div>`;
                    break;
                case 'timer-tp':
                    symbolHtml = `<div class="timer-box"><div class="box-type">TP</div><div>T${elem.timerId}</div><div>${elem.preset}ms</div></div>`;
                    break;
                case 'counter-ctu':
                    symbolHtml = `<div class="counter-box"><div class="box-type">CTU</div><div>C${elem.counterId}</div><div>PV:${elem.preset}</div></div>`;
                    break;
                case 'counter-ctd':
                    symbolHtml = `<div class="counter-box"><div class="box-type">CTD</div><div>C${elem.counterId}</div><div>PV:${elem.preset}</div></div>`;
                    break;
                case 'counter-ctud':
                    symbolHtml = `<div class="counter-box ctud-box"><div class="box-type">CTUD</div><div>C${elem.counterId}</div><div>PV:${elem.preset}</div></div>`;
                    break;
                case 'cmp-eq':
                    symbolHtml = `<div class="compare-box"><div class="box-type">==</div></div>`;
                    displayAddr = this.formatOperands(elem);
                    break;
                case 'cmp-ne':
                    symbolHtml = `<div class="compare-box"><div class="box-type"><></div></div>`;
                    displayAddr = this.formatOperands(elem);
                    break;
                case 'cmp-gt':
                    symbolHtml = `<div class="compare-box"><div class="box-type">></div></div>`;
                    displayAddr = this.formatOperands(elem);
                    break;
                case 'cmp-lt':
                    symbolHtml = `<div class="compare-box"><div class="box-type"><</div></div>`;
                    displayAddr = this.formatOperands(elem);
                    break;
                case 'cmp-ge':
                    symbolHtml = `<div class="compare-box"><div class="box-type">>=</div></div>`;
                    displayAddr = this.formatOperands(elem);
                    break;
                case 'cmp-le':
                    symbolHtml = `<div class="compare-box"><div class="box-type"><=</div></div>`;
                    displayAddr = this.formatOperands(elem);
                    break;
            }

            return `
                <div class="ladder-element ${elem.type}" data-elem-id="${elem.id}" data-rung-id="${rungId}" data-idx="${idx}" data-section="${section || 'inputs'}">
                    <div class="element-symbol">${symbolHtml}</div>
                    <div class="element-address">${displayAddr}</div>
                    ${elem.comment ? `<div class="element-comment">${elem.comment}</div>` : ''}
                </div>
            `;
        },

        // Formatta operandi per comparatori
        formatOperands: function(elem) {
            const op1 = elem.operand1 || { type: 'const', value: 0 };
            const op2 = elem.operand2 || { type: 'const', value: 0 };
            const fmt = (op) => {
                if (op.type === 'const') return op.value;
                if (op.type === 'counter') return `C${op.value}.CV`;
                if (op.type === 'timer') return `T${op.value}.ET`;
                if (op.type === 'MW') return `MW${op.value}`;
                return op.value;
            };
            return `${fmt(op1)} ? ${fmt(op2)}`;
        },

        // Setup eventi elementi
        setupElementEvents: function(rungId) {
            const $rung = $(`.ladder-rung[data-rung-id="${rungId}"]`);
            
            // Click con supporto multi-selezione (Ctrl+click)
            $rung.find('.ladder-element').off('click').on('click', function(e) {
                if (e.ctrlKey || e.metaKey) {
                    UI.toggleSelectElement($(this).data('elem-id'), $(this).data('rung-id'));
                } else {
                    UI.selectElement($(this).data('elem-id'), $(this).data('rung-id'), $(this).data('section'));
                }
            });

            // Doppio click per modifica
            $rung.find('.ladder-element').off('dblclick').on('dblclick', function() {
                UI.openConfigModal($(this).data('elem-id'), $(this).data('rung-id'), $(this).data('section'));
            });
            
            // Click destro per context menu
            $rung.find('.ladder-element').off('contextmenu').on('contextmenu', function(e) {
                const elemId = $(this).data('elem-id');
                const rungId = $(this).data('rung-id');
                const section = $(this).data('section');
                UI.showContextMenu(e, elemId, rungId, section);
            });

            // Drop zone
            $rung.find('.drop-zone').on('dragover', function(e) {
                e.preventDefault();
                $(this).addClass('drag-over');
            }).on('dragleave', function() {
                $(this).removeClass('drag-over');
            }).on('drop', function(e) {
                e.preventDefault();
                $(this).removeClass('drag-over');
                if (UI.draggedType) {
                    const position = parseInt($(this).data('position'));
                    UI.addElement(rungId, position, UI.draggedType);
                    UI.draggedType = null;
                }
            });
        },

        // Seleziona elemento (singola selezione)
        selectElement: function(elemId, rungId, section) {
            this.selectedElements = []; // Reset multi-selezione
            $('.ladder-element').removeClass('selected multi-selected');
            $(`.ladder-element[data-elem-id="${elemId}"]`).addClass('selected');
            this.selectedElement = { elemId, rungId, section: section || 'inputs' };
        },

        // Toggle selezione elemento (per multi-selezione con Ctrl+click)
        toggleSelectElement: function(elemId, rungId, section) {
            const $elem = $(`.ladder-element[data-elem-id="${elemId}"]`);
            
            // Cerca se gia selezionato
            const idx = this.selectedElements.findIndex(e => e.elemId === elemId);
            
            if (idx !== -1) {
                // Deseleziona
                this.selectedElements.splice(idx, 1);
                $elem.removeClass('selected multi-selected');
            } else {
                // Aggiungi alla selezione
                this.selectedElements.push({ elemId, rungId, section: section || 'inputs' });
                $elem.addClass('multi-selected');
            }
            
            // Se c'e un solo elemento, imposta anche selectedElement
            if (this.selectedElements.length === 1) {
                this.selectedElement = this.selectedElements[0];
            } else {
                this.selectedElement = null;
            }
            
            // Aggiorna indicatore selezione multipla
            this.updateSelectionIndicator();
        },

        // Aggiorna indicatore selezione multipla
        updateSelectionIndicator: function() {
            if (this.selectedElements.length > 1) {
                $('#selection-indicator').text(`${this.selectedElements.length} elementi selezionati`).show();
            } else {
                $('#selection-indicator').hide();
            }
        },

        // Pulisci tutte le selezioni
        clearSelection: function() {
            this.selectedElement = null;
            this.selectedElements = [];
            $('.ladder-element').removeClass('selected multi-selected');
            $('#selection-indicator').hide();
        },

        // Apri modal config
        openConfigModal: function(elemId, rungId, section) {
            const rung = PLC.program.rungs.find(r => r.id === rungId);
            if (!rung) return;
            
            // Inizializza se necessario
            if (!rung.inputs) rung.inputs = [];
            if (!rung.outputs) rung.outputs = [];
            
            const sec = section || 'inputs';
            const elements = sec === 'outputs' ? rung.outputs : rung.inputs;
            const found = this.findElementInArray(elements, elemId);
            if (!found) return;
            
            const elem = found.element;

            this.selectedElement = { elemId, rungId, section: sec };

            // Reset visibilita
            $('#address-config').show();
            $('#timer-config').hide();
            $('#counter-config').hide();
            $('#ctud-config').hide();
            $('#compare-config').hide();

            // Popola form indirizzo (per elementi con indirizzo)
            if (!elem.type.startsWith('cmp-')) {
                $('#config-address-type').val(elem.address?.type || 'I');
                $('#config-address-byte').val(elem.address?.byte || 0);
                $('#config-address-bit').val(elem.address?.bit || 0);
            } else {
                // Comparatori: nascondi indirizzo, mostra operandi
                $('#address-config').hide();
                $('#compare-config').show();
                const op1 = elem.operand1 || { type: 'const', value: 0 };
                const op2 = elem.operand2 || { type: 'const', value: 0 };
                $('#config-cmp-op1-type').val(op1.type);
                $('#config-cmp-op1-value').val(op1.value);
                $('#config-cmp-op2-type').val(op2.type);
                $('#config-cmp-op2-value').val(op2.value);
            }
            
            $('#config-comment').val(elem.comment || '');

            // Timer config
            if (elem.type.startsWith('timer')) {
                $('#timer-config').show();
                $('#config-timer-preset').val(elem.preset || 1000);
            }

            // Counter config
            if (elem.type.startsWith('counter')) {
                $('#counter-config').show();
                $('#config-counter-preset').val(elem.preset || 10);
                
                // CTUD config extra
                if (elem.type === 'counter-ctud') {
                    $('#ctud-config').show();
                    const cd = elem.cdAddr || { type: 'I', byte: 0, bit: 1 };
                    $('#config-ctud-cd-type').val(cd.type);
                    $('#config-ctud-cd-byte').val(cd.byte);
                    $('#config-ctud-cd-bit').val(cd.bit);
                }
            }

            $('#config-modal').addClass('active');
        },

        // Salva config elemento
        saveElementConfig: function() {
            if (!this.selectedElement) return;
            
            History.save();

            const rung = PLC.program.rungs.find(r => r.id === this.selectedElement.rungId);
            if (!rung) return;
            
            const section = this.selectedElement.section || 'inputs';
            const elements = section === 'outputs' ? rung.outputs : rung.inputs;
            const found = this.findElementInArray(elements, this.selectedElement.elemId);
            if (!found) return;
            
            const elem = found.element;

            // Salva indirizzo (solo se non e comparatore)
            if (!elem.type.startsWith('cmp-')) {
                elem.address = {
                    type: $('#config-address-type').val(),
                    byte: parseInt($('#config-address-byte').val()) || 0,
                    bit: parseInt($('#config-address-bit').val()) || 0
                };
            }
            
            elem.comment = $('#config-comment').val();

            // Timer
            if (elem.type.startsWith('timer')) {
                elem.preset = parseInt($('#config-timer-preset').val()) || 1000;
            }
            
            // Counter
            if (elem.type.startsWith('counter')) {
                elem.preset = parseInt($('#config-counter-preset').val()) || 10;
                
                // CTUD: salva indirizzo CD
                if (elem.type === 'counter-ctud') {
                    elem.cdAddr = {
                        type: $('#config-ctud-cd-type').val(),
                        byte: parseInt($('#config-ctud-cd-byte').val()) || 0,
                        bit: parseInt($('#config-ctud-cd-bit').val()) || 0
                    };
                }
            }
            
            // Comparatori: salva operandi
            if (elem.type.startsWith('cmp-')) {
                elem.operand1 = {
                    type: $('#config-cmp-op1-type').val(),
                    value: parseInt($('#config-cmp-op1-value').val()) || 0
                };
                elem.operand2 = {
                    type: $('#config-cmp-op2-type').val(),
                    value: parseInt($('#config-cmp-op2-value').val()) || 0
                };
            }

            this.rerenderRung(rung);
            closeConfigModal();
        },

        // Elimina elemento
        deleteElement: function() {
            if (!this.selectedElement) return;

            const rung = PLC.program.rungs.find(r => r.id === this.selectedElement.rungId);
            if (!rung) return;

            const found = this.findElementInRung(rung, this.selectedElement.elemId);
            if (!found) return;

            const elements = found.section === 'outputs' ? rung.outputs : rung.inputs;

            if (found.inBranch) {
                // Rimuovi elemento dal branch
                found.branch.lines[found.lineIdx].splice(found.elemIdx, 1);
                
                // Se la linea e vuota, rimuovila
                if (found.branch.lines[found.lineIdx].length === 0) {
                    found.branch.lines.splice(found.lineIdx, 1);
                }
                
                // Se rimane solo una linea, converti branch in elementi normali
                if (found.branch.lines.length === 1) {
                    const branchIdx = elements.findIndex(e => e.id === found.branch.id);
                    const remainingElements = found.branch.lines[0];
                    elements.splice(branchIdx, 1, ...remainingElements);
                } else if (found.branch.lines.length === 0) {
                    // Rimuovi branch vuoto
                    const idx = elements.findIndex(e => e.id === found.branch.id);
                    if (idx !== -1) elements.splice(idx, 1);
                }
            } else {
                const idx = elements.findIndex(e => e.id === this.selectedElement.elemId);
                if (idx !== -1) elements.splice(idx, 1);
            }

            this.rerenderRung(rung);
            closeConfigModal();
        },

        // Toggle Fullscreen
        toggleFullscreen: function() {
            const container = document.getElementById('plc-simulator');
            if (!container) return;
            
            if (container.classList.contains('fullscreen')) {
                // Exit fullscreen
                container.classList.remove('fullscreen');
                document.body.style.overflow = '';
                
                // Try native fullscreen exit
                if (document.exitFullscreen) {
                    document.exitFullscreen().catch(() => {});
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                }
            } else {
                // Enter fullscreen
                container.classList.add('fullscreen');
                document.body.style.overflow = 'hidden';
                
                // Try native fullscreen
                if (container.requestFullscreen) {
                    container.requestFullscreen().catch(() => {});
                } else if (container.webkitRequestFullscreen) {
                    container.webkitRequestFullscreen();
                }
            }
        },

        // Avvia simulazione
        startSimulation: function() {
            PLC.running = true;
            $('#btn-run').addClass('active');
            $('#status-led').addClass('running');
            $('#status-text').text('RUN');
            this.setMode('run');
            
            // Se HMI ha elementi, mostrala in modalità RUN (senza toolbar design)
            if (HMI.elements && HMI.elements.length > 0) {
                $('#hmi-panel').addClass('active run-mode');
                $('#btn-hmi').addClass('active');
            }
            
            PLC.scanInterval = setInterval(() => {
                LadderEngine.execute();
            }, PLC.scanTime);
        },

        // Ferma simulazione
        stopSimulation: function() {
            PLC.running = false;
            $('#btn-run').removeClass('active');
            $('#status-led').removeClass('running');
            $('#status-text').text('STOP');
            this.setMode('stop');
            
            // Rimuovi modalità RUN da HMI
            $('#hmi-panel').removeClass('run-mode');
            
            if (PLC.scanInterval) {
                clearInterval(PLC.scanInterval);
                PLC.scanInterval = null;
            }
        },

        // Aggiorna display I/O
        updateDisplay: function() {
            // Ingressi
            $('.input-bit').each(function() {
                const byte = $(this).data('byte');
                const bit = $(this).data('bit');
                const val = PLC.readBit('I', byte, bit);
                $(this).toggleClass('active', val === 1);
                $(this).find('.io-bit-state').text(val);
            });

            // Uscite
            $('.output-bit').each(function() {
                const byte = $(this).data('byte');
                const bit = $(this).data('bit');
                const val = PLC.readBit('Q', byte, bit);
                $(this).toggleClass('active', val === 1);
                $(this).find('.io-bit-state').text(val);
            });

            // Merker
            $('.merker-bit').each(function() {
                const byte = $(this).data('byte');
                const bit = $(this).data('bit');
                const val = PLC.readBit('M', byte, bit);
                $(this).toggleClass('active', val === 1);
                $(this).find('.io-bit-state').text(val);
            });

            // Elementi ladder - nuova struttura inputs/outputs
            PLC.program.rungs.forEach(rung => {
                const $rung = $(`.ladder-rung[data-rung-id="${rung.id}"]`);
                const powerOn = rung.power === 1;
                
                $rung.find('.rung-rail-left, .rung-rail-right').toggleClass('active', powerOn);
                $rung.find('.rung-content').toggleClass('power-on', powerOn);
                $rung.find('.rung-inputs').toggleClass('active', powerOn);
                $rung.find('.rung-outputs').toggleClass('active', powerOn);
                
                // Update inputs section
                if (rung.inputs) {
                    this.updateElementsDisplay($rung.find('.rung-inputs'), rung.inputs);
                }
                
                // Update outputs section
                if (rung.outputs) {
                    this.updateElementsDisplay($rung.find('.rung-outputs'), rung.outputs);
                }
            });
            
            // Timers display
            this.updateTimersDisplay();
            
            // Counters display
            this.updateCountersDisplay();
            
            // Analog I/O display
            this.updateAnalogDisplay();
        },

        // Aggiorna display elementi (ricorsivo per branch annidati)
        updateElementsDisplay: function($container, elements) {
            if (!elements) return;
            
            elements.forEach((elem, idx) => {
                if (elem.type === 'branch') {
                    const $branch = $container.find(`.ladder-branch[data-elem-id="${elem.id}"]`).first();
                    $branch.find('.branch-connector-left, .branch-connector-right').first().toggleClass('active', elem.state === 1);
                    
                    elem.lines.forEach((line, lineIdx) => {
                        this.updateElementsDisplay($branch, line);
                    });
                } else {
                    const $elem = $container.find(`.ladder-element[data-elem-id="${elem.id}"]`).first();
                    $elem.toggleClass('active', elem.state === 1);
                }
            });
        },

        // Aggiorna display timers
        updateTimersDisplay: function() {
            const $container = $('#timers-display');
            $container.empty();
            
            Object.keys(PLC.timers).forEach(id => {
                const t = PLC.timers[id];
                const percent = (t.ET / t.PT) * 100;
                $container.append(`
                    <div class="timer-display ${t.Q ? 'active' : ''}">
                        <div class="timer-name">${id} (${t.PT}ms)</div>
                        <div class="timer-value">${t.ET}ms</div>
                        <div class="timer-bar">
                            <div class="timer-bar-fill" style="width: ${percent}%"></div>
                        </div>
                    </div>
                `);
            });
        },

        // Aggiorna display counters
        updateCountersDisplay: function() {
            const $container = $('#counters-display');
            $container.empty();
            
            Object.keys(PLC.counters).forEach(id => {
                const c = PLC.counters[id];
                $container.append(`
                    <div class="counter-display ${c.Q ? 'active' : ''}">
                        <div class="counter-name">${id} (PV: ${c.PV})</div>
                        <div class="counter-value">${c.CV}</div>
                    </div>
                `);
            });
        },

        // Nuovo programma
        newProgram: function(skipConfirm) {
            if (!skipConfirm && !confirm('Creare un nuovo programma? I dati non salvati andranno persi.')) return;
            
            this.stopSimulation();
            PLC.reset();
            PLC.program = { name: 'Main [OB1]', rungs: [] };
            this.rungCounter = 0;
            this.timerCounter = 0;
            this.counterCounter = 0;
            History.clear();
            $('#ladder-canvas').empty();
            $('#program-name').val('Main [OB1]');
            this.addRung();
            this.updateDisplay();
        },

        // Salva programma
        saveProgram: function() {
            const name = prompt('Nome del programma:', PLC.program.name);
            if (!name) return;

            PLC.program.name = name;
            $('#program-name').val(name);
            
            // Prepara configurazione hardware
            const hardwareConfig = {
                currentCPU: PLC.hardware.currentCPU,
                installedExpansions: PLC.hardware.installedExpansions
            };
            
            // Prepara oggetto completo per export
            const exportData = {
                version: '1.6.9',
                name: name,
                savedAt: new Date().toISOString(),
                program: PLC.program,
                hardware_config: hardwareConfig,
                hmi_config: JSON.parse(HMI.exportConfig())
            };
            
            // Download file JSON
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = name.replace(/[^a-z0-9]/gi, '_') + '.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            // Salva anche nel database
            $.ajax({
                url: plcAjax.ajaxurl,
                method: 'POST',
                data: {
                    action: 'plc_save_program',
                    nonce: plcAjax.nonce,
                    session_id: Session.id,
                    name: name,
                    program: JSON.stringify(PLC.program),
                    hardware_config: JSON.stringify(hardwareConfig),
                    hmi_config: HMI.exportConfig()
                },
                success: function(response) {
                    if (response.success) {
                        console.log('Programma salvato anche nel database');
                    }
                }
            });
        },

        // Mostra modal caricamento
        showLoadModal: function() {
            // Crea input file temporaneo per caricare JSON
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const data = JSON.parse(event.target.result);
                        this.importFromFile(data);
                    } catch (err) {
                        alert('Errore nel parsing del file: ' + err.message);
                    }
                };
                reader.readAsText(file);
            };
            
            input.click();
        },
        
        // Importa programma da file JSON
        importFromFile: function(data) {
            // Supporta sia nuovo formato che vecchio
            let program, hardwareConfig, hmiConfig, name;
            
            if (data.program) {
                // Nuovo formato con tutto incluso
                program = data.program;
                hardwareConfig = data.hardware_config;
                hmiConfig = data.hmi_config;
                name = data.name || 'Importato';
            } else if (data.rungs) {
                // Vecchio formato (solo programma)
                program = data;
                name = data.name || 'Importato';
            } else {
                alert('Formato file non riconosciuto');
                return;
            }
            
            // Ferma simulazione
            this.stopSimulation();
            
            // Carica programma
            PLC.program = program;
            PLC.program.name = name;
            $('#program-name').val(name);
            
            // Carica hardware config se presente
            if (hardwareConfig) {
                if (hardwareConfig.currentCPU) {
                    PLC.hardware.currentCPU = hardwareConfig.currentCPU;
                }
                if (hardwareConfig.installedExpansions) {
                    PLC.hardware.installedExpansions = hardwareConfig.installedExpansions;
                }
                PLC.hardware.updateIOLimits();
            }
            
            // Carica HMI config se presente
            if (hmiConfig) {
                HMI.importConfig(JSON.stringify(hmiConfig));
            }
            
            // Reset memoria PLC
            PLC.resetMemory();
            
            // Render programma
            LadderEditor.render();
            this.updateDisplay();
            
            alert('Programma "' + name + '" caricato con successo!');
        },

        // Carica programma
        loadProgram: function(id) {
            console.log('Caricamento programma ID:', id);
            
            $.ajax({
                url: plcAjax.ajaxurl,
                method: 'POST',
                data: {
                    action: 'plc_load_program',
                    nonce: plcAjax.nonce,
                    session_id: Session.id,
                    id: id
                },
                success: function(response) {
                    console.log('Risposta server:', response);
                    
                    if (response.success) {
                        try {
                            UI.stopSimulation();
                            PLC.reset();
                            History.clear();
                            
                            // Il programma potrebbe essere gia un oggetto o una stringa JSON
                            let data = response.data.program;
                            console.log('Tipo dati:', typeof data);
                            console.log('Dati raw:', data);
                            
                            if (typeof data === 'string') {
                                // Prova a pulire il JSON se corrotto
                                data = data.trim();
                                // Rimuovi eventuali escape extra
                                if (data.startsWith('\\"') || data.indexOf('\\"') !== -1) {
                                    data = data.replace(/\\"/g, '"');
                                }
                                console.log('Dati puliti:', data);
                                data = JSON.parse(data);
                            }
                            
                            console.log('Dati programma parsed:', data);
                            
                            // Verifica struttura minima
                            if (!data || typeof data !== 'object') {
                                throw new Error('Struttura programma non valida');
                            }
                            
                            // Assicura che rungs esista
                            if (!data.rungs) {
                                data.rungs = [];
                            }
                            
                            // Compatibilita: converti vecchia struttura elements in inputs/outputs
                            data.rungs.forEach(rung => {
                                if (rung.elements && !rung.inputs) {
                                    rung.inputs = [];
                                    rung.outputs = [];
                                    rung.elements.forEach(elem => {
                                        if (elem.type && elem.type.startsWith('coil')) {
                                            rung.outputs.push(elem);
                                        } else {
                                            rung.inputs.push(elem);
                                        }
                                    });
                                    delete rung.elements;
                                }
                                if (!rung.inputs) rung.inputs = [];
                                if (!rung.outputs) rung.outputs = [];
                            });
                            
                            PLC.program = data;
                            
                            // Carica Hardware config se presente
                            if (response.data.hardware_config) {
                                try {
                                    let hwConfig = response.data.hardware_config;
                                    if (typeof hwConfig === 'string') {
                                        hwConfig = JSON.parse(hwConfig);
                                    }
                                    if (hwConfig.currentCPU) {
                                        PLC.hardware.currentCPU = hwConfig.currentCPU;
                                    }
                                    if (hwConfig.installedExpansions) {
                                        PLC.hardware.installedExpansions = hwConfig.installedExpansions;
                                    }
                                    // Ricrea griglia I/O analogici
                                    UI.createAnalogIOGrid();
                                    console.log('Hardware config caricata:', hwConfig);
                                } catch (e) {
                                    console.warn('Errore caricamento Hardware config:', e);
                                }
                            }
                            
                            // Carica HMI config se presente
                            if (response.data.hmi_config) {
                                try {
                                    HMI.importConfig(response.data.hmi_config);
                                } catch (e) {
                                    console.warn('Errore caricamento HMI config:', e);
                                }
                            }
                            
                            // Ricostruisci UI
                            $('#ladder-canvas').empty();
                            $('#program-name').val(data.name || 'Main [OB1]');
                            UI.rungCounter = 0;
                            UI.timerCounter = 0;
                            UI.counterCounter = 0;
                            
                            if (data.rungs && data.rungs.length > 0) {
                                data.rungs.forEach(rung => {
                                    UI.rungCounter = Math.max(UI.rungCounter, rung.id || 0);
                                    UI.renderRungFromData(rung);
                                });
                            } else {
                                UI.addRung();
                            }
                            
                            closeModal();
                            UI.updateDisplay();
                            console.log('Programma caricato con successo');
                            
                        } catch (err) {
                            console.error('Errore parsing programma:', err);
                            console.error('Dati ricevuti:', response.data.program);
                            alert('Errore nel caricamento del programma: ' + err.message + '\n\nIl programma salvato potrebbe essere corrotto. Prova a salvare un nuovo programma.');
                        }
                    } else {
                        console.error('Errore risposta:', response);
                        alert('Errore dal server: ' + (response.data || 'sconosciuto'));
                    }
                },
                error: function(xhr, status, error) {
                    console.error('Errore AJAX:', status, error);
                    alert('Errore di connessione: ' + error);
                }
            });
        },

        // Render rung da dati salvati
        renderRungFromData: function(rung) {
            // Assicura compatibilita
            if (!rung.inputs) rung.inputs = [];
            if (!rung.outputs) rung.outputs = [];
            this.renderRung(rung);
            this.rerenderRung(rung);
        },

        // Aggiungi branch (parallelo)
        addBranch: function() {
            // Multi-selezione: raggruppa piu elementi in una diramazione
            if (this.selectedElements.length > 1) {
                this.createBranchFromMultiSelection();
                return;
            }

            // Singola selezione
            if (!this.selectedElement) {
                alert('Seleziona uno o piu elementi (Ctrl+click per multi-selezione) per creare una diramazione.');
                return;
            }

            const rung = PLC.program.rungs.find(r => r.id === this.selectedElement.rungId);
            if (!rung) return;

            const section = this.selectedElement.section || 'inputs';
            const elements = section === 'outputs' ? rung.outputs : rung.inputs;
            
            const elemIdx = elements.findIndex(e => e.id === this.selectedElement.elemId);
            if (elemIdx === -1) return;

            const elem = elements[elemIdx];

            // Se l'elemento e gia un branch, aggiungi una linea VUOTA
            if (elem.type === 'branch') {
                elem.lines.push([]); // Linea vuota
            } else {
                // Crea un nuovo branch: elemento originale + linea VUOTA
                const branch = {
                    id: Date.now(),
                    type: 'branch',
                    lines: [
                        [elem], // Linea 1: elemento originale
                        []      // Linea 2: VUOTA
                    ],
                    state: 0
                };
                elements[elemIdx] = branch;
            }

            this.clearSelection();
            this.rerenderRung(rung);
        },

        // Crea branch da multi-selezione
        createBranchFromMultiSelection: function() {
            // Verifica che tutti gli elementi siano nello stesso rung e sezione
            const rungIds = [...new Set(this.selectedElements.map(e => e.rungId))];
            const sections = [...new Set(this.selectedElements.map(e => e.section || 'inputs'))];
            
            if (rungIds.length > 1) {
                alert('Gli elementi devono essere nello stesso Network per creare una diramazione.');
                return;
            }
            if (sections.length > 1) {
                alert('Gli elementi devono essere nella stessa sezione (inputs o outputs).');
                return;
            }

            const rungId = rungIds[0];
            const section = sections[0];
            const rung = PLC.program.rungs.find(r => r.id === rungId);
            if (!rung) return;

            const elements = section === 'outputs' ? rung.outputs : rung.inputs;

            // Trova gli indici degli elementi selezionati
            const selectedIds = this.selectedElements.map(e => e.elemId);
            const indices = [];
            
            for (let i = 0; i < elements.length; i++) {
                if (selectedIds.includes(elements[i].id)) {
                    indices.push(i);
                }
            }

            if (indices.length < 2) {
                alert('Seleziona almeno 2 elementi contigui per creare una diramazione.');
                return;
            }

            // Ordina gli indici
            indices.sort((a, b) => a - b);

            // Verifica che siano contigui
            for (let i = 1; i < indices.length; i++) {
                if (indices[i] !== indices[i-1] + 1) {
                    alert('Gli elementi devono essere contigui per creare una diramazione.');
                    return;
                }
            }

            // Estrai gli elementi selezionati
            const selectedElems = indices.map(i => elements[i]);

            // Crea il branch con ogni elemento su una linea separata + una linea vuota
            const branch = {
                id: Date.now(),
                type: 'branch',
                lines: selectedElems.map(elem => [elem]),
                state: 0
            };
            
            // Aggiungi linea vuota
            branch.lines.push([]);

            // Sostituisci gli elementi con il branch
            elements.splice(indices[0], indices.length, branch);

            this.clearSelection();
            this.rerenderRung(rung);
        },

        // Render branch parallelo - Stile TIA Portal
        renderBranch: function(branch, rungId, parentIdx, section, depth = 0) {
            const maxDepth = 3;
            if (depth > maxDepth) return '<span class="error">[Max depth]</span>';
            
            const numLines = branch.lines.length;
            
            let html = `<div class="ladder-branch tia-style" data-elem-id="${branch.id}" data-rung-id="${rungId}" data-depth="${depth}">`;
            
            // Struttura TIA Portal: linea verticale sinistra, rami, linea verticale destra
            html += '<div class="branch-vertical-left"></div>';
            html += '<div class="branch-content">';
            
            branch.lines.forEach((line, lineIdx) => {
                const isFirst = lineIdx === 0;
                const isLast = lineIdx === numLines - 1;
                
                html += `<div class="branch-row ${isFirst ? 'first' : ''} ${isLast ? 'last' : ''}" data-line-idx="${lineIdx}">`;
                
                // Connettore orizzontale sinistro (dal verticale al ramo)
                html += '<div class="branch-h-left"></div>';
                
                // Contenuto del ramo
                html += '<div class="branch-row-content">';
                
                if (line.length === 0) {
                    // Ramo vuoto - solo wire passante e drop zone piccola
                    html += `<div class="wire-through"></div>`;
                    html += `<div class="drop-zone-mini" data-rung-id="${rungId}" data-branch-id="${branch.id}" data-line-idx="${lineIdx}" data-position="0" data-section="${section || 'inputs'}">+</div>`;
                } else {
                    line.forEach((elem, elemIdx) => {
                        if (elem.type === 'branch') {
                            html += this.renderBranch(elem, rungId, `${parentIdx}-${lineIdx}-${elemIdx}`, section, depth + 1);
                        } else {
                            html += this.renderElement(elem, rungId, `${parentIdx}-${lineIdx}-${elemIdx}`, section);
                        }
                        // Wire tra elementi
                        if (elemIdx < line.length - 1) {
                            html += '<div class="wire-h"></div>';
                        }
                    });
                }
                
                html += '</div>'; // branch-row-content
                
                // Connettore orizzontale destro
                html += '<div class="branch-h-right"></div>';
                
                html += '</div>'; // branch-row
            });
            
            html += '</div>'; // branch-content
            html += '<div class="branch-vertical-right"></div>';
            
            // Controlli branch (hover)
            html += `<div class="branch-controls-tia">`;
            html += `<button class="branch-btn-add" data-branch-id="${branch.id}" data-rung-id="${rungId}" title="Aggiungi ramo">+</button>`;
            html += `<button class="branch-btn-del" data-branch-id="${branch.id}" data-rung-id="${rungId}" title="Elimina">x</button>`;
            html += `</div>`;
            
            html += '</div>'; // ladder-branch
            
            return html;
        },

        // Setup eventi per branch
        setupBranchEvents: function(rungId) {
            const $rung = $(`.ladder-rung[data-rung-id="${rungId}"]`);
            
            // Click su elementi dentro branch
            $rung.find('.ladder-branch .ladder-element').off('click.branch').on('click.branch', function(e) {
                e.stopPropagation();
                if (e.ctrlKey || e.metaKey) {
                    UI.toggleSelectElement($(this).data('elem-id'), $(this).data('rung-id'));
                } else {
                    UI.selectBranchElement($(this).data('elem-id'), $(this).data('rung-id'), $(this).closest('.ladder-branch').data('elem-id'));
                }
            });

            $rung.find('.ladder-branch .ladder-element').off('dblclick.branch').on('dblclick.branch', function(e) {
                e.stopPropagation();
                UI.openConfigModal($(this).data('elem-id'), $(this).data('rung-id'));
            });

            // Aggiungi linea al branch - nuovo selettore TIA
            $rung.find('.branch-btn-add').off('click').on('click', function(e) {
                e.stopPropagation();
                const branchId = parseInt($(this).data('branch-id'));
                const rungId = $(this).data('rung-id');
                UI.addLineToBranch(rungId, branchId);
            });

            // Elimina branch - nuovo selettore TIA
            $rung.find('.branch-btn-del').off('click').on('click', function(e) {
                e.stopPropagation();
                if (confirm('Eliminare questa diramazione?')) {
                    const branchId = parseInt($(this).data('branch-id'));
                    const rungId = $(this).data('rung-id');
                    UI.deleteBranch(rungId, branchId);
                }
            });

            // Drop zone mini dentro branch
            $rung.find('.drop-zone-mini').off('dragover dragleave drop').on('dragover', function(e) {
                e.preventDefault();
                e.stopPropagation();
                $(this).addClass('drag-over');
            }).on('dragleave', function(e) {
                e.stopPropagation();
                $(this).removeClass('drag-over');
            }).on('drop', function(e) {
                e.preventDefault();
                e.stopPropagation();
                $(this).removeClass('drag-over');
                
                const branchId = parseInt($(this).data('branch-id'));
                const lineIdx = parseInt($(this).data('line-idx'));
                const position = parseInt($(this).data('position'));
                const section = $(this).data('section') || 'inputs';
                
                if (UI.dragSource === 'toolbox' && UI.draggedType) {
                    UI.addElementToBranchLine(rungId, branchId, lineIdx, position, UI.draggedType, section);
                }
                
                UI.draggedType = null;
                UI.draggedElement = null;
                UI.dragSource = null;
            });
        },

        // Aggiungi elemento in serie dentro una specifica linea del branch
        addElementToBranchLine: function(rungId, branchId, lineIdx, position, type) {
            const rung = PLC.program.rungs.find(r => r.id === rungId);
            if (!rung) return;

            const branch = this.findBranchInRung(rung, branchId);
            if (!branch || !branch.lines[lineIdx]) return;

            const element = {
                id: Date.now(),
                type: type,
                address: { type: type.startsWith('coil') ? 'Q' : 'I', byte: 0, bit: 0 },
                comment: '',
                state: 0
            };

            if (type.startsWith('timer')) {
                element.timerId = this.timerCounter++;
                element.preset = 1000;
            }
            
            if (type.startsWith('counter')) {
                element.counterId = this.counterCounter++;
                element.preset = 10;
                if (type === 'counter-ctud') {
                    element.cdAddr = { type: 'I', byte: 0, bit: 1 };
                }
            }
            
            if (type.startsWith('cmp-')) {
                element.operand1 = { type: 'const', value: 0 };
                element.operand2 = { type: 'const', value: 0 };
            }

            branch.lines[lineIdx].splice(position, 0, element);
            this.rerenderRung(rung);
        },

        // Cerca branch per ID (anche annidato)
        findBranchById: function(elements, branchId) {
            for (let elem of elements) {
                if (elem.type === 'branch' && elem.id === branchId) {
                    return elem;
                }
                if (elem.type === 'branch') {
                    for (let line of elem.lines) {
                        const found = this.findBranchById(line, branchId);
                        if (found) return found;
                    }
                }
            }
            return null;
        },

        // Crea sub-branch (diramazione annidata) da un elemento esistente - con linea VUOTA
        createSubBranch: function(rungId, branchId, lineIdx, elemIdx) {
            const rung = PLC.program.rungs.find(r => r.id === rungId);
            if (!rung) return;

            const branch = this.findBranchInRung(rung, branchId);
            if (!branch || !branch.lines[lineIdx]) return;

            const line = branch.lines[lineIdx];
            if (elemIdx >= line.length) return;

            const elem = line[elemIdx];
            
            // Se e gia un branch, aggiungi una linea VUOTA
            if (elem.type === 'branch') {
                elem.lines.push([]); // Linea vuota
            } else {
                // Crea nuovo sub-branch: elemento + linea VUOTA
                const subBranch = {
                    id: Date.now(),
                    type: 'branch',
                    lines: [
                        [elem], // Linea 1: elemento originale
                        []      // Linea 2: VUOTA
                    ],
                    state: 0
                };
                line[elemIdx] = subBranch;
            }

            this.rerenderRung(rung);
        },

        // Seleziona elemento in branch (con supporto multi-selezione)
        selectBranchElement: function(elemId, rungId, branchId) {
            this.selectedElements = []; // Reset multi
            $('.ladder-element').removeClass('selected multi-selected');
            $(`.ladder-element[data-elem-id="${elemId}"]`).addClass('selected');
            this.selectedElement = { elemId, rungId, branchId };
        },

        // Aggiungi linea a branch esistente (supporta branch annidati) - VUOTA
        addLineToBranch: function(rungId, branchId) {
            const rung = PLC.program.rungs.find(r => r.id === rungId);
            if (!rung) return;

            const branch = this.findBranchInRung(rung, branchId);
            if (!branch) return;

            // Aggiungi linea VUOTA
            branch.lines.push([]);

            this.rerenderRung(rung);
        },

        // Elimina un branch intero
        deleteBranch: function(rungId, branchId) {
            const rung = PLC.program.rungs.find(r => r.id === rungId);
            if (!rung) return;

            // Cerca il branch in inputs
            let result = this.findBranchAndParent(rung.inputs || [], branchId, null, -1);
            let elements = rung.inputs;
            
            // Se non trovato, cerca in outputs
            if (!result) {
                result = this.findBranchAndParent(rung.outputs || [], branchId, null, -1);
                elements = rung.outputs;
            }
            
            if (!result) return;

            const { branch, parent, parentLineIdx, indexInParent } = result;

            // Raccogli tutti gli elementi della prima linea del branch (per sostituirlo)
            const firstLineElements = branch.lines[0] || [];

            if (parent === null) {
                // Branch e al livello root
                const branchIdx = elements.findIndex(e => e.id === branchId);
                if (branchIdx !== -1) {
                    // Sostituisci il branch con gli elementi della prima linea
                    elements.splice(branchIdx, 1, ...firstLineElements);
                }
            } else {
                // Branch e annidato in un altro branch
                parent.lines[parentLineIdx].splice(indexInParent, 1, ...firstLineElements);
            }

            this.rerenderRung(rung);
        },

        // Trova branch e il suo parent
        findBranchAndParent: function(elements, branchId, parent, parentLineIdx) {
            for (let i = 0; i < elements.length; i++) {
                const elem = elements[i];
                if (elem.type === 'branch' && elem.id === branchId) {
                    return { branch: elem, parent, parentLineIdx, indexInParent: i };
                }
                if (elem.type === 'branch') {
                    for (let li = 0; li < elem.lines.length; li++) {
                        const found = this.findBranchAndParent(elem.lines[li], branchId, elem, li);
                        if (found) return found;
                    }
                }
            }
            return null;
        },

        // Aggiungi elemento a branch
        addElementToBranch: function(rungId, branchId, lineIdx, position, type) {
            const rung = PLC.program.rungs.find(r => r.id === rungId);
            if (!rung) return;

            const branch = this.findBranchInRung(rung, branchId);
            if (!branch || !branch.lines[lineIdx]) return;

            const element = {
                id: Date.now(),
                type: type,
                address: { type: type.startsWith('coil') ? 'Q' : 'I', byte: 0, bit: 0 },
                comment: '',
                state: 0
            };

            if (type.startsWith('timer')) {
                element.timerId = this.timerCounter++;
                element.preset = 1000;
            } else if (type.startsWith('counter')) {
                element.counterId = this.counterCounter++;
                element.preset = 10;
            }

            branch.lines[lineIdx].splice(position, 0, element);
            this.rerenderRung(rung);
        },

        // Trova branch in rung (usa versione ricorsiva)
        findBranchInRung: function(rung, branchId) {
            // Cerca in inputs
            let found = this.findBranchById(rung.inputs || [], branchId);
            if (found) return found;
            // Cerca in outputs
            return this.findBranchById(rung.outputs || [], branchId);
        },

        // Trova elemento (anche in branch annidati) per delete/config
        findElementInRung: function(rung, elemId) {
            // Cerca in inputs
            let found = this.findElementRecursive(rung.inputs || [], elemId, null);
            if (found) {
                found.section = 'inputs';
                return found;
            }
            // Cerca in outputs
            found = this.findElementRecursive(rung.outputs || [], elemId, null);
            if (found) {
                found.section = 'outputs';
            }
            return found;
        },

        // Ricerca ricorsiva negli elementi
        findElementRecursive: function(elements, elemId, parentBranch) {
            for (let i = 0; i < elements.length; i++) {
                const elem = elements[i];
                if (elem.id === elemId) {
                    return { 
                        element: elem, 
                        index: i, 
                        inBranch: parentBranch !== null,
                        branch: parentBranch,
                        elements: elements
                    };
                }
                if (elem.type === 'branch') {
                    for (let li = 0; li < elem.lines.length; li++) {
                        const found = this.findElementRecursive(elem.lines[li], elemId, elem);
                        if (found) {
                            found.lineIdx = li;
                            found.elemIdx = elem.lines[li].indexOf(found.element);
                            return found;
                        }
                    }
                }
            }
            return null;
        },

        // ==================== DRAG & DROP ELEMENTI ====================
        
        setupElementDrag: function(rungId) {
            const $rung = $(`.ladder-rung[data-rung-id="${rungId}"]`);
            
            // Rispetta stato RUN/STOP
            const isRunning = $('#plc-simulator').hasClass('mode-run');
            $rung.find('.ladder-element').attr('draggable', !isRunning);
            
            if (isRunning) return; // Non setup eventi se in RUN
            
            $rung.find('.ladder-element').off('dragstart.elem').on('dragstart.elem', function(e) {
                UI.draggedType = null;
                UI.dragSource = 'element';
                UI.draggedElement = {
                    elemId: $(this).data('elem-id'),
                    rungId: $(this).data('rung-id')
                };
                $(this).addClass('dragging');
                e.originalEvent.dataTransfer.effectAllowed = 'move';
            });
            
            $rung.find('.ladder-element').off('dragend.elem').on('dragend.elem', function() {
                $(this).removeClass('dragging');
                UI.draggedElement = null;
                UI.dragSource = null;
            });
        },

        // ==================== EXPORT PROGRAMMA ====================
        
        exportProgram: function() {
            const format = prompt(
                'Formato export:\n' +
                '1 = JSON (nativo)\n' +
                '2 = AWL/STL (TIA Portal - Statement List)\n' +
                '3 = SCL (TIA Portal - Structured Text)\n' +
                '4 = XML SimaticML (TIA Portal - External Source)\n' +
                '\nInserisci 1, 2, 3 o 4:', '2');
            
            switch(format) {
                case '1': this.exportJSON(); break;
                case '2': this.exportAWL(); break;
                case '3': this.exportSCL(); break;
                case '4': this.exportXML(); break;
            }
        },

        exportJSON: function() {
            const data = JSON.stringify(PLC.program, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = (PLC.program.name || 'ladder_program') + '.json';
            a.click();
            URL.revokeObjectURL(url);
        },

        // ==================== EXPORT AWL/STL (Statement List) ====================
        exportAWL: function() {
            let awl = '';
            const progName = (PLC.program.name || 'Main').replace(/[^a-zA-Z0-9_]/g, '_');
            
            // Header
            awl += `// ============================================================\n`;
            awl += `// Programma: ${PLC.program.name || 'Main'}\n`;
            awl += `// Esportato da: Unofficial S7/1200 Simulator\n`;
            awl += `// Data: ${new Date().toLocaleString('it-IT')}\n`;
            awl += `// ============================================================\n\n`;
            
            awl += `ORGANIZATION_BLOCK "${progName}" : OB1\n`;
            awl += `TITLE = ${PLC.program.name || 'Main Program'}\n`;
            awl += `VERSION : 0.1\n\n`;
            awl += `BEGIN\n\n`;
            
            // Networks
            PLC.program.rungs.forEach((rung, idx) => {
                awl += this.rungToAWL(rung, idx);
            });
            
            awl += `END_ORGANIZATION_BLOCK\n`;
            
            // Download
            const blob = new Blob([awl], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = progName + '.awl';
            a.click();
            URL.revokeObjectURL(url);
        },

        rungToAWL: function(rung, idx) {
            let awl = `NETWORK\n`;
            awl += `TITLE = Network ${rung.id}${rung.comment ? ': ' + rung.comment : ''}\n`;
            if (rung.comment) {
                awl += `// ${rung.comment}\n`;
            }
            awl += `\n`;
            
            const inputs = rung.inputs || [];
            const outputs = rung.outputs || [];
            
            if (inputs.length === 0 && outputs.length === 0) {
                awl += `      // Network vuoto\n\n`;
                return awl;
            }
            
            // Genera AWL per inputs (condizioni)
            awl += this.elementsToAWL(inputs, true);
            
            // Genera AWL per outputs (azioni)
            outputs.forEach(elem => {
                awl += this.elementToAWL(elem, false);
            });
            
            awl += `\n`;
            return awl;
        },

        elementsToAWL: function(elements, isFirst) {
            let awl = '';
            let firstInSeries = isFirst;
            
            elements.forEach((elem, idx) => {
                if (elem.type === 'branch') {
                    awl += this.branchToAWL(elem, firstInSeries);
                    firstInSeries = false;
                } else {
                    awl += this.elementToAWL(elem, firstInSeries);
                    firstInSeries = false;
                }
            });
            
            return awl;
        },

        branchToAWL: function(branch, isFirst) {
            let awl = '';
            const lines = branch.lines || [];
            
            if (lines.length === 0) return awl;
            
            // Prima linea del branch
            if (lines[0] && lines[0].length > 0) {
                awl += this.elementsToAWL(lines[0], isFirst);
            }
            
            // Linee successive (OR)
            for (let i = 1; i < lines.length; i++) {
                if (lines[i] && lines[i].length > 0) {
                    // Apri parentesi OR
                    awl += `      O(\n`;
                    lines[i].forEach((elem, idx) => {
                        awl += this.elementToAWL(elem, idx === 0);
                    });
                    awl += `      )\n`;
                }
            }
            
            return awl;
        },

        elementToAWL: function(elem, isFirst) {
            const addr = elem.address || {};
            const type = addr.type || 'M';
            const byte = addr.byte || 0;
            const bit = addr.bit || 0;
            const addrStr = `${type}${byte}.${bit}`;
            const comment = elem.comment ? `  // ${elem.comment}` : '';
            
            let instruction = '';
            
            switch (elem.type) {
                case 'contact-no':
                    instruction = isFirst ? `A` : `A`;
                    return `      ${instruction}     ${addrStr}${comment}\n`;
                    
                case 'contact-nc':
                    instruction = isFirst ? `AN` : `AN`;
                    return `      ${instruction}    ${addrStr}${comment}\n`;
                    
                case 'contact-p':
                    return `      A     ${addrStr}\n      FP    M${100 + byte}.${bit}${comment}\n`;
                    
                case 'contact-n':
                    return `      A     ${addrStr}\n      FN    M${100 + byte}.${bit}${comment}\n`;
                    
                case 'coil':
                    return `      =     ${addrStr}${comment}\n`;
                    
                case 'coil-set':
                    return `      S     ${addrStr}${comment}\n`;
                    
                case 'coil-reset':
                    return `      R     ${addrStr}${comment}\n`;
                    
                case 'timer-ton':
                    const tonId = elem.timerId || 0;
                    const tonPT = elem.preset || 1000;
                    return `      CALL  "TON_TIME"\n` +
                           `            DB${10 + tonId}\n` +
                           `       IN  :=\n` +
                           `       PT  :=T#${tonPT}ms\n` +
                           `       Q   :=\n` +
                           `       ET  :=\n`;
                    
                case 'timer-tof':
                    const tofId = elem.timerId || 0;
                    const tofPT = elem.preset || 1000;
                    return `      CALL  "TOF_TIME"\n` +
                           `            DB${10 + tofId}\n` +
                           `       IN  :=\n` +
                           `       PT  :=T#${tofPT}ms\n` +
                           `       Q   :=\n` +
                           `       ET  :=\n`;
                    
                case 'timer-tp':
                    const tpId = elem.timerId || 0;
                    const tpPT = elem.preset || 1000;
                    return `      CALL  "TP_TIME"\n` +
                           `            DB${10 + tpId}\n` +
                           `       IN  :=\n` +
                           `       PT  :=T#${tpPT}ms\n` +
                           `       Q   :=\n` +
                           `       ET  :=\n`;
                    
                case 'counter-ctu':
                    const ctuId = elem.counterId || 0;
                    const ctuPV = elem.preset || 10;
                    return `      CALL  "CTU"\n` +
                           `            DB${50 + ctuId}\n` +
                           `       CU  :=\n` +
                           `       R   :=FALSE\n` +
                           `       PV  :=${ctuPV}\n` +
                           `       Q   :=\n` +
                           `       CV  :=\n`;
                    
                case 'counter-ctd':
                    const ctdId = elem.counterId || 0;
                    const ctdPV = elem.preset || 10;
                    return `      CALL  "CTD"\n` +
                           `            DB${50 + ctdId}\n` +
                           `       CD  :=\n` +
                           `       LD  :=FALSE\n` +
                           `       PV  :=${ctdPV}\n` +
                           `       Q   :=\n` +
                           `       CV  :=\n`;
                    
                case 'counter-ctud':
                    const ctudId = elem.counterId || 0;
                    const ctudPV = elem.preset || 10;
                    return `      CALL  "CTUD"\n` +
                           `            DB${50 + ctudId}\n` +
                           `       CU  :=\n` +
                           `       CD  :=\n` +
                           `       R   :=FALSE\n` +
                           `       LD  :=FALSE\n` +
                           `       PV  :=${ctudPV}\n` +
                           `       QU  :=\n` +
                           `       QD  :=\n` +
                           `       CV  :=\n`;
                    
                case 'cmp-eq':
                case 'cmp-ne':
                case 'cmp-gt':
                case 'cmp-lt':
                case 'cmp-ge':
                case 'cmp-le':
                    return this.compareToAWL(elem);
                    
                default:
                    return `      // Elemento non supportato: ${elem.type}\n`;
            }
        },

        compareToAWL: function(elem) {
            const op1 = this.operandToAWL(elem.operand1);
            const op2 = this.operandToAWL(elem.operand2);
            
            const cmpMap = {
                'cmp-eq': '==I',
                'cmp-ne': '<>I',
                'cmp-gt': '>I',
                'cmp-lt': '<I',
                'cmp-ge': '>=I',
                'cmp-le': '<=I'
            };
            
            const cmpInstr = cmpMap[elem.type] || '==I';
            return `      L     ${op1}\n      L     ${op2}\n      ${cmpInstr}\n`;
        },

        operandToAWL: function(op) {
            if (!op) return '0';
            switch (op.type) {
                case 'const': return op.value || 0;
                case 'counter': return `DB${50 + (op.value || 0)}.CV`;
                case 'timer': return `DB${10 + (op.value || 0)}.ET`;
                case 'MW': return `MW${op.value || 0}`;
                default: return op.value || 0;
            }
        },

        // ==================== EXPORT SCL (Structured Control Language) ====================
        exportSCL: function() {
            let scl = '';
            const progName = (PLC.program.name || 'Main').replace(/[^a-zA-Z0-9_]/g, '_');
            
            // Header
            scl += `// ============================================================\n`;
            scl += `// Programma: ${PLC.program.name || 'Main'}\n`;
            scl += `// Esportato da: Unofficial S7/1200 Simulator\n`;
            scl += `// Data: ${new Date().toLocaleString('it-IT')}\n`;
            scl += `// ============================================================\n\n`;
            
            scl += `ORGANIZATION_BLOCK "${progName}"\n`;
            scl += `TITLE = '${PLC.program.name || 'Main Program'}'\n`;
            scl += `VERSION : 0.1\n\n`;
            
            // Variabili temporanee per timer/counter
            scl += `VAR_TEMP\n`;
            scl += `    tempBool : Bool;\n`;
            scl += `END_VAR\n\n`;
            
            scl += `BEGIN\n\n`;
            
            // Networks
            PLC.program.rungs.forEach((rung, idx) => {
                scl += this.rungToSCL(rung, idx);
            });
            
            scl += `END_ORGANIZATION_BLOCK\n`;
            
            // Download
            const blob = new Blob([scl], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = progName + '.scl';
            a.click();
            URL.revokeObjectURL(url);
        },

        rungToSCL: function(rung, idx) {
            let scl = `    // ========== Network ${rung.id}${rung.comment ? ': ' + rung.comment : ''} ==========\n`;
            
            const inputs = rung.inputs || [];
            const outputs = rung.outputs || [];
            
            if (inputs.length === 0 && outputs.length === 0) {
                scl += `    // Network vuoto\n\n`;
                return scl;
            }
            
            // Genera condizione
            const condition = this.inputsToSCL(inputs);
            
            // Genera azioni per ogni output
            outputs.forEach(elem => {
                scl += this.outputToSCL(elem, condition);
            });
            
            scl += `\n`;
            return scl;
        },

        inputsToSCL: function(elements) {
            if (elements.length === 0) return 'TRUE';
            
            const parts = [];
            
            elements.forEach(elem => {
                if (elem.type === 'branch') {
                    parts.push(this.branchToSCL(elem));
                } else {
                    parts.push(this.inputElementToSCL(elem));
                }
            });
            
            return parts.join(' AND ');
        },

        branchToSCL: function(branch) {
            const lines = branch.lines || [];
            if (lines.length === 0) return 'TRUE';
            
            const orParts = [];
            lines.forEach(line => {
                if (line.length > 0) {
                    const andParts = line.map(elem => this.inputElementToSCL(elem));
                    orParts.push(`(${andParts.join(' AND ')})`);
                }
            });
            
            return `(${orParts.join(' OR ')})`;
        },

        inputElementToSCL: function(elem) {
            const addr = elem.address || {};
            const type = addr.type || 'M';
            const byte = addr.byte || 0;
            const bit = addr.bit || 0;
            const addrStr = `"${type}${byte}.${bit}"`;
            
            switch (elem.type) {
                case 'contact-no':
                    return addrStr;
                case 'contact-nc':
                    return `NOT ${addrStr}`;
                case 'contact-p':
                    return `(${addrStr} AND NOT "M_Edge_${type}${byte}_${bit}")`; // Semplificato
                case 'contact-n':
                    return `(NOT ${addrStr} AND "M_Edge_${type}${byte}_${bit}")`;
                case 'timer-ton':
                case 'timer-tof':
                case 'timer-tp':
                    return `"T${elem.timerId || 0}".Q`;
                case 'counter-ctu':
                case 'counter-ctd':
                case 'counter-ctud':
                    return `"C${elem.counterId || 0}".Q`;
                case 'cmp-eq':
                    return `(${this.operandToSCL(elem.operand1)} = ${this.operandToSCL(elem.operand2)})`;
                case 'cmp-ne':
                    return `(${this.operandToSCL(elem.operand1)} <> ${this.operandToSCL(elem.operand2)})`;
                case 'cmp-gt':
                    return `(${this.operandToSCL(elem.operand1)} > ${this.operandToSCL(elem.operand2)})`;
                case 'cmp-lt':
                    return `(${this.operandToSCL(elem.operand1)} < ${this.operandToSCL(elem.operand2)})`;
                case 'cmp-ge':
                    return `(${this.operandToSCL(elem.operand1)} >= ${this.operandToSCL(elem.operand2)})`;
                case 'cmp-le':
                    return `(${this.operandToSCL(elem.operand1)} <= ${this.operandToSCL(elem.operand2)})`;
                default:
                    return 'TRUE';
            }
        },

        operandToSCL: function(op) {
            if (!op) return '0';
            switch (op.type) {
                case 'const': return op.value || 0;
                case 'counter': return `"C${op.value || 0}".CV`;
                case 'timer': return `"T${op.value || 0}".ET`;
                case 'MW': return `"MW${op.value || 0}"`;
                default: return op.value || 0;
            }
        },

        outputToSCL: function(elem, condition) {
            const addr = elem.address || {};
            const type = addr.type || 'Q';
            const byte = addr.byte || 0;
            const bit = addr.bit || 0;
            const addrStr = `"${type}${byte}.${bit}"`;
            const comment = elem.comment ? ` // ${elem.comment}` : '';
            
            switch (elem.type) {
                case 'coil':
                    return `    ${addrStr} := ${condition};${comment}\n`;
                case 'coil-set':
                    return `    IF ${condition} THEN\n        ${addrStr} := TRUE;${comment}\n    END_IF;\n`;
                case 'coil-reset':
                    return `    IF ${condition} THEN\n        ${addrStr} := FALSE;${comment}\n    END_IF;\n`;
                case 'timer-ton':
                    const tonId = elem.timerId || 0;
                    const tonPT = elem.preset || 1000;
                    return `    "T${tonId}"(IN := ${condition}, PT := T#${tonPT}ms);${comment}\n`;
                case 'timer-tof':
                    const tofId = elem.timerId || 0;
                    const tofPT = elem.preset || 1000;
                    return `    "T${tofId}"(IN := ${condition}, PT := T#${tofPT}ms);${comment}\n`;
                case 'timer-tp':
                    const tpId = elem.timerId || 0;
                    const tpPT = elem.preset || 1000;
                    return `    "T${tpId}"(IN := ${condition}, PT := T#${tpPT}ms);${comment}\n`;
                case 'counter-ctu':
                    const ctuId = elem.counterId || 0;
                    const ctuPV = elem.preset || 10;
                    return `    "C${ctuId}"(CU := ${condition}, R := FALSE, PV := ${ctuPV});${comment}\n`;
                case 'counter-ctd':
                    const ctdId = elem.counterId || 0;
                    const ctdPV = elem.preset || 10;
                    return `    "C${ctdId}"(CD := ${condition}, LD := FALSE, PV := ${ctdPV});${comment}\n`;
                case 'counter-ctud':
                    const ctudId = elem.counterId || 0;
                    const ctudPV = elem.preset || 10;
                    return `    "C${ctudId}"(CU := ${condition}, CD := FALSE, R := FALSE, LD := FALSE, PV := ${ctudPV});${comment}\n`;
                default:
                    return `    // Output non supportato: ${elem.type}\n`;
            }
        },

        exportXML: function() {
            let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
            xml += '<Document>\n';
            xml += '  <Engineering version="V17" />\n';
            xml += '  <SW.Blocks.OB ID="0">\n';
            xml += `    <AttributeList>\n`;
            xml += `      <Name>${this.escapeXml(PLC.program.name)}</Name>\n`;
            xml += `      <ProgrammingLanguage>LAD</ProgrammingLanguage>\n`;
            xml += `    </AttributeList>\n`;
            xml += '    <ObjectList>\n';
            
            PLC.program.rungs.forEach((rung, idx) => {
                xml += this.rungToXML(rung, idx);
            });
            
            xml += '    </ObjectList>\n';
            xml += '  </SW.Blocks.OB>\n';
            xml += '</Document>\n';
            
            const blob = new Blob([xml], { type: 'application/xml' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = (PLC.program.name || 'ladder_program') + '.xml';
            a.click();
            URL.revokeObjectURL(url);
        },

        rungToXML: function(rung, idx) {
            let xml = `      <SW.Blocks.CompileUnit ID="${idx + 1}">\n`;
            xml += `        <AttributeList>\n`;
            xml += `          <NetworkSource>LAD</NetworkSource>\n`;
            xml += `        </AttributeList>\n`;
            xml += `        <ObjectList>\n`;
            xml += `          <Title><MultilingualText><Text>${this.escapeXml(rung.comment || 'Network ' + rung.id)}</Text></MultilingualText></Title>\n`;
            xml += `          <FlgNet>\n`;
            xml += `            <Parts>\n`;
            
            // Combina inputs e outputs per export XML
            const allElements = [...(rung.inputs || []), ...(rung.outputs || [])];
            allElements.forEach((elem, elemIdx) => {
                xml += this.elementToXML(elem, elemIdx);
            });
            
            xml += `            </Parts>\n`;
            xml += `          </FlgNet>\n`;
            xml += `        </ObjectList>\n`;
            xml += `      </SW.Blocks.CompileUnit>\n`;
            return xml;
        },

        elementToXML: function(elem, idx) {
            if (elem.type === 'branch') {
                let xml = `              <Or ID="${idx}">\n`;
                elem.lines.forEach((line, lineIdx) => {
                    xml += `                <Branch ID="${lineIdx}">\n`;
                    line.forEach((e, i) => {
                        xml += this.singleElementToXML(e, i);
                    });
                    xml += `                </Branch>\n`;
                });
                xml += `              </Or>\n`;
                return xml;
            }
            return this.singleElementToXML(elem, idx);
        },

        singleElementToXML: function(elem, idx) {
            const addr = elem.address || {};
            const addrStr = `%${addr.type || 'I'}${addr.byte || 0}.${addr.bit || 0}`;
            const typeMap = {
                'contact-no': 'Contact',
                'contact-nc': 'Contact',
                'coil': 'Coil',
                'coil-set': 'SCoil',
                'coil-reset': 'RCoil',
                'timer-ton': 'TON',
                'timer-tof': 'TOF',
                'counter-ctu': 'CTU'
            };
            const xmlType = typeMap[elem.type] || 'Contact';
            
            let xml = `              <Part Name="${xmlType}" ID="${idx}">\n`;
            xml += `                <Instance>${addrStr}</Instance>\n`;
            if (elem.type === 'contact-nc') {
                xml += `                <Negated>true</Negated>\n`;
            }
            if (elem.comment) {
                xml += `                <Comment>${this.escapeXml(elem.comment)}</Comment>\n`;
            }
            if (elem.preset) {
                xml += `                <Preset>${elem.preset}</Preset>\n`;
            }
            xml += `              </Part>\n`;
            return xml;
        },

        escapeXml: function(str) {
            return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        },

        // ==================== IMPORT PROGRAMMA ====================
        
        importProgram: function(e) {
            const file = e.target.files[0];
            if (!file) return;
            
            const fileName = file.name.toLowerCase();
            console.log('Import file:', fileName);
            
            // File ZAP (TIA Portal archive) - qualsiasi versione
            if (fileName.indexOf('.zap') !== -1) {
                console.log('Rilevato file ZAP, avvio import...');
                this.importZAP(file);
                e.target.value = '';
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (event) => {
                const content = event.target.result;
                
                if (fileName.endsWith('.json')) {
                    this.importJSON(content);
                } else if (fileName.endsWith('.xml')) {
                    this.importXML(content);
                } else {
                    alert('Formato non supportato. Usa .json, .xml o .zap');
                }
            };
            reader.readAsText(file);
            e.target.value = '';
        },

        // Import file ZAP (TIA Portal)
        importZAP: async function(file) {
            try {
                // Verifica che JSZip sia disponibile
                if (typeof JSZip === 'undefined') {
                    throw new Error('Libreria JSZip non caricata. Ricarica la pagina.');
                }
                
                console.log('Importazione file ZAP:', file.name);
                
                // Leggi il file come ArrayBuffer
                const arrayBuffer = await file.arrayBuffer();
                
                // Estrai lo ZIP
                const zip = await JSZip.loadAsync(arrayBuffer);
                
                console.log('Contenuto ZIP:', Object.keys(zip.files));
                
                // Cerca file XML con logica ladder
                const xmlFiles = [];
                const filePromises = [];
                
                const fileNames = Object.keys(zip.files);
                console.log('Numero file nello ZIP:', fileNames.length);
                
                for (const relativePath of fileNames) {
                    const zipEntry = zip.files[relativePath];
                    
                    if (relativePath.endsWith('.xml') && !zipEntry.dir) {
                        const isProgramBlock = relativePath.toLowerCase().includes('programblock') ||
                                               relativePath.toLowerCase().includes('blocks') ||
                                               relativePath.toLowerCase().includes('ob') ||
                                               relativePath.toLowerCase().includes('fc') ||
                                               relativePath.toLowerCase().includes('fb');
                        
                        console.log('Trovato XML:', relativePath, isProgramBlock ? '(PRIORITY)' : '');
                        
                        filePromises.push(
                            zipEntry.async('text').then(content => {
                                xmlFiles.push({
                                    path: relativePath,
                                    content: content,
                                    isPriority: isProgramBlock
                                });
                            })
                        );
                    }
                }
                
                await Promise.all(filePromises);
                
                if (xmlFiles.length === 0) {
                    throw new Error('Nessun file XML trovato nel progetto TIA Portal');
                }
                
                console.log('File XML trovati:', xmlFiles.length);
                
                // Ordina per priorita (ProgramBlocks prima)
                xmlFiles.sort((a, b) => (b.isPriority ? 1 : 0) - (a.isPriority ? 1 : 0));
                
                // Parse dei file XML
                this.stopSimulation();
                PLC.reset();
                History.clear();
                
                // Estrai nome progetto dal nome file
                const projectName = file.name.replace(/\.zap\d+$/i, '');
                
                PLC.program = {
                    name: projectName,
                    rungs: []
                };
                
                let totalNetworks = 0;
                
                // Processa ogni file XML
                for (const xmlFile of xmlFiles) {
                    try {
                        const networks = this.parseSimaticML(xmlFile.content);
                        if (networks && networks.length > 0) {
                            console.log(`File ${xmlFile.path}: ${networks.length} network trovati`);
                            networks.forEach(rung => {
                                rung.id = ++totalNetworks;
                                PLC.program.rungs.push(rung);
                            });
                        }
                    } catch (err) {
                        console.warn(`Errore parsing ${xmlFile.path}:`, err.message);
                    }
                }
                
                // Se non ci sono rung, crea uno vuoto
                if (PLC.program.rungs.length === 0) {
                    console.warn('Nessun network ladder trovato nei file XML');
                    PLC.program.rungs.push({
                        id: 1,
                        inputs: [],
                        outputs: [],
                        comment: '',
                        power: 0
                    });
                }
                
                // Ricostruisci UI
                $('#ladder-canvas').empty();
                $('#program-name').val(PLC.program.name);
                this.rungCounter = 0;
                this.timerCounter = 0;
                this.counterCounter = 0;
                
                PLC.program.rungs.forEach(rung => {
                    this.rungCounter = Math.max(this.rungCounter, rung.id);
                    this.renderRungFromData(rung);
                });
                
                this.updateDisplay();
                alert(`Progetto TIA Portal importato!\nNome: ${projectName}\nNetwork: ${PLC.program.rungs.length}`);
                
            } catch (err) {
                console.error('Errore importazione ZAP:', err);
                alert('Errore importazione file TIA Portal: ' + err.message);
            }
        },

        // Parse SimaticML (formato XML TIA Portal)
        parseSimaticML: function(xmlContent) {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
            
            // Verifica errori parsing
            if (xmlDoc.querySelector('parsererror')) {
                throw new Error('XML non valido');
            }
            
            const networks = [];
            
            // Cerca CompileUnit (network/segmenti)
            // TIA Portal usa vari namespace, cerco senza namespace
            const compileUnits = xmlDoc.querySelectorAll('CompileUnit, SW\\.Blocks\\.CompileUnit');
            
            if (compileUnits.length === 0) {
                // Prova a cercare FlgNet direttamente
                const flgNets = xmlDoc.querySelectorAll('FlgNet');
                flgNets.forEach((flgNet, idx) => {
                    const rung = this.parseFlgNet(flgNet, idx);
                    if (rung) networks.push(rung);
                });
            } else {
                compileUnits.forEach((unit, idx) => {
                    const rung = this.parseCompileUnit(unit, idx);
                    if (rung) networks.push(rung);
                });
            }
            
            return networks;
        },

        // Parse CompileUnit (singolo network)
        parseCompileUnit: function(unit, idx) {
            const rung = {
                id: idx + 1,
                inputs: [],
                outputs: [],
                comment: '',
                power: 0
            };
            
            // Estrai titolo/commento
            const title = unit.querySelector('Title MultilingualText Text, Title Text, MultilingualTextItem Text');
            if (title) {
                rung.comment = title.textContent.trim();
            }
            
            // Cerca FlgNet (la rete ladder)
            const flgNet = unit.querySelector('FlgNet');
            if (flgNet) {
                this.parseFlgNetElements(flgNet, rung);
            }
            
            return rung;
        },

        // Parse FlgNet
        parseFlgNet: function(flgNet, idx) {
            const rung = {
                id: idx + 1,
                inputs: [],
                outputs: [],
                comment: '',
                power: 0
            };
            
            this.parseFlgNetElements(flgNet, rung);
            return rung;
        },

        // Parse elementi dentro FlgNet
        parseFlgNetElements: function(flgNet, rung) {
            // In SimaticML, la logica e definita in:
            // - Parts: contatti, bobine, blocchi funzione
            // - Wires: connessioni tra le parti
            
            const parts = flgNet.querySelectorAll('Part, Access');
            const partsMap = {};
            
            parts.forEach(part => {
                const uid = part.getAttribute('UId') || part.getAttribute('Uid');
                const name = part.getAttribute('Name') || '';
                const nameLower = name.toLowerCase();
                
                let elem = null;
                
                // Identifica il tipo di parte
                if (nameLower === 'contact' || nameLower.includes('contact')) {
                    elem = this.parseContactPart(part);
                } else if (nameLower === 'coil' || nameLower.includes('coil')) {
                    elem = this.parseCoilPart(part);
                } else if (nameLower === 'scoil' || nameLower === 's_coil' || nameLower.includes('set')) {
                    elem = this.parseCoilPart(part, 'set');
                } else if (nameLower === 'rcoil' || nameLower === 'r_coil' || nameLower.includes('reset')) {
                    elem = this.parseCoilPart(part, 'reset');
                } else if (nameLower === 'ton' || nameLower.includes('ton_time')) {
                    elem = this.parseTimerPart(part, 'ton');
                } else if (nameLower === 'tof' || nameLower.includes('tof_time')) {
                    elem = this.parseTimerPart(part, 'tof');
                } else if (nameLower === 'tp' || nameLower.includes('tp_time')) {
                    elem = this.parseTimerPart(part, 'tp');
                } else if (nameLower === 'ctu' || nameLower.includes('ctu_')) {
                    elem = this.parseCounterPart(part, 'ctu');
                } else if (nameLower === 'ctd' || nameLower.includes('ctd_')) {
                    elem = this.parseCounterPart(part, 'ctd');
                } else if (nameLower === 'ctud' || nameLower.includes('ctud_')) {
                    elem = this.parseCounterPart(part, 'ctud');
                } else if (nameLower.includes('cmp') || nameLower.includes('eq') || nameLower.includes('ne') ||
                           nameLower.includes('gt') || nameLower.includes('lt') || nameLower.includes('ge') || nameLower.includes('le')) {
                    elem = this.parseComparePart(part, nameLower);
                }
                
                if (elem && uid) {
                    partsMap[uid] = elem;
                    
                    // Aggiungi a inputs o outputs
                    if (elem.type.startsWith('coil')) {
                        rung.outputs.push(elem);
                    } else {
                        rung.inputs.push(elem);
                    }
                }
            });
            
            // Se non abbiamo trovato parti specifiche, prova parsing generico
            if (rung.inputs.length === 0 && rung.outputs.length === 0) {
                this.parseGenericFlgNet(flgNet, rung);
            }
        },

        // Parse contatto SimaticML
        parseContactPart: function(part) {
            const negated = part.querySelector('Negated');
            const isNegated = negated && negated.textContent.toLowerCase() === 'true';
            
            const elem = {
                id: Date.now() + Math.random(),
                type: isNegated ? 'contact-nc' : 'contact-no',
                address: this.parseSimaticAddress(part),
                comment: this.parsePartComment(part),
                state: 0
            };
            
            return elem;
        },

        // Parse bobina SimaticML
        parseCoilPart: function(part, subtype) {
            let type = 'coil';
            if (subtype === 'set') type = 'coil-set';
            else if (subtype === 'reset') type = 'coil-reset';
            
            const elem = {
                id: Date.now() + Math.random(),
                type: type,
                address: this.parseSimaticAddress(part),
                comment: this.parsePartComment(part),
                state: 0
            };
            
            return elem;
        },

        // Parse timer SimaticML
        parseTimerPart: function(part, subtype) {
            const elem = {
                id: Date.now() + Math.random(),
                type: 'timer-' + subtype,
                timerId: this.timerCounter++,
                preset: this.parsePresetValue(part, 1000),
                address: this.parseSimaticAddress(part),
                comment: this.parsePartComment(part),
                state: 0
            };
            
            return elem;
        },

        // Parse counter SimaticML
        parseCounterPart: function(part, subtype) {
            const elem = {
                id: Date.now() + Math.random(),
                type: 'counter-' + subtype,
                counterId: this.counterCounter++,
                preset: this.parsePresetValue(part, 10),
                address: this.parseSimaticAddress(part),
                comment: this.parsePartComment(part),
                state: 0
            };
            
            if (subtype === 'ctud') {
                elem.cdAddr = { type: 'I', byte: 0, bit: 1 };
            }
            
            return elem;
        },

        // Parse comparatore SimaticML
        parseComparePart: function(part, nameLower) {
            let cmpType = 'eq';
            if (nameLower.includes('ne') || nameLower.includes('<>')) cmpType = 'ne';
            else if (nameLower.includes('ge') || nameLower.includes('>=')) cmpType = 'ge';
            else if (nameLower.includes('le') || nameLower.includes('<=')) cmpType = 'le';
            else if (nameLower.includes('gt') || nameLower.includes('>')) cmpType = 'gt';
            else if (nameLower.includes('lt') || nameLower.includes('<')) cmpType = 'lt';
            
            const elem = {
                id: Date.now() + Math.random(),
                type: 'cmp-' + cmpType,
                operand1: { type: 'const', value: 0 },
                operand2: { type: 'const', value: 0 },
                comment: this.parsePartComment(part),
                state: 0
            };
            
            return elem;
        },

        // Parse indirizzo SimaticML
        parseSimaticAddress: function(part) {
            // Cerca Component o Symbol
            const component = part.querySelector('Component, Symbol, Address');
            if (component) {
                const name = component.getAttribute('Name') || component.textContent || '';
                return this.parseAddressString(name);
            }
            
            // Cerca in TemplateValue o Instance
            const instance = part.querySelector('TemplateValue, Instance, Operand');
            if (instance) {
                const text = instance.textContent || '';
                return this.parseAddressString(text);
            }
            
            return { type: 'M', byte: 0, bit: 0 };
        },

        // Parse commento parte
        parsePartComment: function(part) {
            const comment = part.querySelector('Comment MultilingualText Text, Comment Text');
            return comment ? comment.textContent.trim() : '';
        },

        // Parse valore preset
        parsePresetValue: function(part, defaultVal) {
            const preset = part.querySelector('TemplateValue[Name="PT"], TemplateValue[Name="PV"], Preset, PT, PV');
            if (preset) {
                const val = parseInt(preset.textContent);
                if (!isNaN(val)) return val;
            }
            return defaultVal;
        },

        // Parse generico FlgNet per formati non standard
        parseGenericFlgNet: function(flgNet, rung) {
            // Cerca qualsiasi elemento che possa essere un contatto o bobina
            const allElements = flgNet.querySelectorAll('*');
            
            allElements.forEach(el => {
                const tag = el.tagName.toLowerCase();
                const text = el.textContent || '';
                
                // Cerca pattern di indirizzi
                const addrMatch = text.match(/(%)?([IQMT])(\d+)\.(\d+)/i);
                if (addrMatch) {
                    const addr = {
                        type: addrMatch[2].toUpperCase(),
                        byte: parseInt(addrMatch[3]),
                        bit: parseInt(addrMatch[4])
                    };
                    
                    // Determina se e input o output basandosi sul tipo
                    const isOutput = addr.type === 'Q';
                    
                    const elem = {
                        id: Date.now() + Math.random(),
                        type: isOutput ? 'coil' : 'contact-no',
                        address: addr,
                        comment: '',
                        state: 0
                    };
                    
                    if (isOutput) {
                        rung.outputs.push(elem);
                    } else {
                        rung.inputs.push(elem);
                    }
                }
            });
        },

        importJSON: function(content) {
            try {
                const data = JSON.parse(content);
                if (!data.rungs) {
                    throw new Error('Formato JSON non valido');
                }
                
                this.stopSimulation();
                PLC.reset();
                PLC.program = data;
                
                $('#ladder-canvas').empty();
                $('#program-name').val(data.name);
                this.rungCounter = 0;
                this.timerCounter = 0;
                this.counterCounter = 0;
                
                data.rungs.forEach(rung => {
                    this.rungCounter = Math.max(this.rungCounter, rung.id);
                    this.renderRungFromData(rung);
                });
                
                this.updateDisplay();
                alert('Programma importato con successo!');
            } catch (err) {
                alert('Errore importazione JSON: ' + err.message);
            }
        },

        importXML: function(content) {
            try {
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(content, 'text/xml');
                
                // Verifica errori parsing
                if (xmlDoc.querySelector('parsererror')) {
                    throw new Error('XML non valido');
                }
                
                this.stopSimulation();
                PLC.reset();
                
                // Estrai nome
                const nameNode = xmlDoc.querySelector('Name');
                const programName = nameNode ? nameNode.textContent : 'Imported Program';
                
                PLC.program = {
                    name: programName,
                    rungs: []
                };
                
                // Parse networks/compile units
                const networks = xmlDoc.querySelectorAll('SW\\.Blocks\\.CompileUnit, CompileUnit, FlgNet');
                
                if (networks.length === 0) {
                    // Prova parsing generico per altri formati XML
                    this.parseGenericXML(xmlDoc);
                } else {
                    networks.forEach((network, idx) => {
                        const rung = this.parseNetworkXML(network, idx);
                        if (rung) {
                            PLC.program.rungs.push(rung);
                        }
                    });
                }
                
                // Se non ci sono rung, crea uno vuoto
                if (PLC.program.rungs.length === 0) {
                    PLC.program.rungs.push({
                        id: 1,
                        elements: [],
                        comment: '',
                        power: 0
                    });
                }
                
                // Render
                $('#ladder-canvas').empty();
                $('#program-name').val(PLC.program.name);
                this.rungCounter = 0;
                
                PLC.program.rungs.forEach(rung => {
                    this.rungCounter = Math.max(this.rungCounter, rung.id);
                    this.renderRungFromData(rung);
                });
                
                this.updateDisplay();
                alert('Programma XML importato! Networks trovati: ' + PLC.program.rungs.length);
            } catch (err) {
                alert('Errore importazione XML: ' + err.message);
            }
        },

        parseNetworkXML: function(network, idx) {
            const rung = {
                id: idx + 1,
                inputs: [],
                outputs: [],
                comment: '',
                power: 0
            };
            
            // Estrai titolo/commento
            const title = network.querySelector('Title Text, Title');
            if (title) {
                rung.comment = title.textContent;
            }
            
            // Parse Parts
            const parts = network.querySelectorAll('Part, Contact, Coil, TON, TOF, CTU');
            parts.forEach((part, partIdx) => {
                const elem = this.parsePartXML(part, partIdx);
                if (elem) {
                    // Separa in inputs/outputs
                    if (elem.type && elem.type.startsWith('coil')) {
                        rung.outputs.push(elem);
                    } else {
                        rung.inputs.push(elem);
                    }
                }
            });
            
            // Parse Or/Branch
            const orBlocks = network.querySelectorAll('Or');
            orBlocks.forEach(orBlock => {
                const branch = this.parseOrBlockXML(orBlock);
                if (branch) {
                    // Branch va negli inputs di default
                    rung.inputs.push(branch);
                }
            });
            
            return rung;
        },

        parsePartXML: function(part, idx) {
            const name = part.getAttribute('Name') || part.tagName;
            const instance = part.querySelector('Instance');
            const negated = part.querySelector('Negated');
            const comment = part.querySelector('Comment');
            const preset = part.querySelector('Preset');
            
            let type = 'contact-no';
            const nameLower = name.toLowerCase();
            
            if (nameLower.includes('coil') || nameLower === 'coil') {
                type = 'coil';
            } else if (nameLower === 'scoil' || nameLower.includes('set')) {
                type = 'coil-set';
            } else if (nameLower === 'rcoil' || nameLower.includes('reset')) {
                type = 'coil-reset';
            } else if (nameLower === 'ton') {
                type = 'timer-ton';
            } else if (nameLower === 'tof') {
                type = 'timer-tof';
            } else if (nameLower === 'ctu') {
                type = 'counter-ctu';
            } else if (negated && negated.textContent === 'true') {
                type = 'contact-nc';
            }
            
            const address = this.parseAddressString(instance ? instance.textContent : '');
            
            const elem = {
                id: Date.now() + idx,
                type: type,
                address: address,
                comment: comment ? comment.textContent : '',
                state: 0
            };
            
            if (type.startsWith('timer')) {
                elem.timerId = this.timerCounter++;
                elem.preset = preset ? parseInt(preset.textContent) : 1000;
            } else if (type.startsWith('counter')) {
                elem.counterId = this.counterCounter++;
                elem.preset = preset ? parseInt(preset.textContent) : 10;
            }
            
            return elem;
        },

        parseOrBlockXML: function(orBlock) {
            const branch = {
                id: Date.now(),
                type: 'branch',
                lines: [],
                state: 0
            };
            
            const branches = orBlock.querySelectorAll('Branch');
            branches.forEach((branchNode, lineIdx) => {
                const line = [];
                const parts = branchNode.querySelectorAll('Part, Contact, Coil');
                parts.forEach((part, partIdx) => {
                    const elem = this.parsePartXML(part, partIdx);
                    if (elem) {
                        line.push(elem);
                    }
                });
                if (line.length > 0) {
                    branch.lines.push(line);
                }
            });
            
            return branch.lines.length > 0 ? branch : null;
        },

        parseAddressString: function(str) {
            // Parse indirizzi tipo %I0.0, %Q1.2, %M0.5, I0.0, Q1.2, M0.5
            const match = str.match(/(%)?([IQMT])(\d+)\.(\d+)/i);
            if (match) {
                return {
                    type: match[2].toUpperCase(),
                    byte: parseInt(match[3]),
                    bit: parseInt(match[4])
                };
            }
            return { type: 'I', byte: 0, bit: 0 };
        },

        parseGenericXML: function(xmlDoc) {
            // Parser generico per formati XML non standard
            const allElements = xmlDoc.querySelectorAll('*');
            let currentRung = null;
            
            allElements.forEach(el => {
                const tag = el.tagName.toLowerCase();
                
                if (tag.includes('network') || tag.includes('rung')) {
                    if (currentRung) {
                        PLC.program.rungs.push(currentRung);
                    }
                    currentRung = {
                        id: PLC.program.rungs.length + 1,
                        inputs: [],
                        outputs: [],
                        comment: el.getAttribute('comment') || el.getAttribute('name') || '',
                        power: 0
                    };
                } else if (tag.includes('contact') || tag.includes('coil') || tag.includes('timer') || tag.includes('counter')) {
                    if (!currentRung) {
                        currentRung = {
                            id: 1,
                            inputs: [],
                            outputs: [],
                            comment: '',
                            power: 0
                        };
                    }
                    
                    let type = 'contact-no';
                    if (tag.includes('coil')) type = 'coil';
                    if (tag.includes('timer')) type = 'timer-ton';
                    if (tag.includes('counter')) type = 'counter-ctu';
                    
                    const addr = el.getAttribute('address') || el.getAttribute('operand') || el.textContent;
                    
                    const elem = {
                        id: Date.now() + Math.random(),
                        type: type,
                        address: this.parseAddressString(addr),
                        comment: '',
                        state: 0
                    };
                    
                    // Separa in inputs/outputs
                    if (type.startsWith('coil')) {
                        currentRung.outputs.push(elem);
                    } else {
                        currentRung.inputs.push(elem);
                    }
                }
            });
            
            if (currentRung) {
                PLC.program.rungs.push(currentRung);
            }
        },

        // ==================== STAMPA ====================
        
        printLadder: function() {
            const printWindow = window.open('', '_blank');
            
            let html = `
<!DOCTYPE html>
<html>
<head>
    <title>${PLC.program.name} - Ladder Diagram</title>
    <style>
        @page { size: A4 landscape; margin: 15mm; }
        body { 
            font-family: 'Courier New', monospace; 
            font-size: 11px;
            line-height: 1.4;
            color: #000;
        }
        .header {
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        .header h1 { margin: 0 0 5px 0; font-size: 18px; }
        .header .info { font-size: 10px; color: #666; }
        .network {
            border: 1px solid #333;
            margin-bottom: 15px;
            page-break-inside: avoid;
        }
        .network-header {
            background: #e0e0e0;
            padding: 5px 10px;
            font-weight: bold;
            border-bottom: 1px solid #333;
        }
        .network-comment {
            font-style: italic;
            color: #666;
            margin-left: 10px;
        }
        .network-content {
            padding: 15px;
            font-family: 'Courier New', monospace;
            white-space: pre;
        }
        .rail { color: #000; }
        .contact { color: #0066cc; }
        .coil { color: #cc0000; }
        .timer, .counter { color: #009900; }
        .address { font-size: 9px; color: #666; }
        .footer {
            position: fixed;
            bottom: 10mm;
            width: 100%;
            text-align: center;
            font-size: 9px;
            color: #999;
        }
        @media print {
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${this.escapeHtml(PLC.program.name)}</h1>
        <div class="info">
            Stampato il: ${new Date().toLocaleString('it-IT')} | 
            Networks: ${PLC.program.rungs.length} |
            Unofficial S7/1200 Simulator by Prof D.Bertolino
        </div>
    </div>
    <button class="no-print" onclick="window.print()" style="margin-bottom:20px;padding:10px 20px;font-size:14px;">ðŸ–¨ Stampa</button>
`;
            
            PLC.program.rungs.forEach(rung => {
                html += this.rungToASCII(rung);
            });
            
            html += `
    <div class="footer">
        Unofficial S7/1200 Simulator by Prof D.Bertolino - Ladder Diagram Print
    </div>
</body>
</html>`;
            
            printWindow.document.write(html);
            printWindow.document.close();
        },

        rungToASCII: function(rung) {
            let ascii = `<div class="network">`;
            ascii += `<div class="network-header">Network ${rung.id}`;
            if (rung.comment) {
                ascii += `<span class="network-comment">// ${this.escapeHtml(rung.comment)}</span>`;
            }
            ascii += `</div>`;
            ascii += `<div class="network-content">`;
            
            // Combina inputs e outputs per la stampa
            const inputs = rung.inputs || [];
            const outputs = rung.outputs || [];
            const allElements = [...inputs, ...outputs];
            
            // Costruisci rappresentazione ASCII del rung
            let line1 = '<span class="rail">|</span>';  // Linea principale
            let line2 = '<span class="rail">|</span>';  // Linea indirizzi
            
            if (allElements.length === 0) {
                line1 += '------------------------------------------<span class="rail">|</span>';
                line2 += '                                          <span class="rail">|</span>';
            } else {
                // Render inputs
                inputs.forEach((elem, idx) => {
                    const result = this.elementToASCII(elem);
                    line1 += result.symbol;
                    line2 += result.address;
                });
                
                // Separatore tra inputs e outputs
                if (inputs.length > 0 && outputs.length > 0) {
                    line1 += '----';
                    line2 += '    ';
                }
                
                // Render outputs
                outputs.forEach((elem, idx) => {
                    const result = this.elementToASCII(elem);
                    line1 += result.symbol;
                    line2 += result.address;
                });
                
                line1 += '--<span class="rail">|</span>';
                line2 += '  <span class="rail">|</span>';
            }
            
            ascii += line1 + '\n' + line2;
            
            // Se ci sono branch, aggiungi le linee parallele
            allElements.forEach(elem => {
                if (elem.type === 'branch' && elem.lines.length > 1) {
                    for (let i = 1; i < elem.lines.length; i++) {
                        ascii += '\n<span class="rail">|</span>';
                        let branchLine = '--+';
                        let branchAddr = '   ';
                        elem.lines[i].forEach(e => {
                            const res = this.elementToASCII(e);
                            branchLine += res.symbol;
                            branchAddr += res.address;
                        });
                        branchLine += '+--';
                        ascii += branchLine + '\n<span class="rail">|</span>' + branchAddr;
                    }
                }
            });
            
            ascii += `</div></div>`;
            return ascii;
        },

        elementToASCII: function(elem) {
            const addr = elem.address || {};
            const addrStr = `${addr.type || 'I'}${addr.byte || 0}.${addr.bit || 0}`;
            let symbol = '';
            let address = '';
            
            switch (elem.type) {
                case 'contact-no':
                    symbol = `--<span class="contact">+ +</span>--`;
                    address = `  <span class="address">${addrStr}</span>  `;
                    break;
                case 'contact-nc':
                    symbol = `--<span class="contact">+/+</span>--`;
                    address = `  <span class="address">${addrStr}</span>  `;
                    break;
                case 'coil':
                    symbol = `--<span class="coil">( )</span>--`;
                    address = `  <span class="address">${addrStr}</span>  `;
                    break;
                case 'coil-set':
                    symbol = `--<span class="coil">(S)</span>--`;
                    address = `  <span class="address">${addrStr}</span>  `;
                    break;
                case 'coil-reset':
                    symbol = `--<span class="coil">(R)</span>--`;
                    address = `  <span class="address">${addrStr}</span>  `;
                    break;
                case 'timer-ton':
                    symbol = `--<span class="timer">[TON T${elem.timerId}]</span>--`;
                    address = `   <span class="address">${elem.preset}ms</span>    `;
                    break;
                case 'timer-tof':
                    symbol = `--<span class="timer">[TOF T${elem.timerId}]</span>--`;
                    address = `   <span class="address">${elem.preset}ms</span>    `;
                    break;
                case 'counter-ctu':
                    symbol = `--<span class="counter">[CTU C${elem.counterId}]</span>--`;
                    address = `   <span class="address">PV:${elem.preset}</span>   `;
                    break;
                case 'branch':
                    // Per branch, mostra solo la prima linea qui
                    if (elem.lines && elem.lines[0]) {
                        let branchSymbol = '---';
                        let branchAddr = '  -';
                        elem.lines[0].forEach(e => {
                            const res = this.elementToASCII(e);
                            branchSymbol += res.symbol;
                            branchAddr += res.address;
                        });
                        branchSymbol += '---';
                        branchAddr += '-  ';
                        symbol = branchSymbol;
                        address = branchAddr;
                    }
                    break;
                default:
                    symbol = '----';
                    address = '    ';
            }
            
            return { symbol, address };
        },

        escapeHtml: function(str) {
            return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }
    };

    // ==================== HMI Controller ====================
    const HMI = {
        elements: [],
        selectedElement: null,
        elementCounter: 0,
        
        // Grid & Drag/Resize
        gridSize: 20,
        snapToGrid: true,
        isDragging: false,
        isResizing: false,
        dragOffset: { x: 0, y: 0 },
        resizeHandle: null,
        activeElement: null,
        
        // Background image
        backgroundImage: null,
        backgroundOpacity: 0.5,
        
        // Multi-pagina
        pages: [{ id: 1, name: 'Pagina 1', elements: [], background: null, bgOpacity: 0.5 }],
        currentPageId: 1,
        pageCounter: 1,
        
        // Sistema Allarmi
        alarms: [],  // {id, message, varType, varNum, varBit, condition, value, active, acknowledged, timestamp}
        alarmCounter: 0,
        alarmPanelVisible: false,
        
        // Configurazione tasti funzione F1-F18
        // { F1: {action: 'page'|'set'|'reset'|'toggle'|'write'|'none', target: pageId|{varType, varNum, varBit?, value?}, label: 'testo'}, ... }
        functionKeys: {},
        
        // ==================== MODELLI HMI SIEMENS ====================
        currentModel: 'KTP700',
        
        // Specifiche realistiche pannelli Siemens
        hmiModels: {
            // ===== BASIC PANELS (grigio, tasti in basso) =====
            'KTP400': {
                name: 'KTP400 Basic PN',
                series: 'basic',
                display: '4.3"',
                resolution: { w: 480, h: 272 },
                scale: 0.8, // Fattore scala per visualizzazione
                fkeys: 4,
                fkeysPosition: 'bottom',
                touch: true,
                color: 'gray'
            },
            'KTP700': {
                name: 'KTP700 Basic PN',
                series: 'basic',
                display: '7"',
                resolution: { w: 800, h: 480 },
                scale: 1.0,
                fkeys: 8,
                fkeysPosition: 'bottom',
                touch: true,
                color: 'gray'
            },
            'KTP900': {
                name: 'KTP900 Basic PN',
                series: 'basic',
                display: '9"',
                resolution: { w: 800, h: 480 },
                scale: 1.1,
                fkeys: 8,
                fkeysPosition: 'bottom',
                touch: true,
                color: 'gray'
            },
            'KTP1200': {
                name: 'KTP1200 Basic PN',
                series: 'basic',
                display: '12"',
                resolution: { w: 1280, h: 800 },
                scale: 1.0,
                fkeys: 10,
                fkeysPosition: 'bottom',
                touch: true,
                color: 'gray'
            },
            // ===== COMFORT PANELS (nero, tasti laterali) =====
            'TP700': {
                name: 'TP700 Comfort',
                series: 'comfort',
                display: '7"',
                resolution: { w: 800, h: 480 },
                scale: 1.0,
                fkeys: 8,
                fkeysPosition: 'sides', // 4+4 ai lati
                touch: true,
                color: 'black'
            },
            'TP900': {
                name: 'TP900 Comfort',
                series: 'comfort',
                display: '9"',
                resolution: { w: 800, h: 480 },
                scale: 1.1,
                fkeys: 8,
                fkeysPosition: 'sides',
                touch: true,
                color: 'black'
            },
            'TP1200': {
                name: 'TP1200 Comfort',
                series: 'comfort',
                display: '12"',
                resolution: { w: 1280, h: 800 },
                scale: 1.0,
                fkeys: 14,
                fkeysPosition: 'sides', // 7+7 ai lati
                touch: true,
                color: 'black'
            },
            'TP1500': {
                name: 'TP1500 Comfort',
                series: 'comfort',
                display: '15.4"',
                resolution: { w: 1280, h: 800 },
                scale: 1.15,
                fkeys: 18,
                fkeysPosition: 'sides', // 9+9 ai lati
                touch: true,
                color: 'black'
            }
        },
        
        init: function() {
            this.setupEventListeners();
            this.loadFromStorage();
            this.loadAlarms();
            // Applica modello iniziale
            this.setModel(this.currentModel, true);
        },
        
        // Cambia modello HMI
        setModel: function(modelId, skipSave) {
            const model = this.hmiModels[modelId];
            if (!model) return;
            
            this.currentModel = modelId;
            const $device = $('#hmi-device');
            const $canvas = $('#hmi-canvas');
            
            // Aggiorna data attribute
            $device.attr('data-model', modelId);
            
            // Aggiorna TUTTE le label modello (sopra e sotto)
            $('.hmi-device-model-label').text(model.name);
            $('#hmi-model-name').text(model.name);
            
            // Calcola dimensioni canvas in base a risoluzione e scala
            const canvasWidth = Math.round(model.resolution.w * model.scale);
            const canvasHeight = Math.round(model.resolution.h * model.scale);
            
            $canvas.css({
                'width': canvasWidth + 'px',
                'height': canvasHeight + 'px',
                'min-width': canvasWidth + 'px',
                'min-height': canvasHeight + 'px'
            });
            
            // Genera tasti funzione
            this.generateFunctionKeys(model);
            
            // Aggiorna select se esiste
            $('#hmi-model-select').val(modelId);
            
            // Salva se necessario
            if (!skipSave) {
                this.saveToStorage();
            }
            
            // Auto-fit dopo cambio modello (con piccolo delay per permettere il rendering)
            setTimeout(() => {
                this.zoomFit();
            }, 100);
            
            console.log(`HMI: Modello cambiato a ${model.name} (${model.resolution.w}x${model.resolution.h})`);
        },
        
        // Genera tasti funzione in base al modello
        generateFunctionKeys: function(model) {
            const $fkeysLeft = $('#hmi-fkeys-left');
            const $fkeysRight = $('#hmi-fkeys-right');
            const $fkeysBottom = $('#hmi-fkeys-bottom');
            const self = this;
            
            // Pulisci tutti
            $fkeysLeft.empty();
            $fkeysRight.empty();
            $fkeysBottom.empty();
            
            const totalKeys = model.fkeys;
            
            const createFkeyButton = (i) => {
                const fkeyId = `F${i}`;
                const config = this.functionKeys[fkeyId] || {};
                const label = config.label || fkeyId;
                const hasConfig = config.action && config.action !== 'none';
                
                return $(`<button class="hmi-fkey ${hasConfig ? 'configured' : ''}" data-fkey="${fkeyId}" title="${fkeyId}: ${this.getFkeyActionDescription(config)}">${label}</button>`)
                    .on('click', function(e) {
                        if (PLC.running) {
                            // In RUN: esegui azione
                            self.executeFkeyAction(fkeyId);
                        }
                    })
                    .on('dblclick', function(e) {
                        if (!PLC.running) {
                            // In STOP: configura
                            self.openFkeyConfigModal(fkeyId);
                        }
                    })
                    .on('contextmenu', function(e) {
                        e.preventDefault();
                        if (!PLC.running) {
                            self.openFkeyConfigModal(fkeyId);
                        }
                    });
            };
            
            if (model.fkeysPosition === 'bottom') {
                // Basic: tasti in basso
                for (let i = 1; i <= totalKeys; i++) {
                    $fkeysBottom.append(createFkeyButton(i));
                }
            } else if (model.fkeysPosition === 'sides') {
                // Comfort: tasti ai lati (metà sinistra, metà destra)
                const leftKeys = Math.ceil(totalKeys / 2);
                
                for (let i = 1; i <= leftKeys; i++) {
                    $fkeysLeft.append(createFkeyButton(i));
                }
                
                for (let i = leftKeys + 1; i <= totalKeys; i++) {
                    $fkeysRight.append(createFkeyButton(i));
                }
            }
        },
        
        // Descrizione azione tasto F
        getFkeyActionDescription: function(config) {
            if (!config || !config.action || config.action === 'none') {
                return 'Nessuna azione (doppio click per configurare)';
            }
            switch (config.action) {
                case 'page':
                    const page = this.pages.find(p => p.id === config.target);
                    return `Vai a ${page ? page.name : 'Pagina ' + config.target}`;
                case 'set':
                    return `SET ${config.target.varType}${config.target.varNum}.${config.target.varBit}`;
                case 'reset':
                    return `RESET ${config.target.varType}${config.target.varNum}.${config.target.varBit}`;
                case 'toggle':
                    return `TOGGLE ${config.target.varType}${config.target.varNum}.${config.target.varBit}`;
                case 'write':
                    return `Scrivi ${config.target.value} in ${config.target.varType}${config.target.varNum}`;
                default:
                    return 'Azione sconosciuta';
            }
        },
        
        // Apre modal configurazione tasto F
        openFkeyConfigModal: function(fkeyId) {
            const config = this.functionKeys[fkeyId] || { action: 'none', label: fkeyId };
            
            // Imposta titolo modal
            $('#fkey-config-title').text(fkeyId);
            
            $('#fkey-config-id').val(fkeyId);
            $('#fkey-config-label').val(config.label || fkeyId);
            $('#fkey-config-action').val(config.action || 'none');
            
            // Popola select pagine
            const $pageSelect = $('#fkey-config-page');
            $pageSelect.empty();
            this.pages.forEach(p => {
                $pageSelect.append(`<option value="${p.id}">${p.name}</option>`);
            });
            
            // Imposta valori target se esistono
            if (config.target) {
                if (config.action === 'page') {
                    $pageSelect.val(config.target);
                } else if (typeof config.target === 'object') {
                    $('#fkey-config-var-type').val(config.target.varType || 'M');
                    $('#fkey-config-var-num').val(config.target.varNum || 0);
                    $('#fkey-config-var-bit').val(config.target.varBit !== undefined ? config.target.varBit : 0);
                    $('#fkey-config-value').val(config.target.value || 0);
                    $('#fkey-config-word-type').val(config.target.varType || 'MW');
                    $('#fkey-config-word-num').val(config.target.varNum || 0);
                }
            }
            
            // Mostra/nascondi campi in base all'azione
            this.updateFkeyConfigFields();
            
            $('#fkey-config-modal').addClass('active');
        },
        
        // Aggiorna visibilità campi in base all'azione selezionata
        updateFkeyConfigFields: function() {
            const action = $('#fkey-config-action').val();
            
            $('#fkey-config-page-group').toggle(action === 'page');
            $('#fkey-config-bit-group').toggle(['set', 'reset', 'toggle'].includes(action));
            $('#fkey-config-word-group').toggle(action === 'write');
        },
        
        // Salva configurazione tasto F
        saveFkeyConfig: function() {
            const fkeyId = $('#fkey-config-id').val();
            const action = $('#fkey-config-action').val();
            const label = $('#fkey-config-label').val() || fkeyId;
            
            let target = null;
            
            if (action === 'page') {
                target = parseInt($('#fkey-config-page').val());
            } else if (['set', 'reset', 'toggle'].includes(action)) {
                target = {
                    varType: $('#fkey-config-var-type').val(),
                    varNum: parseInt($('#fkey-config-var-num').val()) || 0,
                    varBit: parseInt($('#fkey-config-var-bit').val()) || 0
                };
            } else if (action === 'write') {
                target = {
                    varType: $('#fkey-config-word-type').val(),
                    varNum: parseInt($('#fkey-config-word-num').val()) || 0,
                    value: parseInt($('#fkey-config-value').val()) || 0
                };
            }
            
            this.functionKeys[fkeyId] = { action, target, label };
            
            // Rigenera tasti per aggiornare UI
            this.generateFunctionKeys(this.getCurrentModelInfo());
            
            this.saveToStorage();
            closeFkeyConfigModal();
        },
        
        // Esegue azione tasto F
        executeFkeyAction: function(fkeyId) {
            const config = this.functionKeys[fkeyId];
            if (!config || !config.action || config.action === 'none') return;
            
            // Feedback visivo
            $(`.hmi-fkey[data-fkey="${fkeyId}"]`).addClass('pressed');
            setTimeout(() => {
                $(`.hmi-fkey[data-fkey="${fkeyId}"]`).removeClass('pressed');
            }, 150);
            
            switch (config.action) {
                case 'page':
                    this.switchPage(config.target);
                    break;
                    
                case 'set':
                    PLC.writeBit(config.target.varType, config.target.varNum, config.target.varBit, 1);
                    UI.updateDisplay();
                    break;
                    
                case 'reset':
                    PLC.writeBit(config.target.varType, config.target.varNum, config.target.varBit, 0);
                    UI.updateDisplay();
                    break;
                    
                case 'toggle':
                    const current = PLC.readBit(config.target.varType, config.target.varNum, config.target.varBit);
                    PLC.writeBit(config.target.varType, config.target.varNum, config.target.varBit, current ? 0 : 1);
                    UI.updateDisplay();
                    break;
                    
                case 'write':
                    PLC.writeWord(config.target.varType, config.target.varNum, config.target.value);
                    UI.updateDisplay();
                    break;
            }
        },
        
        // Ottieni info modello corrente
        getCurrentModelInfo: function() {
            return this.hmiModels[this.currentModel] || this.hmiModels['KTP700'];
        },
        
        // ==================== ZOOM HMI ====================
        zoomLevel: 100,
        zoomMin: 25,
        zoomMax: 150,
        zoomStep: 10,
        
        // Aggiorna visualizzazione zoom
        updateZoom: function() {
            const scale = this.zoomLevel / 100;
            $('#hmi-device-wrapper').css('transform', `scale(${scale})`);
            $('#hmi-zoom-value').text(this.zoomLevel + '%');
        },
        
        // Zoom in
        zoomIn: function() {
            if (this.zoomLevel < this.zoomMax) {
                this.zoomLevel = Math.min(this.zoomMax, this.zoomLevel + this.zoomStep);
                this.updateZoom();
            }
        },
        
        // Zoom out
        zoomOut: function() {
            if (this.zoomLevel > this.zoomMin) {
                this.zoomLevel = Math.max(this.zoomMin, this.zoomLevel - this.zoomStep);
                this.updateZoom();
            }
        },
        
        // Adatta allo schermo
        zoomFit: function() {
            const $container = $('.hmi-device-container');
            const $device = $('#hmi-device');
            
            if (!$container.length || !$device.length) return;
            
            // Reset zoom per misurare dimensioni reali
            $('#hmi-device-wrapper').css('transform', 'scale(1)');
            
            const containerWidth = $container.width() - 40; // padding
            const containerHeight = $container.height() - 40;
            const deviceWidth = $device.outerWidth();
            const deviceHeight = $device.outerHeight();
            
            if (deviceWidth === 0 || deviceHeight === 0) {
                this.zoomLevel = 100;
                this.updateZoom();
                return;
            }
            
            // Calcola scala per adattare
            const scaleX = containerWidth / deviceWidth;
            const scaleY = containerHeight / deviceHeight;
            const scale = Math.min(scaleX, scaleY, 1); // Non oltre 100%
            
            this.zoomLevel = Math.max(this.zoomMin, Math.min(this.zoomMax, Math.round(scale * 100)));
            this.updateZoom();
        },
        
        setupEventListeners: function() {
            // Toggle pannello HMI
            $('#btn-hmi').on('click', () => this.togglePanel());
            $('#hmi-close').on('click', () => this.togglePanel());
            
            // Cambio modello HMI
            $('#hmi-model-select').on('change', (e) => {
                this.setModel($(e.target).val());
            });
            
            // Controlli Zoom HMI
            $('#hmi-zoom-in').on('click', () => this.zoomIn());
            $('#hmi-zoom-out').on('click', () => this.zoomOut());
            $('#hmi-zoom-fit').on('click', () => this.zoomFit());
            
            // Configurazione Tasti Funzione
            $('#fkey-config-action').on('change', () => this.updateFkeyConfigFields());
            $('#fkey-config-save').on('click', () => this.saveFkeyConfig());
            
            // Pulsanti aggiungi elementi
            $('#hmi-add-led').on('click', () => this.addElement('led'));
            $('#hmi-add-button').on('click', () => this.addElement('button'));
            $('#hmi-add-switch').on('click', () => this.addElement('switch'));
            $('#hmi-add-display').on('click', () => this.addElement('display'));
            $('#hmi-add-slider').on('click', () => this.addElement('slider'));
            $('#hmi-add-gauge').on('click', () => this.addElement('gauge'));
            
            // Simboli industriali
            $('#hmi-add-motor').on('click', () => this.addElement('motor'));
            $('#hmi-add-valve').on('click', () => this.addElement('valve'));
            $('#hmi-add-pump').on('click', () => this.addElement('pump'));
            $('#hmi-add-tank').on('click', () => this.addElement('tank'));
            $('#hmi-add-conveyor').on('click', () => this.addElement('conveyor'));
            $('#hmi-add-light').on('click', () => this.addElement('light'));
            
            // Bargraph e testo
            $('#hmi-add-bargraph').on('click', () => this.addElement('bargraph'));
            $('#hmi-add-text').on('click', () => this.addElement('text'));
            
            // Trend/Grafico
            $('#hmi-add-trend').on('click', () => this.addElement('trend'));
            
            // Allarmi
            $('#hmi-show-alarms').on('click', () => this.toggleAlarmPanel());
            
            // Pagine
            $('#hmi-add-page').on('click', () => this.addPage());
            $(document).on('click', '.hmi-page-tab', function() {
                HMI.switchPage($(this).data('page-id'));
            });
            $(document).on('click', '.hmi-page-delete', function(e) {
                e.stopPropagation();
                HMI.deletePage($(this).closest('.hmi-page-tab').data('page-id'));
            });
            $(document).on('dblclick', '.hmi-page-tab', function(e) {
                e.stopPropagation();
                HMI.renamePagePrompt($(this).data('page-id'));
            });
            
            // Toggle snap to grid
            $('#hmi-snap-grid').on('change', (e) => {
                this.snapToGrid = $(e.target).is(':checked');
            });
            
            // Background image
            $('#hmi-bg-btn').on('click', () => $('#hmi-bg-input').click());
            $('#hmi-bg-input').on('change', (e) => this.loadBackgroundImage(e));
            $('#hmi-bg-clear').on('click', () => this.clearBackgroundImage());
            $('#hmi-bg-opacity').on('input', (e) => {
                this.backgroundOpacity = parseFloat($(e.target).val());
                this.applyBackgroundImage();
            });
            
            // Cancella tutto
            $('#hmi-clear').on('click', () => {
                if (confirm('Cancellare tutti gli elementi HMI?')) {
                    this.clearAll();
                }
            });
            
            // Modal config
            $('#hmi-config-save').on('click', () => this.saveElementConfig());
            $('#hmi-config-delete').on('click', () => this.deleteElement());
            
            // Cambia visibilita campi in base al tipo variabile
            $('#hmi-config-var-type').on('change', function() {
                const type = $(this).val();
                if (type === 'T' || type === 'C' || type === 'MW') {
                    $('#hmi-config-bit-group').hide();
                } else {
                    $('#hmi-config-bit-group').show();
                }
            });
            
            // Global mouse events per drag/resize
            $(document).on('mousemove', (e) => this.onMouseMove(e));
            $(document).on('mouseup', (e) => this.onMouseUp(e));
            
            // Click su canvas deseleziona
            $('#hmi-canvas').on('click', (e) => {
                if ($(e.target).attr('id') === 'hmi-canvas') {
                    this.deselectAll();
                }
            });
        },
        
        // Carica immagine sfondo
        loadBackgroundImage: function(e) {
            const file = e.target.files[0];
            if (!file) return;
            
            if (!file.type.startsWith('image/')) {
                alert('Seleziona un file immagine (PNG, JPG, GIF)');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (event) => {
                this.backgroundImage = event.target.result;
                this.applyBackgroundImage();
                this.saveToStorage();
            };
            reader.readAsDataURL(file);
            e.target.value = '';
        },
        
        // Applica immagine sfondo
        applyBackgroundImage: function() {
            const $canvas = $('#hmi-canvas');
            
            if (this.backgroundImage) {
                $canvas.css({
                    'background-image': `
                        linear-gradient(rgba(26, 29, 35, ${1 - this.backgroundOpacity}), rgba(26, 29, 35, ${1 - this.backgroundOpacity})),
                        url(${this.backgroundImage})`,
                    'background-size': 'cover',
                    'background-position': 'center'
                });
                $('#hmi-bg-clear').show();
                $('#hmi-bg-opacity-group').show();
                $('#hmi-bg-opacity').val(this.backgroundOpacity);
            } else {
                // Ripristina grid di default
                $canvas.css({
                    'background-image': `
                        linear-gradient(rgba(61, 68, 81, 0.3) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(61, 68, 81, 0.3) 1px, transparent 1px)`,
                    'background-size': '20px 20px',
                    'background-position': ''
                });
                $('#hmi-bg-clear').hide();
                $('#hmi-bg-opacity-group').hide();
            }
        },
        
        // Rimuovi immagine sfondo
        clearBackgroundImage: function(noSave) {
            this.backgroundImage = null;
            $('#hmi-canvas').css('background-image', 'none');
            $('#hmi-bg-clear').hide();
            $('#hmi-bg-opacity-group').hide();
            if (!noSave) {
                this.saveToStorage();
            }
        },
        
        togglePanel: function() {
            $('#hmi-panel').toggleClass('active');
            $('#btn-hmi').toggleClass('active');
        },
        
        // ==================== GESTIONE PAGINE ====================
        
        getCurrentPage: function() {
            return this.pages.find(p => p.id === this.currentPageId) || this.pages[0];
        },
        
        renderPageTabs: function() {
            const $tabs = $('#hmi-pages-tabs');
            const self = this;
            $tabs.empty();
            
            this.pages.forEach(page => {
                const isActive = page.id === this.currentPageId;
                const canDelete = this.pages.length > 1;
                const $tab = $(`
                    <div class="hmi-page-tab ${isActive ? 'active' : ''}" data-page-id="${page.id}">
                        <span class="hmi-page-name">${page.name}</span>
                        ${canDelete ? '<button class="hmi-page-delete" title="Elimina pagina">&times;</button>' : ''}
                    </div>
                `);
                
                // Click per switch pagina
                $tab.find('.hmi-page-name').on('click', function() {
                    self.switchPage(page.id);
                });
                
                // Doppio click per rinominare
                $tab.find('.hmi-page-name').on('dblclick', function() {
                    self.renamePagePrompt(page.id);
                });
                
                // Click delete
                $tab.find('.hmi-page-delete').on('click', function(e) {
                    e.stopPropagation();
                    self.deletePage(page.id);
                });
                
                $tabs.append($tab);
            });
        },
        
        addPage: function() {
            const id = ++this.pageCounter;
            const newPage = {
                id: id,
                name: 'Pagina ' + id,
                elements: [],
                background: null,
                bgOpacity: 0.5
            };
            this.pages.push(newPage);
            this.switchPage(id);
            this.saveToStorage();
        },
        
        switchPage: function(pageId) {
            // Salva elementi correnti nella pagina attuale
            const currentPage = this.getCurrentPage();
            if (currentPage) {
                currentPage.elements = this.elements;
                currentPage.background = this.backgroundImage;
                currentPage.bgOpacity = this.backgroundOpacity;
            }
            
            // Cambia pagina
            this.currentPageId = pageId;
            const newPage = this.getCurrentPage();
            
            // Carica elementi nuova pagina
            this.elements = newPage.elements || [];
            this.backgroundImage = newPage.background || null;
            this.backgroundOpacity = newPage.bgOpacity !== undefined ? newPage.bgOpacity : 0.5;
            
            // Re-render
            this.renderPageTabs();
            this.rerenderCanvas();
            this.applyBackgroundImage();
        },
        
        deletePage: function(pageId) {
            if (this.pages.length <= 1) {
                alert('Non puoi eliminare l\'ultima pagina');
                return;
            }
            
            if (!confirm('Eliminare questa pagina?')) return;
            
            const idx = this.pages.findIndex(p => p.id === pageId);
            if (idx === -1) return;
            
            this.pages.splice(idx, 1);
            
            // Se era la pagina corrente, passa alla prima
            if (this.currentPageId === pageId) {
                this.currentPageId = this.pages[0].id;
                const newPage = this.getCurrentPage();
                this.elements = newPage.elements || [];
                this.backgroundImage = newPage.background || null;
                this.backgroundOpacity = newPage.bgOpacity !== undefined ? newPage.bgOpacity : 0.5;
            }
            
            this.renderPageTabs();
            this.rerenderCanvas();
            this.applyBackgroundImage();
            this.saveToStorage();
        },
        
        renamePagePrompt: function(pageId) {
            const page = this.pages.find(p => p.id === pageId);
            if (!page) return;
            
            const newName = prompt('Nome pagina:', page.name);
            if (newName && newName.trim()) {
                page.name = newName.trim();
                this.renderPageTabs();
                this.saveToStorage();
            }
        },
        
        rerenderCanvas: function() {
            $('#hmi-canvas .hmi-element').remove();
            this.elements.forEach(elem => {
                this.elementCounter = Math.max(this.elementCounter, elem.id);
                this.renderElement(elem);
            });
            this.updateEmptyMessage();
        },
        
        snap: function(value) {
            if (!this.snapToGrid) return value;
            return Math.round(value / this.gridSize) * this.gridSize;
        },
        
        addElement: function(type) {
            const id = ++this.elementCounter;
            
            // Dimensioni di default per tipo
            const sizes = {
                'led': { w: 60, h: 80 },
                'button': { w: 80, h: 100 },
                'switch': { w: 80, h: 80 },
                'display': { w: 120, h: 80 },
                'slider': { w: 160, h: 80 },
                'gauge': { w: 120, h: 120 },
                // Simboli industriali
                'motor': { w: 80, h: 80 },
                'valve': { w: 60, h: 80 },
                'pump': { w: 80, h: 80 },
                'tank': { w: 80, h: 120 },
                'conveyor': { w: 160, h: 60 },
                'light': { w: 40, h: 120 },
                // Bargraph e testo
                'bargraph': { w: 40, h: 120 },
                'text': { w: 120, h: 40 },
                // Trend
                'trend': { w: 300, h: 180 }
            };
            
            const size = sizes[type] || { w: 80, h: 80 };
            
            // Posizione iniziale (cascata per nuovi elementi)
            const offset = (this.elements.length % 5) * 20;
            
            const element = {
                id: id,
                type: type,
                label: this.getDefaultLabel(type),
                varType: type === 'button' || type === 'switch' ? 'I' : 'Q',
                varNum: 0,
                varBit: 0,
                color: 'green',
                min: 0,
                max: 100,
                mode: 'momentary',
                // Posizione e dimensioni
                x: this.snap(20 + offset),
                y: this.snap(20 + offset),
                width: size.w,
                height: size.h,
                // Specifici per tank
                fillLevel: 50
            };
            
            this.elements.push(element);
            this.renderElement(element);
            this.updateEmptyMessage();
            this.saveToStorage();
        },
        
        getDefaultLabel: function(type) {
            const labels = {
                'led': 'LED',
                'button': 'BTN',
                'switch': 'SW',
                'display': 'DISP',
                'slider': 'SLIDER',
                'gauge': 'GAUGE',
                'motor': 'M1',
                'valve': 'V1',
                'pump': 'P1',
                'tank': 'TK1',
                'conveyor': 'CONV',
                'light': 'SEM',
                'bargraph': 'BAR',
                'text': 'Valore: {v}',
                'trend': 'TREND'
            };
            return labels[type] || 'ELEM';
        },
        
        renderElement: function(elem) {
            let content = '';
            const addr = this.formatAddress(elem);
            
            // Assicura valori default per compatibilita
            if (elem.x === undefined) elem.x = 20;
            if (elem.y === undefined) elem.y = 20;
            if (elem.width === undefined) elem.width = 80;
            if (elem.height === undefined) elem.height = 80;
            
            switch (elem.type) {
                case 'led':
                    content = `
                        <div class="hmi-element-label">${elem.label}</div>
                        <div class="hmi-led-light ${elem.color}"></div>
                        <div class="hmi-element-address">${addr}</div>
                    `;
                    break;
                    
                case 'button':
                    content = `
                        <div class="hmi-element-label">${elem.label}</div>
                        <div class="hmi-button-btn ${elem.color}">${elem.label}</div>
                        <div class="hmi-element-address">${addr}</div>
                    `;
                    break;
                    
                case 'switch':
                    content = `
                        <div class="hmi-element-label">${elem.label}</div>
                        <div class="hmi-switch-track">
                            <div class="hmi-switch-knob"></div>
                        </div>
                        <div class="hmi-element-address">${addr}</div>
                    `;
                    break;
                    
                case 'display':
                    content = `
                        <div class="hmi-element-label">${elem.label}</div>
                        <div class="hmi-display-screen ${elem.color}">0</div>
                        <div class="hmi-element-address">${addr}</div>
                    `;
                    break;
                    
                case 'slider':
                    content = `
                        <div class="hmi-element-label">${elem.label}</div>
                        <div class="hmi-slider-container">
                            <input type="range" class="hmi-slider-input" min="${elem.min}" max="${elem.max}" value="0">
                            <div class="hmi-slider-value">0</div>
                        </div>
                        <div class="hmi-element-address">${addr}</div>
                    `;
                    break;
                    
                case 'gauge':
                    content = `
                        <div class="hmi-element-label">${elem.label}</div>
                        <div class="hmi-gauge-container">
                            <div class="hmi-gauge-bg"></div>
                            <div class="hmi-gauge-fill"></div>
                            <div class="hmi-gauge-value">0</div>
                            <div class="hmi-gauge-label-min">${elem.min}</div>
                            <div class="hmi-gauge-label-max">${elem.max}</div>
                        </div>
                        <div class="hmi-element-address">${addr}</div>
                    `;
                    break;
                    
                // ==================== SIMBOLI INDUSTRIALI ====================
                case 'motor':
                    content = `
                        <div class="hmi-element-label">${elem.label}</div>
                        <div class="hmi-motor">
                            <svg viewBox="0 0 60 60" class="hmi-motor-svg">
                                <circle cx="30" cy="30" r="25" fill="none" stroke="currentColor" stroke-width="3"/>
                                <text x="30" y="35" text-anchor="middle" font-size="14" font-weight="bold" fill="currentColor">M</text>
                                <line class="hmi-motor-rotor" x1="30" y1="10" x2="30" y2="20" stroke="currentColor" stroke-width="2"/>
                            </svg>
                        </div>
                        <div class="hmi-element-address">${addr}</div>
                    `;
                    break;
                    
                case 'valve':
                    content = `
                        <div class="hmi-element-label">${elem.label}</div>
                        <div class="hmi-valve">
                            <svg viewBox="0 0 40 60" class="hmi-valve-svg">
                                <polygon points="5,15 35,15 20,35" fill="none" stroke="currentColor" stroke-width="2"/>
                                <polygon points="5,45 35,45 20,25" fill="none" stroke="currentColor" stroke-width="2"/>
                                <line x1="20" y1="5" x2="20" y2="15" stroke="currentColor" stroke-width="3"/>
                                <rect x="12" y="2" width="16" height="6" fill="currentColor"/>
                            </svg>
                        </div>
                        <div class="hmi-element-address">${addr}</div>
                    `;
                    break;
                    
                case 'pump':
                    content = `
                        <div class="hmi-element-label">${elem.label}</div>
                        <div class="hmi-pump">
                            <svg viewBox="0 0 60 60" class="hmi-pump-svg">
                                <circle cx="30" cy="30" r="22" fill="none" stroke="currentColor" stroke-width="3"/>
                                <polygon class="hmi-pump-impeller" points="30,12 40,30 30,48 20,30" fill="currentColor"/>
                                <line x1="52" y1="30" x2="60" y2="30" stroke="currentColor" stroke-width="3"/>
                                <line x1="0" y1="30" x2="8" y2="30" stroke="currentColor" stroke-width="3"/>
                            </svg>
                        </div>
                        <div class="hmi-element-address">${addr}</div>
                    `;
                    break;
                    
                case 'tank':
                    content = `
                        <div class="hmi-element-label">${elem.label}</div>
                        <div class="hmi-tank">
                            <svg viewBox="0 0 60 100" class="hmi-tank-svg">
                                <rect x="5" y="10" width="50" height="80" rx="5" fill="none" stroke="currentColor" stroke-width="2"/>
                                <rect class="hmi-tank-fill" x="7" y="12" width="46" height="76" rx="3"/>
                                <line x1="5" y1="30" x2="15" y2="30" stroke="currentColor" stroke-width="1"/>
                                <line x1="5" y1="50" x2="15" y2="50" stroke="currentColor" stroke-width="1"/>
                                <line x1="5" y1="70" x2="15" y2="70" stroke="currentColor" stroke-width="1"/>
                            </svg>
                            <div class="hmi-tank-value">0%</div>
                        </div>
                        <div class="hmi-element-address">${addr}</div>
                    `;
                    break;
                    
                case 'conveyor':
                    content = `
                        <div class="hmi-element-label">${elem.label}</div>
                        <div class="hmi-conveyor">
                            <svg viewBox="0 0 120 40" class="hmi-conveyor-svg">
                                <ellipse cx="20" cy="20" rx="15" ry="12" fill="none" stroke="currentColor" stroke-width="2"/>
                                <ellipse cx="100" cy="20" rx="15" ry="12" fill="none" stroke="currentColor" stroke-width="2"/>
                                <line x1="20" y1="8" x2="100" y2="8" stroke="currentColor" stroke-width="2"/>
                                <line x1="20" y1="32" x2="100" y2="32" stroke="currentColor" stroke-width="2"/>
                                <line class="hmi-conveyor-arrow" x1="45" y1="20" x2="75" y2="20" stroke="currentColor" stroke-width="2" marker-end="url(#arrow)"/>
                                <defs>
                                    <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                                        <path d="M0,0 L6,3 L0,6 Z" fill="currentColor"/>
                                    </marker>
                                </defs>
                            </svg>
                        </div>
                        <div class="hmi-element-address">${addr}</div>
                    `;
                    break;
                    
                case 'light':
                    content = `
                        <div class="hmi-element-label">${elem.label}</div>
                        <div class="hmi-light">
                            <div class="hmi-light-lamp red"></div>
                            <div class="hmi-light-lamp yellow"></div>
                            <div class="hmi-light-lamp green"></div>
                        </div>
                        <div class="hmi-element-address">${addr}</div>
                    `;
                    break;
                    
                case 'bargraph':
                    content = `
                        <div class="hmi-bargraph">
                            <div class="hmi-bargraph-container">
                                <div class="hmi-bargraph-fill ${elem.color}"></div>
                                <div class="hmi-bargraph-ticks">
                                    <span>${elem.max}</span>
                                    <span>${Math.round((elem.max + elem.min) / 2)}</span>
                                    <span>${elem.min}</span>
                                </div>
                            </div>
                            <div class="hmi-bargraph-value">0</div>
                        </div>
                        <div class="hmi-element-address">${addr}</div>
                    `;
                    break;
                    
                case 'text':
                    content = `
                        <div class="hmi-text">
                            <span class="hmi-text-content">${elem.label.replace('{v}', '0')}</span>
                        </div>
                    `;
                    break;
                    
                case 'trend':
                    // Canvas per grafico trend
                    content = `
                        <div class="hmi-trend">
                            <div class="hmi-trend-label">${elem.label}</div>
                            <canvas class="hmi-trend-canvas" data-id="${elem.id}"></canvas>
                        </div>
                    `;
                    break;
                    
                case 'trend':
                    // Inizializza dati trend se non esistono
                    if (!elem.trendData) elem.trendData = [];
                    if (!elem.trendMaxPoints) elem.trendMaxPoints = 100;
                    if (!elem.trendInterval) elem.trendInterval = 500;
                    content = `
                        <div class="hmi-element-label">${elem.label}</div>
                        <div class="hmi-trend">
                            <canvas class="hmi-trend-canvas" width="280" height="130"></canvas>
                            <div class="hmi-trend-info">
                                <span class="hmi-trend-value">0</span>
                                <span class="hmi-trend-address">${addr}</span>
                            </div>
                        </div>
                    `;
                    break;
            }
            
            // Wrapper con posizionamento assoluto e maniglie resize
            const html = `
                <div class="hmi-element hmi-${elem.type}" data-id="${elem.id}" 
                     style="left:${elem.x}px; top:${elem.y}px; width:${elem.width}px; height:${elem.height}px;">
                    ${content}
                    <div class="hmi-resize-handles">
                        <div class="hmi-resize-handle hmi-resize-se" data-handle="se"></div>
                        <div class="hmi-resize-handle hmi-resize-e" data-handle="e"></div>
                        <div class="hmi-resize-handle hmi-resize-s" data-handle="s"></div>
                    </div>
                </div>
            `;
            
            $('#hmi-canvas').append(html);
            this.setupElementEvents(elem);
        },
        
        formatAddress: function(elem) {
            if (elem.varType === 'T') return `T${elem.varNum}`;
            if (elem.varType === 'C') return `C${elem.varNum}`;
            if (elem.varType === 'MW') return `MW${elem.varNum}`;
            return `${elem.varType}${elem.varNum}.${elem.varBit}`;
        },
        
        setupElementEvents: function(elem) {
            const $el = $(`.hmi-element[data-id="${elem.id}"]`);
            const self = this;
            
            // Click per selezionare
            $el.on('mousedown', function(e) {
                // Ignora se click su controlli interattivi
                if ($(e.target).hasClass('hmi-button-btn') || 
                    $(e.target).hasClass('hmi-switch-track') ||
                    $(e.target).hasClass('hmi-slider-input') ||
                    $(e.target).hasClass('hmi-resize-handle')) {
                    return;
                }
                
                e.preventDefault();
                e.stopPropagation();
                
                self.selectElement(elem.id);
                
                // Inizia drag
                const rect = $el[0].getBoundingClientRect();
                const canvasRect = $('#hmi-canvas')[0].getBoundingClientRect();
                
                self.isDragging = true;
                self.activeElement = elem;
                self.dragOffset = {
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                };
                
                $el.addClass('dragging');
            });
            
            // Resize handles
            $el.find('.hmi-resize-handle').on('mousedown', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                self.selectElement(elem.id);
                self.isResizing = true;
                self.activeElement = elem;
                self.resizeHandle = $(this).data('handle');
                
                $el.addClass('resizing');
            });
            
            // Doppio click per configurare
            $el.on('dblclick', (e) => {
                if ($(e.target).hasClass('hmi-button-btn') || 
                    $(e.target).hasClass('hmi-switch-track') ||
                    $(e.target).hasClass('hmi-slider-input')) {
                    return;
                }
                e.stopPropagation();
                this.openConfigModal(elem.id);
            });
            
            // Click destro per configurare
            $el.on('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.selectElement(elem.id);
                this.openConfigModal(elem.id);
            });
            
            // Interazioni specifiche per tipo
            switch (elem.type) {
                case 'button':
                    const $btn = $el.find('.hmi-button-btn');
                    if (elem.mode === 'momentary') {
                        $btn.on('mousedown touchstart', (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            this.writeVariable(elem, 1);
                            $btn.addClass('pressed');
                        });
                        $btn.on('mouseup mouseleave touchend', (e) => {
                            e.preventDefault();
                            this.writeVariable(elem, 0);
                            $btn.removeClass('pressed');
                        });
                    } else {
                        $btn.on('click', (e) => {
                            e.stopPropagation();
                            const current = this.readVariable(elem);
                            this.writeVariable(elem, current ? 0 : 1);
                        });
                    }
                    break;
                    
                case 'switch':
                    $el.find('.hmi-switch-track').on('click', (e) => {
                        e.stopPropagation();
                        const current = this.readVariable(elem);
                        this.writeVariable(elem, current ? 0 : 1);
                    });
                    break;
                    
                case 'slider':
                    $el.find('.hmi-slider-input').on('input', function(e) {
                        e.stopPropagation();
                        const val = parseInt($(this).val());
                        HMI.writeVariable(elem, val);
                    });
                    break;
            }
        },
        
        // Mouse move globale
        onMouseMove: function(e) {
            if (!this.activeElement) return;
            
            const $canvas = $('#hmi-canvas');
            const canvasRect = $canvas[0].getBoundingClientRect();
            const $el = $(`.hmi-element[data-id="${this.activeElement.id}"]`);
            
            if (this.isDragging) {
                let newX = e.clientX - canvasRect.left - this.dragOffset.x;
                let newY = e.clientY - canvasRect.top - this.dragOffset.y;
                
                // Snap to grid
                newX = this.snap(newX);
                newY = this.snap(newY);
                
                // Limiti canvas
                newX = Math.max(0, Math.min(newX, canvasRect.width - this.activeElement.width));
                newY = Math.max(0, Math.min(newY, canvasRect.height - this.activeElement.height));
                
                this.activeElement.x = newX;
                this.activeElement.y = newY;
                
                $el.css({ left: newX + 'px', top: newY + 'px' });
            }
            
            if (this.isResizing) {
                const elemX = this.activeElement.x;
                const elemY = this.activeElement.y;
                
                let newW = this.activeElement.width;
                let newH = this.activeElement.height;
                
                const mouseX = e.clientX - canvasRect.left;
                const mouseY = e.clientY - canvasRect.top;
                
                if (this.resizeHandle.includes('e')) {
                    newW = this.snap(mouseX - elemX);
                }
                if (this.resizeHandle.includes('s')) {
                    newH = this.snap(mouseY - elemY);
                }
                
                // Dimensioni minime
                newW = Math.max(40, newW);
                newH = Math.max(40, newH);
                
                this.activeElement.width = newW;
                this.activeElement.height = newH;
                
                $el.css({ width: newW + 'px', height: newH + 'px' });
            }
        },
        
        // Mouse up globale
        onMouseUp: function(e) {
            if (this.isDragging || this.isResizing) {
                const $el = $(`.hmi-element[data-id="${this.activeElement.id}"]`);
                $el.removeClass('dragging resizing');
                this.saveToStorage();
            }
            
            this.isDragging = false;
            this.isResizing = false;
            this.activeElement = null;
            this.resizeHandle = null;
        },
        
        // Seleziona elemento
        selectElement: function(id) {
            this.deselectAll();
            const $el = $(`.hmi-element[data-id="${id}"]`);
            $el.addClass('selected');
            this.selectedElement = this.elements.find(e => e.id === id);
        },
        
        // Deseleziona tutti
        deselectAll: function() {
            $('.hmi-element').removeClass('selected');
            this.selectedElement = null;
        },
        
        readVariable: function(elem) {
            switch (elem.varType) {
                case 'I':
                case 'Q':
                case 'M':
                    return PLC.readBit(elem.varType, elem.varNum, elem.varBit);
                case 'T':
                    const timer = PLC.timers['T' + elem.varNum];
                    return timer ? timer.ET : 0;
                case 'C':
                    const counter = PLC.counters['C' + elem.varNum];
                    return counter ? counter.CV : 0;
                case 'MW':
                    return PLC.MW[elem.varNum] || 0;
                default:
                    return 0;
            }
        },
        
        writeVariable: function(elem, value) {
            switch (elem.varType) {
                case 'I':
                case 'Q':
                case 'M':
                    PLC.writeBit(elem.varType, elem.varNum, elem.varBit, value);
                    break;
                case 'MW':
                    PLC.MW[elem.varNum] = value;
                    break;
            }
            this.updateDisplay();
            UI.updateDisplay();
        },
        
        updateDisplay: function() {
            this.elements.forEach(elem => {
                const $el = $(`.hmi-element[data-id="${elem.id}"]`);
                const value = this.readVariable(elem);
                
                switch (elem.type) {
                    case 'led':
                        $el.find('.hmi-led-light').toggleClass('on', value === 1);
                        break;
                        
                    case 'button':
                        if (elem.mode === 'toggle') {
                            $el.find('.hmi-button-btn').toggleClass('pressed', value === 1);
                        }
                        break;
                        
                    case 'switch':
                        $el.find('.hmi-switch-track').toggleClass('on', value === 1);
                        break;
                        
                    case 'display':
                        $el.find('.hmi-display-screen').text(value);
                        break;
                        
                    case 'slider':
                        $el.find('.hmi-slider-input').val(value);
                        $el.find('.hmi-slider-value').text(value);
                        break;
                        
                    case 'gauge':
                        const percent = ((value - elem.min) / (elem.max - elem.min)) * 100;
                        const rotation = 225 + (percent * 2.7); // 270 degree sweep
                        $el.find('.hmi-gauge-fill').css('transform', `rotate(${rotation}deg)`);
                        $el.find('.hmi-gauge-value').text(value);
                        break;
                        
                    // ==================== SIMBOLI INDUSTRIALI ====================
                    case 'motor':
                        $el.find('.hmi-motor').toggleClass('running', value === 1);
                        break;
                        
                    case 'valve':
                        $el.find('.hmi-valve').toggleClass('open', value === 1);
                        break;
                        
                    case 'pump':
                        $el.find('.hmi-pump').toggleClass('running', value === 1);
                        break;
                        
                    case 'tank':
                        // value = 0-100 (percentuale riempimento)
                        const fillPercent = Math.max(0, Math.min(100, value));
                        const fillHeight = 76 * (fillPercent / 100);
                        const fillY = 12 + (76 - fillHeight);
                        $el.find('.hmi-tank-fill').attr('y', fillY).attr('height', fillHeight);
                        $el.find('.hmi-tank-value').text(fillPercent + '%');
                        break;
                        
                    case 'conveyor':
                        $el.find('.hmi-conveyor').toggleClass('running', value === 1);
                        break;
                        
                    case 'light':
                        // value: 0=spento, 1=rosso, 2=giallo, 3=verde
                        $el.find('.hmi-light-lamp').removeClass('on');
                        if (value === 1) $el.find('.hmi-light-lamp.red').addClass('on');
                        else if (value === 2) $el.find('.hmi-light-lamp.yellow').addClass('on');
                        else if (value === 3) $el.find('.hmi-light-lamp.green').addClass('on');
                        break;
                        
                    case 'bargraph':
                        const barPercent = ((value - elem.min) / (elem.max - elem.min)) * 100;
                        $el.find('.hmi-bargraph-fill').css('height', Math.max(0, Math.min(100, barPercent)) + '%');
                        $el.find('.hmi-bargraph-value').text(value);
                        break;
                        
                    case 'text':
                        // Sostituisci {v} con il valore
                        const textContent = elem.label.replace('{v}', value);
                        $el.find('.hmi-text-content').text(textContent);
                        break;
                        
                    case 'trend':
                        // Aggiorna trend con nuovo valore
                        this.updateTrendData(elem, value);
                        break;
                        
                    case 'trend':
                        // Aggiungi valore ai dati trend
                        if (!elem.trendData) elem.trendData = [];
                        elem.trendData.push(value);
                        if (elem.trendData.length > (elem.trendMaxPoints || 100)) {
                            elem.trendData.shift();
                        }
                        // Aggiorna canvas e valore
                        $el.find('.hmi-trend-value').text(value);
                        this.drawTrendCanvas($el.find('.hmi-trend-canvas')[0], elem);
                        break;
                }
            });
            
            // Verifica condizioni allarmi
            this.checkAlarms();
            
            // Aggiorna impianto virtuale
            if (typeof Scene !== 'undefined') {
                Scene.update();
            }
        },
        
        // Disegna grafico trend su canvas
        drawTrendCanvas: function(canvas, elem) {
            if (!canvas) return;
            
            const ctx = canvas.getContext('2d');
            const width = canvas.width;
            const height = canvas.height;
            const data = elem.trendData || [];
            const min = elem.min || 0;
            const max = elem.max || 100;
            const color = elem.color || '#00d4aa';
            
            // Pulisci canvas
            ctx.fillStyle = '#1a1d23';
            ctx.fillRect(0, 0, width, height);
            
            // Griglia
            ctx.strokeStyle = '#3d4451';
            ctx.lineWidth = 1;
            for (let i = 0; i <= 4; i++) {
                const y = (height / 4) * i;
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
                ctx.stroke();
            }
            
            if (data.length < 2) return;
            
            // Disegna linea trend
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            
            const maxPoints = elem.trendMaxPoints || 100;
            const stepX = width / (maxPoints - 1);
            
            data.forEach((val, i) => {
                const x = i * stepX;
                const normalizedVal = (val - min) / (max - min);
                const y = height - (normalizedVal * height);
                
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });
            
            ctx.stroke();
            
            // Area sotto la curva (opzionale)
            ctx.lineTo((data.length - 1) * stepX, height);
            ctx.lineTo(0, height);
            ctx.closePath();
            ctx.fillStyle = color + '20';
            ctx.fill();
        },
        
        openConfigModal: function(id) {
            const elem = this.elements.find(e => e.id === id);
            if (!elem) return;
            
            this.selectedElement = elem;
            
            // Popola form
            $('#hmi-config-label').val(elem.label);
            $('#hmi-config-var-type').val(elem.varType).trigger('change');
            $('#hmi-config-var-num').val(elem.varNum);
            $('#hmi-config-var-bit').val(elem.varBit);
            $('#hmi-config-color').val(elem.color);
            $('#hmi-config-min').val(elem.min);
            $('#hmi-config-max').val(elem.max);
            $('#hmi-config-mode').val(elem.mode);
            
            // Mostra/nascondi campi in base al tipo
            const showRange = elem.type === 'slider' || elem.type === 'gauge' || elem.type === 'display';
            const showMode = elem.type === 'button';
            const showColor = elem.type !== 'slider';
            
            $('#hmi-config-range-group').toggle(showRange);
            $('#hmi-config-mode-group').toggle(showMode);
            $('#hmi-config-color-group').toggle(showColor);
            
            $('#hmi-config-modal').addClass('active');
        },
        
        saveElementConfig: function() {
            if (!this.selectedElement) return;
            
            const elem = this.selectedElement;
            
            elem.label = $('#hmi-config-label').val() || 'ELEM';
            elem.varType = $('#hmi-config-var-type').val();
            elem.varNum = parseInt($('#hmi-config-var-num').val()) || 0;
            elem.varBit = parseInt($('#hmi-config-var-bit').val()) || 0;
            elem.color = $('#hmi-config-color').val();
            elem.min = parseInt($('#hmi-config-min').val()) || 0;
            elem.max = parseInt($('#hmi-config-max').val()) || 100;
            elem.mode = $('#hmi-config-mode').val();
            
            // Re-render
            $(`.hmi-element[data-id="${elem.id}"]`).remove();
            this.renderElement(elem);
            this.saveToStorage();
            
            closeHmiConfigModal();
        },
        
        deleteElement: function() {
            if (!this.selectedElement) return;
            
            const id = this.selectedElement.id;
            this.elements = this.elements.filter(e => e.id !== id);
            $(`.hmi-element[data-id="${id}"]`).remove();
            this.updateEmptyMessage();
            this.saveToStorage();
            
            closeHmiConfigModal();
        },
        
        clearAll: function() {
            const page = this.getCurrentPage();
            if (page) {
                page.elements = [];
            }
            this.elements = [];
            $('#hmi-canvas .hmi-element').remove();
            this.updateEmptyMessage();
            this.saveToStorage();
        },
        
        updateEmptyMessage: function() {
            if (this.elements.length === 0) {
                if (!$('#hmi-canvas .hmi-empty-message').length) {
                    $('#hmi-canvas').append(`
                        <div class="hmi-empty-message">
                            <p>Pannello HMI vuoto</p>
                            <p>Usa i pulsanti sopra per aggiungere elementi</p>
                        </div>
                    `);
                }
            } else {
                $('#hmi-canvas .hmi-empty-message').remove();
            }
        },
        
        saveToStorage: function() {
            try {
                // Salva elementi nella pagina corrente prima di salvare
                const currentPage = this.getCurrentPage();
                if (currentPage) {
                    currentPage.elements = this.elements;
                    currentPage.background = this.backgroundImage;
                    currentPage.bgOpacity = this.backgroundOpacity;
                }
                
                const data = {
                    model: this.currentModel,
                    functionKeys: this.functionKeys,
                    pages: this.pages,
                    currentPageId: this.currentPageId,
                    pageCounter: this.pageCounter,
                    elementCounter: this.elementCounter
                };
                localStorage.setItem('plc_hmi_config', JSON.stringify(data));
            } catch (e) {
                console.warn('Impossibile salvare HMI in localStorage');
            }
        },
        
        loadFromStorage: function() {
            try {
                const saved = localStorage.getItem('plc_hmi_config');
                if (saved) {
                    const data = JSON.parse(saved);
                    
                    // Carica modello HMI se presente
                    if (data.model && this.hmiModels[data.model]) {
                        this.setModel(data.model, true);
                    }
                    
                    // Carica configurazione tasti funzione
                    if (data.functionKeys) {
                        this.functionKeys = data.functionKeys;
                    }
                    
                    // Nuovo formato con pagine
                    if (data.pages) {
                        this.pages = data.pages;
                        this.currentPageId = data.currentPageId || 1;
                        this.pageCounter = data.pageCounter || 1;
                        this.elementCounter = data.elementCounter || 0;
                        
                        const currentPage = this.getCurrentPage();
                        this.elements = currentPage.elements || [];
                        this.backgroundImage = currentPage.background || null;
                        this.backgroundOpacity = currentPage.bgOpacity !== undefined ? currentPage.bgOpacity : 0.5;
                    } else {
                        // Compatibilita: vecchio formato singola pagina
                        this.elements = data.elements || [];
                        this.backgroundImage = data.backgroundImage || null;
                        this.backgroundOpacity = data.backgroundOpacity !== undefined ? data.backgroundOpacity : 0.5;
                        
                        // Migra a nuovo formato
                        this.pages = [{
                            id: 1,
                            name: 'Pagina 1',
                            elements: this.elements,
                            background: this.backgroundImage,
                            bgOpacity: this.backgroundOpacity
                        }];
                    }
                    
                    this.renderPageTabs();
                    this.elements.forEach(elem => {
                        this.elementCounter = Math.max(this.elementCounter, elem.id);
                        this.renderElement(elem);
                    });
                    this.updateEmptyMessage();
                    this.applyBackgroundImage();
                    
                    // Rigenera tasti funzione con configurazione caricata
                    this.generateFunctionKeys(this.getCurrentModelInfo());
                } else {
                    // Nessun dato salvato, inizializza pagine
                    this.renderPageTabs();
                }
            } catch (e) {
                console.warn('Impossibile caricare HMI da localStorage');
                this.renderPageTabs();
            }
        },
        
        // ==================== SISTEMA ALLARMI ====================
        loadAlarms: function() {
            try {
                const saved = localStorage.getItem('plc_hmi_alarms');
                if (saved) {
                    const data = JSON.parse(saved);
                    this.alarms = data.alarms || [];
                    this.alarmCounter = data.alarmCounter || 0;
                }
            } catch(e) {
                console.warn('Errore caricamento allarmi');
            }
        },
        
        saveAlarms: function() {
            try {
                localStorage.setItem('plc_hmi_alarms', JSON.stringify({
                    alarms: this.alarms,
                    alarmCounter: this.alarmCounter
                }));
            } catch(e) {
                console.warn('Errore salvataggio allarmi');
            }
        },
        
        toggleAlarmPanel: function() {
            this.alarmPanelVisible = !this.alarmPanelVisible;
            
            if (this.alarmPanelVisible) {
                this.showAlarmPanel();
            } else {
                $('#alarm-panel').removeClass('visible');
            }
        },
        
        showAlarmPanel: function() {
            let $panel = $('#alarm-panel');
            if (!$panel.length) {
                $panel = $(`
                    <div id="alarm-panel" class="alarm-panel">
                        <div class="alarm-panel-header">
                            <h3>⚠️ Gestione Allarmi</h3>
                            <button id="alarm-panel-close" class="plc-btn plc-btn-small">×</button>
                        </div>
                        <div class="alarm-panel-toolbar">
                            <button id="alarm-add" class="plc-btn plc-btn-small">+ Nuovo Allarme</button>
                            <button id="alarm-ack-all" class="plc-btn plc-btn-small">✓ Ack Tutti</button>
                            <button id="alarm-clear-inactive" class="plc-btn plc-btn-small">🗑 Pulisci</button>
                        </div>
                        <div class="alarm-list" id="alarm-list"></div>
                        <div class="alarm-history">
                            <h4>Cronologia</h4>
                            <div id="alarm-history-list"></div>
                        </div>
                    </div>
                `);
                $('body').append($panel);
                
                $('#alarm-panel-close').on('click', () => this.toggleAlarmPanel());
                $('#alarm-add').on('click', () => this.showAddAlarmModal());
                $('#alarm-ack-all').on('click', () => this.acknowledgeAllAlarms());
                $('#alarm-clear-inactive').on('click', () => this.clearInactiveAlarms());
            }
            
            this.renderAlarmList();
            $panel.addClass('visible');
        },
        
        renderAlarmList: function() {
            const $list = $('#alarm-list');
            $list.empty();
            
            if (this.alarms.length === 0) {
                $list.html('<p class="alarm-empty">Nessun allarme configurato</p>');
                return;
            }
            
            this.alarms.forEach(alarm => {
                const statusClass = alarm.active ? (alarm.acknowledged ? 'acked' : 'active') : 'inactive';
                const varAddr = alarm.varType === 'MW' ? `MW${alarm.varNum}` : `${alarm.varType}${alarm.varNum}.${alarm.varBit}`;
                
                const $item = $(`
                    <div class="alarm-item ${statusClass}" data-alarm-id="${alarm.id}">
                        <div class="alarm-status-icon">${alarm.active ? '🔴' : '⚪'}</div>
                        <div class="alarm-info">
                            <div class="alarm-message">${alarm.message}</div>
                            <div class="alarm-condition">${varAddr} ${alarm.condition} ${alarm.value}</div>
                        </div>
                        <div class="alarm-actions">
                            ${alarm.active && !alarm.acknowledged ? '<button class="alarm-ack" title="Acknowledge">✓</button>' : ''}
                            <button class="alarm-edit" title="Modifica">✎</button>
                            <button class="alarm-delete" title="Elimina">×</button>
                        </div>
                    </div>
                `);
                
                $item.find('.alarm-ack').on('click', () => this.acknowledgeAlarm(alarm.id));
                $item.find('.alarm-edit').on('click', () => this.editAlarm(alarm.id));
                $item.find('.alarm-delete').on('click', () => this.deleteAlarm(alarm.id));
                
                $list.append($item);
            });
        },
        
        showAddAlarmModal: function(alarmId) {
            const alarm = alarmId ? this.alarms.find(a => a.id === alarmId) : null;
            
            let $modal = $('#alarm-config-modal');
            if (!$modal.length) {
                $modal = $(`
                    <div id="alarm-config-modal" class="plc-modal">
                        <div class="plc-modal-content">
                            <h2>${alarm ? 'Modifica' : 'Nuovo'} Allarme</h2>
                            <div class="plc-form-group">
                                <label>Messaggio:</label>
                                <input type="text" id="alarm-message" placeholder="Descrizione allarme">
                            </div>
                            <div class="plc-form-group">
                                <label>Variabile:</label>
                                <select id="alarm-var-type">
                                    <option value="I">I - Ingresso</option>
                                    <option value="Q">Q - Uscita</option>
                                    <option value="M">M - Merker</option>
                                    <option value="MW">MW - Memory Word</option>
                                </select>
                                <input type="number" id="alarm-var-num" min="0" value="0" style="width:60px;">
                                <span id="alarm-bit-group">.</span>
                                <input type="number" id="alarm-var-bit" min="0" max="7" value="0" style="width:50px;">
                            </div>
                            <div class="plc-form-group">
                                <label>Condizione:</label>
                                <select id="alarm-condition">
                                    <option value="==">= (Uguale)</option>
                                    <option value="!=">≠ (Diverso)</option>
                                    <option value=">">> (Maggiore)</option>
                                    <option value="<">< (Minore)</option>
                                    <option value=">=">≥ (Maggiore/Uguale)</option>
                                    <option value="<=">≤ (Minore/Uguale)</option>
                                </select>
                                <input type="number" id="alarm-value" value="1" style="width:80px;">
                            </div>
                            <div class="plc-modal-buttons">
                                <button id="alarm-save" class="plc-btn plc-btn-primary">Salva</button>
                                <button id="alarm-cancel" class="plc-btn">Annulla</button>
                            </div>
                        </div>
                    </div>
                `);
                $('body').append($modal);
                
                $('#alarm-var-type').on('change', function() {
                    const isMW = $(this).val() === 'MW';
                    $('#alarm-bit-group, #alarm-var-bit').toggle(!isMW);
                });
                
                $('#alarm-cancel').on('click', () => $modal.removeClass('active'));
            }
            
            // Popola form
            if (alarm) {
                $modal.data('alarm-id', alarm.id);
                $('#alarm-message').val(alarm.message);
                $('#alarm-var-type').val(alarm.varType).trigger('change');
                $('#alarm-var-num').val(alarm.varNum);
                $('#alarm-var-bit').val(alarm.varBit);
                $('#alarm-condition').val(alarm.condition);
                $('#alarm-value').val(alarm.value);
            } else {
                $modal.removeData('alarm-id');
                $('#alarm-message').val('');
                $('#alarm-var-type').val('I').trigger('change');
                $('#alarm-var-num').val(0);
                $('#alarm-var-bit').val(0);
                $('#alarm-condition').val('==');
                $('#alarm-value').val(1);
            }
            
            // Save handler
            $('#alarm-save').off('click').on('click', () => {
                const id = $modal.data('alarm-id');
                const alarmData = {
                    message: $('#alarm-message').val() || 'Allarme',
                    varType: $('#alarm-var-type').val(),
                    varNum: parseInt($('#alarm-var-num').val()) || 0,
                    varBit: parseInt($('#alarm-var-bit').val()) || 0,
                    condition: $('#alarm-condition').val(),
                    value: parseInt($('#alarm-value').val()) || 0,
                    active: false,
                    acknowledged: false,
                    timestamp: null
                };
                
                if (id) {
                    const existing = this.alarms.find(a => a.id === id);
                    if (existing) Object.assign(existing, alarmData);
                } else {
                    alarmData.id = ++this.alarmCounter;
                    this.alarms.push(alarmData);
                }
                
                this.saveAlarms();
                this.renderAlarmList();
                $modal.removeClass('active');
            });
            
            $modal.addClass('active');
        },
        
        editAlarm: function(id) {
            this.showAddAlarmModal(id);
        },
        
        deleteAlarm: function(id) {
            if (!confirm('Eliminare questo allarme?')) return;
            this.alarms = this.alarms.filter(a => a.id !== id);
            this.saveAlarms();
            this.renderAlarmList();
            this.updateAlarmBadge();
        },
        
        acknowledgeAlarm: function(id) {
            const alarm = this.alarms.find(a => a.id === id);
            if (alarm) {
                alarm.acknowledged = true;
                this.saveAlarms();
                this.renderAlarmList();
                this.updateAlarmBadge();
            }
        },
        
        acknowledgeAllAlarms: function() {
            this.alarms.forEach(a => {
                if (a.active) a.acknowledged = true;
            });
            this.saveAlarms();
            this.renderAlarmList();
            this.updateAlarmBadge();
        },
        
        clearInactiveAlarms: function() {
            this.alarms = this.alarms.filter(a => a.active);
            this.saveAlarms();
            this.renderAlarmList();
        },
        
        // Chiamato dal ciclo scan per verificare condizioni allarme
        checkAlarms: function() {
            let activeCount = 0;
            
            this.alarms.forEach(alarm => {
                let currentValue;
                if (alarm.varType === 'MW') {
                    currentValue = PLC.MW[alarm.varNum] || 0;
                } else {
                    currentValue = PLC.readBit(alarm.varType, alarm.varNum, alarm.varBit);
                }
                
                let conditionMet = false;
                switch(alarm.condition) {
                    case '==': conditionMet = currentValue === alarm.value; break;
                    case '!=': conditionMet = currentValue !== alarm.value; break;
                    case '>':  conditionMet = currentValue > alarm.value; break;
                    case '<':  conditionMet = currentValue < alarm.value; break;
                    case '>=': conditionMet = currentValue >= alarm.value; break;
                    case '<=': conditionMet = currentValue <= alarm.value; break;
                }
                
                const wasActive = alarm.active;
                alarm.active = conditionMet;
                
                if (conditionMet && !wasActive) {
                    // Nuovo allarme attivato
                    alarm.acknowledged = false;
                    alarm.timestamp = new Date().toISOString();
                }
                
                if (alarm.active && !alarm.acknowledged) {
                    activeCount++;
                }
            });
            
            this.updateAlarmBadge(activeCount);
            
            // Aggiorna lista se pannello visibile
            if (this.alarmPanelVisible) {
                this.renderAlarmList();
            }
        },
        
        updateAlarmBadge: function(count) {
            if (count === undefined) {
                count = this.alarms.filter(a => a.active && !a.acknowledged).length;
            }
            
            const $badge = $('#alarm-badge');
            if (count > 0) {
                $badge.text(count).show();
            } else {
                $badge.hide();
            }
        },
        
        // Esporta configurazione HMI (per salvataggio con programma)
        exportConfig: function() {
            // Salva elementi correnti nella pagina attuale prima di esportare
            const currentPage = this.getCurrentPage();
            if (currentPage) {
                currentPage.elements = this.elements;
                currentPage.background = this.backgroundImage;
                currentPage.bgOpacity = this.backgroundOpacity;
            }
            
            return JSON.stringify({
                model: this.currentModel,
                functionKeys: this.functionKeys,
                pages: this.pages,
                currentPageId: this.currentPageId,
                pageCounter: this.pageCounter,
                elementCounter: this.elementCounter
            });
        },
        
        // Importa configurazione HMI
        importConfig: function(json) {
            try {
                this.clearAll();
                const data = JSON.parse(json);
                
                // Carica modello HMI se presente
                if (data.model && this.hmiModels[data.model]) {
                    this.setModel(data.model, true);
                }
                
                // Carica configurazione tasti funzione
                if (data.functionKeys) {
                    this.functionKeys = data.functionKeys;
                } else {
                    this.functionKeys = {};
                }
                
                // Supporta vari formati
                if (data.pages) {
                    // Nuovo formato multi-pagina
                    this.pages = data.pages;
                    this.currentPageId = data.currentPageId || 1;
                    this.pageCounter = data.pageCounter || 1;
                    this.elementCounter = data.elementCounter || 0;
                } else if (Array.isArray(data)) {
                    // Vecchissimo formato (solo array elementi)
                    this.pages = [{
                        id: 1, name: 'Pagina 1',
                        elements: data, background: null, bgOpacity: 0.5
                    }];
                    this.currentPageId = 1;
                } else if (data.elements) {
                    // Vecchio formato singola pagina
                    this.pages = [{
                        id: 1, name: 'Pagina 1',
                        elements: data.elements || [],
                        background: data.backgroundImage || null,
                        bgOpacity: data.backgroundOpacity !== undefined ? data.backgroundOpacity : 0.5
                    }];
                    this.currentPageId = 1;
                }
                
                const currentPage = this.getCurrentPage();
                this.elements = currentPage.elements || [];
                this.backgroundImage = currentPage.background || null;
                this.backgroundOpacity = currentPage.bgOpacity !== undefined ? currentPage.bgOpacity : 0.5;
                
                this.renderPageTabs();
                this.elements.forEach(elem => {
                    this.elementCounter = Math.max(this.elementCounter, elem.id);
                    this.renderElement(elem);
                });
                this.updateEmptyMessage();
                this.applyBackgroundImage();
                
                // Rigenera tasti funzione con nuova configurazione
                this.generateFunctionKeys(this.getCurrentModelInfo());
            } catch (e) {
                console.error('Errore importazione HMI:', e);
            }
        },
        
        // ==================== TREND SYSTEM ====================
        
        trendData: {}, // { elemId: { timestamps: [], values: [] } }
        
        updateTrendData: function(elem, value) {
            if (!this.trendData[elem.id]) {
                this.trendData[elem.id] = { timestamps: [], values: [] };
            }
            
            const data = this.trendData[elem.id];
            const now = Date.now();
            const duration = (elem.duration || 30) * 1000;
            
            // Aggiungi nuovo punto
            data.timestamps.push(now);
            data.values.push(value);
            
            // Rimuovi dati vecchi
            const cutoff = now - duration;
            while (data.timestamps.length > 0 && data.timestamps[0] < cutoff) {
                data.timestamps.shift();
                data.values.shift();
            }
            
            // Disegna canvas
            this.drawTrend(elem);
        },
        
        drawTrend: function(elem) {
            const canvas = document.querySelector(`.hmi-trend-canvas[data-id="${elem.id}"]`);
            if (!canvas) return;
            
            const ctx = canvas.getContext('2d');
            const rect = canvas.parentElement.getBoundingClientRect();
            canvas.width = rect.width - 10;
            canvas.height = rect.height - 30;
            
            const w = canvas.width;
            const h = canvas.height;
            const data = this.trendData[elem.id] || { timestamps: [], values: [] };
            const yMin = elem.yMin !== undefined ? elem.yMin : 0;
            const yMax = elem.yMax !== undefined ? elem.yMax : 100;
            const duration = (elem.duration || 30) * 1000;
            
            // Sfondo
            ctx.fillStyle = '#0a0a0a';
            ctx.fillRect(0, 0, w, h);
            
            // Griglia
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 0.5;
            for (let i = 0; i <= 4; i++) {
                const y = (h / 4) * i;
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(w, y);
                ctx.stroke();
            }
            for (let i = 0; i <= 6; i++) {
                const x = (w / 6) * i;
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, h);
                ctx.stroke();
            }
            
            if (data.values.length < 2) return;
            
            const now = Date.now();
            
            // Disegna linea dati
            ctx.strokeStyle = '#00d4aa';
            ctx.lineWidth = 2;
            ctx.beginPath();
            
            for (let i = 0; i < data.values.length; i++) {
                const x = w - ((now - data.timestamps[i]) / duration) * w;
                const y = h - ((data.values[i] - yMin) / (yMax - yMin)) * h;
                
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
            
            // Etichette asse Y
            ctx.fillStyle = '#666';
            ctx.font = '9px monospace';
            ctx.fillText(yMax.toString(), 2, 10);
            ctx.fillText(yMin.toString(), 2, h - 2);
        },
        
        openTrendConfigModal: function(elem) {
            this.selectedElement = elem;
            $('#trend-label').val(elem.label || 'Trend');
            $('#trend-duration').val(elem.duration || 30);
            $('#trend-y-min').val(elem.yMin !== undefined ? elem.yMin : 0);
            $('#trend-y-max').val(elem.yMax !== undefined ? elem.yMax : 100);
            
            // Popola lista variabili
            const $list = $('#trend-var-list');
            $list.empty();
            
            const vars = elem.trendVars || [{ type: elem.varType, num: elem.varNum, bit: elem.varBit, color: '#00d4aa' }];
            vars.forEach((v, idx) => {
                this.addTrendVarRow(v, idx);
            });
            
            $('#trend-config-modal').addClass('active');
        },
        
        addTrendVarRow: function(v, idx) {
            const colors = ['#00d4aa', '#3b82f6', '#ef4444', '#f59e0b', '#22c55e', '#9333ea'];
            const color = v.color || colors[idx % colors.length];
            
            const html = `
                <div class="trend-var-row" data-idx="${idx}">
                    <select class="trend-var-type">
                        <option value="I" ${v.type === 'I' ? 'selected' : ''}>I</option>
                        <option value="Q" ${v.type === 'Q' ? 'selected' : ''}>Q</option>
                        <option value="M" ${v.type === 'M' ? 'selected' : ''}>M</option>
                        <option value="T" ${v.type === 'T' ? 'selected' : ''}>T</option>
                        <option value="C" ${v.type === 'C' ? 'selected' : ''}>C</option>
                        <option value="MW" ${v.type === 'MW' ? 'selected' : ''}>MW</option>
                    </select>
                    <input type="number" class="trend-var-num" value="${v.num || 0}" style="width:50px;">
                    <input type="color" class="trend-var-color" value="${color}" style="width:40px;">
                    <button class="plc-btn trend-var-remove" style="padding:4px 8px;">X</button>
                </div>
            `;
            $('#trend-var-list').append(html);
        },
        
        // ==================== ALARM SYSTEM ====================
        
        alarms: [],          // Configurazione allarmi
        activeAlarms: [],    // Allarmi attualmente attivi
        alarmHistory: [],    // Storico allarmi
        alarmCounter: 0,
        
        toggleAlarmPanel: function() {
            $('#alarm-panel').toggleClass('active');
        },
        
        setupAlarmEvents: function() {
            // Questa funzione viene chiamata in setupEventListeners
            $('#alarm-add').on('click', () => this.openAlarmConfigModal());
            $('#alarm-ack-all').on('click', () => this.ackAllAlarms());
            $('#alarm-clear-history').on('click', () => this.clearAlarmHistory());
            $('#alarm-close').on('click', () => this.toggleAlarmPanel());
            
            // Modal
            $('#alarm-save').on('click', () => this.saveAlarm());
            $('#alarm-delete').on('click', () => this.deleteAlarm());
            
            // Condizione mostra/nascondi threshold
            $('#alarm-condition').on('change', function() {
                const cond = $(this).val();
                const showThreshold = cond !== 'eq1' && cond !== 'eq0';
                $('#alarm-threshold').toggle(showThreshold);
            });
            
            // Bit group
            $('#alarm-var-type').on('change', function() {
                const type = $(this).val();
                $('#alarm-bit-group').toggle(type !== 'T' && type !== 'C' && type !== 'MW');
            });
            
            // Click su config allarme
            $(document).on('click', '.alarm-config-item', (e) => {
                const id = $(e.currentTarget).data('alarm-id');
                const alarm = this.alarms.find(a => a.id === id);
                if (alarm) this.openAlarmConfigModal(alarm);
            });
            
            // ACK singolo allarme
            $(document).on('click', '.alarm-ack-btn', (e) => {
                e.stopPropagation();
                const id = $(e.target).closest('.alarm-item').data('alarm-id');
                this.ackAlarm(id);
            });
            
            // Trend events
            $('#trend-add-var').on('click', () => {
                const idx = $('#trend-var-list .trend-var-row').length;
                this.addTrendVarRow({ type: 'M', num: 0, bit: 0 }, idx);
            });
            
            $(document).on('click', '.trend-var-remove', function() {
                $(this).closest('.trend-var-row').remove();
            });
            
            $('#trend-config-save').on('click', () => this.saveTrendConfig());
            $('#trend-config-delete').on('click', () => this.deleteElement());
        },
        
        saveTrendConfig: function() {
            if (!this.selectedElement) return;
            
            const elem = this.selectedElement;
            elem.label = $('#trend-label').val() || 'Trend';
            elem.duration = parseInt($('#trend-duration').val()) || 30;
            elem.yMin = parseInt($('#trend-y-min').val()) || 0;
            elem.yMax = parseInt($('#trend-y-max').val()) || 100;
            
            // Raccogli variabili
            elem.trendVars = [];
            $('#trend-var-list .trend-var-row').each(function() {
                elem.trendVars.push({
                    type: $(this).find('.trend-var-type').val(),
                    num: parseInt($(this).find('.trend-var-num').val()) || 0,
                    color: $(this).find('.trend-var-color').val()
                });
            });
            
            // Imposta prima variabile come principale
            if (elem.trendVars.length > 0) {
                elem.varType = elem.trendVars[0].type;
                elem.varNum = elem.trendVars[0].num;
            }
            
            // Re-render
            $(`.hmi-element[data-id="${elem.id}"]`).remove();
            this.renderElement(elem);
            this.saveToStorage();
            
            closeTrendConfigModal();
        },
        
        openAlarmConfigModal: function(alarm) {
            if (alarm) {
                // Modifica esistente
                this.editingAlarm = alarm;
                $('#alarm-modal-title').text('Modifica Allarme');
                $('#alarm-msg').val(alarm.msg);
                $('#alarm-var-type').val(alarm.varType).trigger('change');
                $('#alarm-var-num').val(alarm.varNum);
                $('#alarm-var-bit').val(alarm.varBit);
                $('#alarm-condition').val(alarm.condition).trigger('change');
                $('#alarm-threshold').val(alarm.threshold);
                $('#alarm-priority').val(alarm.priority);
                $('#alarm-ack-required').prop('checked', alarm.ackRequired);
                $('#alarm-delete').show();
            } else {
                // Nuovo allarme
                this.editingAlarm = null;
                $('#alarm-modal-title').text('Nuovo Allarme');
                $('#alarm-msg').val('');
                $('#alarm-var-type').val('M').trigger('change');
                $('#alarm-var-num').val(0);
                $('#alarm-var-bit').val(0);
                $('#alarm-condition').val('eq1').trigger('change');
                $('#alarm-threshold').val(0);
                $('#alarm-priority').val('high');
                $('#alarm-ack-required').prop('checked', true);
                $('#alarm-delete').hide();
            }
            
            $('#alarm-config-modal').addClass('active');
        },
        
        saveAlarm: function() {
            const alarmData = {
                msg: $('#alarm-msg').val() || 'Allarme',
                varType: $('#alarm-var-type').val(),
                varNum: parseInt($('#alarm-var-num').val()) || 0,
                varBit: parseInt($('#alarm-var-bit').val()) || 0,
                condition: $('#alarm-condition').val(),
                threshold: parseInt($('#alarm-threshold').val()) || 0,
                priority: $('#alarm-priority').val(),
                ackRequired: $('#alarm-ack-required').is(':checked'),
                enabled: true
            };
            
            if (this.editingAlarm) {
                // Modifica
                Object.assign(this.editingAlarm, alarmData);
            } else {
                // Nuovo
                alarmData.id = ++this.alarmCounter;
                this.alarms.push(alarmData);
            }
            
            this.renderAlarmConfigList();
            this.saveAlarmsToStorage();
            closeAlarmConfigModal();
        },
        
        deleteAlarm: function() {
            if (!this.editingAlarm) return;
            
            this.alarms = this.alarms.filter(a => a.id !== this.editingAlarm.id);
            this.activeAlarms = this.activeAlarms.filter(a => a.alarmId !== this.editingAlarm.id);
            
            this.renderAlarmConfigList();
            this.renderActiveAlarms();
            this.saveAlarmsToStorage();
            closeAlarmConfigModal();
        },
        
        renderAlarmConfigList: function() {
            const $list = $('#alarm-config-list');
            $list.empty();
            
            if (this.alarms.length === 0) {
                $list.html('<div class="alarm-empty">Nessun allarme configurato</div>');
                return;
            }
            
            this.alarms.forEach(alarm => {
                const varStr = this.formatAlarmVar(alarm);
                $list.append(`
                    <div class="alarm-config-item" data-alarm-id="${alarm.id}">
                        <span class="alarm-priority-dot ${alarm.priority}"></span>
                        <span class="config-msg">${alarm.msg}</span>
                        <span class="config-var">${varStr}</span>
                        <span class="${alarm.enabled ? 'config-enabled' : 'config-disabled'}">${alarm.enabled ? '✓' : '○'}</span>
                    </div>
                `);
            });
        },
        
        formatAlarmVar: function(alarm) {
            if (alarm.varType === 'T' || alarm.varType === 'C' || alarm.varType === 'MW') {
                return `${alarm.varType}${alarm.varNum}`;
            }
            return `${alarm.varType}${alarm.varNum}.${alarm.varBit}`;
        },
        
        checkAlarms: function() {
            if (!PLC.running) return;
            
            this.alarms.forEach(alarm => {
                if (!alarm.enabled) return;
                
                const value = this.readAlarmVariable(alarm);
                const triggered = this.evaluateAlarmCondition(alarm, value);
                
                const existing = this.activeAlarms.find(a => a.alarmId === alarm.id);
                
                if (triggered && !existing) {
                    // Nuovo allarme attivo
                    const activeAlarm = {
                        id: Date.now(),
                        alarmId: alarm.id,
                        msg: alarm.msg,
                        priority: alarm.priority,
                        timestamp: new Date(),
                        acked: !alarm.ackRequired,
                        varStr: this.formatAlarmVar(alarm)
                    };
                    this.activeAlarms.push(activeAlarm);
                    this.addToHistory('in', alarm.msg);
                    this.renderActiveAlarms();
                    this.updateAlarmBadge();
                    
                } else if (!triggered && existing) {
                    // Allarme rientrato
                    this.activeAlarms = this.activeAlarms.filter(a => a.id !== existing.id);
                    this.addToHistory('out', alarm.msg);
                    this.renderActiveAlarms();
                    this.updateAlarmBadge();
                }
            });
        },
        
        readAlarmVariable: function(alarm) {
            switch (alarm.varType) {
                case 'I':
                case 'Q':
                case 'M':
                    return PLC.readBit(alarm.varType, alarm.varNum, alarm.varBit);
                case 'T':
                    const timer = PLC.timers['T' + alarm.varNum];
                    return timer ? timer.ET : 0;
                case 'C':
                    const counter = PLC.counters['C' + alarm.varNum];
                    return counter ? counter.CV : 0;
                case 'MW':
                    return PLC.MW[alarm.varNum] || 0;
                default:
                    return 0;
            }
        },
        
        evaluateAlarmCondition: function(alarm, value) {
            switch (alarm.condition) {
                case 'eq1': return value === 1;
                case 'eq0': return value === 0;
                case 'gt': return value > alarm.threshold;
                case 'lt': return value < alarm.threshold;
                case 'ge': return value >= alarm.threshold;
                case 'le': return value <= alarm.threshold;
                default: return false;
            }
        },
        
        renderActiveAlarms: function() {
            const $list = $('#active-alarms');
            $list.empty();
            
            $('#active-alarm-count').text(`(${this.activeAlarms.length})`);
            
            if (this.activeAlarms.length === 0) {
                $list.html('<div class="alarm-empty">Nessun allarme attivo</div>');
                return;
            }
            
            // Ordina per priorità e timestamp
            const sorted = [...this.activeAlarms].sort((a, b) => {
                const prio = { high: 0, medium: 1, low: 2, info: 3 };
                return (prio[a.priority] - prio[b.priority]) || (b.timestamp - a.timestamp);
            });
            
            sorted.forEach(alarm => {
                const time = alarm.timestamp.toLocaleTimeString('it-IT');
                $list.append(`
                    <div class="alarm-item ${alarm.priority} ${alarm.acked ? 'acked' : 'unacked'}" data-alarm-id="${alarm.id}">
                        <span class="alarm-icon-small">⚠</span>
                        <div class="alarm-details">
                            <div class="alarm-msg">${alarm.msg}</div>
                            <div class="alarm-time">${time} <span class="alarm-var">${alarm.varStr}</span></div>
                        </div>
                        ${!alarm.acked ? '<button class="alarm-ack-btn">ACK</button>' : ''}
                    </div>
                `);
            });
        },
        
        ackAlarm: function(id) {
            const alarm = this.activeAlarms.find(a => a.id === id);
            if (alarm) {
                alarm.acked = true;
                this.addToHistory('ack', alarm.msg);
                this.renderActiveAlarms();
                this.updateAlarmBadge();
            }
        },
        
        ackAllAlarms: function() {
            this.activeAlarms.forEach(a => {
                if (!a.acked) {
                    a.acked = true;
                    this.addToHistory('ack', a.msg);
                }
            });
            this.renderActiveAlarms();
            this.updateAlarmBadge();
        },
        
        addToHistory: function(type, msg) {
            const entry = {
                time: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                type: type,
                msg: msg
            };
            this.alarmHistory.unshift(entry);
            
            // Limita storico
            if (this.alarmHistory.length > 100) {
                this.alarmHistory.pop();
            }
            
            this.renderAlarmHistory();
        },
        
        renderAlarmHistory: function() {
            const $hist = $('#alarm-history');
            $hist.empty();
            
            $('#alarm-history-count').text(`(${this.alarmHistory.length})`);
            
            this.alarmHistory.forEach(entry => {
                const typeLabel = { 'in': 'IN', 'out': 'OUT', 'ack': 'ACK' }[entry.type];
                $hist.append(`
                    <div class="alarm-history-item">
                        <span class="hist-time">${entry.time}</span>
                        <span class="hist-type ${entry.type}">${typeLabel}</span>
                        <span class="hist-msg">${entry.msg}</span>
                    </div>
                `);
            });
        },
        
        clearAlarmHistory: function() {
            if (confirm('Cancellare lo storico allarmi?')) {
                this.alarmHistory = [];
                this.renderAlarmHistory();
            }
        },
        
        updateAlarmBadge: function() {
            const unacked = this.activeAlarms.filter(a => !a.acked).length;
            const $badge = $('#alarm-badge');
            
            if (unacked > 0) {
                $badge.text(unacked).show();
            } else {
                $badge.hide();
            }
        },
        
        saveAlarmsToStorage: function() {
            try {
                localStorage.setItem('plc_alarms', JSON.stringify({
                    alarms: this.alarms,
                    counter: this.alarmCounter
                }));
            } catch (e) {
                console.warn('Impossibile salvare allarmi');
            }
        },
        
        loadAlarmsFromStorage: function() {
            try {
                const saved = localStorage.getItem('plc_alarms');
                if (saved) {
                    const data = JSON.parse(saved);
                    this.alarms = data.alarms || [];
                    this.alarmCounter = data.counter || 0;
                    this.renderAlarmConfigList();
                }
            } catch (e) {
                console.warn('Impossibile caricare allarmi');
            }
        }
    };

    // ==================== IMPIANTO VIRTUALE (Scene) ====================
    const Scene = {
        elements: [],
        elementCounter: 0,
        selectedElement: null,
        panelVisible: false,
        draggedTool: null,
        isDragging: false,
        dragOffset: { x: 0, y: 0 },

        init: function() {
            this.setupEventListeners();
            this.loadScene();
        },

        setupEventListeners: function() {
            // Toggle pannello
            $('#btn-scene').on('click', () => this.togglePanel());
            $('#scene-close').on('click', () => this.togglePanel());
            
            // Template preimpostati
            $('#scene-template').on('change', (e) => {
                const template = e.target.value;
                if (template) {
                    this.loadTemplate(template);
                    e.target.value = '';
                }
            });
            
            // Pulisci scena
            $('#scene-clear').on('click', () => {
                if (confirm('Eliminare tutti gli elementi dalla scena?')) {
                    this.clearScene();
                }
            });
            
            // Drag dalla toolbar
            $('.scene-tool').on('mousedown', (e) => {
                this.draggedTool = $(e.currentTarget).data('type');
            });
            
            // Canvas events
            const canvas = document.getElementById('scene-canvas');
            if (canvas) {
                canvas.addEventListener('mousedown', (e) => this.onCanvasMouseDown(e));
                canvas.addEventListener('mousemove', (e) => this.onCanvasMouseMove(e));
                canvas.addEventListener('mouseup', (e) => this.onCanvasMouseUp(e));
                canvas.addEventListener('mouseleave', () => this.onCanvasMouseUp());
                canvas.addEventListener('dblclick', (e) => this.onCanvasDoubleClick(e));
                canvas.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    this.onCanvasDoubleClick(e); // Click destro = configura
                });
            }
            
            // Config modal
            $('#scene-config-save').on('click', () => this.saveElementConfig());
            $('#scene-config-delete').on('click', () => this.deleteSelectedElement());
            
            // Cambia tipo variabile
            $('#scene-config-var-type').on('change', (e) => {
                const isMW = e.target.value === 'MW';
                $('#scene-config-bit-sep').toggle(!isMW);
                $('#scene-config-var-bit').toggle(!isMW);
            });
        },

        togglePanel: function() {
            this.panelVisible = !this.panelVisible;
            $('#scene-panel').toggleClass('active', this.panelVisible);
            if (this.panelVisible) {
                this.render();
            }
        },

        // Coordinate mouse -> SVG
        getSVGPoint: function(e) {
            const svg = document.getElementById('scene-canvas');
            const rect = svg.getBoundingClientRect();
            const scaleX = 800 / rect.width;
            const scaleY = 500 / rect.height;
            return {
                x: (e.clientX - rect.left) * scaleX,
                y: (e.clientY - rect.top) * scaleY
            };
        },

        onCanvasMouseDown: function(e) {
            const pt = this.getSVGPoint(e);
            
            // Se stavo trascinando un tool dalla toolbar
            if (this.draggedTool) {
                this.addElement(this.draggedTool, pt.x, pt.y);
                this.draggedTool = null;
                return;
            }
            
            // Cerca elemento cliccato
            const elem = this.findElementAt(pt.x, pt.y);
            if (elem) {
                this.selectElement(elem.id);
                this.isDragging = true;
                this.dragOffset = { x: pt.x - elem.x, y: pt.y - elem.y };
            } else {
                this.deselectAll();
            }
        },

        onCanvasMouseMove: function(e) {
            if (!this.isDragging || !this.selectedElement) return;
            
            const pt = this.getSVGPoint(e);
            const elem = this.elements.find(el => el.id === this.selectedElement);
            if (elem) {
                elem.x = Math.max(0, Math.min(750, pt.x - this.dragOffset.x));
                elem.y = Math.max(0, Math.min(450, pt.y - this.dragOffset.y));
                this.render();
            }
        },

        onCanvasMouseUp: function(e) {
            if (this.isDragging) {
                this.isDragging = false;
                this.saveScene();
            }
            this.draggedTool = null;
        },

        onCanvasDoubleClick: function(e) {
            const pt = this.getSVGPoint(e);
            const elem = this.findElementAt(pt.x, pt.y);
            if (elem) {
                this.openConfigModal(elem.id);
            }
        },

        findElementAt: function(x, y) {
            // Cerca in ordine inverso (elementi in primo piano)
            for (let i = this.elements.length - 1; i >= 0; i--) {
                const el = this.elements[i];
                const size = this.getElementSize(el.type);
                if (x >= el.x && x <= el.x + size.w && y >= el.y && y <= el.y + size.h) {
                    return el;
                }
            }
            return null;
        },

        getElementSize: function(type) {
            const sizes = {
                'conveyor': { w: 120, h: 40 },
                'tank': { w: 60, h: 80 },
                'motor': { w: 60, h: 50 },
                'pump': { w: 50, h: 50 },
                'valve': { w: 40, h: 50 },
                'sensor': { w: 30, h: 40 },
                'light': { w: 30, h: 70 },
                'pipe-h': { w: 80, h: 20 },
                'pipe-v': { w: 20, h: 80 },
                'robot-arm': { w: 60, h: 80 },
                'box': { w: 30, h: 30 },
                'label': { w: 80, h: 24 }
            };
            return sizes[type] || { w: 50, h: 50 };
        },

        addElement: function(type, x, y) {
            const size = this.getElementSize(type);
            const elem = {
                id: ++this.elementCounter,
                type: type,
                x: x - size.w / 2,
                y: y - size.h / 2,
                label: type.charAt(0).toUpperCase() + type.slice(1) + ' ' + this.elementCounter,
                varType: type === 'tank' ? 'MW' : 'Q',
                varNum: 0,
                varBit: 0,
                color: '#00d4aa',
                min: 0,
                max: 100,
                text: 'Label'
            };
            
            this.elements.push(elem);
            this.selectElement(elem.id);
            this.render();
            this.saveScene();
            
            $('#scene-empty').addClass('hidden');
        },

        selectElement: function(id) {
            this.selectedElement = id;
            this.render();
        },

        deselectAll: function() {
            this.selectedElement = null;
            this.render();
        },

        deleteSelectedElement: function() {
            if (!this.selectedElement) return;
            this.elements = this.elements.filter(el => el.id !== this.selectedElement);
            this.selectedElement = null;
            this.render();
            this.saveScene();
            closeSceneConfigModal();
            
            if (this.elements.length === 0) {
                $('#scene-empty').removeClass('hidden');
            }
        },

        openConfigModal: function(id) {
            const elem = this.elements.find(el => el.id === id);
            if (!elem) return;
            
            this.selectedElement = id;
            
            $('#scene-config-label').val(elem.label || '');
            $('#scene-config-var-type').val(elem.varType || 'Q');
            $('#scene-config-var-num').val(elem.varNum || 0);
            $('#scene-config-var-bit').val(elem.varBit || 0);
            $('#scene-config-color').val(elem.color || '#00d4aa');
            $('#scene-config-min').val(elem.min || 0);
            $('#scene-config-max').val(elem.max || 100);
            $('#scene-config-text').val(elem.text || 'Label');
            
            // Mostra/nascondi opzioni specifiche
            const isMW = elem.varType === 'MW';
            $('#scene-config-bit-sep').toggle(!isMW);
            $('#scene-config-var-bit').toggle(!isMW);
            $('#scene-config-level-group').toggle(elem.type === 'tank');
            $('#scene-config-text-group').toggle(elem.type === 'label');
            
            $('#scene-config-modal').addClass('active');
        },

        saveElementConfig: function() {
            const elem = this.elements.find(el => el.id === this.selectedElement);
            if (!elem) return;
            
            elem.label = $('#scene-config-label').val();
            elem.varType = $('#scene-config-var-type').val();
            elem.varNum = parseInt($('#scene-config-var-num').val()) || 0;
            elem.varBit = parseInt($('#scene-config-var-bit').val()) || 0;
            elem.color = $('#scene-config-color').val();
            elem.min = parseFloat($('#scene-config-min').val()) || 0;
            elem.max = parseFloat($('#scene-config-max').val()) || 100;
            elem.text = $('#scene-config-text').val();
            
            this.render();
            this.saveScene();
            closeSceneConfigModal();
        },

        // Legge valore variabile PLC
        readValue: function(elem) {
            if (elem.varType === 'MW') {
                return PLC.MW[elem.varNum] || 0;
            } else {
                return PLC.readBit(elem.varType, elem.varNum, elem.varBit);
            }
        },

        render: function() {
            const container = document.getElementById('scene-elements');
            if (!container) return;
            
            let svg = '';
            
            this.elements.forEach(elem => {
                const isSelected = elem.id === this.selectedElement;
                const value = this.readValue(elem);
                const isOn = elem.varType === 'MW' ? value > elem.min : value === 1;
                
                svg += this.renderElement(elem, isSelected, isOn, value);
            });
            
            container.innerHTML = svg;
        },

        renderElement: function(elem, isSelected, isOn, value) {
            const x = elem.x;
            const y = elem.y;
            const color = elem.color || '#00d4aa';
            const selectClass = isSelected ? 'selected' : '';
            const activeClass = isOn ? 'active' : '';
            
            // Tooltip con variabile
            const varInfo = elem.varType === 'MW' 
                ? `${elem.varType}${elem.varNum}` 
                : `${elem.varType}${elem.varNum}.${elem.varBit}`;
            const title = elem.label ? `${elem.label} (${varInfo})` : varInfo;
            
            let svg = `<g class="scene-element-group scene-element ${selectClass} ${activeClass}" data-id="${elem.id}" transform="translate(${x},${y})">`;
            svg += `<title>🔧 ${title} - Doppio click per configurare</title>`;
            
            switch (elem.type) {
                case 'conveyor':
                    svg += this.renderConveyor(elem, isOn, color);
                    break;
                case 'tank':
                    svg += this.renderTank(elem, value, color);
                    break;
                case 'motor':
                    svg += this.renderMotor(elem, isOn, color);
                    break;
                case 'pump':
                    svg += this.renderPump(elem, isOn, color);
                    break;
                case 'valve':
                    svg += this.renderValve(elem, isOn, color);
                    break;
                case 'sensor':
                    svg += this.renderSensor(elem, isOn, color);
                    break;
                case 'light':
                    svg += this.renderLight(elem, value);
                    break;
                case 'pipe-h':
                    svg += this.renderPipeH(elem, isOn);
                    break;
                case 'pipe-v':
                    svg += this.renderPipeV(elem, isOn);
                    break;
                case 'robot-arm':
                    svg += this.renderRobotArm(elem, isOn, color);
                    break;
                case 'box':
                    svg += this.renderBox(elem, isOn, color);
                    break;
                case 'label':
                    svg += this.renderLabel(elem);
                    break;
            }
            
            // Etichetta
            if (elem.label && elem.type !== 'label') {
                const size = this.getElementSize(elem.type);
                svg += `<text x="${size.w/2}" y="${size.h + 14}" text-anchor="middle" fill="#9ca3af" font-size="10">${elem.label}</text>`;
            }
            
            svg += '</g>';
            return svg;
        },

        renderConveyor: function(elem, isOn, color) {
            return `
                <rect x="0" y="10" width="120" height="20" rx="10" fill="#555" stroke="${isOn ? color : '#666'}" stroke-width="2"/>
                <circle cx="15" cy="20" r="8" fill="#333" stroke="#666">
                    ${isOn ? '<animateTransform attributeName="transform" type="rotate" from="0 15 20" to="360 15 20" dur="0.3s" repeatCount="indefinite"/>' : ''}
                </circle>
                <circle cx="105" cy="20" r="8" fill="#333" stroke="#666">
                    ${isOn ? '<animateTransform attributeName="transform" type="rotate" from="0 105 20" to="360 105 20" dur="0.3s" repeatCount="indefinite"/>' : ''}
                </circle>
                <line x1="15" y1="12" x2="105" y2="12" stroke="#444" stroke-width="2"/>
                <line x1="15" y1="28" x2="105" y2="28" stroke="#444" stroke-width="2"/>
                ${isOn ? `
                    <rect x="20" y="14" width="8" height="4" fill="#888">
                        <animate attributeName="x" values="20;100;20" dur="2s" repeatCount="indefinite"/>
                    </rect>
                    <rect x="50" y="14" width="8" height="4" fill="#888">
                        <animate attributeName="x" values="50;100;20;50" dur="2s" repeatCount="indefinite"/>
                    </rect>
                    <rect x="80" y="14" width="8" height="4" fill="#888">
                        <animate attributeName="x" values="80;100;20;80" dur="2s" repeatCount="indefinite"/>
                    </rect>
                    <circle cx="110" cy="5" r="4" fill="#22c55e"><animate attributeName="opacity" values="1;0.5;1" dur="0.5s" repeatCount="indefinite"/></circle>
                ` : '<circle cx="110" cy="5" r="4" fill="#666"/>'}
            `;
        },

        renderTank: function(elem, value, color) {
            const level = Math.max(0, Math.min(100, ((value - elem.min) / (elem.max - elem.min)) * 100));
            const fillHeight = (level / 100) * 60;
            const fillY = 70 - fillHeight;
            return `
                <rect x="0" y="0" width="60" height="70" rx="3" fill="none" stroke="${color}" stroke-width="2"/>
                <rect x="2" y="${fillY}" width="56" height="${fillHeight}" fill="${color}" opacity="0.6"/>
                <text x="30" y="40" text-anchor="middle" fill="#fff" font-size="12" font-weight="bold">${Math.round(value)}</text>
                <rect x="25" y="70" width="10" height="10" fill="#555"/>
            `;
        },

        renderMotor: function(elem, isOn, color) {
            return `
                <rect x="0" y="10" width="45" height="30" rx="3" fill="${isOn ? color : '#555'}" stroke="#333" stroke-width="2"/>
                <rect x="45" y="17" width="15" height="16" fill="#333"/>
                <circle cx="22" cy="25" r="10" fill="#333"/>
                <g>
                    <line x1="22" y1="17" x2="22" y2="33" stroke="${isOn ? '#fff' : '#666'}" stroke-width="2"/>
                    <line x1="14" y1="25" x2="30" y2="25" stroke="${isOn ? '#fff' : '#666'}" stroke-width="2"/>
                    ${isOn ? '<animateTransform attributeName="transform" type="rotate" from="0 22 25" to="360 22 25" dur="0.5s" repeatCount="indefinite"/>' : ''}
                </g>
                ${isOn ? '<circle cx="5" cy="5" r="4" fill="#22c55e"><animate attributeName="opacity" values="1;0.5;1" dur="0.5s" repeatCount="indefinite"/></circle>' : '<circle cx="5" cy="5" r="3" fill="#666"/>'}
            `;
        },

        renderPump: function(elem, isOn, color) {
            return `
                <circle cx="25" cy="25" r="22" fill="none" stroke="${isOn ? color : '#555'}" stroke-width="3"/>
                <circle cx="25" cy="25" r="10" fill="${isOn ? color : '#555'}">
                    ${isOn ? '<animate attributeName="r" values="10;12;10" dur="0.3s" repeatCount="indefinite"/>' : ''}
                </circle>
                ${isOn ? `
                    <g>
                        <path d="M25 5 L25 15" stroke="${color}" stroke-width="3"/>
                        <path d="M25 35 L25 45" stroke="${color}" stroke-width="3"/>
                        <path d="M5 25 L15 25" stroke="${color}" stroke-width="3"/>
                        <path d="M35 25 L45 25" stroke="${color}" stroke-width="3"/>
                        <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="1s" repeatCount="indefinite"/>
                    </g>
                    <circle cx="45" cy="5" r="4" fill="#22c55e"><animate attributeName="opacity" values="1;0.5;1" dur="0.5s" repeatCount="indefinite"/></circle>
                ` : '<circle cx="45" cy="5" r="3" fill="#666"/>'}
            `;
        },

        renderValve: function(elem, isOn, color) {
            const fillColor = isOn ? '#27ae60' : '#c0392b';
            return `
                <polygon points="5,15 20,5 35,15 35,35 20,45 5,35" fill="${fillColor}" stroke="#333" stroke-width="2" class="valve-body ${isOn ? 'open' : 'closed'}"/>
                <line x1="20" y1="0" x2="20" y2="5" stroke="#333" stroke-width="3"/>
                <circle cx="20" cy="0" r="4" fill="#333"/>
                <text x="20" y="28" text-anchor="middle" fill="#fff" font-size="10">${isOn ? 'ON' : 'OFF'}</text>
            `;
        },

        renderSensor: function(elem, isOn, color) {
            return `
                <rect x="5" y="20" width="20" height="18" rx="2" fill="${isOn ? color : '#555'}" stroke="#333"/>
                <circle cx="15" cy="12" r="10" fill="none" stroke="${isOn ? color : '#666'}" stroke-width="2" stroke-dasharray="4,2">
                    ${isOn ? '<animate attributeName="r" values="10;14;10" dur="0.5s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0.3;1" dur="0.5s" repeatCount="indefinite"/>' : ''}
                </circle>
                ${isOn ? `<circle cx="15" cy="12" r="3" fill="${color}"><animate attributeName="opacity" values="1;0.5;1" dur="0.3s" repeatCount="indefinite"/></circle>` : ''}
            `;
        },

        renderLight: function(elem, value) {
            // Supporta semaforo (3 luci) o singola luce
            // value: 0=off, 1=rosso, 2=giallo, 3=verde, oppure bit diretto
            const isRed = value === 1;
            const isYellow = value === 2;
            const isGreen = value === 3 || (elem.varType !== 'MW' && value === 1);
            
            return `
                <rect x="0" y="0" width="30" height="65" rx="3" fill="#333" stroke="#555"/>
                <circle cx="15" cy="12" r="8" fill="${isRed ? '#e74c3c' : '#441111'}">
                    ${isRed ? '<animate attributeName="r" values="8;9;8" dur="0.5s" repeatCount="indefinite"/>' : ''}
                </circle>
                <circle cx="15" cy="32" r="8" fill="${isYellow ? '#f1c40f' : '#444411'}">
                    ${isYellow ? '<animate attributeName="r" values="8;9;8" dur="0.5s" repeatCount="indefinite"/>' : ''}
                </circle>
                <circle cx="15" cy="52" r="8" fill="${isGreen ? '#27ae60' : '#114411'}">
                    ${isGreen ? '<animate attributeName="r" values="8;9;8" dur="0.5s" repeatCount="indefinite"/>' : ''}
                </circle>
            `;
        },

        renderPipeH: function(elem, isOn) {
            return `
                <rect x="0" y="5" width="80" height="10" fill="${isOn ? '#3498db' : '#555'}" rx="2"/>
                ${isOn ? '<rect x="0" y="7" width="80" height="6" fill="url(#flow-pattern)" class="pipe-flow active"/>' : ''}
            `;
        },

        renderPipeV: function(elem, isOn) {
            return `
                <rect x="5" y="0" width="10" height="80" fill="${isOn ? '#3498db' : '#555'}" rx="2"/>
                ${isOn ? '<rect x="7" y="0" width="6" height="80" fill="url(#flow-pattern)" class="pipe-flow active"/>' : ''}
            `;
        },

        renderRobotArm: function(elem, isOn, color) {
            return `
                <rect x="22" y="60" width="16" height="20" fill="#333"/>
                <rect x="15" y="35" width="30" height="28" rx="3" fill="${isOn ? color : '#555'}" stroke="#333"/>
                <g>
                    <rect x="26" y="10" width="8" height="25" fill="${isOn ? color : '#555'}" stroke="#333"/>
                    <circle cx="30" cy="8" r="6" fill="#333"/>
                    ${isOn ? '<animateTransform attributeName="transform" type="rotate" from="-20 30 35" to="20 30 35" dur="1s" repeatCount="indefinite" calcMode="spline" keySplines="0.5 0 0.5 1"/>' : ''}
                </g>
                ${isOn ? '<circle cx="45" cy="40" r="4" fill="#22c55e"><animate attributeName="opacity" values="1;0.5;1" dur="0.5s" repeatCount="indefinite"/></circle>' : '<circle cx="45" cy="40" r="3" fill="#666"/>'}
            `;
        },

        renderBox: function(elem, isOn, color) {
            return `
                <rect x="0" y="0" width="30" height="30" fill="${color}" stroke="#333" stroke-width="2" opacity="${isOn ? 1 : 0.5}"/>
                <line x1="0" y1="0" x2="30" y2="0" stroke="#fff" stroke-width="1" opacity="0.3"/>
                <line x1="0" y1="0" x2="0" y2="30" stroke="#fff" stroke-width="1" opacity="0.3"/>
            `;
        },

        renderLabel: function(elem) {
            return `
                <text x="0" y="16" fill="${elem.color || '#ecf0f1'}" font-size="14" font-weight="bold">${elem.text || 'Label'}</text>
            `;
        },

        // Template preimpostati
        loadTemplate: function(name) {
            this.clearScene();
            
            const templates = {
                conveyor: [
                    { type: 'conveyor', x: 100, y: 200, label: 'Nastro 1', varType: 'Q', varNum: 0, varBit: 0 },
                    { type: 'sensor', x: 80, y: 180, label: 'Sens. Ingresso', varType: 'I', varNum: 0, varBit: 0 },
                    { type: 'sensor', x: 200, y: 180, label: 'Sens. Uscita', varType: 'I', varNum: 0, varBit: 1 },
                    { type: 'motor', x: 250, y: 195, label: 'Motore', varType: 'Q', varNum: 0, varBit: 0 },
                    { type: 'box', x: 120, y: 175, label: 'Prodotto', varType: 'I', varNum: 0, varBit: 0, color: '#8e44ad' },
                    { type: 'light', x: 300, y: 150, label: 'Stato', varType: 'Q', varNum: 0, varBit: 1 }
                ],
                tanks: [
                    { type: 'tank', x: 100, y: 100, label: 'Serbatoio 1', varType: 'MW', varNum: 0, min: 0, max: 100 },
                    { type: 'tank', x: 300, y: 100, label: 'Serbatoio 2', varType: 'MW', varNum: 2, min: 0, max: 100 },
                    { type: 'pump', x: 180, y: 200, label: 'Pompa', varType: 'Q', varNum: 0, varBit: 0 },
                    { type: 'valve', x: 135, y: 180, label: 'Valvola 1', varType: 'Q', varNum: 0, varBit: 1 },
                    { type: 'valve', x: 255, y: 180, label: 'Valvola 2', varType: 'Q', varNum: 0, varBit: 2 },
                    { type: 'pipe-h', x: 160, y: 160, label: '', varType: 'Q', varNum: 0, varBit: 0 },
                    { type: 'sensor', x: 80, y: 50, label: 'Liv. Alto', varType: 'I', varNum: 0, varBit: 0 },
                    { type: 'sensor', x: 80, y: 180, label: 'Liv. Basso', varType: 'I', varNum: 0, varBit: 1 }
                ],
                traffic: [
                    { type: 'light', x: 200, y: 50, label: 'Semaforo Nord', varType: 'MW', varNum: 0, min: 0, max: 3 },
                    { type: 'light', x: 200, y: 350, label: 'Semaforo Sud', varType: 'MW', varNum: 0, min: 0, max: 3 },
                    { type: 'light', x: 50, y: 200, label: 'Semaforo Ovest', varType: 'MW', varNum: 2, min: 0, max: 3 },
                    { type: 'light', x: 350, y: 200, label: 'Semaforo Est', varType: 'MW', varNum: 2, min: 0, max: 3 },
                    { type: 'sensor', x: 180, y: 150, label: 'Sens. Nord', varType: 'I', varNum: 0, varBit: 0 },
                    { type: 'sensor', x: 180, y: 300, label: 'Sens. Sud', varType: 'I', varNum: 0, varBit: 1 },
                    { type: 'label', x: 150, y: 250, label: '', text: 'INCROCIO', color: '#f1c40f' }
                ],
                robot: [
                    { type: 'robot-arm', x: 200, y: 150, label: 'Robot', varType: 'Q', varNum: 0, varBit: 0, color: '#e67e22' },
                    { type: 'conveyor', x: 50, y: 280, label: 'Ingresso', varType: 'Q', varNum: 0, varBit: 1 },
                    { type: 'conveyor', x: 280, y: 280, label: 'Uscita', varType: 'Q', varNum: 0, varBit: 2 },
                    { type: 'sensor', x: 140, y: 260, label: 'Pos. Prelievo', varType: 'I', varNum: 0, varBit: 0 },
                    { type: 'sensor', x: 260, y: 260, label: 'Pos. Deposito', varType: 'I', varNum: 0, varBit: 1 },
                    { type: 'box', x: 100, y: 250, label: 'Pezzo', varType: 'M', varNum: 0, varBit: 0, color: '#3498db' },
                    { type: 'light', x: 350, y: 150, label: 'Stato Cella', varType: 'Q', varNum: 0, varBit: 3 }
                ],
                bottling: [
                    { type: 'tank', x: 50, y: 50, label: 'Serbatoio', varType: 'MW', varNum: 0, min: 0, max: 1000 },
                    { type: 'valve', x: 75, y: 140, label: 'Dosatore', varType: 'Q', varNum: 0, varBit: 0 },
                    { type: 'conveyor', x: 150, y: 200, label: 'Nastro', varType: 'Q', varNum: 0, varBit: 1 },
                    { type: 'sensor', x: 200, y: 170, label: 'Presenza', varType: 'I', varNum: 0, varBit: 0 },
                    { type: 'sensor', x: 250, y: 170, label: 'Pieno', varType: 'I', varNum: 0, varBit: 1 },
                    { type: 'box', x: 210, y: 175, label: 'Bottiglia', varType: 'M', varNum: 0, varBit: 0, color: '#1abc9c' },
                    { type: 'light', x: 320, y: 150, label: 'Stato', varType: 'MW', varNum: 2, min: 0, max: 3 },
                    { type: 'label', x: 150, y: 30, label: '', text: 'LINEA IMBOTTIGLIAMENTO', color: '#00d4aa' }
                ]
            };
            
            const elements = templates[name];
            if (!elements) return;
            
            elements.forEach(el => {
                this.elements.push({
                    id: ++this.elementCounter,
                    type: el.type,
                    x: el.x,
                    y: el.y,
                    label: el.label,
                    varType: el.varType || 'Q',
                    varNum: el.varNum || 0,
                    varBit: el.varBit || 0,
                    color: el.color || '#00d4aa',
                    min: el.min || 0,
                    max: el.max || 100,
                    text: el.text || 'Label'
                });
            });
            
            this.render();
            this.saveScene();
            $('#scene-empty').addClass('hidden');
        },

        clearScene: function() {
            this.elements = [];
            this.elementCounter = 0;
            this.selectedElement = null;
            this.render();
            this.saveScene();
            $('#scene-empty').removeClass('hidden');
        },

        // Update chiamato dal ciclo PLC
        update: function() {
            if (this.panelVisible && this.elements.length > 0) {
                this.render();
            }
        },

        saveScene: function() {
            try {
                localStorage.setItem('plc_scene_' + Session.id, JSON.stringify({
                    elements: this.elements,
                    counter: this.elementCounter
                }));
            } catch (e) {
                console.warn('Impossibile salvare scena');
            }
        },

        loadScene: function() {
            try {
                const data = localStorage.getItem('plc_scene_' + Session.id);
                if (data) {
                    const parsed = JSON.parse(data);
                    this.elements = parsed.elements || [];
                    this.elementCounter = parsed.counter || 0;
                    if (this.elements.length > 0) {
                        $('#scene-empty').addClass('hidden');
                    }
                }
            } catch (e) {
                console.warn('Impossibile caricare scena');
            }
        }
    };

    // ==================== Global Functions ====================
    window.closeModal = function() {
        $('#load-modal').removeClass('active');
    };

    window.closeConfigModal = function() {
        $('#config-modal').removeClass('active');
    };
    
    window.closeHmiConfigModal = function() {
        $('#hmi-config-modal').removeClass('active');
    };
    
    window.closeFkeyConfigModal = function() {
        $('#fkey-config-modal').removeClass('active');
    };
    
    window.closeSceneConfigModal = function() {
        $('#scene-config-modal').removeClass('active');
    };
    
    window.closeHardwareModal = function() {
        $('#hardware-modal').removeClass('active');
    };

    // ==================== Init ====================
    $(document).ready(function() {
        if ($('#plc-simulator').length) {
            Session.init();
            UI.init();
            HMI.init();
            Scene.init();
        }
    });

})(jQuery);
