<?php
/**
 * Plugin Name:       MyDDPC Dimensions Tool
 * Description:       A tool to display and compare vehicle dimensions.
 * Version:           1.0.0
 * Author:            Rory Teehan
 * Author URI:        https://myddpc.com/
 */

// Prevent direct access
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Register the REST API route.
 */
add_action( 'rest_api_init', function () {
    register_rest_route( 'myddpc-dimensions/v1', '/vehicle', array(
        'methods'  => 'GET',
        'callback' => 'get_myddpc_vehicle_dimensions',
        'permission_callback' => '__return_true', // Public endpoint
        'args'     => [
            'year'  => [
                'required'          => true,
                'validate_callback' => function( $param ) {
                    return is_numeric( $param );
                }
            ],
            'make'  => [
                'required'          => true,
                'sanitize_callback' => 'sanitize_text_field'
            ],
            'model' => [
                'required'          => true,
                'sanitize_callback' => 'sanitize_text_field'
            ],
            'trim'  => [
                'required'          => true,
                'sanitize_callback' => 'sanitize_text_field'
            ],
        ],
    ) );
} );

/**
 * Callback function for the REST API endpoint.
 * Fetches vehicle dimension data from the custom table.
 *
 * @param WP_REST_Request $request The request object.
 * @return WP_REST_Response|WP_Error The response object.
 */
function get_myddpc_vehicle_dimensions( WP_REST_Request $request ) {
    global $wpdb;

    // Extract parameters from the request
    $year  = $request->get_param( 'year' );
    $make  = $request->get_param( 'make' );
    $model = $request->get_param( 'model' );
    $trim  = $request->get_param( 'trim' );

    $table_name = 'qfh_vehicle_data';

    // Prepare the SQL query to prevent SQL injection
    $query = $wpdb->prepare(
        "SELECT
            `Length (in)`,
            `Width (in)`,
            `Height (in)`,
            `Wheelbase (in)`,
            `Ground clearance (in)`,
            `Turning circle (ft)`,
            `Angle of approach (degrees)`,
            `Angle of departure (degrees)`,
            `Doors`,
            `Body type`,
            `Front track (in)`,
            `Rear track (in)`
        FROM {$table_name}
        WHERE `Year` = %d AND `Make` = %s AND `Model` = %s AND `Trim` = %s",
        $year,
        $make,
        $model,
        $trim
    );

    // Execute the query
    $result = $wpdb->get_row( $query, ARRAY_A );

    // Check for results
    if ( $result ) {
        return new WP_REST_Response( $result, 200 );
    } else {
        // Return an empty object if no vehicle is found
        return new WP_REST_Response( (object)[], 404 );
    }
}

/**
 * Enqueue the JavaScript for the tool.
 */
function myddpc_dimensions_enqueue_scripts() {
    // Only enqueue script on pages where the shortcode is present
    if ( is_a( get_post( get_the_ID() ), 'WP_Post' ) && has_shortcode( get_post( get_the_ID() )->post_content, 'myddpc_dimensions_tool' ) ) {
        wp_enqueue_script(
            'myddpc-dimensions-script',
            plugin_dir_url( __FILE__ ) . 'js/dimensions-script.js',
            [], // Dependencies
            '1.0.0', // Version
            true // Load in footer
        );

        // Pass the API URL and nonce to the script for secure AJAX calls
        wp_localize_script(
            'myddpc-dimensions-script',
            'myddpc_dimensions_ajax',
            [
                'api_url' => esc_url_raw( rest_url( 'myddpc-dimensions/v1/vehicle' ) ),
                'nonce'   => wp_create_nonce( 'wp_rest' )
            ]
        );
    }
}
add_action( 'wp_enqueue_scripts', 'myddpc_dimensions_enqueue_scripts' );


/**
 * Define the shortcode to display the tool.
 */
function myddpc_dimensions_tool_shortcode() {
    ob_start();
    include plugin_dir_path( __FILE__ ) . 'templates/dimensions-tool-template.php';
    return ob_get_clean();
}
add_shortcode( 'myddpc_dimensions_tool', 'myddpc_dimensions_tool_shortcode' );