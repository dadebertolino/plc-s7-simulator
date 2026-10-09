/**
 * Motore Ladder: logica a contatti, bobine, timer, contatori, comparatori.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
    newPlc, NO, NC, COIL, SET, RESET, TON, TOF, TP, CTU, CTD, CTUD, CMP, BRANCH, RUNG,
} = require('./helpers');

describe('contatti e bobine', () => {
    test('contatti NA e NC in serie fanno AND', () => {
        const plc = newPlc([RUNG([NO('I0.0'), NC('I0.1')], [COIL('Q0.0')])]);
        const cases = [[0, 0, 0], [1, 0, 1], [1, 1, 0], [0, 1, 0]];
        for (const [i0, i1, q] of cases) {
            plc.set('I0.0', i0);
            plc.set('I0.1', i1);
            plc.scan();
            assert.equal(plc.get('Q0.0'), q, `I0.0=${i0} I0.1=${i1}`);
        }
    });

    test('diramazione in parallelo fa OR', () => {
        const plc = newPlc([RUNG([BRANCH([NO('I0.0')], [NO('I0.1')])], [COIL('Q0.0')])]);
        const cases = [[0, 0, 0], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
        for (const [i0, i1, q] of cases) {
            plc.set('I0.0', i0);
            plc.set('I0.1', i1);
            plc.scan();
            assert.equal(plc.get('Q0.0'), q, `I0.0=${i0} I0.1=${i1}`);
        }
    });

    test('diramazioni annidate: I0.0 AND (I0.1 OR (I0.2 AND I0.3))', () => {
        const plc = newPlc([RUNG([
            NO('I0.0'),
            BRANCH([NO('I0.1')], [NO('I0.2'), NO('I0.3')]),
        ], [COIL('Q0.0')])]);
        const cases = [
            [1, 0, 0, 0, 0], [1, 1, 0, 0, 1], [1, 0, 1, 0, 0], [1, 0, 1, 1, 1], [0, 1, 1, 1, 0],
        ];
        for (const [a, b, c, d, q] of cases) {
            plc.set('I0.0', a); plc.set('I0.1', b); plc.set('I0.2', c); plc.set('I0.3', d);
            plc.scan();
            assert.equal(plc.get('Q0.0'), q, `${a}${b}${c}${d}`);
        }
    });

    test('bobine in parallelo sulle uscite', () => {
        const plc = newPlc([RUNG([NO('I0.0')], [BRANCH([COIL('Q0.0')], [COIL('Q0.1')])])]);
        plc.set('I0.0', 1);
        plc.scan();
        assert.equal(plc.get('Q0.0'), 1);
        assert.equal(plc.get('Q0.1'), 1);
    });

    test('autoritenuta con merker: marcia, arresto', () => {
        const plc = newPlc([
            RUNG([BRANCH([NO('I0.0')], [NO('M0.0')]), NC('I0.1')], [COIL('M0.0')]),
            RUNG([NO('M0.0')], [COIL('Q0.0')]),
        ]);
        plc.set('I0.0', 1); plc.scan();
        plc.set('I0.0', 0); plc.scan();
        assert.equal(plc.get('Q0.0'), 1, 'resta in marcia');
        plc.set('I0.1', 1); plc.scan();
        assert.equal(plc.get('Q0.0'), 0, 'arresto');
    });

    test('Set e Reset: la bobina S memorizza, R azzera', () => {
        const plc = newPlc([
            RUNG([NO('I0.0')], [SET('Q0.0')]),
            RUNG([NO('I0.1')], [RESET('Q0.0')]),
        ]);
        plc.set('I0.0', 1); plc.scan();
        plc.set('I0.0', 0); plc.scan();
        assert.equal(plc.get('Q0.0'), 1);
        plc.set('I0.1', 1); plc.scan();
        assert.equal(plc.get('Q0.0'), 0);
    });

    test('a parita\' di ciclo vince l\'ultimo segmento (R dopo S)', () => {
        const plc = newPlc([
            RUNG([NO('I0.0')], [SET('Q0.0')]),
            RUNG([NO('I0.0')], [RESET('Q0.0')]),
        ]);
        plc.set('I0.0', 1); plc.scan();
        assert.equal(plc.get('Q0.0'), 0);
    });

    test('con il PLC in STOP il programma non viene eseguito', () => {
        const plc = newPlc([RUNG([NO('I0.0')], [COIL('Q0.0')])]);
        plc.PLC.running = false;
        plc.set('I0.0', 1); plc.scan();
        assert.equal(plc.get('Q0.0'), 0);
    });
});

describe('timer', () => {
    test('TON: Q dopo PT con ingresso fisso, ET torna a 0 quando l\'ingresso cade', () => {
        const plc = newPlc([RUNG([NO('I0.0'), TON(0, 1000)], [COIL('Q0.0')])]);
        plc.set('I0.0', 1);
        plc.scan(0);
        plc.run(9, 100);
        assert.equal(plc.timer(0).ET, 900);
        assert.equal(plc.get('Q0.0'), 0);
        plc.scan(100);
        assert.equal(plc.get('Q0.0'), 1);
        plc.scan(500);
        assert.equal(plc.timer(0).ET, 1000, 'ET si ferma a PT');
        plc.set('I0.0', 0); plc.scan(50);
        assert.equal(plc.get('Q0.0'), 0);
        assert.equal(plc.timer(0).ET, 0);
    });

    test('TON: un\'interruzione prima di PT fa ripartire il conteggio', () => {
        const plc = newPlc([RUNG([NO('I0.0'), TON(0, 1000)], [COIL('Q0.0')])]);
        plc.set('I0.0', 1); plc.scan(0); plc.scan(800);
        plc.set('I0.0', 0); plc.scan(50);
        plc.set('I0.0', 1); plc.scan(0); plc.scan(800);
        assert.equal(plc.get('Q0.0'), 0);
        plc.scan(200);
        assert.equal(plc.get('Q0.0'), 1);
    });

    test('TOF: Q segue l\'ingresso e si spegne PT dopo la discesa', () => {
        const plc = newPlc([RUNG([NO('I0.0'), TOF(0, 500)], [COIL('Q0.0')])]);
        plc.scan(0);
        assert.equal(plc.get('Q0.0'), 0, 'spento all\'avvio');
        plc.set('I0.0', 1); plc.scan(10);
        assert.equal(plc.get('Q0.0'), 1);
        plc.set('I0.0', 0); plc.scan(0);
        plc.scan(400);
        assert.equal(plc.get('Q0.0'), 1, 'ancora acceso durante il ritardo');
        plc.scan(100);
        assert.equal(plc.get('Q0.0'), 0);
    });

    test('TOF: l\'ingresso che torna alto durante il ritardo azzera ET', () => {
        const plc = newPlc([RUNG([NO('I0.0'), TOF(0, 500)], [COIL('Q0.0')])]);
        plc.set('I0.0', 1); plc.scan(0);
        plc.set('I0.0', 0); plc.scan(0); plc.scan(300);
        plc.set('I0.0', 1); plc.scan(0);
        assert.equal(plc.timer(0).ET, 0);
        plc.set('I0.0', 0); plc.scan(0); plc.scan(400);
        assert.equal(plc.get('Q0.0'), 1);
    });

    test('TP: impulso lungo PT sul fronte di salita, anche se l\'ingresso cade prima', () => {
        const plc = newPlc([RUNG([NO('I0.0'), TP(0, 300)], [COIL('Q0.0')])]);
        plc.set('I0.0', 1); plc.scan(0);
        assert.equal(plc.get('Q0.0'), 1);
        plc.set('I0.0', 0); plc.scan(100);
        assert.equal(plc.get('Q0.0'), 1, 'l\'impulso continua');
        plc.scan(200);
        assert.equal(plc.get('Q0.0'), 0);
    });

    test('TP: non si riavvia con l\'ingresso sempre alto', () => {
        const plc = newPlc([RUNG([NO('I0.0'), TP(0, 300)], [COIL('Q0.0')])]);
        plc.set('I0.0', 1); plc.scan(0); plc.scan(300);
        assert.equal(plc.get('Q0.0'), 0);
        plc.scan(1000);
        assert.equal(plc.get('Q0.0'), 0);
    });
});

describe('contatori', () => {
    test('CTU conta i fronti di salita e attiva Q a CV >= PV', () => {
        const plc = newPlc([RUNG([NO('I0.0'), CTU(0, 3)], [COIL('Q0.0')])]);
        for (let k = 1; k <= 3; k++) {
            plc.set('I0.0', 1); plc.scan();
            plc.scan();
            plc.set('I0.0', 0); plc.scan();
            assert.equal(plc.counter(0).CV, k);
        }
        assert.equal(plc.counter(0).Q, 1);
    });

    test('CTU: l\'ingresso R azzera CV', () => {
        const plc = newPlc([RUNG([NO('I0.0'), CTU(0, 2, { resetAddr: { type: 'I', byte: 0, bit: 1 } })], [COIL('Q0.0')])]);
        plc.set('I0.0', 1); plc.scan(); plc.set('I0.0', 0); plc.scan();
        assert.equal(plc.counter(0).CV, 1);
        plc.set('I0.1', 1); plc.scan();
        assert.equal(plc.counter(0).CV, 0);
    });

    test('CTD parte da PV, scende sui fronti e attiva Q a CV <= 0', () => {
        const plc = newPlc([RUNG([NO('I0.0'), CTD(0, 2)], [COIL('Q0.0')])]);
        plc.scan();
        assert.equal(plc.counter(0).CV, 2);
        for (let k = 0; k < 2; k++) {
            plc.set('I0.0', 1); plc.scan(); plc.set('I0.0', 0); plc.scan();
        }
        assert.equal(plc.counter(0).CV, 0);
        assert.equal(plc.get('Q0.0'), 1);
    });

    test('CTUD: CU incrementa, CD decrementa, QU a CV >= PV', () => {
        const plc = newPlc([RUNG([NO('I0.0'), CTUD(0, 2, 'I0.1')], [COIL('Q0.0')])]);
        const pulse = (a) => { plc.set(a, 1); plc.scan(); plc.set(a, 0); plc.scan(); };
        pulse('I0.0'); pulse('I0.0'); pulse('I0.0');
        assert.equal(plc.counter(0).CV, 3);
        assert.equal(plc.get('Q0.0'), 1);
        pulse('I0.1'); pulse('I0.1');
        assert.equal(plc.counter(0).CV, 1);
        assert.equal(plc.get('Q0.0'), 0);
    });
});

describe('comparatori', () => {
    const k = (value) => ({ type: 'const', value });

    for (const [op, a, b, expected] of [
        ['eq', 5, 5, 1], ['eq', 5, 6, 0], ['ne', 5, 6, 1], ['gt', 6, 5, 1], ['gt', 5, 5, 0],
        ['lt', 4, 5, 1], ['ge', 5, 5, 1], ['le', 6, 5, 0],
    ]) {
        test(`${a} ${op} ${b} = ${expected}`, () => {
            const plc = newPlc([RUNG([CMP(op, k(a), k(b))], [COIL('Q0.0')])]);
            plc.scan();
            assert.equal(plc.get('Q0.0'), expected);
        });
    }

    test('senza potenza in ingresso il comparatore e\' falso', () => {
        const plc = newPlc([RUNG([NO('I0.0'), CMP('eq', k(1), k(1))], [COIL('Q0.0')])]);
        plc.scan();
        assert.equal(plc.get('Q0.0'), 0);
    });

    test('confronta il valore corrente di un contatore', () => {
        const plc = newPlc([
            RUNG([NO('I0.0'), CTU(0, 10)], []),
            RUNG([CMP('ge', { type: 'counter', value: 0 }, k(2))], [COIL('Q0.0')]),
        ]);
        for (let i = 0; i < 2; i++) { plc.set('I0.0', 1); plc.scan(); plc.set('I0.0', 0); plc.scan(); }
        assert.equal(plc.get('Q0.0'), 1);
    });

    test('confronta il tempo trascorso di un timer', () => {
        const plc = newPlc([
            RUNG([NO('I0.0'), TON(0, 5000)], []),
            RUNG([CMP('gt', { type: 'timer', value: 0 }, k(1000))], [COIL('Q0.0')]),
        ]);
        plc.set('I0.0', 1); plc.scan(0); plc.scan(1000);
        assert.equal(plc.get('Q0.0'), 0);
        plc.scan(1);
        assert.equal(plc.get('Q0.0'), 1);
    });
});

describe('funzioni analogiche', () => {
    test('NORM_X e SCALE_X come in TIA Portal, con saturazione', () => {
        const { PLC } = newPlc();
        assert.equal(PLC.NORM_X(13824, 0, 27648), 0.5);
        assert.equal(PLC.NORM_X(30000, 0, 27648), 1);
        assert.equal(PLC.SCALE_X(0.25, 0, 100), 25);
        assert.equal(PLC.SCALE_RANGE(27648, 0, 27648, 4, 20), 20);
        assert.equal(PLC.analogToEngineering(13824, 0, 10), 5);
        assert.equal(PLC.engineeringToAnalog(5, 0, 10), 13824);
    });

    test('indirizzi analogici: CPU 1215C e moduli di espansione da IW96', () => {
        const { PLC } = newPlc();
        PLC.hardware.currentCPU = '1215C-DC';
        PLC.hardware.installedExpansions = ['SM1231-4AI', 'SM1234-4AI2AQ'];
        const cfg = PLC.getAnalogConfig();
        assert.deepEqual(cfg.aiAddresses, [64, 66, 96, 98, 100, 102, 104, 106, 108, 110]);
        assert.deepEqual(cfg.aqAddresses, [64, 66, 96, 98]);
        assert.equal(cfg.totalAI, 10);
        assert.equal(cfg.totalAQ, 4);
    });
});

describe('reset', () => {
    test('reset azzera I/O, merker, timer e contatori', () => {
        const plc = newPlc([
            RUNG([NO('I0.0'), TON(0, 100)], [COIL('Q0.0')]),
            RUNG([NO('I0.0'), CTU(1, 5)], [SET('M0.0')]),
        ]);
        plc.set('I0.0', 1); plc.scan(0); plc.scan(200);
        plc.PLC.reset();
        assert.equal(plc.get('I0.0'), 0);
        assert.equal(plc.get('Q0.0'), 0);
        assert.equal(plc.get('M0.0'), 0);
        assert.equal(plc.timer(0).ET, 0);
        assert.equal(plc.counter(1).CV, 0);
    });
});

describe('timer: comportamento TIA dopo la scadenza', () => {
    test('lo stesso timer chiamato due volte nello stesso ciclo non conta il tempo due volte', () => {
        const plc = newPlc([
            RUNG([NO('I0.0'), TON(0, 1000)], []),
            RUNG([NO('I0.0'), TON(0, 1000)], [COIL('Q0.0')]),
        ]);
        plc.set('I0.0', 1); plc.scan(0);
        plc.run(5, 100);
        assert.equal(plc.timer(0).ET, 500);
    });

    test('TOF: dopo la scadenza ET resta a PT finche\' l\'ingresso non torna alto', () => {
        const plc = newPlc([RUNG([NO('I0.0'), TOF(0, 500)], [COIL('Q0.0')])]);
        plc.set('I0.0', 1); plc.scan(0);
        plc.set('I0.0', 0); plc.scan(0); plc.scan(500);
        assert.equal(plc.get('Q0.0'), 0);
        plc.scan(100);
        assert.equal(plc.timer(0).ET, 500);
        plc.set('I0.0', 1); plc.scan(0);
        assert.equal(plc.timer(0).ET, 0);
    });

    test('TP: a impulso finito ET torna a 0 se l\'ingresso e\' basso', () => {
        const plc = newPlc([RUNG([NO('I0.0'), TP(0, 300)], [COIL('Q0.0')])]);
        plc.set('I0.0', 1); plc.scan(0);
        plc.set('I0.0', 0); plc.scan(0); plc.scan(300);
        assert.equal(plc.get('Q0.0'), 0);
        plc.scan(10);
        assert.equal(plc.timer(0).ET, 0);
    });

    test('TP: a impulso finito ET resta a PT finche\' l\'ingresso e\' alto', () => {
        const plc = newPlc([RUNG([NO('I0.0'), TP(0, 300)], [COIL('Q0.0')])]);
        plc.set('I0.0', 1); plc.scan(0); plc.scan(300); plc.scan(200);
        assert.equal(plc.timer(0).ET, 300);
        plc.set('I0.0', 0); plc.scan(10);
        assert.equal(plc.timer(0).ET, 0);
    });

    test('TP: un nuovo fronte durante l\'impulso non lo riavvia', () => {
        const plc = newPlc([RUNG([NO('I0.0'), TP(0, 300)], [COIL('Q0.0')])]);
        plc.set('I0.0', 1); plc.scan(0); plc.scan(100);
        plc.set('I0.0', 0); plc.scan(50);
        plc.set('I0.0', 1); plc.scan(50);
        plc.scan(100);
        assert.equal(plc.get('Q0.0'), 0, 'finisce a 300 ms dal primo fronte');
    });
});

describe('contatori: campo INT e casi limite come in TIA', () => {
    const I01 = { type: 'I', byte: 0, bit: 1 };
    const I02 = { type: 'I', byte: 0, bit: 2 };
    const pulse = (plc, a) => { plc.set(a, 1); plc.scan(); plc.set(a, 0); plc.scan(); };

    test('CTU si ferma a 32767', () => {
        const plc = newPlc([RUNG([NO('I0.0'), CTU(0, 5)], [])]);
        plc.scan();
        plc.counter(0).CV = 32766;
        pulse(plc, 'I0.0'); pulse(plc, 'I0.0');
        assert.equal(plc.counter(0).CV, 32767);
    });

    test('CTU: i fronti con R attivo non contano', () => {
        const plc = newPlc([RUNG([NO('I0.0'), CTU(0, 5, { resetAddr: I01 })], [])]);
        plc.set('I0.1', 1);
        pulse(plc, 'I0.0');
        plc.set('I0.1', 0); plc.scan();
        assert.equal(plc.counter(0).CV, 0);
    });

    test('CTD con LD collegato: parte da 0, LD carica PV, scende sotto zero', () => {
        const plc = newPlc([RUNG([NO('I0.0'), CTD(0, 2, { loadAddr: I01 })], [COIL('Q0.0')])]);
        plc.scan();
        assert.equal(plc.counter(0).CV, 0);
        assert.equal(plc.get('Q0.0'), 1, 'Q = CV <= 0');
        pulse(plc, 'I0.1');
        assert.equal(plc.counter(0).CV, 2);
        assert.equal(plc.get('Q0.0'), 0);
        pulse(plc, 'I0.0'); pulse(plc, 'I0.0'); pulse(plc, 'I0.0');
        assert.equal(plc.counter(0).CV, -1);
        assert.equal(plc.get('Q0.0'), 1);
    });

    test('CTD senza LD: dopo il reset (STOP) riparte da PV', () => {
        // Regressione: reset() lo azzerava e senza LD non si ricaricava piu'.
        const plc = newPlc([RUNG([NO('I0.0'), CTD(0, 3)], [COIL('Q0.0')])]);
        pulse(plc, 'I0.0');
        assert.equal(plc.counter(0).CV, 2);
        plc.PLC.reset();
        plc.scan();
        assert.equal(plc.counter(0).CV, 3);
        assert.equal(plc.get('Q0.0'), 0);
    });

    test('CTD si ferma a -32768', () => {
        const plc = newPlc([RUNG([NO('I0.0'), CTD(0, 2, { loadAddr: I01 })], [])]);
        plc.scan();
        plc.counter(0).CV = -32767;
        pulse(plc, 'I0.0'); pulse(plc, 'I0.0');
        assert.equal(plc.counter(0).CV, -32768);
    });

    test('CTUD scende sotto zero e QD vale CV <= 0', () => {
        const plc = newPlc([RUNG([NO('I0.0'), CTUD(0, 2, 'I0.1')], [])]);
        pulse(plc, 'I0.1');
        assert.equal(plc.counter(0).CV, -1);
        assert.equal(plc.counter(0).QD, 1);
    });

    test('CTUD: fronti CU e CD nello stesso ciclo lasciano CV invariato, anche a 32767', () => {
        const plc = newPlc([RUNG([NO('I0.0'), CTUD(0, 2, 'I0.1')], [])]);
        plc.scan();
        plc.counter(0).CV = 32767;
        plc.set('I0.0', 1); plc.set('I0.1', 1); plc.scan();
        assert.equal(plc.counter(0).CV, 32767);
    });

    test('CTUD: R ha precedenza su LD', () => {
        const plc = newPlc([RUNG([NO('I0.0'), CTUD(0, 7, 'I0.3', { resetAddr: I01, loadAddr: I02 })], [])]);
        plc.set('I0.1', 1); plc.set('I0.2', 1); plc.scan();
        assert.equal(plc.counter(0).CV, 0);
        plc.set('I0.1', 0); plc.scan();
        assert.equal(plc.counter(0).CV, 7);
    });
});

describe('CTUD: uscita QD su operando', () => {
    test('QD viene scritta sull\'operando configurato', () => {
        const plc = newPlc([RUNG([NO('I0.0'), CTUD(0, 2, 'I0.1', { qdAddr: { type: 'M', byte: 5, bit: 0 } })], [COIL('Q0.0')])]);
        plc.scan();
        assert.equal(plc.get('M5.0'), 1, 'CV = 0 -> QD');
        plc.set('I0.0', 1); plc.scan();
        assert.equal(plc.get('M5.0'), 0);
        assert.equal(plc.get('Q0.0'), 0, 'QU resta il flusso di potenza');
    });
});
