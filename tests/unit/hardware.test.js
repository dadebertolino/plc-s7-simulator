/**
 * Indirizzi di default degli I/O come in TIA Portal per S7-1200:
 * CPU da I0.0/Q0.0 e IW64/QW64, signal board da I4.0/Q4.0 e IW80/QW80,
 * modulo nello slot n (2..9) da I(8+4(n-2)).0 e IW(96+16(n-2)).
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { newPlc } = require('./helpers');

function io(cpu, expansions) {
    const { PLC } = newPlc();
    PLC.hardware.currentCPU = cpu;
    PLC.hardware.installedExpansions = expansions;
    return PLC.getIOConfig();
}

const labels = (channels) => channels.map(c => `${c.byte}.${c.bit}`);

describe('ingressi e uscite digitali', () => {
    test('CPU 1214C: 14 DI da I0.0 a I1.5, 10 DQ da Q0.0 a Q1.1', () => {
        const cfg = io('1214C-DC', []);
        assert.equal(cfg.di.length, 14);
        assert.equal(labels(cfg.di).at(-1), '1.5');
        assert.equal(cfg.dq.length, 10);
        assert.equal(labels(cfg.dq).at(-1), '1.1');
        assert.equal(cfg.di[0].module, 'CPU');
    });

    test('signal board digitale a I4.0 / Q4.0', () => {
        const cfg = io('1212C-DC', ['SB1223-2DI2DQ']);
        assert.deepEqual(labels(cfg.di.filter(c => c.byte >= 4)), ['4.0', '4.1']);
        assert.deepEqual(labels(cfg.dq.filter(c => c.byte >= 4)), ['4.0', '4.1']);
    });

    test('moduli SM negli slot 2 e 3: I8.0 e I12.0', () => {
        const cfg = io('1214C-DC', ['SM1221-8DI', 'SM1223-8DI8DQ']);
        assert.deepEqual(labels(cfg.di.filter(c => c.byte >= 8)), [
            '8.0', '8.1', '8.2', '8.3', '8.4', '8.5', '8.6', '8.7',
            '12.0', '12.1', '12.2', '12.3', '12.4', '12.5', '12.6', '12.7',
        ]);
        assert.deepEqual(labels(cfg.dq.filter(c => c.byte >= 8)), ['12.0', '12.1', '12.2', '12.3', '12.4', '12.5', '12.6', '12.7']);
    });

    test('SM1221 a 16 DI occupa I8.0-I9.7', () => {
        const cfg = io('1214C-DC', ['SM1221-16DI']);
        assert.equal(labels(cfg.di).at(-1), '9.7');
    });

    test('la signal board non occupa uno slot', () => {
        const cfg = io('1214C-DC', ['SB1221-4DI', 'SM1221-8DI']);
        assert.equal(cfg.di.find(c => c.module === 'SM 1221 DI x8').byte, 8);
    });
});

describe('ingressi e uscite analogici', () => {
    test('1215C con SM nello slot 2 e 3: IW96... e IW112...', () => {
        const cfg = io('1215C-DC', ['SM1231-4AI', 'SM1234-4AI2AQ']);
        assert.deepEqual(cfg.ai, [64, 66, 96, 98, 100, 102, 112, 114, 116, 118]);
        assert.deepEqual(cfg.aq, [64, 66, 112, 114]);
    });

    test('signal board analogica a IW80 / QW80', () => {
        const cfg = io('1214C-DC', ['SB1231-1AI']);
        assert.deepEqual(cfg.ai, [64, 66, 80]);
        const cfg2 = io('1214C-DC', ['SB1232-1AQ']);
        assert.deepEqual(cfg2.aq, [80]);
    });

    test('getAnalogConfig usa gli stessi indirizzi', () => {
        const { PLC } = newPlc();
        PLC.hardware.currentCPU = '1215C-DC';
        PLC.hardware.installedExpansions = ['SM1231-4AI', 'SM1234-4AI2AQ'];
        const cfg = PLC.getAnalogConfig();
        assert.deepEqual(cfg.aiAddresses, [64, 66, 96, 98, 100, 102, 112, 114, 116, 118]);
        assert.deepEqual(cfg.aqAddresses, [64, 66, 112, 114]);
        assert.equal(cfg.totalAI, 10);
        assert.equal(cfg.totalAQ, 4);
    });
});

describe('limiti della configurazione', () => {
    test('una sola signal board', () => {
        assert.match(io('1214C-DC', ['SB1221-4DI', 'SB1222-4DQ']).errors[0], /signal board/i);
    });

    test('1211C non accetta moduli SM, 1212C al massimo 2, 1214C al massimo 8', () => {
        assert.equal(io('1211C-DC', ['SM1221-8DI']).errors.length, 1);
        assert.equal(io('1212C-DC', ['SM1221-8DI', 'SM1221-8DI', 'SM1221-8DI']).errors.length, 1);
        assert.equal(io('1214C-DC', Array(8).fill('SM1221-8DI')).errors.length, 0);
        assert.equal(io('1214C-DC', Array(9).fill('SM1221-8DI')).errors.length, 1);
    });

    test('canAddExpansion rispetta gli stessi limiti', () => {
        const { PLC } = newPlc();
        PLC.hardware.currentCPU = '1212C-DC';
        PLC.hardware.installedExpansions = ['SM1221-8DI', 'SB1221-4DI'];
        assert.equal(PLC.canAddExpansion('SM1222-8DQ'), '');
        assert.match(PLC.canAddExpansion('SB1222-4DQ'), /signal board/i);
        PLC.hardware.installedExpansions.push('SM1222-8DQ');
        assert.match(PLC.canAddExpansion('SM1221-8DI'), /1212C/);
    });
});
