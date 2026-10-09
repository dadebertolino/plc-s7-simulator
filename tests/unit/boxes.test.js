/**
 * Box MOVE, NORM_X e SCALE_X, memoria REAL (MD) e tempo di ciclo.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { newPlc, NO, COIL, RUNG, CMP, OP, MOVE, NORM_X, SCALE_X } = require('./helpers');

describe('MOVE', () => {
    test('copia IW in MW solo con EN = 1', () => {
        const plc = newPlc([RUNG([NO('I0.0'), MOVE(OP('IW', 64), OP('MW', 10))], [COIL('Q0.0')])]);
        plc.PLC.writeWord('IW', 64, 1234);
        plc.scan();
        assert.equal(plc.PLC.readWord('MW', 10), 0);
        assert.equal(plc.get('Q0.0'), 0, 'ENO = 0 con EN = 0');

        plc.set('I0.0', 1);
        plc.scan();
        assert.equal(plc.PLC.readWord('MW', 10), 1234);
        assert.equal(plc.get('Q0.0'), 1, 'ENO = 1');
    });

    test('costante in QW', () => {
        const plc = newPlc([RUNG([MOVE(OP('const', -500), OP('QW', 64))], [])]);
        plc.scan();
        assert.equal(plc.PLC.readWord('QW', 64), -500);
    });

    test('REAL in una word: arrotondato; fuori campo INT non scrive e ENO = 0', () => {
        const plc = newPlc([RUNG([MOVE(OP('MD', 20), OP('MW', 10))], [COIL('Q0.0')])]);
        plc.PLC.writeReal('MD', 20, 12.6);
        plc.scan();
        assert.equal(plc.PLC.readWord('MW', 10), 13);
        assert.equal(plc.get('Q0.0'), 1);

        plc.PLC.writeReal('MD', 20, 40000);
        plc.scan();
        assert.equal(plc.PLC.readWord('MW', 10), 13);
        assert.equal(plc.get('Q0.0'), 0);
    });
});

describe('NORM_X e SCALE_X', () => {
    test('ingresso analogico 0..27648 scalato a 0..100', () => {
        const plc = newPlc([RUNG([
            NORM_X(OP('const', 0), OP('IW', 64), OP('const', 27648), OP('MD', 20)),
            SCALE_X(OP('const', 0), OP('MD', 20), OP('const', 100), OP('MW', 30)),
        ], [])]);
        const cases = [[0, 0], [13824, 50], [27648, 100], [6912, 25]];
        for (const [raw, eng] of cases) {
            plc.PLC.writeWord('IW', 64, raw);
            plc.scan();
            assert.equal(plc.PLC.readWord('MW', 30), eng, `IW64=${raw}`);
        }
        plc.PLC.writeWord('IW', 64, 13824);
        plc.scan();
        assert.equal(plc.PLC.readReal('MD', 20), 0.5);
    });

    test('fuori da MIN..MAX il risultato non viene limitato', () => {
        // Come in S7-1200: NORM_X da' valori < 0 o > 1, SCALE_X oltre MIN..MAX
        const plc = newPlc([RUNG([
            NORM_X(OP('const', 0), OP('IW', 64), OP('const', 27648), OP('MD', 20)),
            SCALE_X(OP('const', 0), OP('MD', 20), OP('const', 100), OP('MW', 30)),
        ], [])]);
        plc.PLC.writeWord('IW', 64, 32511); // overflow del canale analogico
        plc.scan();
        assert.ok(plc.PLC.readReal('MD', 20) > 1);
        assert.equal(plc.PLC.readWord('MW', 30), 118);
    });

    test('NORM_X con MIN = MAX non scrive e da\' ENO = 0', () => {
        const plc = newPlc([RUNG([NORM_X(OP('const', 5), OP('IW', 64), OP('const', 5), OP('MD', 20))], [COIL('Q0.0')])]);
        plc.PLC.writeReal('MD', 20, 0.25);
        plc.scan();
        assert.equal(plc.PLC.readReal('MD', 20), 0.25);
        assert.equal(plc.get('Q0.0'), 0);
    });

    test('uscita analogica: 0..100 % su QW 0..27648', () => {
        const plc = newPlc([RUNG([
            NORM_X(OP('const', 0), OP('MW', 10), OP('const', 100), OP('MD', 20)),
            SCALE_X(OP('const', 0), OP('MD', 20), OP('const', 27648), OP('QW', 64)),
        ], [])]);
        plc.PLC.writeWord('MW', 10, 75);
        plc.scan();
        assert.equal(plc.PLC.readWord('QW', 64), 20736);
    });
});

describe('memoria REAL', () => {
    test('MD20 occupa MB20..MB23 e si sovrappone a MW20 e MW22', () => {
        const plc = newPlc();
        plc.PLC.writeReal('MD', 20, 1.0); // 0x3F800000
        assert.equal(plc.PLC.readWord('MW', 20), 0x3F80);
        assert.equal(plc.PLC.readWord('MW', 22), 0);
    });

    test('un comparatore legge MD', () => {
        const plc = newPlc([RUNG([CMP('gt', OP('MD', 20), OP('const', 0.5))], [COIL('Q0.0')])]);
        plc.PLC.writeReal('MD', 20, 0.75);
        plc.scan();
        assert.equal(plc.get('Q0.0'), 1);
    });
});

describe('tempo di ciclo', () => {
    test('attuale, minimo e massimo fra l\'inizio di due cicli', () => {
        const plc = newPlc();
        plc.scan();
        assert.equal(plc.PLC.cycle.last, 0, 'il primo ciclo non ha un precedente');
        plc.scan(50);
        plc.scan(70);
        plc.scan(40);
        assert.deepEqual(
            { last: plc.PLC.cycle.last, min: plc.PLC.cycle.min, max: plc.PLC.cycle.max },
            { last: 40, min: 40, max: 70 }
        );
    });

    test('il passaggio in RUN azzera la statistica', () => {
        const plc = newPlc();
        plc.scan();
        plc.scan(80);
        plc.PLC.startup();
        plc.scan(10);
        plc.scan(50);
        assert.equal(plc.PLC.cycle.max, 50);
    });
});
