/**
 * Smoke test: plugin attivo, shortcode reso, asset locali caricati
 * nell'ordine giusto, nessuna richiesta esterna, nessun errore JavaScript.
 * Se falliscono, gli altri risultati non sono attendibili.
 */
const { test, expect } = require( '@playwright/test' );
const { PAGES, pageUrl, openSimulator } = require( './helpers' );

test.describe( 'infrastruttura', () => {
	test( 'lo shortcode mostra il simulatore senza errori JavaScript', async ( { page } ) => {
		const errors = await openSimulator( page );

		await expect( page.locator( '#plc-simulator' ) ).toBeVisible();
		await expect( page.locator( '.ladder-rung' ) ).toHaveCount( 1 );
		await expect( page.locator( '#inputs-grid .io-bit' ) ).not.toHaveCount( 0 );
		expect( errors ).toEqual( [] );
	} );

	test( 'asset del plugin nell\'ordine delle dipendenze, versione esposta', async ( { page } ) => {
		await openSimulator( page );

		await expect( page.locator( 'link#plc-simulator-style-css' ) ).toHaveCount( 1 );
		const scripts = await page.locator( 'script[src*="plc-s7-simulator/assets/js/"]' ).evaluateAll(
			( nodes ) => nodes.map( ( n ) => n.src.match( /assets\/js\/([\w./-]+)\.js/ )[ 1 ] )
		);
		expect( scripts ).toEqual( [ 'vendor/jszip.min', 'core/plc-core', 'simulator' ] );
		expect( await page.evaluate( () => window.plcSimConfig.version ) ).toMatch( /^\d+\.\d+\.\d+$/ );
	} );

	test( 'nessuna richiesta a server esterni dal simulatore', async ( { page } ) => {
		const external = [];
		page.on( 'request', ( req ) => {
			const url = new URL( req.url() );
			if ( url.hostname !== 'localhost' && url.protocol.startsWith( 'http' ) ) external.push( req.url() );
		} );
		await openSimulator( page );
		await page.waitForLoadState( 'networkidle' );
		// Il tema puo' caricare font o emoji da fuori: contano solo quelle del plugin
		expect( external.filter( ( u ) => /fonts\.googleapis|cdnjs|jszip/.test( u ) ) ).toEqual( [] );
	} );

	test( 'una pagina senza shortcode non carica gli asset', async ( { page } ) => {
		await page.goto( pageUrl( 'plain' ) );
		await expect( page.getByText( 'Nessuno shortcode qui.' ) ).toBeVisible();
		await expect( page.locator( 'script[src*="plc-s7-simulator/assets/js/"]' ) ).toHaveCount( 0 );
		await expect( page.locator( 'link#plc-simulator-style-css' ) ).toHaveCount( 0 );
	} );

	test( 'lo shortcode in un blocco riutilizzabile carica gli asset', async ( { page } ) => {
		const errors = await openSimulator( page, 'block' );
		await expect( page.locator( '#plc-simulator' ) ).toBeVisible();
		await expect( page.locator( '#inputs-grid .io-bit' ) ).not.toHaveCount( 0 );
		expect( errors ).toEqual( [] );
	} );

	test( 'le pagine di prova esistono', async ( { page } ) => {
		for ( const key of Object.keys( PAGES ) ) {
			const response = await page.goto( pageUrl( key ) );
			expect( response.status(), key ).toBe( 200 );
		}
	} );
} );
