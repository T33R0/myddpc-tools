<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class Discover_REST {
    public function register_routes() {
        register_rest_route( 'myddpc/v1', '/discover/filters', [
            'methods'             => 'GET',
            'callback'            => [ $this, 'get_filter_options' ],
            'permission_callback' => '__return_true',
        ] );
        register_rest_route( 'myddpc/v1', '/discover/results', [
            'methods'             => 'POST',
            'callback'            => [ $this, 'get_results_endpoint' ],
            'permission_callback' => '__return_true',
        ] );
    }

    // Return filter metadata: distinct values and ranges
    public function get_filter_options( $request ) {
        require_once __DIR__ . '/class-discover-query.php';
        $query = new Discover_Query();
        global $wpdb;
        $table = $wpdb->prefix . 'qfh_vehicle_data';
        $response = [
            'year' => [
                'min' => (int) $wpdb->get_var( "SELECT MIN(`Year`) FROM $table" ),
                'max' => (int) $wpdb->get_var( "SELECT MAX(`Year`) FROM $table" ),
            ],
            'horsepower' => [
                'min' => (int) $wpdb->get_var( "SELECT MIN(`Horsepower (HP)`) FROM $table" ),
                'max' => (int) $wpdb->get_var( "SELECT MAX(`Horsepower (HP)`) FROM $table" ),
            ],
            'torque' => [
                'min' => (int) $wpdb->get_var( "SELECT MIN(`Torque (ft-lbs)`) FROM $table" ),
                'max' => (int) $wpdb->get_var( "SELECT MAX(`Torque (ft-lbs)`) FROM $table" ),
            ],
            'weight' => [
                'min' => (int) $wpdb->get_var( "SELECT MIN(`Curb weight (lbs)`) FROM $table" ),
                'max' => (int) $wpdb->get_var( "SELECT MAX(`Curb weight (lbs)`) FROM $table" ),
            ],
            'cargo' => [
                'min' => (int) $wpdb->get_var( "SELECT MIN(`Cargo capacity (cu ft)`) FROM $table" ),
                'max' => (int) $wpdb->get_var( "SELECT MAX(`Cargo capacity (cu ft)`) FROM $table" ),
            ],
            'tow' => [
                'min' => (int) $wpdb->get_var( "SELECT MIN(`Maximum towing capacity (lbs)`) FROM $table" ),
                'max' => (int) $wpdb->get_var( "SELECT MAX(`Maximum towing capacity (lbs)`) FROM $table" ),
            ],
            'clearance' => [
                'min' => (int) $wpdb->get_var( "SELECT MIN(`Ground clearance (in)`) FROM $table" ),
                'max' => (int) $wpdb->get_var( "SELECT MAX(`Ground clearance (in)`) FROM $table" ),
            ],
            'mpg' => [
                'min' => (int) $wpdb->get_var( "SELECT MIN(`EPA combined MPG`) FROM $table" ),
                'max' => (int) $wpdb->get_var( "SELECT MAX(`EPA combined MPG`) FROM $table" ),
            ],
            'country_of_origin'    => $query->get_distinct_values('Country of origin'),
            'body_type'            => $query->get_distinct_values('Body type'),
            'car_classification'   => $query->get_distinct_values('Car classification'),
            'drive_type'           => $query->get_distinct_values('Drive type'),
            'transmission'         => $query->get_distinct_values('Transmission'),
            'fuel_type'            => $query->get_distinct_values('Fuel type'),
            'cylinders'            => $query->get_distinct_values('Cylinders'),
            'doors'                => $query->get_distinct_values('Doors'),
            'total_seating'        => $query->get_distinct_values('Total seating'),
        ];
        return function_exists('rest_ensure_response') ? rest_ensure_response($response) : $response;
    }

    // Return filtered results
    public function get_results_endpoint( $request ) {
        require_once __DIR__ . '/class-discover-query.php';
        $params = method_exists($request, 'get_json_params') ? $request->get_json_params() : (array) $request;
        $filters = isset( $params['filters'] ) ? (array) $params['filters'] : [];
        $limit = isset( $params['limit'] ) ? min( absint( $params['limit'] ), 50 ) : 50;
        $offset = isset( $params['offset'] ) ? absint( $params['offset'] ) : 0;
        $query = new Discover_Query();
        $data = $query->get_results( $filters, $limit, $offset );
        $total = $query->get_total_count( $filters );
        $result = [ 'results' => $data, 'total' => $total ];
        return function_exists('rest_ensure_response') ? rest_ensure_response($result) : $result;
    }
}