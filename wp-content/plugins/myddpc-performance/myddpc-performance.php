<?php
/**
 * Plugin Name:       MyDDPC Performance Tool
 * Description:       A tool to display and compare vehicle performance and efficiency metrics.
 * Version:           1.2.0
 * Author:            Rory Teehan
 * Author URI:        https://myddpc.com/
 */

if ( ! defined( 'ABSPATH' ) ) exit; // Prevent direct access

define( 'MYDDPC_PERFORMANCE_PLUGIN_PATH', plugin_dir_path( __FILE__ ) );
define( 'MYDDPC_PERFORMANCE_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

/**
 * Main plugin class
 */
final class MyDDPC_Performance_Tool {

    private static $_instance = null;

    public static function instance() {
        if ( is_null( self::$_instance ) ) {
            self::$_instance = new self();
        }
        return self::$_instance;
    }

    public function __construct() {
        $this->includes();
        $this->init_hooks();
    }

    private function includes() {
        require_once MYDDPC_PERFORMANCE_PLUGIN_PATH . 'includes/class-performance-query.php';
        require_once MYDDPC_PERFORMANCE_PLUGIN_PATH . 'includes/class-performance-rest.php';
    }

    private function init_hooks() {
        $query_handler = new MyDDPC_Performance_Query();
        new MyDDPC_Performance_REST_Controller($query_handler);

        add_action( 'wp_enqueue_scripts', [ $this, 'enqueue_scripts' ] );
        add_shortcode( 'myddpc_performance_tool', [ $this, 'shortcode_render' ] );
    }

    /**
     * Enqueue scripts and styles.
     */
    public function enqueue_scripts() {
        global $post;
        if ( is_a( $post, 'WP_Post' ) && has_shortcode( $post->post_content, 'myddpc_performance_tool' ) ) {
            wp_enqueue_style(
                'myddpc-performance-style',
                MYDDPC_PERFORMANCE_PLUGIN_URL . 'assets/css/myddpc-performance-style.css',
                [], '1.2.0'
            );

            // **NEW**: Enqueue Chart.js from a CDN
            wp_enqueue_script(
                'chart-js',
                'https://cdn.jsdelivr.net/npm/chart.js',
                [], '4.4.3', true
            );

            // Enqueue our plugin script, making it dependent on Chart.js
            wp_enqueue_script(
                'myddpc-performance-script',
                 MYDDPC_PERFORMANCE_PLUGIN_URL . 'assets/js/myddpc-performance-script.js',
                ['chart-js'], '1.2.0', true // **MODIFIED**: Added 'chart-js' as a dependency
            );
            
            wp_localize_script(
                'myddpc-performance-script',
                'myddpc_performance_data',
                [
                    'api_url' => esc_url_raw( rest_url( 'myddpc-performance/v1' ) ),
                    'nonce'   => wp_create_nonce( 'wp_rest' )
                ]
            );
        }
    }

    public function shortcode_render() {
        ob_start();
        include MYDDPC_PERFORMANCE_PLUGIN_PATH . 'templates/performance-tool-template.php';
        return ob_get_clean();
    }
}

function myddpc_performance_tool() {
    return MyDDPC_Performance_Tool::instance();
}

myddpc_performance_tool();