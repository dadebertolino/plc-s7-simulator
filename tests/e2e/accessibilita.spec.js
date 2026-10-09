/**
 * Accessibilita' (WCAG 2.1 AA) verificata con axe-core sul simulatore, negli
 * stati in cui lo vede uno studente.
 */
const { test, expect } = require( '@playwright/test' );
const AxeBuilder = require( '@axe-core/playwright' ).default;
const { openSimulator, loadProgramFile, run } = require( './helpers' );

async function violations( page ) {
	const results = await new AxeBuilder( { page } )
		.include( '#plc-simulator' )
		.withTags( [ 'wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa' ] )
		.analyze();
	return results.violations.map( ( v ) => `${ v.id } (${ v.nodes.length }): ${ v.nodes.slice( 0, 3 ).map( ( n ) => n.target.join( ' ' ) ).join( ', ' ) }` );
}

const programma = {
	name: 'Prova',
	program: { rungs: [ {
		id: 1, comment: 'Segmento',
		inputs: [ { type: 'contact-no', address: { type: 'I', byte: 0, bit: 0 } }, { type: 'timer-ton', timerId: 0, preset: 1000 } ],
		outputs: [ { type: 'coil', address: { type: 'Q', byte: 0, bit: 0 } } ],
	} ] },
};

// Misura di partenza (ottobre 2026): contrasti (~60 nodi), cursori analogici
// senza etichetta, select senza nome. Da riattivare con le correzioni del
// passo 6 del piano (accessibilita' e telefono).
test.describe.fixme( 'accessibilita\'', () => {
	test( 'simulatore appena aperto', async ( { page } ) => {
		await openSimulator( page );
		expect( await violations( page ) ).toEqual( [] );
	} );

	test( 'con un programma, in RUN', async ( { page } ) => {
		await openSimulator( page );
		await loadProgramFile( page, programma );
		await run( page );
		expect( await violations( page ) ).toEqual( [] );
	} );

	test( 'finestra di configurazione di un elemento', async ( { page } ) => {
		await openSimulator( page );
		await loadProgramFile( page, programma );
		await page.locator( '.ladder-element' ).first().dblclick();
		await expect( page.locator( '#config-modal' ) ).toHaveClass( /active/ );
		expect( await violations( page ) ).toEqual( [] );
	} );

	test( 'finestra hardware', async ( { page } ) => {
		await openSimulator( page );
		await page.locator( '#btn-hardware' ).click();
		await expect( page.locator( '#hardware-modal' ) ).toHaveClass( /active/ );
		expect( await violations( page ) ).toEqual( [] );
	} );

	test( 'pannello HMI', async ( { page } ) => {
		await openSimulator( page );
		await page.locator( '#btn-hmi' ).click();
		expect( await violations( page ) ).toEqual( [] );
	} );

	test( 'pannello Scene', async ( { page } ) => {
		await openSimulator( page );
		await page.locator( '#btn-scene' ).click();
		expect( await violations( page ) ).toEqual( [] );
	} );
} );
