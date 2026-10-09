/**
 * Login admin e pagine di prova.
 *
 * Le pagine si creano via REST e non con wp-cli, cosi' il setup funziona
 * uguale su wp-env (CI) e su WordPress Playground (locale senza Docker).
 * Idempotente: le pagine che esistono gia' vengono riallineate.
 */
const { test: setup, expect } = require( '@playwright/test' );
const { ADMIN_STATE, PAGES } = require( './helpers' );

setup( 'login admin e pagine di prova', async ( { page } ) => {
	// Login con una POST diretta e non dal form: il click va perso se arriva
	// prima che gli script di wp-login.php siano pronti.
	await page.request.get( '/wp-login.php' );
	const res = await page.request.post( '/wp-login.php', {
		form: { log: process.env.WP_USERNAME || 'admin', pwd: process.env.WP_PASSWORD || 'password', testcookie: '1', redirect_to: '/wp-admin/' },
		maxRedirects: 0,
	} );
	expect( res.status(), 'login rifiutato' ).toBe( 302 );

	await page.goto( '/wp-admin/', { waitUntil: 'domcontentloaded' } );
	await expect( page.locator( '#wpadminbar' ) ).toBeVisible();

	const nonce = await page.evaluate( () => window.wpApiSettings && window.wpApiSettings.nonce );
	expect( nonce ).toMatch( /^[a-f0-9]{10}$/ );
	const headers = { 'X-WP-Nonce': nonce };

	// Blocco riutilizzabile con lo shortcode, per la pagina 'block'
	const blocks = await page.request.get( '/?rest_route=/wp/v2/blocks&search=plcsim-e2e', { headers } );
	expect( blocks.ok() ).toBeTruthy();
	const [ existingBlock ] = await blocks.json();
	const blockRoute = existingBlock ? `/?rest_route=/wp/v2/blocks/${ existingBlock.id }` : '/?rest_route=/wp/v2/blocks';
	const block = await page.request.post( blockRoute, {
		headers,
		data: { title: 'plcsim-e2e', content: '<!-- wp:shortcode -->[plc_simulator]<!-- /wp:shortcode -->', status: 'publish' },
	} );
	expect( block.ok(), await block.text() ).toBeTruthy();
	PAGES.block.content = `<!-- wp:block {"ref":${ ( await block.json() ).id }} /-->`;

	for ( const { slug, title, content } of Object.values( PAGES ) ) {
		const found = await page.request.get( `/?rest_route=/wp/v2/pages&slug=${ slug }&status=publish,draft`, { headers } );
		expect( found.ok() ).toBeTruthy();
		const [ existing ] = await found.json();

		const route = existing ? `/?rest_route=/wp/v2/pages/${ existing.id }` : '/?rest_route=/wp/v2/pages';
		const saved = await page.request.post( route, { headers, data: { slug, title, content, status: 'publish' } } );
		expect( saved.ok(), `pagina ${ slug }: ${ await saved.text() }` ).toBeTruthy();
	}

	await page.context().storageState( { path: ADMIN_STATE } );
} );
