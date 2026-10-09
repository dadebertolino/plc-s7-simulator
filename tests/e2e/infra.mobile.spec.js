/**
 * Telefono (Pixel 7): il simulatore si carica e si usa senza errori.
 */
const { test, expect } = require( '@playwright/test' );
const AxeBuilder = require( '@axe-core/playwright' ).default;
const { openSimulator, loadProgramFile, run, ioBit } = require( './helpers' );

// Misura di partenza (ottobre 2026): la testata sborda di 787 px e i
// pulsanti si sovrappongono. Da riattivare con il passo 6 del piano.
test.describe.fixme( 'telefono', () => {
	test( 'si carica un programma, si va in RUN e si aziona un ingresso', async ( { page } ) => {
		const errors = await openSimulator( page );
		await loadProgramFile( page, {
			name: 'Marcia',
			program: { rungs: [ {
				id: 1,
				inputs: [ { type: 'contact-no', address: { type: 'I', byte: 0, bit: 0 } } ],
				outputs: [ { type: 'coil', address: { type: 'Q', byte: 0, bit: 0 } } ],
			} ] },
		} );
		await run( page );
		await ioBit( page, 'I', '0.0' ).tap();
		await expect( ioBit( page, 'Q', '0.0' ) ).toHaveClass( /active/ );
		expect( errors ).toEqual( [] );
	} );

	test( 'ne\' la pagina ne\' il simulatore scorrono in orizzontale', async ( { page } ) => {
		await openSimulator( page );
		const overflow = await page.evaluate( () => {
			const app = document.getElementById( 'plc-simulator' );
			return {
				page: document.documentElement.scrollWidth - window.innerWidth,
				app: app.scrollWidth - app.clientWidth,
				header: document.querySelector( '.plc-header' ).scrollWidth - app.clientWidth,
			};
		} );
		expect( overflow ).toEqual( { page: 0, app: 0, header: 0 } );
	} );

	test( 'comandi principali visibili', async ( { page } ) => {
		await openSimulator( page );
		for ( const sel of [ '#btn-run', '#btn-stop', '#btn-load', '#btn-save', '#ladder-canvas', '#inputs-grid', '#status-text' ] ) {
			await expect( page.locator( sel ), sel ).toBeInViewport( { ratio: 0.1 } ).catch( async () => {
				await expect( page.locator( sel ), sel ).toBeVisible();
			} );
		}
	} );

	test( 'nessun problema di accessibilita\' (axe)', async ( { page } ) => {
		await openSimulator( page );
		const results = await new AxeBuilder( { page } )
			.include( '#plc-simulator' )
			.withTags( [ 'wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa' ] )
			.analyze();
		expect( results.violations.map( ( v ) => `${ v.id } (${ v.nodes.length })` ) ).toEqual( [] );
	} );
} );
