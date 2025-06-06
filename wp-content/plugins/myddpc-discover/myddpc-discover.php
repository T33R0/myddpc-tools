<?php
/*
Plugin Name:       MyDDPC Discover Tool
Plugin URI:        https://myddpc.com
Description:       Provides a Discover interface for filtering the vehicle database.
Version:           0.1
Author:            Rory Teehan
Author URI:        https://myddpc.com
License:           GPLv2 or later
Text Domain:       myddpc-discover
*/

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// Ensure REST and Query classes are loaded
require_once plugin_dir_path( __FILE__ ) . 'includes/class-discover-query.php';
require_once plugin_dir_path( __FILE__ ) . 'includes/class-discover-rest.php';

// Register shortcode [myddpc_discover]
function myddpc_discover_shortcode() {
    ob_start();
    $template = plugin_dir_path( __FILE__ ) . 'includes/templates/template-discover-page.php';
    if ( file_exists( $template ) ) {
        include $template;
    } else {
        error_log('MyDDPC Discover: Template file missing: ' . $template);
        echo '<div style="color:red">Discover template missing.</div>';
    }
    return ob_get_clean();
}
add_shortcode( 'myddpc_discover', 'myddpc_discover_shortcode' );

// Enqueue CSS and JS only when shortcode is present
function myddpc_discover_enqueue_assets() {
    global $post;
    if ( ! is_singular() || ! ( isset($post->post_content) && has_shortcode( $post->post_content, 'myddpc_discover' ) ) ) {
        return;
    }
    wp_enqueue_style(
        'myddpc-discover-css',
        plugin_dir_url( __FILE__ ) . 'assets/css/discover.css',
        array(),
        '0.1'
    );
    wp_enqueue_script(
        'myddpc-discover-js',
        plugin_dir_url( __FILE__ ) . 'assets/js/discover.js',
        array( 'jquery' ),
        '0.1',
        true
    );
    // Localize REST root and nonce
    wp_localize_script(
        'myddpc-discover-js',
        'wpApiSettings',
        array(
            'root'  => esc_url_raw( rest_url() ),
            'nonce' => wp_create_nonce( 'wp_rest' ),
        )
    );
}
add_action( 'wp_enqueue_scripts', 'myddpc_discover_enqueue_assets' );

// Register REST routes
add_action( 'rest_api_init', function() {
    $discover_rest = new Discover_REST();
    $discover_rest->register_routes();
} );