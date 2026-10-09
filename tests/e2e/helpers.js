/**
 * Utilità condivise dagli spec E2E.
 */
const path = require( 'path' );
const { expect } = require( '@playwright/test' );

const AUTH_DIR = path.join( __dirname, '.auth' );
const ADMIN_STATE = path.join( AUTH_DIR, 'admin.json' );

/**
 * Pagine di prova, create (o riallineate) da auth.setup.js. Si aprono con
 * ?pagename= per non dipendere dalla struttura dei permalink.
 */
const PAGES = {
	simulator: { slug: 'plcsim-e2e', title: 'Simulatore S7', content: '[plc_simulator]' },
	plain: { slug: 'plcsim-e2e-senza', title: 'Pagina senza simulatore', content: '<p>Nessuno shortcode qui.</p>' },
	// Shortcode dentro un blocco riutilizzabile: has_shortcode() sul contenuto
	// della pagina non lo vede, gli asset li accoda lo shortcode al rendering.
	// Il contenuto lo completa auth.setup.js con l'id del blocco.
	block: { slug: 'plcsim-e2e-blocco', title: 'Simulatore in un blocco riutilizzabile', content: '' },
};

const pageUrl = ( key ) => `/?pagename=${ PAGES[ key ].slug }`;

/**
 * Apre la pagina del simulatore e aspetta che sia inizializzato. Raccoglie
 * gli errori JavaScript: un errore in console e' quasi sempre un bug.
 */
async function openSimulator( page, key = 'simulator' ) {
	const errors = [];
	page.on( 'pageerror', ( err ) => errors.push( err.message ) );
	page.on( 'console', ( msg ) => {
		if ( msg.type() === 'error' ) errors.push( msg.text() );
	} );
	// Ogni test parte da uno stato pulito (scena e HMI stanno in localStorage)
	await page.addInitScript( () => {
		if ( ! sessionStorage.getItem( 'plcsim-e2e' ) ) {
			localStorage.clear();
			sessionStorage.setItem( 'plcsim-e2e', '1' );
		}
	} );
	await page.goto( pageUrl( key ) );
	await page.waitForFunction( () => window.plcSim && window.plcSim.PLC );
	return errors;
}

/** Bit di un'area ('I0.0', 'Q0.1', 'M10.0') letto dal PLC. */
function bit( page, addr ) {
	return page.evaluate( ( a ) => {
		const m = /^([IQM])(\d+)\.(\d)$/.exec( a );
		return window.plcSim.PLC.readBit( m[ 1 ], Number( m[ 2 ] ), Number( m[ 3 ] ) );
	}, addr );
}

const ioBit = ( page, type, addr ) => page.locator( `.io-bit[data-type="${ type }"][data-byte="${ addr.split( '.' )[ 0 ] }"][data-bit="${ addr.split( '.' )[ 1 ] }"]` );

/** Trascina uno strumento della toolbox nella zona di rilascio di un segmento. */
async function dropTool( page, type, rungIndex = 0, zone = 0 ) {
	const target = page.locator( '.ladder-rung' ).nth( rungIndex ).locator( '.drop-zone' ).nth( zone );
	await page.locator( `.plc-tool[data-type="${ type }"]` ).dragTo( target );
}

/** Configura l'indirizzo dell'elemento n-esimo di un segmento dalla finestra di configurazione. */
async function setAddress( page, elementIndex, type, byte, bitNo, rungIndex = 0 ) {
	await page.locator( '.ladder-rung' ).nth( rungIndex ).locator( '.ladder-element' ).nth( elementIndex ).dblclick();
	await expect( page.locator( '#config-modal' ) ).toHaveClass( /active/ );
	await page.locator( '#config-address-type' ).selectOption( type );
	await page.locator( '#config-address-byte' ).fill( String( byte ) );
	await page.locator( '#config-address-bit' ).fill( String( bitNo ) );
	await page.locator( '#config-save' ).click();
	await expect( page.locator( '#config-modal' ) ).not.toHaveClass( /active/ );
}

/**
 * Carica un programma in formato file JSON, come farebbe Carica, e chiude
 * l'avviso finale (arriva dopo la lettura asincrona del file).
 */
async function loadProgramFile( page, data, name = 'programma.json' ) {
	const chooser = page.waitForEvent( 'filechooser' );
	await page.locator( '#btn-load' ).click();
	const dialog = page.waitForEvent( 'dialog' );
	await ( await chooser ).setFiles( { name, mimeType: 'application/json', buffer: Buffer.from( JSON.stringify( data ) ) } );
	const d = await dialog;
	const message = d.message();
	await d.accept();
	return message;
}

async function run( page ) {
	await page.locator( '#btn-run' ).click();
	await page.waitForFunction( () => window.plcSim.PLC.running );
}

module.exports = {
	AUTH_DIR, ADMIN_STATE, PAGES, pageUrl, openSimulator, bit, ioBit, dropTool, setAddress, loadProgramFile, run,
};
