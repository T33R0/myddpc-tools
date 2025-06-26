<?php
/**
 * Plugin Name:       MyDDPC Dimensions Tool
 * Description:       A tool to display and compare vehicle dimensions.
 * Version:           1.1.0
 * Author:            Rory Teehan
 * Author URI:        https://myddpc.com/
 */

if ( ! defined( 'ABSPATH' ) ) exit; // Prevent direct access

// === ACTION HOOKS ===
add_action( 'rest_api_init', 'myddpc_dimensions_register_routes' );
add_action( 'wp_enqueue_scripts', 'myddpc_dimensions_enqueue_scripts' );
add_shortcode( 'myddpc_dimensions_tool', 'myddpc_dimensions_tool_shortcode' );

/**
 * Register all REST API routes for the Dimensions tool.
 */
function myddpc_dimensions_register_routes() {
    // Endpoint for getting specific vehicle dimensions
    register_rest_route( 'myddpc-dimensions/v1', '/vehicle', [
        'methods'  => 'GET',
        'callback' => 'get_myddpc_vehicle_dimensions_callback',
        'permission_callback' => '__return_true',
    ] );

    // Endpoints for populating dropdowns
    register_rest_route( 'myddpc-dimensions/v1', '/years', [
        'methods' => 'GET',
        'callback' => 'get_myddpc_distinct_years_callback',
        'permission_callback' => '__return_true',
    ]);
    register_rest_route( 'myddpc-dimensions/v1', '/makes', [
        'methods' => 'GET',
        'callback' => 'get_myddpc_distinct_makes_callback',
        'permission_callback' => '__return_true',
    ]);
    register_rest_route( 'myddpc-dimensions/v1', '/models', [
        'methods' => 'GET',
        'callback' => 'get_myddpc_distinct_models_callback',
        'permission_callback' => '__return_true',
    ]);
    register_rest_route( 'myddpc-dimensions/v1', '/trims', [
        'methods' => 'GET',
        'callback' => 'get_myddpc_distinct_trims_callback',
        'permission_callback' => '__return_true',
    ]);
}

/**
 * Enqueue scripts and styles.
 */
function myddpc_dimensions_enqueue_scripts() {
    global $post;
    if ( is_a( $post, 'WP_Post' ) && has_shortcode( $post->post_content, 'myddpc_dimensions_tool' ) ) {
        // **FIXED**: Correct path to include '/assets/' subdirectory
        $plugin_assets_url = plugin_dir_url( __FILE__ ) . 'assets/';

        wp_enqueue_style(
            'myddpc-dimensions-style',
            $plugin_assets_url . 'css/myddpc-dimensions-style.css',
            [],
            '1.1.0'
        );

        wp_enqueue_script(
            'myddpc-dimensions-script',
            $plugin_assets_url . 'js/myddpc-dimensions-script.js',
            [],
            '1.1.0',
            true
        );

        // Pass API URLs and nonce to the script
        wp_localize_script(
            'myddpc-dimensions-script',
            'myddpc_dimensions_data',
            [
                'api_url' => esc_url_raw( rest_url( 'myddpc-dimensions/v1' ) ),
                'nonce'   => wp_create_nonce( 'wp_rest' )
            ]
        );
    }
}

/**
 * Define the shortcode to display the tool.
 */
function myddpc_dimensions_tool_shortcode() {
    ob_start();
    include plugin_dir_path( __FILE__ ) . 'templates/dimensions-tool-template.php';
    return ob_get_clean();
}

// === API CALLBACK FUNCTIONS ===

function get_myddpc_vehicle_dimensions_callback( WP_REST_Request $request ) {
    global $wpdb;
    $year  = $request->get_param( 'year' );
    $make  = $request->get_param( 'make' );
    $model = $request->get_param( 'model' );
    $trim  = $request->get_param( 'trim' );

    if ( ! $year || ! $make || ! $model || ! $trim ) {
        return new WP_Error( 'bad_request', 'Missing required parameters (Year, Make, Model, Trim).', [ 'status' => 400 ] );
    }

    $query = $wpdb->prepare(
        "SELECT `Length (in)`, `Width (in)`, `Height (in)`, `Wheelbase (in)`, `Ground clearance (in)`, `Turning circle (ft)`, `Angle of approach (degrees)`, `Angle of departure (degrees)`, `Doors`, `Body type`, `Front track (in)`, `Rear track (in)`
        FROM qfh_vehicle_data WHERE `Year` = %d AND `Make` = %s AND `Model` = %s AND `Trim` = %s",
        $year, $make, $model, $trim
    );
    $result = $wpdb->get_row( $query, ARRAY_A );

    return $result ? new WP_REST_Response( $result, 200 ) : new WP_REST_Response( [], 404 );
}

function get_myddpc_distinct_years_callback() {
    global $wpdb;
    $results = $wpdb->get_col("SELECT DISTINCT `Year` FROM qfh_vehicle_data ORDER BY `Year` DESC");
    return new WP_REST_Response( $results, 200 );
}

function get_myddpc_distinct_makes_callback( WP_REST_Request $request ) {
    global $wpdb;
    $year = $request->get_param('year');
    if (!$year) return new WP_Error( 'bad_request', 'Year is required.', [ 'status' => 400 ] );
    $query = $wpdb->prepare("SELECT DISTINCT `Make` FROM qfh_vehicle_data WHERE `Year` = %d ORDER BY `Make` ASC", $year);
    $results = $wpdb->get_col($query);
    return new WP_REST_Response( $results, 200 );
}

function get_myddpc_distinct_models_callback( WP_REST_Request $request ) {
    global $wpdb;
    $year = $request->get_param('year');
    $make = $request->get_param('make');
    if (!$year || !$make) return new WP_Error( 'bad_request', 'Year and Make are required.', [ 'status' => 400 ] );
    $query = $wpdb->prepare("SELECT DISTINCT `Model` FROM qfh_vehicle_data WHERE `Year` = %d AND `Make` = %s ORDER BY `Model` ASC", $year, $make);
    $results = $wpdb->get_col($query);
    return new WP_REST_Response( $results, 200 );
}

function get_myddpc_distinct_trims_callback( WP_REST_Request $request ) {
    global $wpdb;
    $year = $request->get_param('year');
    $make = $request->get_param('make');
    $model = $request->get_param('model');
    if (!$year || !$make || !$model) return new WP_Error( 'bad_request', 'Year, Make, and Model are required.', [ 'status' => 400 ] );
    $query = $wpdb->prepare("SELECT DISTINCT `Trim` FROM qfh_vehicle_data WHERE `Year` = %d AND `Make` = %s AND `Model` = %s ORDER BY `Trim` ASC", $year, $make, $model);
    $results = $wpdb->get_col($query);
    return new WP_REST_Response( $results, 200 );
}