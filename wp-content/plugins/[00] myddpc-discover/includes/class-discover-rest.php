<?php
if ( ! defined( 'ABSPATH' ) ) exit;

// Assume REST API is loaded by WordPress; do not require ABSPATH files
class Discover_REST {

    public function register_routes() {
        register_rest_route( 'myddpc/v1', '/discover/filters', [
            'methods'             => 'GET',
            'callback'            => [ $this, 'get_filter_options' ],
            'permission_callback' => '__return_true',
        ] );
        register_rest_route( 'myddpc/v1', '/discover/results', [
            'methods'             => 'POST',
            'callback'            => [ $this, 'get_results' ],
            'permission_callback' => '__return_true',
        ] );
    }

    // Return filter metadata: distinct values and ranges
    public function get_filter_options( $request ) {
        require_once __DIR__ . '/class-discover-query.php';
        $query = new Discover_Query();

        $response = [];

        // Numeric range filters: Year, Horsepower, Torque, Weight, Cargo, Tow, Clearance, MPG
        global $wpdb;
        $table = $wpdb->prefix . 'qfh_vehicle_data';

        $response['year'] = [
            'min' => intval( $wpdb->get_var( "SELECT MIN(`Year`) FROM $table" ) ),
            'max' => intval( $wpdb->get_var( "SELECT MAX(`Year`) FROM $table" ) ),
        ];
        $response['horsepower'] = [
            'min' => intval( $wpdb->get_var( "SELECT MIN(`Horsepower (HP)`) FROM $table" ) ),
            'max' => intval( $wpdb->get_var( "SELECT MAX(`Horsepower (HP)`) FROM $table" ) ),
        ];
        $response['torque'] = [
            'min' => intval( $wpdb->get_var( "SELECT MIN(`Torque (ft-lbs)`) FROM $table" ) ),
            'max' => intval( $wpdb->get_var( "SELECT MAX(`Torque (ft-lbs)`) FROM $table" ) ),
        ];
        $response['weight'] = [
            'min' => intval( $wpdb->get_var( "SELECT MIN(`Curb weight (lbs)`) FROM $table" ) ),
            'max' => intval( $wpdb->get_var( "SELECT MAX(`Curb weight (lbs)`) FROM $table" ) ),
        ];
        $response['cargo'] = [
            'min' => intval( $wpdb->get_var( "SELECT MIN(`Cargo capacity (cu ft)`) FROM $table" ) ),
            'max' => intval( $wpdb->get_var( "SELECT MAX(`Cargo capacity (cu ft)`) FROM $table" ) ),
        ];
        $response['tow'] = [
            'min' => intval( $wpdb->get_var( "SELECT MIN(`Maximum towing capacity (lbs)`) FROM $table" ) ),
            'max' => intval( $wpdb->get_var( "SELECT MAX(`Maximum towing capacity (lbs)`) FROM $table" ) ),
        ];
        $response['clearance'] = [
            'min' => intval( $wpdb->get_var( "SELECT MIN(`Ground clearance (in)`) FROM $table" ) ),
            'max' => intval( $wpdb->get_var( "SELECT MAX(`Ground clearance (in)`) FROM $table" ) ),
        ];
        $response['mpg'] = [
            'min' => intval( $wpdb->get_var( "SELECT MIN(`EPA combined MPG`) FROM $table" ) ),
            'max' => intval( $wpdb->get_var( "SELECT MAX(`EPA combined MPG`) FROM $table" ) ),
        ];

        // Multi-select filters
        $multi_select_columns = [
            'country_of_origin'    => 'Country of origin',
            'body_type'            => 'Body type',
            'car_classification'   => 'Car classification',
            'drive_type'           => 'Drive type',
            'transmission'         => 'Transmission',
            'fuel_type'            => 'Fuel type',
            'cylinders'            => 'Cylinders',
            'doors'                => 'Doors',
            'total_seating'        => 'Total seating'
        ];

        foreach ( $multi_select_columns as $key => $col ) {
            $response[ $key ] = $query->get_distinct_values( $col );
        }

        if ( function_exists( 'rest_ensure_response' ) ) {
            return rest_ensure_response( $response );
        }
        return $response;
    }

    // Return filtered results
    public function get_results( $request ) {
        require_once __DIR__ . '/class-discover-query.php';
        $params = $request->get_json_params();
        $filters = isset( $params['filters'] ) ? $params['filters'] : [];
        $limit   = isset( $params['limit'] ) ? min( intval( $params['limit'] ), 50 ) : 50;
        $offset  = isset( $params['offset'] ) ? intval( $params['offset'] ) : 0;

        $query = new Discover_Query();
        $rows  = $query->get_results( $filters, $limit, $offset );
        $total = $query->get_total_count( $filters );

        $result = [
            'total'   => $total,
            'results' => $rows,
        ];
        if ( function_exists( 'rest_ensure_response' ) ) {
            return rest_ensure_response( $result );
        }
        return $result;
    }
}