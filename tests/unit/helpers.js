/**
 * Helper dei test del motore: un PLC nuovo per ogni test, orologio finto per
 * i timer e costruttori compatti per gli elementi Ladder, con la stessa forma
 * di quelli creati dall'editor (UI.createElement / saveElementConfig).
 */
const PLCSimCore = require('../../assets/js/core/plc-core.js');

/** 'I0.3' -> { type: 'I', byte: 0, bit: 3 } */
function addr(text) {
    const m = /^([IQM])(\d+)\.([0-7])$/.exec(text);
    if (!m) throw new Error('indirizzo non valido: ' + text);
    return { type: m[1], byte: Number(m[2]), bit: Number(m[3]) };
}

const NO = (a) => ({ type: 'contact-no', address: addr(a) });
const NC = (a) => ({ type: 'contact-nc', address: addr(a) });
const P = (a) => ({ type: 'contact-p', address: addr(a) });
const N = (a) => ({ type: 'contact-n', address: addr(a) });
const COIL = (a) => ({ type: 'coil', address: addr(a) });
const SET = (a) => ({ type: 'coil-set', address: addr(a) });
const RESET = (a) => ({ type: 'coil-reset', address: addr(a) });
const TON = (id, preset) => ({ type: 'timer-ton', timerId: id, preset });
const TOF = (id, preset) => ({ type: 'timer-tof', timerId: id, preset });
const TP = (id, preset) => ({ type: 'timer-tp', timerId: id, preset });
const CTU = (id, preset, extra = {}) => ({ type: 'counter-ctu', counterId: id, preset, ...extra });
const CTD = (id, preset, extra = {}) => ({ type: 'counter-ctd', counterId: id, preset, ...extra });
const CTUD = (id, preset, cd, extra = {}) => ({ type: 'counter-ctud', counterId: id, preset, cdAddr: addr(cd), ...extra });
const CMP = (op, operand1, operand2) => ({ type: 'cmp-' + op, operand1, operand2 });
const BRANCH = (...lines) => ({ type: 'branch', lines });

let nextRungId = 1;
const RUNG = (inputs, outputs) => ({ id: nextRungId++, inputs, outputs });

/**
 * PLC in RUN con orologio finto.
 *   plc.load(rungs)   programma
 *   plc.set('I0.0', 1) / plc.get('Q0.0')
 *   plc.scan(ms)      avanza l'orologio di ms e esegue un ciclo
 */
function newPlc(rungs = []) {
    const { PLC, LadderEngine } = PLCSimCore.create();
    let time = 0;
    PLC.now = () => time;
    PLC.running = true;
    PLC.program = { name: 'Test', rungs };

    return {
        PLC,
        engine: LadderEngine,
        load(newRungs) {
            PLC.program = { name: 'Test', rungs: newRungs };
        },
        set(a, value) {
            const { type, byte, bit } = addr(a);
            PLC.writeBit(type, byte, bit, value);
        },
        get(a) {
            const { type, byte, bit } = addr(a);
            return PLC.readBit(type, byte, bit);
        },
        scan(ms = 0) {
            time += ms;
            LadderEngine.execute();
        },
        /** n cicli da ms ciascuno */
        run(n, ms = 0) {
            for (let i = 0; i < n; i++) this.scan(ms);
        },
        timer: (id) => PLC.timers['T' + id],
        counter: (id) => PLC.counters['C' + id],
    };
}

module.exports = {
    PLCSimCore, addr, newPlc,
    NO, NC, P, N, COIL, SET, RESET, TON, TOF, TP, CTU, CTD, CTUD, CMP, BRANCH, RUNG,
};
