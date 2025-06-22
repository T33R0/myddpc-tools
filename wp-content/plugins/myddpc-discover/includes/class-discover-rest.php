<?php
if (!defined('ABSPATH')) exit;

// Ensure WordPress REST API is available
if (!function_exists('rest_ensure_response')) {
    require_once(ABSPATH . 'wp-includes/rest-api.php');
}

require_once __DIR__ . '/class-discover-query.php';

class Discover_REST {
    public function __construct() {
        add_action('rest_api_init', array($this, 'register_routes'));
    }

    public function register_routes() {
        // Register the filters endpoint
        register_rest_route('myddpc/v1', '/discover/filters', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_filter_options'),
            'permission_callback' => '__return_true'
        ));

        // Register the results endpoint
        register_rest_route('myddpc/v1', '/discover/results', array(
            'methods' => 'POST',
            'callback' => array($this, 'get_results'),
            'permission_callback' => '__return_true'
        ));

        // Register the vehicle details endpoint
        register_rest_route('myddpc/v1', '/vehicle/(?P<id>\\d+)', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_vehicle_details'),
            'permission_callback' => '__return_true',
            'args' => array(
                'id' => array(
                    'required' => true,
                    'validate_callback' => function($param) {
                        return is_numeric($param);
                    }
                )
            )
        ));
    }

    public function get_filter_options($request) {
        try {
            $query = new Discover_Query();
            $data = $query->get_discover_filter_options();
            return rest_ensure_response($data);
        } catch (Exception $e) {
            return new WP_REST_Response(array(
                'success' => false,
                'message' => 'Failed to fetch filter options',
                'error' => $e->getMessage()
            ), 500);
        }
    }

    public function get_results($request) {
        try {
            $params = method_exists($request, 'get_json_params') ? $request->get_json_params() : (array)$request;
            $filters = isset($params['filters']) ? (array)$params['filters'] : [];
            $limit = isset($params['limit']) ? (int)$params['limit'] : 50;
            $offset = isset($params['offset']) ? (int)$params['offset'] : 0;
            $sort_by = isset($params['sort_by']) ? $params['sort_by'] : 'Year';
            $sort_dir = isset($params['sort_dir']) && strtolower($params['sort_dir']) === 'asc' ? 'asc' : 'desc';
            
            $query = new Discover_Query();
            $data = $query->get_discover_results($filters, $limit, $offset, $sort_by, $sort_dir);
            return rest_ensure_response($data);
        } catch (Exception $e) {
            return new WP_REST_Response(array(
                'success' => false,
                'message' => 'Failed to fetch results',
                'error' => $e->getMessage()
            ), 500);
        }
    }

    public function get_vehicle_details($request) {
        $vehicle_id = (int) $request['id'];
        if ($vehicle_id <= 0) {
            return new WP_Error('rest_invalid_id', 'Invalid vehicle ID.', ['status' => 400]);
        }
        $vehicle_data = Discover_Query::get_vehicle_by_id($vehicle_id);

        if (empty($vehicle_data)) {
            return new WP_Error('rest_not_found', 'Vehicle not found.', ['status' => 404]);
        }
        return new WP_REST_Response($vehicle_data, 200);
    }
}

// Instantiate to register routes
new Discover_REST();