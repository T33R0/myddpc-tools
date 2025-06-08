<?php
if ( ! defined( 'ABSPATH' ) ) exit;
require_once __DIR__ . '/class-discover-query.php';

class Discover_REST {
    public function __construct() {
        // Register routes on rest_api_init
        add_action('rest_api_init', array($this, 'register_routes'));
    }
    public function register_routes() {
        register_rest_route('myddpc/v1', '/discover/filters', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_filters'),
            'permission_callback' => '__return_true',
        ));
        register_rest_route('myddpc/v1', '/discover/results', array(
            'methods' => 'POST',
            'callback' => array($this, 'get_results'),
            'permission_callback' => '__return_true',
        ));
    }
    public function get_filters( $request ) {
        $query = new Discover_Query();
        $data = $query->get_discover_filter_options();
        // Add Make options
        $data['make'] = $query->get_distinct_values('Make');
        // Add Fuel Type options
        $data['fuel_type'] = $query->get_distinct_values('Fuel type');
        return function_exists('rest_ensure_response') ? rest_ensure_response($data) : $data;
    }
    public function get_results( $request ) {
        $params = method_exists($request, 'get_json_params') ? $request->get_json_params() : (array)$request;
        $filters = isset($params['filters']) ? (array)$params['filters'] : [];
        $limit = isset($params['limit']) ? (int)$params['limit'] : 50;
        $offset = isset($params['offset']) ? (int)$params['offset'] : 0;
        $query = new Discover_Query();
        $data = $query->get_discover_results($filters, $limit, $offset);
        return function_exists('rest_ensure_response') ? rest_ensure_response($data) : $data;
    }
}
// Instantiate to register routes
new Discover_REST();