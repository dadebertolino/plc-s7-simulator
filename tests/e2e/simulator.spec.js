/**
 * Simulatore nel browser: editor Ladder, RUN/STOP, salvataggio e
 * caricamento dei file, configurazione hardware, contatori.
 */
const fs = require( 'fs' );
const { test, expect } = require( '@playwright/test' );
const { openSimulator, bit, ioBit, dropTool, setAddress, loadProgramFile, run } = require( './helpers' );

const marcia = {
	version: '1.6.9',
	name: 'Marcia',
	program: {
		name: 'Marcia',
		rungs: [ {
			id: 1, comment: 'Uscita con I0.0',
			inputs: [ { id: 11, type: 'contact-no', address: { type: 'I', byte: 0, bit: 0 }, comment: 'Pulsante' } ],
			outputs: [ { id: 12, type: 'coil', address: { type: 'Q', byte: 0, bit: 0 }, comment: 'Lampada' } ],
		} ],
	},
	hardware_config: { currentCPU: '1214C-DC', installedExpansions: [] },
};

test.describe( 'editor e RUN', () => {
	test( 'contatto e bobina trascinati, indirizzi, RUN: l\'ingresso accende l\'uscita', async ( { page } ) => {
		const errors = await openSimulator( page );

		await dropTool( page, 'contact-no' );
		await expect( page.locator( '.ladder-rung .ladder-element' ) ).toHaveCount( 1 );
		await dropTool( page, 'coil', 0, -1 );
		await expect( page.locator( '.ladder-rung .ladder-element' ) ).toHaveCount( 2 );
		await setAddress( page, 0, 'I', 0, 2 );
		await setAddress( page, 1, 'Q', 0, 3 );
		await expect( page.locator( '.ladder-element .element-address' ).first() ).toHaveText( 'I0.2' );

		await run( page );
		await expect( page.locator( '#status-text' ) ).toHaveText( 'RUN' );
		await ioBit( page, 'I', '0.2' ).click();
		await expect( ioBit( page, 'Q', '0.3' ) ).toHaveClass( /active/ );
		await ioBit( page, 'I', '0.2' ).click();
		await expect( ioBit( page, 'Q', '0.3' ) ).not.toHaveClass( /active/ );
		expect( errors ).toEqual( [] );
	} );

	test( 'STOP spegne le uscite; un secondo RUN non crea un secondo ciclo', async ( { page } ) => {
		await openSimulator( page );
		await loadProgramFile( page, marcia );
		await run( page );
		await page.locator( '#btn-run' ).click();
		await ioBit( page, 'I', '0.0' ).click();
		await expect( ioBit( page, 'Q', '0.0' ) ).toHaveClass( /active/ );

		await page.locator( '#btn-stop' ).click();
		await expect( page.locator( '#status-text' ) ).toHaveText( 'STOP' );
		await expect( ioBit( page, 'Q', '0.0' ) ).not.toHaveClass( /active/ );
		expect( await bit( page, 'Q0.0' ) ).toBe( 0 );

		// Nessun ciclo orfano: in STOP il programma non riscrive Q0.0
		await page.waitForTimeout( 300 );
		expect( await bit( page, 'Q0.0' ) ).toBe( 0 );
		expect( await page.evaluate( () => window.plcSim.PLC.scanInterval ) ).toBeNull();
	} );

	test( 'timer TON in tempo reale', async ( { page } ) => {
		await openSimulator( page );
		await loadProgramFile( page, {
			name: 'Ritardo',
			program: { rungs: [ {
				id: 1,
				inputs: [ { type: 'contact-no', address: { type: 'I', byte: 0, bit: 0 } }, { type: 'timer-ton', timerId: 0, preset: 600 } ],
				outputs: [ { type: 'coil', address: { type: 'Q', byte: 0, bit: 0 } } ],
			} ] },
		} );
		await run( page );
		await ioBit( page, 'I', '0.0' ).click();
		const start = Date.now();
		await expect( ioBit( page, 'Q', '0.0' ) ).toHaveClass( /active/, { timeout: 3000 } );
		expect( Date.now() - start ).toBeGreaterThanOrEqual( 500 );
	} );
} );

