<?php
/**
 * Eseguito quando il plugin viene eliminato (non solo disattivato).
 *
 * @package PLC_S7_Simulator
 */

if (!defined('WP_UNINSTALL_PLUGIN')) {
    exit;
}

global $wpdb;

// Programmi salvati dalle versioni fino alla 1.6.9 (dati degli utenti)
$wpdb->query("DROP TABLE IF EXISTS {$wpdb->prefix}plc_programs");

// Cache dell'updater GitHub (componente condiviso dei plugin DB)
$wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '\\_transient\\_dbgu\\_%' OR option_name LIKE '\\_transient\\_timeout\\_dbgu\\_%'");
