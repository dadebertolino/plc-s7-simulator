<?php
/**
 * Plugin Name: Unofficial S7/1200 Simulator by Prof D.Bertolino
 * Plugin URI: https://example.com/plc-simulator
 * Description: Unofficial S7/1200 Simulator - Simulatore PLC Siemens con editor Ladder e visualizzazione I/O
 * Version: 1.1.0
 * Author: Davide "the Prof" Bertolino
 * License: GPL v2 or later
 * Text Domain: plc-s7-simulator
 */

if (!defined('ABSPATH')) {
    exit;
}

define('PLC_SIM_VERSION', '1.6.8');
define('PLC_SIM_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('PLC_SIM_PLUGIN_URL', plugin_dir_url(__FILE__));

class PLC_S7_Simulator {
    
    private static $instance = null;
    
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        add_action('init', array($this, 'init'));
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_shortcode('plc_simulator', array($this, 'render_simulator'));
        
        // AJAX actions
        add_action('wp_ajax_plc_save_program', array($this, 'save_program'));
        add_action('wp_ajax_nopriv_plc_save_program', array($this, 'save_program'));
        add_action('wp_ajax_plc_load_program', array($this, 'load_program'));
        add_action('wp_ajax_nopriv_plc_load_program', array($this, 'load_program'));
        add_action('wp_ajax_plc_list_programs', array($this, 'list_programs'));
        add_action('wp_ajax_nopriv_plc_list_programs', array($this, 'list_programs'));
        add_action('wp_ajax_plc_delete_program', array($this, 'delete_program'));
        add_action('wp_ajax_nopriv_plc_delete_program', array($this, 'delete_program'));
        
        register_activation_hook(__FILE__, array($this, 'activate'));
    }
    
    public function init() {
        load_plugin_textdomain('plc-s7-simulator', false, dirname(plugin_basename(__FILE__)) . '/languages');
    }
    
    public function activate() {
        global $wpdb;
        $table_name = $wpdb->prefix . 'plc_programs';
        $charset_collate = $wpdb->get_charset_collate();
        
        // Tabella con supporto sessioni
        $sql = "CREATE TABLE IF NOT EXISTS $table_name (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            session_id varchar(32) NOT NULL DEFAULT '',
            name varchar(255) NOT NULL,
            program longtext NOT NULL,
            hardware_config longtext,
            hmi_config longtext,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY session_id (session_id)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
        
        // Aggiungi colonne se mancanti (per upgrade da versione precedente)
        $this->maybe_upgrade_table();
    }
    
    private function maybe_upgrade_table() {
        global $wpdb;
        $table_name = $wpdb->prefix . 'plc_programs';
        
        // Verifica se esiste colonna session_id
        $col = $wpdb->get_results("SHOW COLUMNS FROM $table_name LIKE 'session_id'");
        if (empty($col)) {
            $wpdb->query("ALTER TABLE $table_name ADD COLUMN session_id varchar(32) NOT NULL DEFAULT '' AFTER id");
            $wpdb->query("ALTER TABLE $table_name ADD INDEX session_id (session_id)");
        }
        
        // Verifica se esiste colonna hardware_config
        $col = $wpdb->get_results("SHOW COLUMNS FROM $table_name LIKE 'hardware_config'");
        if (empty($col)) {
            $wpdb->query("ALTER TABLE $table_name ADD COLUMN hardware_config longtext AFTER program");
        }
        
        // Verifica se esiste colonna hmi_config
        $col = $wpdb->get_results("SHOW COLUMNS FROM $table_name LIKE 'hmi_config'");
        if (empty($col)) {
            $wpdb->query("ALTER TABLE $table_name ADD COLUMN hmi_config longtext AFTER hardware_config");
        }
    }
    
    public function enqueue_scripts() {
        global $post;
        if (is_a($post, 'WP_Post') && has_shortcode($post->post_content, 'plc_simulator')) {
            wp_enqueue_style('plc-simulator-style', PLC_SIM_PLUGIN_URL . 'assets/css/simulator.css', array(), PLC_SIM_VERSION);
            
            // JSZip per import file TIA Portal (.zap)
            wp_enqueue_script('jszip', 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js', array(), '3.10.1', true);
            
            wp_enqueue_script('plc-simulator-script', PLC_SIM_PLUGIN_URL . 'assets/js/simulator.js', array('jquery', 'jszip'), PLC_SIM_VERSION, true);
            wp_localize_script('plc-simulator-script', 'plcAjax', array(
                'ajaxurl' => admin_url('admin-ajax.php'),
                'nonce' => wp_create_nonce('plc_simulator_nonce')
            ));
        }
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
    
    public function admin_page() {
        ?>
        <div class="wrap">
            <h1>Unofficial S7/1200 Simulator by Prof D.Bertolino</h1>
            <p>Usa lo shortcode <code>[plc_simulator]</code> per inserire il simulatore in una pagina.</p>
            
            <h2>Sessioni Attive</h2>
            <?php
            global $wpdb;
            $table_name = $wpdb->prefix . 'plc_programs';
            
            // Raggruppa per sessione
            $sessions = $wpdb->get_results("
                SELECT session_id, COUNT(*) as program_count, MAX(updated_at) as last_activity 
                FROM $table_name 
                WHERE session_id != '' 
                GROUP BY session_id 
                ORDER BY last_activity DESC
                LIMIT 50
            ");
            
            if ($sessions) {
                echo '<table class="wp-list-table widefat fixed striped">';
                echo '<thead><tr><th>Session ID</th><th>Programmi</th><th>Ultima Attivita</th></tr></thead><tbody>';
                foreach ($sessions as $sess) {
                    $short_id = substr($sess->session_id, 0, 8) . '...';
                    echo "<tr><td><code>{$short_id}</code></td><td>{$sess->program_count}</td><td>{$sess->last_activity}</td></tr>";
                }
                echo '</tbody></table>';
            } else {
                echo '<p>Nessuna sessione attiva.</p>';
            }
            ?>
            
            <h2>Tutti i Programmi</h2>
            <?php
            $programs = $wpdb->get_results("SELECT id, session_id, name, updated_at FROM $table_name ORDER BY updated_at DESC LIMIT 100");
            if ($programs) {
                echo '<table class="wp-list-table widefat fixed striped">';
                echo '<thead><tr><th>ID</th><th>Sessione</th><th>Nome</th><th>Ultimo Aggiornamento</th></tr></thead><tbody>';
                foreach ($programs as $prog) {
                    $short_sess = $prog->session_id ? substr($prog->session_id, 0, 8) . '...' : '<em>nessuna</em>';
                    echo "<tr><td>{$prog->id}</td><td><code>{$short_sess}</code></td><td>{$prog->name}</td><td>{$prog->updated_at}</td></tr>";
                }
                echo '</tbody></table>';
            } else {
                echo '<p>Nessun programma salvato.</p>';
            }
            ?>
        </div>
        <?php
    }
    
    public function render_simulator($atts) {
        ob_start();
        include PLC_SIM_PLUGIN_DIR . 'templates/simulator.php';
        return ob_get_clean();
    }
    
    public function save_program() {
        check_ajax_referer('plc_simulator_nonce', 'nonce');
        
        global $wpdb;
        $table_name = $wpdb->prefix . 'plc_programs';
        
        $session_id = sanitize_text_field($_POST['session_id'] ?? '');
        $name = sanitize_text_field($_POST['name']);
        $program = wp_unslash($_POST['program']);
        $hardware_config = isset($_POST['hardware_config']) ? wp_unslash($_POST['hardware_config']) : '';
        $hmi_config = isset($_POST['hmi_config']) ? wp_unslash($_POST['hmi_config']) : '';
        $id = isset($_POST['id']) ? intval($_POST['id']) : 0;
        
        if ($id > 0) {
            // Verifica che il programma appartenga alla sessione
            $existing = $wpdb->get_var($wpdb->prepare(
                "SELECT session_id FROM $table_name WHERE id = %d", $id
            ));
            
            if ($existing !== $session_id && $existing !== '') {
                wp_send_json_error('Non autorizzato a modificare questo programma');
                return;
            }
            
            $wpdb->update($table_name, 
                array(
                    'name' => $name, 
                    'program' => $program,
                    'hardware_config' => $hardware_config,
                    'hmi_config' => $hmi_config
                ),
                array('id' => $id)
            );
        } else {
            $wpdb->insert($table_name, array(
                'session_id' => $session_id,
                'name' => $name,
                'program' => $program,
                'hardware_config' => $hardware_config,
                'hmi_config' => $hmi_config
            ));
            $id = $wpdb->insert_id;
        }
        
        wp_send_json_success(array('id' => $id, 'message' => 'Programma salvato'));
    }
    
    public function load_program() {
        check_ajax_referer('plc_simulator_nonce', 'nonce');
        
        global $wpdb;
        $table_name = $wpdb->prefix . 'plc_programs';
        $id = intval($_POST['id']);
        $session_id = sanitize_text_field($_POST['session_id'] ?? '');
        
        $program = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table_name WHERE id = %d", $id));
        
        if ($program) {
            // Verifica accesso: stesso session_id o programma senza sessione
            if ($program->session_id !== '' && $program->session_id !== $session_id) {
                wp_send_json_error('Non autorizzato ad accedere a questo programma');
                return;
            }
            wp_send_json_success($program);
        } else {
            wp_send_json_error('Programma non trovato');
        }
    }
    
    public function list_programs() {
        check_ajax_referer('plc_simulator_nonce', 'nonce');
        
        global $wpdb;
        $table_name = $wpdb->prefix . 'plc_programs';
        $session_id = sanitize_text_field($_POST['session_id'] ?? '');
        
        // Mostra solo programmi della sessione corrente
        if ($session_id) {
            $programs = $wpdb->get_results($wpdb->prepare(
                "SELECT id, name, updated_at FROM $table_name WHERE session_id = %s ORDER BY updated_at DESC",
                $session_id
            ));
        } else {
            // Nessuna sessione: mostra solo programmi senza sessione (legacy)
            $programs = $wpdb->get_results(
                "SELECT id, name, updated_at FROM $table_name WHERE session_id = '' ORDER BY updated_at DESC"
            );
        }
        
        wp_send_json_success($programs);
    }
    
    public function delete_program() {
        check_ajax_referer('plc_simulator_nonce', 'nonce');
        
        global $wpdb;
        $table_name = $wpdb->prefix . 'plc_programs';
        $id = intval($_POST['id']);
        $session_id = sanitize_text_field($_POST['session_id'] ?? '');
        
        // Verifica che il programma appartenga alla sessione
        $existing = $wpdb->get_var($wpdb->prepare(
            "SELECT session_id FROM $table_name WHERE id = %d", $id
        ));
        
        if ($existing !== $session_id && $existing !== '') {
            wp_send_json_error('Non autorizzato a eliminare questo programma');
            return;
        }
        
        $wpdb->delete($table_name, array('id' => $id));
        wp_send_json_success(array('message' => 'Programma eliminato'));
    }
}

PLC_S7_Simulator::get_instance();
