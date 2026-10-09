/**
 * Contatti -|P|- e -|N|- come in TIA Portal: confrontano l'operando con il
 * proprio bit di memoria del fronte, aggiornato a ogni esecuzione anche senza
 * potenza in ingresso; il risultato va in AND con la potenza. Ogni istruzione
 * ha la sua memoria del fronte.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { newPlc, NO, P, N, COIL, SET, CTU, BRANCH, RUNG } = require('./helpers');

describe('contatto P', () => {
    test('impulso di un solo ciclo sul fronte di salita', () => {
        const plc = newPlc([RUNG([P('I0.0')], [COIL('Q0.0')])]);
        plc.scan();
        assert.equal(plc.get('Q0.0'), 0);
        plc.set('I0.0', 1); plc.scan();
        assert.equal(plc.get('Q0.0'), 1);
        plc.scan();
        assert.equal(plc.get('Q0.0'), 0);
    });

    test('nessun falso impulso se l\'operando e\' gia\' alto quando arriva la potenza', () => {
        // Regressione: il fronte era calcolato su (potenza AND operando).
        const plc = newPlc([RUNG([NO('I0.1'), P('I0.0')], [SET('Q0.0')])]);
        plc.set('I0.0', 1); plc.scan();
        plc.set('I0.1', 1); plc.scan();
        assert.equal(plc.get('Q0.0'), 0);
    });

    test('due contatti P sullo stesso operando scattano entrambi', () => {
        // Regressione: la memoria del fronte era per indirizzo e il primo
        // contatto la "consumava".
        const plc = newPlc([
            RUNG([P('I0.0')], [SET('Q0.0')]),
            RUNG([P('I0.0')], [SET('Q0.1')]),
        ]);
        plc.scan();
        plc.set('I0.0', 1); plc.scan();
        assert.equal(plc.get('Q0.0'), 1);
        assert.equal(plc.get('Q0.1'), 1);
    });

    test('P in due linee della stessa diramazione: ognuno ha il suo fronte', () => {
        const p1 = P('I0.0');
        const p2 = P('I0.0');
        const plc = newPlc([RUNG([NO('I0.1'), BRANCH([p1], [p2, NO('I0.2')])], [CTU(0, 99)])]);
        plc.set('I0.1', 1); plc.set('I0.2', 1); plc.scan();
        plc.set('I0.0', 1); plc.scan();
        assert.equal(p1.state, 1);
        assert.equal(p2.state, 1);
        assert.equal(plc.counter(0).CV, 1);
    });

    test('conta un fronte per pressione del pulsante', () => {
        const plc = newPlc([RUNG([P('I0.0')], [CTU(0, 99)])]);
        for (let k = 0; k < 3; k++) {
            plc.set('I0.0', 1); plc.run(4);
            plc.set('I0.0', 0); plc.run(4);
        }
        assert.equal(plc.counter(0).CV, 3);
    });
});

describe('contatto N', () => {
    test('impulso di un solo ciclo sul fronte di discesa', () => {
        const plc = newPlc([RUNG([N('I0.0')], [COIL('Q0.0')])]);
        plc.set('I0.0', 1); plc.scan();
        assert.equal(plc.get('Q0.0'), 0);
        plc.set('I0.0', 0); plc.scan();
        assert.equal(plc.get('Q0.0'), 1);
        plc.scan();
        assert.equal(plc.get('Q0.0'), 0);
    });

    test('nessun falso impulso quando cade la potenza con l\'operando alto', () => {
        // Regressione: la caduta della potenza era vista come fronte di discesa.
        const plc = newPlc([RUNG([NO('I0.1'), N('I0.0')], [SET('Q0.0')])]);
        plc.set('I0.0', 1); plc.set('I0.1', 1); plc.scan();
        plc.set('I0.1', 0); plc.scan();
        plc.set('I0.1', 1); plc.scan();
        assert.equal(plc.get('Q0.0'), 0);
    });

    test('due contatti N sullo stesso operando scattano entrambi', () => {
        const plc = newPlc([
            RUNG([N('I0.0')], [SET('Q0.0')]),
            RUNG([N('I0.0')], [SET('Q0.1')]),
        ]);
        plc.set('I0.0', 1); plc.scan();
        plc.set('I0.0', 0); plc.scan();
        assert.equal(plc.get('Q0.0'), 1);
        assert.equal(plc.get('Q0.1'), 1);
    });
});
