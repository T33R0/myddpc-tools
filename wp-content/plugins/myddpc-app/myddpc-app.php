<?php
/**
 * Plugin Name:       MyDDPC App
 * Description:       Loads the integrated MyDDPC React application and provides its REST API endpoints.
 * Version:           1.8.0
 * Author:            Rory Teehan
 */

if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly.

// 1. =========================================================================
//    ENQUEUE CORE & STYLING ASSETS
// =========================================================================
function myddpc_app_enqueue_assets() {
    // Only load assets on our dedicated template page.
    if ( is_page_template( 'template-myddpc-app.php' ) ) {
        // Enqueue React, ReactDOM, and Babel from a CDN. These are reliable.
        wp_enqueue_script( 'react', 'https://unpkg.com/react@18/umd/react.production.min.js', [], '18.2.0', true );
        wp_enqueue_script( 'react-dom', 'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js', ['react'], '18.2.0', true );
        wp_enqueue_script( 'babel-standalone', 'https://unpkg.com/@babel/standalone/babel.min.js', [], '7.24.7', true );

        // Enqueue Application CSS.
        $app_css_url = plugin_dir_url( __FILE__ ) . 'assets/app.css';
        wp_enqueue_style( 'myddpc-react-app-styles', $app_css_url, [], '1.8.0' );
    }
}
add_action( 'wp_enqueue_scripts', 'myddpc_app_enqueue_assets', 999 );


// 2. =========================================================================
//    MANUALLY PRINT INLINE FOOTER SCRIPTS (MOST ROBUST METHOD)
// =========================================================================
// This function now reads the app.js file and injects it directly into an
// inline script tag, eliminating all file-loading race conditions.
function myddpc_app_print_inline_scripts() {
    if ( is_page_template( 'template-myddpc-app.php' ) ) {
        
        // Define the path to the application's main JavaScript file.
        $app_js_path = plugin_dir_path( __FILE__ ) . 'assets/app.js';

        // Ensure the app.js file actually exists before trying to load it.
        if ( file_exists( $app_js_path ) ) {
            // Get the contents of our React application script.
            $react_app_code = file_get_contents( $app_js_path );

            // Prepare the WordPress data object.
            $data_object_string = 'const myddpcAppData = ' . json_encode([
                'rest_url'     => esc_url_raw( rest_url() ),
                'nonce'        => wp_create_nonce( 'wp_rest' ),
                'is_logged_in' => is_user_logged_in(),
            ]);

            // Print a single, combined script tag.
            // This guarantees the data object exists before the app code runs.
            echo '<script type="text/babel">';
            echo $data_object_string . ';'; // Print data object first.
            echo $react_app_code;           // Print the app code immediately after.
            echo '</script>';
        } else {
            // If the file is missing, print an error in the console.
            echo '<script>console.error("MyDDPC Error: assets/app.js file not found.");</script>';
        }
    }
}
// Using wp_print_footer_scripts ensures this happens at the right time.
add_action( 'wp_print_footer_scripts', 'myddpc_app_print_inline_scripts', 50 );


// 3. =========================================================================
//    UNIFIED REST API ENDPOINTS (No changes)
// =========================================================================
function myddpc_app_register_rest_routes() {
    $namespace = 'myddpc/v2';
    // Dimensions
    register_rest_route( $namespace, '/dimensions/vehicle', [ 'methods'  => 'GET', 'callback' => 'get_myddpc_vehicle_dimensions_callback', 'permission_callback' => '__return_true' ] );
    register_rest_route( $namespace, '/dimensions/years', [ 'methods' => 'GET', 'callback' => 'get_myddpc_distinct_years_callback', 'permission_callback' => '__return_true' ]);
    register_rest_route( $namespace, '/dimensions/makes', [ 'methods' => 'GET', 'callback' => 'get_myddpc_distinct_makes_callback', 'permission_callback' => '__return_true' ]);
    register_rest_route( $namespace, '/dimensions/models', [ 'methods' => 'GET', 'callback' => 'get_myddpc_distinct_models_callback', 'permission_callback' => '__return_true' ]);
    register_rest_route( $namespace, '/dimensions/trims', [ 'methods' => 'GET', 'callback' => 'get_myddpc_distinct_trims_callback', 'permission_callback' => '__return_true' ]);
    // Performance
    register_rest_route( $namespace, '/performance/vehicle', [ 'methods'  => 'GET', 'callback' => 'get_myddpc_performance_data_callback', 'permission_callback' => '__return_true' ] );
    // Discover
    register_rest_route( $namespace, '/discover/filters', [ 'methods' => 'GET', 'callback' => 'get_myddpc_discover_filters_callback', 'permission_callback' => '__return_true' ]);
    register_rest_route( $namespace, '/discover/results', [ 'methods' => 'POST', 'callback' => 'get_myddpc_discover_results_callback', 'permission_callback' => '__return_true' ]);
    register_rest_route($namespace, '/discover/vehicle/(?P<id>\d+)', [ 'methods' => 'GET', 'callback' => 'get_myddpc_discover_vehicle_details_callback', 'permission_callback' => '__return_true', 'args' => [ 'id' => [ 'validate_callback' => function($param, $request, $key) { return is_numeric( $param ); } ] ], ]);
}
add_action( 'rest_api_init', 'myddpc_app_register_rest_routes' );

