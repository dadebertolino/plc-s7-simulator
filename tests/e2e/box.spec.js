/**
 * Box MOVE, NORM_X, SCALE_X nell'editor e tempo di ciclo nella barra di stato.
 */
const { test, expect } = require( '@playwright/test' );
const { openSimulator, run } = require( './helpers' );

/**
 * Trascina uno strumento con gli eventi HTML5 dell'editor. Questi strumenti
 * stanno in fondo alla toolbox: con dragTo la pagina scorre fra la pressione
 * del mouse e il trascinamento e il browser prende lo strumento sbagliato.
 */
function dropTool( page, type, position = 0 ) {
	return page.evaluate( ( [ t, z ] ) => {
		const dataTransfer = new DataTransfer();
		const fire = ( el, name ) => el.dispatchEvent( new DragEvent( name, { bubbles: true, cancelable: true, dataTransfer } ) );
		fire( document.querySelector( `.plc-tool[data-type="${ t }"]` ), 'dragstart' );
		const target = document.querySelector( `.ladder-rung .drop-zone[data-section="inputs"][data-position="${ z }"]` );
		fire( target, 'dragover' );
		fire( target, 'drop' );
	}, [ type, position ] );
}

/** Valore dell'ingresso analogico come lo darebbe il cursore della finestra I/O. */
function setAnalog( page, address, value ) {
	return page.evaluate( ( [ a, v ] ) => {
		const slider = document.querySelector( `.ai-slider[data-address="${ a }"]` );
		slider.value = String( v );
		slider.dispatchEvent( new Event( 'input', { bubbles: true } ) );
	}, [ address, value ] );
}

const word = ( page, type, address ) => page.evaluate( ( [ t, a ] ) => window.plcSim.PLC.readWord( t, a ), [ type, address ] );

test.describe( 'MOVE, NORM_X, SCALE_X', () => {
	test( 'NORM_X e SCALE_X trascinati: IW64 in percentuale su MW30', async ( { page } ) => {
		const errors = await openSimulator( page );

		// Valori iniziali: NORM_X IW64 0..27648 -> MD20, SCALE_X MD20 -> 0..100 su MW30
		await dropTool( page, 'norm-x' );
		await dropTool( page, 'scale-x', 1 ); // dopo NORM_X
		const boxes = page.locator( '.ladder-rung .math-box' );
		await expect( boxes ).toHaveCount( 2 );
		await expect( boxes.nth( 0 ) ).toContainText( 'NORM_X' );
		await expect( boxes.nth( 0 ) ).toContainText( 'VALUE: IW64' );
		await expect( boxes.nth( 1 ) ).toContainText( 'OUT: MW30' );

		await run( page );
		await setAnalog( page, 64, 13824 );
		await expect.poll( () => word( page, 'MW', 30 ) ).toBe( 50 );
		await setAnalog( page, 64, 27648 );
		await expect.poll( () => word( page, 'MW', 30 ) ).toBe( 100 );
		expect( errors ).toEqual( [] );
	} );

	test( 'MOVE configurato dalla finestra: costante in QW64', async ( { page } ) => {
		await openSimulator( page );
		await dropTool( page, 'move' );

		await page.locator( '.ladder-rung .ladder-element' ).first().dblclick();
		await expect( page.locator( '#box-config' ) ).toBeVisible();
		await expect( page.locator( '#address-config' ) ).toBeHidden();
		await page.locator( '#config-box-IN-type' ).selectOption( 'const' );
		await page.locator( '#config-box-IN-value' ).fill( '1234' );
		await page.locator( '#config-box-OUT-type' ).selectOption( 'QW' );
		await page.locator( '#config-box-OUT-value' ).fill( '64' );
		await page.locator( '#config-save' ).click();
		await expect( page.locator( '.math-box' ) ).toContainText( 'IN: 1234' );
		await expect( page.locator( '.math-box' ) ).toContainText( 'OUT: QW64' );

		await run( page );
		await expect.poll( () => word( page, 'QW', 64 ) ).toBe( 1234 );
	} );
} );

test.describe( 'tempo di ciclo', () => {
	test( 'in RUN la barra di stato mostra attuale, minimo e massimo; in STOP sparisce', async ( { page } ) => {
		await openSimulator( page );
		await expect( page.locator( '#status-cycle' ) ).toHaveText( '' );
		await run( page );
		await expect( page.locator( '#status-cycle' ) ).toHaveText( /^\d+ ms \(\d+ \/ \d+\)$/ );
		await page.locator( '#btn-stop' ).click();
		await expect( page.locator( '#status-cycle' ) ).toHaveText( '' );
	} );
} );
