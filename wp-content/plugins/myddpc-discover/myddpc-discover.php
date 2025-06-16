<?php
/**
 * Plugin Name: MYDDPC Discover
 * Description: Vehicle discovery and search functionality
 * Version: 1.0.0
 * Author: MYDDPC
 */

if (!defined('ABSPATH')) exit;

// Ensure WordPress REST API is available
if (!function_exists('rest_ensure_response')) {
    require_once(ABSPATH . 'wp-includes/rest-api.php');
}

// Load plugin files
require_once plugin_dir_path(__FILE__) . 'includes/class-discover-query.php';
require_once plugin_dir_path(__FILE__) . 'includes/class-discover-rest.php';

// Initialize REST API
add_action('init', function() {
    new Discover_REST();
});

// Activation check
function myddpc_discover_activation_check() {
    if (!is_plugin_active('myddpc-user-system/myddpc-user-system.php')) {
        deactivate_plugins(plugin_basename(__FILE__));
        wp_die(esc_html__('MYDDPC Discover requires the MYDDPC User System plugin to be active.', 'myddpc-discover'));
    }
}
register_activation_hook(__FILE__, 'myddpc_discover_activation_check');

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