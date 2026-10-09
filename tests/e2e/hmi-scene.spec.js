/**
 * Pannelli HMI e Scene: si aprono, si chiudono, nessun errore JavaScript.
 */
const { test, expect } = require( '@playwright/test' );
const { openSimulator, loadProgramFile, run } = require( './helpers' );

test( 'il pannello HMI si apre e mostra il modello scelto', async ( { page } ) => {
	const errors = await openSimulator( page );
	await page.locator( '#btn-hmi' ).click();
	await expect( page.locator( '#hmi-panel' ) ).toHaveClass( /active/ );
	await page.locator( '#hmi-model-select' ).selectOption( { index: 0 } );
	expect( errors ).toEqual( [] );
} );

test( 'il pannello Scene si apre senza errori', async ( { page } ) => {
	const errors = await openSimulator( page );
	await page.locator( '#btn-scene' ).click();
	await expect( page.locator( '#scene-panel' ) ).toHaveClass( /active/ );
	expect( errors ).toEqual( [] );
} );

test( 'HMI importata con il programma: una word MW scritta dal PLC', async ( { page } ) => {
	const errors = await openSimulator( page );
	await loadProgramFile( page, {
		name: 'Con HMI',
		program: { rungs: [ {
			id: 1,
			inputs: [ { id: 1, type: 'contact-no', address: { type: 'I', byte: 0, bit: 0 } } ],
			outputs: [ { id: 2, type: 'coil', address: { type: 'M', byte: 11, bit: 0 } } ],
		} ] },
		hmi_config: { pages: [ { id: 1, name: 'Pagina 1', elements: [] } ], currentPageId: 1, pageCounter: 1, elementCounter: 0 },
	} );
	await run( page );
	await page.evaluate( () => window.plcSim.PLC.writeBit( 'I', 0, 0, 1 ) );
	// M11.0 e' il bit basso di MW10: la HMI legge MW10 = 1
	await expect.poll( () => page.evaluate( () => window.plcSim.PLC.readWord( 'MW', 10 ) ) ).toBe( 1 );
	expect( errors ).toEqual( [] );
} );