// 4. =========================================================================
//    API CALLBACK FUNCTIONS (No changes)
// =========================================================================
if (file_exists(plugin_dir_path(__FILE__) . 'includes/class-discover-query.php')) {
    require_once plugin_dir_path(__FILE__) . 'includes/class-discover-query.php';
}
function get_myddpc_vehicle_dimensions_callback( WP_REST_Request $request ) {
    global $wpdb; $params = $request->get_params();
    $year  = isset($params['year']) ? sanitize_text_field($params['year']) : null;
    $make  = isset($params['make']) ? sanitize_text_field($params['make']) : null;
    $model = isset($params['model']) ? sanitize_text_field($params['model']) : null;
    $trim  = isset($params['trim']) ? sanitize_text_field($params['trim']) : null;
    if ( ! $year || ! $make || ! $model || ! $trim ) { return new WP_Error( 'bad_request', 'Missing required parameters.', [ 'status' => 400 ] ); }
    $query = $wpdb->prepare( "SELECT `Length (in)`, `Width (in)`, `Height (in)`, `Wheelbase (in)`, `Ground clearance (in)`, `Turning circle (ft)` FROM {$wpdb->prefix}vehicle_data WHERE `Year` = %d AND `Make` = %s AND `Model` = %s AND `Trim` = %s", $year, $make, $model, $trim );
    $result = $wpdb->get_row( $query, ARRAY_A );
    return $result ? new WP_REST_Response( $result, 200 ) : new WP_REST_Response( [], 404 );
}
function get_myddpc_distinct_years_callback() {
    global $wpdb; return new WP_REST_Response( $wpdb->get_col("SELECT DISTINCT `Year` FROM {$wpdb->prefix}vehicle_data ORDER BY `Year` DESC"), 200 );
}
function get_myddpc_distinct_makes_callback( WP_REST_Request $request ) {
    global $wpdb; $year = $request->get_param('year');
    if (!$year) return new WP_Error( 'bad_request', 'Year is required.', [ 'status' => 400 ] );
    $query = $wpdb->prepare("SELECT DISTINCT `Make` FROM {$wpdb->prefix}vehicle_data WHERE `Year` = %d ORDER BY `Make` ASC", $year);
    return new WP_REST_Response( $wpdb->get_col($query), 200 );
}
function get_myddpc_distinct_models_callback( WP_REST_Request $request ) {
    global $wpdb; $year = $request->get_param('year'); $make = $request->get_param('make');
    if (!$year || !$make) return new WP_Error( 'bad_request', 'Year and Make are required.', [ 'status' => 400 ] );
    $query = $wpdb->prepare("SELECT DISTINCT `Model` FROM {$wpdb->prefix}vehicle_data WHERE `Year` = %d AND `Make` = %s ORDER BY `Model` ASC", $year, $make);
    return new WP_REST_Response( $wpdb->get_col($query), 200 );
}
function get_myddpc_distinct_trims_callback( WP_REST_Request $request ) {
    global $wpdb; $year = $request->get_param('year'); $make = $request->get_param('make'); $model = $request->get_param('model');
    if (!$year || !$make || !$model) return new WP_Error( 'bad_request', 'Year, Make, and Model are required.', [ 'status' => 400 ] );
    $query = $wpdb->prepare("SELECT DISTINCT `Trim` FROM {$wpdb->prefix}vehicle_data WHERE `Year` = %d AND `Make` = %s AND `Model` = %s ORDER BY `Trim` ASC", $year, $make, $model);
    return new WP_REST_Response( $wpdb->get_col($query), 200 );
}
function get_myddpc_performance_data_callback( WP_REST_Request $request ) {
    global $wpdb; $params = $request->get_params();
    $year  = isset($params['year']) ? sanitize_text_field($params['year']) : null;
    $make  = isset($params['make']) ? sanitize_text_field($params['make']) : null;
    $model = isset($params['model']) ? sanitize_text_field($params['model']) : null;
    $trim  = isset($params['trim']) ? sanitize_text_field($params['trim']) : null;
    if ( ! $year || ! $make || ! $model || ! $trim ) { return new WP_Error( 'bad_request', 'Missing required parameters.', [ 'status' => 400 ] ); }
    $query = $wpdb->prepare( "SELECT `Horsepower (HP)`, `Torque (ft-lbs)`, `EPA combined MPG`, `EPA combined MPGe` FROM {$wpdb->prefix}vehicle_data WHERE `Year` = %d AND `Make` = %s AND `Model` = %s AND `Trim` = %s", $year, $make, $model, $trim );
    $result = $wpdb->get_row( $query, ARRAY_A );
    return $result ? new WP_REST_Response( $result, 200 ) : new WP_REST_Response( [], 404 );
}
function get_myddpc_discover_filters_callback($request) {
    if (!class_exists('Discover_Query')) return new WP_Error('class_not_found', 'Discover Query class is missing.', ['status' => 500]);
    $query = new Discover_Query(); return new WP_REST_Response($query->get_discover_filter_options(), 200);
}
function get_myddpc_discover_results_callback($request) {
    if (!class_exists('Discover_Query')) return new WP_Error('class_not_found', 'Discover Query class is missing.', ['status' => 500]);
    $params = $request->get_json_params(); $query = new Discover_Query();
    $results = $query->get_discover_results( $params['filters'] ?? [], $params['limit'] ?? 25, $params['offset'] ?? 0, $params['sort_by'] ?? 'Year', $params['sort_dir'] ?? 'desc' );
    return new WP_REST_Response($results, 200);
}
function get_myddpc_discover_vehicle_details_callback($request){
    if (!class_exists('Discover_Query')) return new WP_Error('class_not_found', 'Discover Query class is missing.', ['status' => 500]);
    $id = (int) $request['id']; $vehicle_data = Discover_Query::get_vehicle_by_id($id);
    if (empty($vehicle_data)) { return new WP_Error('not_found', 'Vehicle not found.', ['status' => 404]); }
    return new WP_REST_Response($vehicle_data, 200);
}