test.describe( 'salva e carica', () => {
	test( 'Carica da file: il programma compare ed e\' eseguibile', async ( { page } ) => {
		// Regressione 1.6.9: Carica chiamava funzioni inesistenti e falliva sempre.
		const errors = await openSimulator( page );
		expect( await loadProgramFile( page, marcia ) ).toContain( 'caricato con successo' );

		await expect( page.locator( '#program-name' ) ).toHaveValue( 'Marcia' );
		await expect( page.locator( '.ladder-rung .ladder-element' ) ).toHaveCount( 2 );
		await expect( page.locator( '.element-comment' ).first() ).toHaveText( 'Pulsante' );
		await expect( page.locator( '.rung-comment' ) ).toHaveValue( 'Uscita con I0.0' );
		expect( await page.evaluate( () => window.plcSim.PLC.hardware.currentCPU ) ).toBe( '1214C-DC' );
		await expect( page.locator( '#inputs-grid .io-bit' ) ).toHaveCount( 14 );

		await run( page );
		await ioBit( page, 'I', '0.0' ).click();
		await expect( ioBit( page, 'Q', '0.0' ) ).toHaveClass( /active/ );
		expect( errors ).toEqual( [] );
	} );

	test( 'Carica accetta il formato vecchio (solo programma, elements)', async ( { page } ) => {
		await openSimulator( page );
		await loadProgramFile( page, {
			name: 'Vecchio',
			rungs: [ { id: 1, elements: [
				{ type: 'contact-no', address: { type: 'I', byte: 0, bit: 0 } },
				{ type: 'coil', address: { type: 'Q', byte: 0, bit: 1 } },
			] } ],
		} );
		await expect( page.locator( '.ladder-rung .ladder-element' ) ).toHaveCount( 2 );
		await run( page );
		await ioBit( page, 'I', '0.0' ).click();
		await expect( ioBit( page, 'Q', '0.1' ) ).toHaveClass( /active/ );
	} );

	test( 'Salva scarica un file che ricaricato da\' lo stesso programma', async ( { page } ) => {
		await openSimulator( page );
		await loadProgramFile( page, marcia );

		page.once( 'dialog', ( d ) => d.accept( 'Copia di prova' ) );
		const download = page.waitForEvent( 'download' );
		await page.locator( '#btn-save' ).click();
		const file = await ( await download ).path();
		const saved = JSON.parse( fs.readFileSync( file, 'utf8' ) );

		expect( saved.name ).toBe( 'Copia di prova' );
		expect( saved.version ).toMatch( /^\d+\.\d+\.\d+$/ );
		expect( saved.hardware_config.currentCPU ).toBe( '1214C-DC' );
		expect( saved.program.rungs[ 0 ].inputs[ 0 ].address ).toEqual( { type: 'I', byte: 0, bit: 0 } );

		// Nessuna richiesta al server: il salvataggio e' solo locale
		const ajax = [];
		page.on( 'request', ( r ) => r.url().includes( 'admin-ajax.php' ) && ajax.push( r.url() ) );
		await page.locator( '#btn-new' ).click().catch( () => {} );
		await loadProgramFile( page, saved );
		await expect( page.locator( '#program-name' ) ).toHaveValue( 'Copia di prova' );
		await expect( page.locator( '.ladder-rung .ladder-element' ) ).toHaveCount( 2 );
		expect( ajax ).toEqual( [] );
	} );

	test( 'un file con HTML nei commenti non esegue script', async ( { page } ) => {
		const errors = await openSimulator( page );
		const payload = '<img src=x onerror="window.__xss=1">';
		await loadProgramFile( page, {
			name: `</title><script>window.__xss=2</script>`,
			program: { rungs: [ {
				id: 1,
				comment: `" onfocus="window.__xss=3" autofocus x="`,
				inputs: [ { type: 'contact-no" onclick="window.__xss=4', address: { type: 'I', byte: 0, bit: 0 }, comment: payload } ],
				outputs: [ { type: 'coil', address: { type: 'Q', byte: 0, bit: 0 } } ],
			} ] },
			hmi_config: { pages: [ { id: 1, name: payload, elements: [ { id: 1, type: 'button', label: payload, x: 10, y: 10, width: '1px" onmouseover="window.__xss=5' } ] } ] },
		} );

		await expect( page.locator( '.element-comment' ).first() ).toHaveText( payload );
		await expect( page.locator( '.rung-comment' ) ).toHaveValue( `" onfocus="window.__xss=3" autofocus x="` );
		await page.locator( '.rung-comment' ).focus();
		await page.locator( '.ladder-element' ).first().click();
		await page.waitForTimeout( 200 );
		expect( await page.evaluate( () => window.__xss ) ).toBeUndefined();
		expect( errors.filter( ( e ) => ! /Failed to load resource/.test( e ) ) ).toEqual( [] );
	} );
} );

