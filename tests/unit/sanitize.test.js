/**
 * Dati importati (programmi JSON, progetti TIA, configurazioni HMI, scene):
 * nessuna stringa deve poter uscire da un attributo o diventare HTML.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { PLCSimCore } = require('./helpers');

const { sanitizeData, escapeHtml } = PLCSimCore;

describe('escapeHtml', () => {
    test('escapa anche le virgolette, per gli attributi', () => {
        assert.equal(escapeHtml('<img src=x onerror="a">\'&'), '&lt;img src=x onerror=&quot;a&quot;&gt;&#39;&amp;');
    });

    test('valori non stringa', () => {
        assert.equal(escapeHtml(null), '');
        assert.equal(escapeHtml(undefined), '');
        assert.equal(escapeHtml(42), '42');
    });
});

describe('sanitizeData', () => {
    test('un programma valido resta uguale', () => {
        const program = {
            name: 'Marcia <arresto>',
            rungs: [{
                id: 1, comment: 'Avvio "motore"',
                inputs: [
                    { id: 1712.5, type: 'contact-no', address: { type: 'I', byte: 0, bit: 0 }, comment: 'S1', state: 0 },
                    { type: 'branch', id: 3, lines: [[{ type: 'cmp-ge', operand1: { type: 'IW', value: 64 }, operand2: { type: 'const', value: -5 } }]] },
                ],
                outputs: [{ type: 'counter-ctud', counterId: 0, preset: 10, cdAddr: { type: 'I', byte: 0, bit: 1 }, qdAddr: { type: 'M', byte: 5, bit: 0 } }],
            }],
        };
        assert.deepEqual(sanitizeData(structuredClone(program)), program);
    });

    test('stringhe non di testo con caratteri HTML vengono scartate', () => {
        const out = sanitizeData({ rungs: [{ id: '1" onmouseover="x', inputs: [{ type: 'contact-no" onclick="x', address: { type: '<b>', byte: 0, bit: 0 } }] }] });
        assert.equal(out.rungs[0].id, undefined);
        assert.equal(out.rungs[0].inputs[0].type, undefined);
        assert.equal(out.rungs[0].inputs[0].address.type, undefined);
    });

    test('campi numerici: stringhe numeriche convertite, il resto scartato', () => {
        const out = sanitizeData({ preset: '1500', byte: '3', bit: 'x', x: '10px"', varNum: 7 });
        assert.deepEqual(out, { preset: 1500, byte: 3, varNum: 7 });
    });

    test('il testo libero resta testo (l\'escape si fa in uscita)', () => {
        const out = sanitizeData({ label: '<script>', comment: 'a "b"', name: 'x', msg: 'T > 50' });
        assert.deepEqual(out, { label: '<script>', comment: 'a "b"', name: 'x', msg: 'T > 50' });
    });

    test('colori e tipi ammessi', () => {
        const out = sanitizeData({ color: '#00d4aa', type: 'tank', varType: 'MW' });
        assert.deepEqual(out, { color: '#00d4aa', type: 'tank', varType: 'MW' });
        assert.deepEqual(sanitizeData({ color: 'red;background:url(x)' }), {});
    });

    test('sfondo HMI: solo immagini data: in base64', () => {
        assert.equal(sanitizeData({ background: 'data:image/png;base64,iVBORw0KGgo=' }).background, 'data:image/png;base64,iVBORw0KGgo=');
        assert.equal(sanitizeData({ background: 'https://example.com/x.png' }).background, null);
        assert.equal(sanitizeData({ backgroundImage: 'data:image/png;base64,x) ; color:red' }).backgroundImage, null);
    });

    test('chiavi pericolose e oggetti annidati', () => {
        const out = sanitizeData(JSON.parse('{"__proto__": {"polluted": 1}, "pages": [{"elements": [{"label": "ok", "width": "50"}]}]}'));
        assert.equal({}.polluted, undefined);
        assert.equal(Object.prototype.hasOwnProperty.call(out, '__proto__'), false);
        assert.deepEqual(out.pages[0].elements[0], { label: 'ok', width: 50 });
    });

    test('testo libero non stringa diventa stringa', () => {
        assert.deepEqual(sanitizeData({ label: { toString: 1 }, name: 5 }), { label: '', name: '5' });
    });
});

describe('assignIds', () => {
    const { assignIds } = PLCSimCore;

    test('assegna id unici a elementi e diramazioni che non li hanno o li ripetono', () => {
        const program = { rungs: [
            { id: 1, inputs: [{ type: 'contact-no' }, { id: 5, type: 'branch', lines: [[{ id: 5, type: 'contact-no' }], [{ type: 'contact-nc' }]] }], outputs: [{ id: 7, type: 'coil' }] },
            { id: 1, inputs: [{ id: 7, type: 'contact-no' }], outputs: [] },
        ] };
        assignIds(program);
        const ids = [];
        const walk = (list) => list.forEach(e => { ids.push(e.id); if (e.lines) e.lines.forEach(walk); });
        program.rungs.forEach(r => { walk(r.inputs); walk(r.outputs); });
        assert.equal(ids.length, 6);
        assert.equal(new Set(ids).size, 6, 'id tutti diversi: ' + ids);
        assert.ok(ids.every(id => typeof id === 'number' && Number.isFinite(id)));
        assert.equal(program.rungs[0].inputs[1].id, 5, 'il primo id resta');
        assert.equal(program.rungs[0].outputs[0].id, 7);
        assert.notEqual(program.rungs[0].id, program.rungs[1].id, 'anche i segmenti');
    });
});
