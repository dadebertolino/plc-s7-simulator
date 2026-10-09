/**
 * Modello di memoria S7: aree I, Q, M indirizzate per byte; le word
 * (IW, QW, MW) sono due byte consecutivi della stessa area, big-endian,
 * con segno (INT).
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { newPlc, NO, COIL, CMP, RUNG } = require('./helpers');

describe('dimensioni delle aree', () => {
    test('bit oltre I1.7, Q1.7 e M3.7 si leggono e si scrivono', () => {
        const { PLC } = newPlc();
        for (const [type, byte] of [['I', 127], ['Q', 127], ['M', 255]]) {
            PLC.writeBit(type, byte, 7, 1);
            assert.equal(PLC.readBit(type, byte, 7), 1, `${type}${byte}.7`);
        }
    });

    test('reset azzera anche i bit oltre i primi byte', () => {
        // Regressione: reset() azzerava solo I0-I1, Q0-Q1, M0-M3.
        const { PLC } = newPlc();
        PLC.writeBit('I', 8, 0, 1);
        PLC.writeBit('Q', 2, 3, 1);
        PLC.writeBit('M', 100, 5, 1);
        PLC.reset();
        assert.equal(PLC.readBit('I', 8, 0), 0);
        assert.equal(PLC.readBit('Q', 2, 3), 0);
        assert.equal(PLC.readBit('M', 100, 5), 0);
    });

    test('indirizzi fuori area: lettura 0, scrittura ignorata', () => {
        const { PLC } = newPlc();
        PLC.writeBit('M', 1e6, 0, 1);
        assert.equal(PLC.readBit('M', 1e6, 0), 0);
        PLC.writeWord('MW', 1e6, 5);
        assert.equal(PLC.readWord('MW', 1e6), 0);
        assert.equal(PLC.readBit('X', 0, 0), 0);
    });
});

describe('word sovrapposte ai bit (come in S7)', () => {
    test('MW10 = MB10 (byte alto) + MB11 (byte basso)', () => {
        const { PLC } = newPlc();
        PLC.writeWord('MW', 10, 0x0102);
        assert.equal(PLC.readBit('M', 10, 0), 1, 'M10.0 dal byte alto 0x01');
        assert.equal(PLC.readBit('M', 11, 1), 1, 'M11.1 dal byte basso 0x02');
        assert.equal(PLC.readBit('M', 11, 0), 0);
    });

    test('scrivere M10.0 cambia MW10', () => {
        const { PLC } = newPlc();
        PLC.writeBit('M', 10, 0, 1);
        assert.equal(PLC.readWord('MW', 10), 256);
        PLC.writeBit('M', 11, 0, 1);
        assert.equal(PLC.readWord('MW', 10), 257);
    });

    test('MW10 e MW11 condividono MB11', () => {
        const { PLC } = newPlc();
        PLC.writeWord('MW', 10, 0x00FF);
        assert.equal(PLC.readWord('MW', 11), 0xFF00 - 0x10000, 'MB11=FF, MB12=00 -> INT negativo');
    });

    test('IW64 si vede come I64.x / I65.x, QW64 come Q64.x / Q65.x', () => {
        const { PLC } = newPlc();
        PLC.writeWord('IW', 64, 27648); // 0x6C00
        assert.equal(PLC.readBit('I', 64, 6), 1);
        assert.equal(PLC.readBit('I', 65, 0), 0);
        PLC.writeBit('Q', 65, 0, 1);
        assert.equal(PLC.readWord('QW', 64), 1);
    });
});

describe('valori delle word (INT)', () => {
    test('MW accetta valori negativi e oltre 27648', () => {
        // Regressione: writeWord limitava ogni word a 0-27648.
        const { PLC } = newPlc();
        PLC.writeWord('MW', 0, -5);
        assert.equal(PLC.readWord('MW', 0), -5);
        PLC.writeWord('MW', 2, 30000);
        assert.equal(PLC.readWord('MW', 2), 30000);
    });

    test('saturazione al campo INT -32768..32767, arrotondamento all\'intero', () => {
        const { PLC } = newPlc();
        PLC.writeWord('MW', 0, 40000);
        assert.equal(PLC.readWord('MW', 0), 32767);
        PLC.writeWord('MW', 2, -40000);
        assert.equal(PLC.readWord('MW', 2), -32768);
        PLC.writeWord('MW', 4, 12.6);
        assert.equal(PLC.readWord('MW', 4), 13);
    });

    test('il comparatore legge MW come word sovrapposta ai merker', () => {
        const plc = newPlc([RUNG([CMP('eq', { type: 'MW', value: 20 }, { type: 'const', value: 1 })], [COIL('Q0.0')])]);
        plc.set('M21.0', 1);
        plc.scan();
        assert.equal(plc.get('Q0.0'), 1);
    });

    test('un contatto su M legge il bit scritto tramite MW', () => {
        const plc = newPlc([RUNG([NO('M30.2')], [COIL('Q0.0')])]);
        plc.PLC.writeWord('MW', 30, 0x0400);
        plc.scan();
        assert.equal(plc.get('Q0.0'), 1);
    });
});