test.describe( 'configurazione hardware', () => {
	test( 'un modulo SM aggiunto e applicato compare nella griglia a I8.0', async ( { page } ) => {
		await openSimulator( page );
		await page.locator( '#btn-hardware' ).click();
		await page.locator( '#hw-cpu-select' ).selectOption( '1214C-DC' );
		await page.locator( '#hw-expansion-select' ).selectOption( 'SM1221-8DI' );
		await page.locator( '#hw-add-expansion' ).click();
		await expect( page.locator( '#hw-address-map' ) ).toContainText( 'I8.0-I8.7 (SM 1221 DI x8)' );
		await page.locator( '#hw-apply' ).click();

		await expect( page.locator( '#inputs-grid .io-bit' ) ).toHaveCount( 22 );
		await expect( ioBit( page, 'I', '8.0' ) ).toBeVisible();
		// Gli ingressi si azionano in RUN (in STOP il pannello e' disattivato)
		await run( page );
		await ioBit( page, 'I', '8.7' ).click();
		expect( await bit( page, 'I8.7' ) ).toBe( 1 );
	} );

	test( 'chiudere la finestra senza Applica non cambia la configurazione', async ( { page } ) => {
		await openSimulator( page );
		const before = await page.evaluate( () => JSON.stringify( window.plcSim.PLC.hardware.installedExpansions ) );
		await page.locator( '#btn-hardware' ).click();
		await page.locator( '#hw-expansion-select' ).selectOption( 'SM1221-8DI' );
		await page.locator( '#hw-add-expansion' ).click();
		await page.keyboard.press( 'Escape' );
		await page.locator( '#hardware-modal .plc-btn-cancel' ).click().catch( () => {} );
		expect( await page.evaluate( () => JSON.stringify( window.plcSim.PLC.hardware.installedExpansions ) ) ).toBe( before );
	} );

	test( 'la 1211C non accetta moduli: errore e Applica disabilitato', async ( { page } ) => {
		await openSimulator( page );
		await page.locator( '#btn-hardware' ).click();
		await page.locator( '#hw-cpu-select' ).selectOption( '1214C-DC' );
		await page.locator( '#hw-expansion-select' ).selectOption( 'SM1221-8DI' );
		await page.locator( '#hw-add-expansion' ).click();
		await page.locator( '#hw-cpu-select' ).selectOption( '1211C-DC' );
		await expect( page.locator( '#hw-errors' ) ).toContainText( '1211C non accetta moduli' );
		await expect( page.locator( '#hw-apply' ) ).toBeDisabled();
	} );
} );

test.describe( 'contatori', () => {
	test( 'CTU con ingresso R configurato dall\'editor', async ( { page } ) => {
		await openSimulator( page );
		await loadProgramFile( page, {
			name: 'Conta',
			program: { rungs: [ {
				id: 1,
				inputs: [ { id: 1, type: 'contact-no', address: { type: 'I', byte: 0, bit: 0 } }, { id: 2, type: 'counter-ctu', counterId: 0, preset: 2 } ],
				outputs: [ { id: 3, type: 'coil', address: { type: 'Q', byte: 0, bit: 0 } } ],
			} ] },
		} );

		await page.locator( '.ladder-element' ).nth( 1 ).dblclick();
		await expect( page.locator( '#pin-r-config' ) ).toBeVisible();
		await expect( page.locator( '#pin-ld-config' ) ).toBeHidden();
		await page.locator( '#config-pin-r-type' ).selectOption( 'I' );
		await page.locator( '#config-pin-r-bit' ).fill( '1' );
		await page.locator( '#config-save' ).click();

		await run( page );
		for ( let i = 0; i < 2; i++ ) {
			await ioBit( page, 'I', '0.0' ).click();
			await page.waitForTimeout( 120 );
			await ioBit( page, 'I', '0.0' ).click();
			await page.waitForTimeout( 120 );
		}
		await expect( ioBit( page, 'Q', '0.0' ) ).toHaveClass( /active/ );
		await ioBit( page, 'I', '0.1' ).click();
		await expect( ioBit( page, 'Q', '0.0' ) ).not.toHaveClass( /active/ );
		expect( await page.evaluate( () => window.plcSim.PLC.counters.C0.CV ) ).toBe( 0 );
	} );
} );
