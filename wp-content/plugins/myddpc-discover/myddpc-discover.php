<?php
/*
Plugin Name:       MyDDPC Discover Tool
Plugin URI:        https://myddpc.com
Description:       Provides a "Discover" interface for filtering the vehicle database by technical attributes.
Version:           0.1
Author:            Rory Teehan
Author URI:        https://myddpc.com
License:           GPLv2 or later
Text Domain:       myddpc-discover
*/

if ( ! defined( 'ABSPATH' ) ) exit;

// Activation check
function myddpc_discover_activate() {
    if ( version_compare( PHP_VERSION, '7.2', '<' ) ) {
        deactivate_plugins( plugin_basename( __FILE__ ) );
        wp_die( esc_html__( 'MyDDPC Discover Tool requires PHP 7.2 or higher.', 'myddpc-discover' ) );
    }
}
register_activation_hook( __FILE__, 'myddpc_discover_activate' );

// Shortcode registration
function myddpc_discover_shortcode( $atts ) {
    $atts = shortcode_atts( array(), $atts, 'myddpc_discover' );
    ob_start();
    include plugin_dir_path( __FILE__ ) . 'includes/templates/template-discover-page.php';
    return ob_get_clean();
}
add_shortcode( 'myddpc_discover', 'myddpc_discover_shortcode' );

// Conditional asset enqueuing
function myddpc_discover_enqueue_assets() {
    global $post;
    if ( is_a( $post, 'WP_Post' ) && has_shortcode( $post->post_content, 'myddpc_discover' ) ) {
        wp_enqueue_style(
            'myddpc-discover-style',
            plugins_url( 'assets/css/discover.css', __FILE__ ),
            array(),
            '1.0.0'
        );
        wp_enqueue_script(
            'myddpc-discover-script',
            plugins_url( 'assets/js/discover.js', __FILE__ ),
            array( 'jquery' ),
            '1.0.0',
            true
        );
        wp_localize_script(
            'myddpc-discover-script',
            'myddpc_discover_data',
            array(
                'root'   => esc_url_raw( rest_url() ),
                'nonce'  => wp_create_nonce( 'wp_rest' ),
                'routes' => array(
                    'filters' => 'myddpc/v1/discover/filters',
                    'results' => 'myddpc/v1/discover/results',
                ),
            )
        );
    }
}
add_action( 'wp_enqueue_scripts', 'myddpc_discover_enqueue_assets' );

// REST endpoints are registered in includes/class-discover-rest.php
require_once __DIR__ . '/includes/class-discover-rest.php';