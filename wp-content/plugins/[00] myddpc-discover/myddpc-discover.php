<?php
/*
Plugin Name: MyDDPC Discover Tool
Plugin URI: https://example.com/myddpc-discover-tool
Description: A tool to discover and display DDPC content via shortcode and REST API.
Version: 1.0.0
Author: Your Name
Author URI: https://example.com
License: GPL2
Text Domain: myddpc-discover
*/

if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly.
}

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
    ?>
    <div id="myddpc-discover-root"></div>
    <?php
    return ob_get_clean();
}
add_shortcode( 'myddpc_discover', 'myddpc_discover_shortcode' );

// Conditional asset enqueuing
function myddpc_discover_enqueue_assets() {
    global $post;
    if ( is_a( $post, 'WP_Post' ) && has_shortcode( $post->post_content, 'myddpc_discover' ) ) {
        wp_enqueue_style(
            'myddpc-discover-style',
            plugins_url( 'assets/css/myddpc-discover.css', __FILE__ ),
            array(),
            '1.0.0'
        );
        wp_enqueue_script(
            'myddpc-discover-script',
            plugins_url( 'assets/js/myddpc-discover.js', __FILE__ ),
            array( 'jquery' ),
            '1.0.0',
            true
        );
        // Script localization
        wp_localize_script(
            'myddpc-discover-script',
            'MyDDPCDiscover',
            array(
                'restUrl' => esc_url_raw( rest_url( 'myddpc-discover/v1/items' ) ),
                'nonce'   => wp_create_nonce( 'wp_rest' ),
            )
        );
    }
}
add_action( 'wp_enqueue_scripts', 'myddpc_discover_enqueue_assets' );

// REST API endpoint registration
function myddpc_discover_register_rest_routes() {
    register_rest_route(
        'myddpc-discover/v1',
        '/items',
        array(
            'methods'  => 'GET',
            'callback' => 'myddpc_discover_rest_items',
            'permission_callback' => '__return_true',
        )
    );
}
add_action( 'rest_api_init', 'myddpc_discover_register_rest_routes' );

function myddpc_discover_rest_items( $request ) {
    // Example data, replace with actual logic as needed
    $items = array(
        array( 'id' => 1, 'title' => 'Item One', 'description' => 'Description for item one.' ),
        array( 'id' => 2, 'title' => 'Item Two', 'description' => 'Description for item two.' ),
    );
    return rest_ensure_response( $items );
}