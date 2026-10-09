/**
 * Pagina di amministrazione del plugin.
 */
const { test, expect } = require( '@playwright/test' );
const { ADMIN_STATE } = require( './helpers' );

test.use( { storageState: ADMIN_STATE } );

test( 'la pagina admin spiega lo shortcode e il salvataggio solo locale', async ( { page } ) => {
	const errors = [];
	page.on( 'pageerror', ( err ) => errors.push( err.message ) );
	const response = await page.goto( '/wp-admin/admin.php?page=plc-simulator', { waitUntil: 'domcontentloaded' } );
	expect( response.status() ).toBe( 200 );
	await expect( page.locator( '.wrap h1' ) ).toContainText( 'S7/1200 Simulator' );
	await expect( page.locator( '.wrap' ) ).toContainText( '[plc_simulator]' );
	await expect( page.locator( '.wrap' ) ).toContainText( 'non invia dati al server' );
	// Nessun errore PHP stampato nella pagina (WP_DEBUG attivo in wp-env)
	await expect( page.locator( 'body' ) ).not.toContainText( /Warning:|Notice:|Fatal error|Deprecated:/ );
	expect( errors ).toEqual( [] );
} );

test( 'l\'eliminazione dei programmi richiede il nonce', async ( { page } ) => {
	const response = await page.request.post( '/wp-admin/admin-post.php', { form: { action: 'plc_sim_purge_programs' } } );
	expect( response.status() ).toBe( 403 );
} );
