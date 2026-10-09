<?php
/**
 * Plugin Name: Unofficial S7-1200 Simulator
 * Plugin URI: https://www.davidebertolino.it/progetti/s7-simulator/
 * Description: Simulatore PLC Siemens S7-1200 con editor Ladder, HMI touch e impianti virtuali animati
 * Version: 1.6.9
 * Requires at least: 5.8
 * Requires PHP: 7.4
 * Author: Davide "the Prof." Bertolino
 * Author URI: https://www.davidebertolino.it
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: plc-s7-simulator
 * Update URI: https://github.com/dadebertolino/plc-s7-simulator
 */

if (!defined('ABSPATH')) {
    exit;
}

define('PLC_SIM_VERSION', '1.6.9');
define('PLC_SIM_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('PLC_SIM_PLUGIN_URL', plugin_dir_url(__FILE__));

/* -------------------------------------------------------------------------
 * GitHub Auto-Updater (componente condiviso)
 * ---------------------------------------------------------------------- */
require_once PLC_SIM_PLUGIN_DIR . 'inc/class-updater.php';
new DB_GitHub_Updater_V2(__FILE__, 'dadebertolino', 'plc-s7-simulator');

class PLC_S7_Simulator {

    private static $instance = null;

    private $assets_done = false;

    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_post_plc_sim_purge_programs', array($this, 'purge_programs'));
        add_shortcode('plc_simulator', array($this, 'render_simulator'));
    }

    /**
     * Dall'hook wp_enqueue_scripts solo se lo shortcode e' nel contenuto del
     * post, cosi' il CSS finisce nell'head. Lo shortcode lo richiama con
     * $force: il controllo sul contenuto non vede lo shortcode in blocchi
     * riutilizzabili, widget, template FSE e page builder, e li' gli asset
     * vengono accodati al momento del rendering.
     */
    public function enqueue_scripts($force = false) {
        if ($this->assets_done) {
            return;
        }
        if (true !== $force) {
            global $post;
            if (!is_a($post, 'WP_Post') || !has_shortcode($post->post_content, 'plc_simulator')) {
                return;
            }
        }
        $this->assets_done = true;

        wp_enqueue_style('plc-simulator-style', PLC_SIM_PLUGIN_URL . 'assets/css/simulator.css', array(), PLC_SIM_VERSION);

        // JSZip per import file TIA Portal (.zap), incluso nel plugin
        wp_enqueue_script('plc-sim-jszip', PLC_SIM_PLUGIN_URL . 'assets/js/vendor/jszip.min.js', array(), '3.10.1', true);

        wp_enqueue_script('plc-sim-core', PLC_SIM_PLUGIN_URL . 'assets/js/core/plc-core.js', array(), PLC_SIM_VERSION, true);
        wp_enqueue_script('plc-simulator-script', PLC_SIM_PLUGIN_URL . 'assets/js/simulator.js', array('jquery', 'plc-sim-jszip', 'plc-sim-core'), PLC_SIM_VERSION, true);
        wp_localize_script('plc-simulator-script', 'plcSimConfig', array(
            'version' => PLC_SIM_VERSION,
        ));
    }

    public function add_admin_menu() {
        add_menu_page(
            'Unofficial S7/1200 Simulator',
            'S7/1200 Simulator',
            'manage_options',
            'plc-simulator',
            array($this, 'admin_page'),
            'dashicons-controls-play',
            30
        );
    }

    private function programs_table() {
        global $wpdb;
        $table_name = $wpdb->prefix . 'plc_programs';
        return $table_name === $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $wpdb->esc_like($table_name))) ? $table_name : '';
    }

    public function admin_page() {
        global $wpdb;
        $table_name = $this->programs_table();
        ?>
        <div class="wrap">
            <h1>Unofficial S7/1200 Simulator by Prof D.Bertolino</h1>
            <p>Usa lo shortcode <code>[plc_simulator]</code> per inserire il simulatore in una pagina.</p>
            <p>I programmi si salvano e si caricano come file JSON sul computer dello studente: il simulatore non invia dati al server.</p>

            <?php if (isset($_GET['purged'])) : // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- solo messaggio dopo il redirect ?>
                <div class="notice notice-success is-dismissible"><p>Programmi salvati dalle versioni precedenti eliminati.</p></div>
            <?php endif; ?>

            <?php
            if ($table_name) {
                // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- nome tabella dal prefisso di WordPress
                $count = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$table_name}");
                if ($count > 0) {
                    // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- nome tabella dal prefisso di WordPress
                    $programs = $wpdb->get_results("SELECT id, name, updated_at FROM {$table_name} ORDER BY updated_at DESC LIMIT 100");
                    ?>
                    <h2>Programmi salvati dalle versioni precedenti</h2>
                    <p>
                        Fino alla 1.6.9 ogni salvataggio veniva copiato anche nel database del sito,
                        ma gli studenti non potevano piu' recuperarlo da li'.
                        Nel database ci sono <?php echo esc_html(number_format_i18n($count)); ?> programmi:
                        puoi eliminarli, oppure li elimina la disinstallazione del plugin.
                    </p>
                    <table class="wp-list-table widefat fixed striped">
                        <thead><tr><th>ID</th><th>Nome</th><th>Ultimo aggiornamento</th></tr></thead>
                        <tbody>
                        <?php foreach ($programs as $prog) : ?>
                            <tr>
                                <td><?php echo esc_html($prog->id); ?></td>
                                <td><?php echo esc_html($prog->name); ?></td>
                                <td><?php echo esc_html($prog->updated_at); ?></td>
                            </tr>
                        <?php endforeach; ?>
                        </tbody>
                    </table>
                    <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" style="margin-top:1em">
                        <input type="hidden" name="action" value="plc_sim_purge_programs">
                        <?php wp_nonce_field('plc_sim_purge_programs'); ?>
                        <?php submit_button('Elimina tutti i programmi salvati', 'delete', 'submit', false, array('onclick' => "return confirm('Eliminare definitivamente tutti i programmi salvati nel database?');")); ?>
                    </form>
                    <?php
                }
            }
            ?>
        </div>
        <?php
    }

    public function purge_programs() {
        if (!current_user_can('manage_options')) {
            wp_die(esc_html__('Non hai i permessi per questa azione.', 'plc-s7-simulator'), 403);
        }
        check_admin_referer('plc_sim_purge_programs');

        $table_name = $this->programs_table();
        if ($table_name) {
            global $wpdb;
            // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.DirectDatabaseQuery.SchemaChange -- tabella del plugin, nome dal prefisso di WordPress
            $wpdb->query("DROP TABLE IF EXISTS {$table_name}");
        }

        wp_safe_redirect(add_query_arg(array('page' => 'plc-simulator', 'purged' => 1), admin_url('admin.php')));
        exit;
    }

    public function render_simulator() {
        $this->enqueue_scripts(true);
        ob_start();
        include PLC_SIM_PLUGIN_DIR . 'templates/simulator.php';
        return ob_get_clean();
    }
}

PLC_S7_Simulator::get_instance();
