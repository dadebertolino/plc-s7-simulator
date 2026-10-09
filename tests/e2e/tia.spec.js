/**
 * Export verso TIA Portal (AWL, SCL, XML) e import di XML SimaticML e
 * progetti .zap (JSZip incluso nel plugin).
 */
const fs = require( 'fs' );
const { test, expect } = require( '@playwright/test' );
const { openSimulator, loadProgramFile, run, ioBit } = require( './helpers' );

const programma = {
	name: 'Nastro',
	program: { rungs: [
		{
			id: 1, comment: 'Marcia nastro',
			inputs: [ { id: 1, type: 'contact-no', address: { type: 'I', byte: 0, bit: 0 } }, { id: 2, type: 'contact-nc', address: { type: 'I', byte: 0, bit: 1 } } ],
			outputs: [ { id: 3, type: 'coil', address: { type: 'Q', byte: 0, bit: 0 } } ],
		},
		{
			id: 2,
			inputs: [ { id: 4, type: 'contact-no', address: { type: 'I', byte: 0, bit: 2 } }, { id: 5, type: 'counter-ctu', counterId: 0, preset: 3, resetAddr: { type: 'I', byte: 0, bit: 3 } } ],
			outputs: [ { id: 6, type: 'coil', address: { type: 'Q', byte: 0, bit: 1 } } ],
		},
	] },
};

/** Esporta nel formato scelto dal prompt (1-4) e restituisce il testo del file. */
async function exportAs( page, format ) {
	page.once( 'dialog', ( d ) => d.accept( String( format ) ) );
	const download = page.waitForEvent( 'download' );
	await page.locator( '#btn-export' ).click();
	const d = await download;
	return { name: d.suggestedFilename(), text: fs.readFileSync( await d.path(), 'utf8' ) };
}

/** Importa un file dal pulsante Importa e restituisce il messaggio finale. */
async function importFile( page, name, buffer ) {
	const dialog = page.waitForEvent( 'dialog' );
	await page.locator( '#import-file' ).setInputFiles( { name, mimeType: 'application/octet-stream', buffer } );
	const d = await dialog;
	const message = d.message();
	await d.accept();
	return message;
}

test.describe( 'TIA Portal', () => {
	test( 'export AWL e SCL con i collegamenti del contatore', async ( { page } ) => {
		const errors = await openSimulator( page );
		await loadProgramFile( page, programma );

		const awl = await exportAs( page, 2 );
		expect( awl.text ).toContain( 'CALL  "CTU"' );
		expect( awl.text ).toMatch( /R\s+:=I0\.3/ );

		// Regressione: un box in serie fra i contatti non veniva mai chiamato
		// ("Q0.1" := "I0.2" AND "C0".Q, senza la chiamata del contatore)
		const scl = await exportAs( page, 3 );
		expect( scl.text ).toContain( '"C0"(CU := "I0.2", R := "I0.3", PV := 3);' );
		expect( scl.text ).toContain( '"Q0.1" := "C0".Q;' );
		expect( scl.text ).toContain( '"Q0.0" := "I0.0" AND NOT "I0.1";' );
		expect( errors ).toEqual( [] );
	} );

	test( 'export XML, reimport dell\'XML e dello stesso XML in un .zap', async ( { page } ) => {
		const errors = await openSimulator( page );
		await loadProgramFile( page, programma );
		const xml = await exportAs( page, 4 );
		expect( xml.text ).toContain( '<?xml' );

		// XML del plugin reimportato. Regressione: il selettore prendeva sia il
		// CompileUnit sia il FlgNet che contiene e duplicava ogni network.
		await importFile( page, 'Nastro.xml', Buffer.from( xml.text ) );
		await expect( page.locator( '.ladder-rung' ) ).toHaveCount( 2 );
		await run( page );
		await ioBit( page, 'I', '0.0' ).click();
		await expect( ioBit( page, 'Q', '0.0' ) ).toHaveClass( /active/ );
		await page.locator( '#btn-stop' ).click();

		// .zap: l'archivio si apre con il JSZip incluso nel plugin e i network
		// vengono trovati. Il parser dei .zap e' quello per l'XML di TIA
		// (Parts con UId): il contenuto degli elementi qui non si verifica.
		const zap = await page.evaluate( async ( text ) => {
			const zip = new window.JSZip();
			zip.file( 'Nastro/PLC_1/ProgramBlocks/Main.xml', text );
			return Array.from( await zip.generateAsync( { type: 'uint8array' } ) );
		}, xml.text );
		const message = await importFile( page, 'Nastro.zap17', Buffer.from( zap ) );
		expect( message ).toContain( 'Progetto TIA Portal importato' );
		expect( message ).toContain( 'Network: 2' );
		await expect( page.locator( '.ladder-rung' ) ).toHaveCount( 2 );
		await expect( page.locator( '#program-name' ) ).toHaveValue( 'Nastro' );
		expect( errors ).toEqual( [] );
	} );
} );
