<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly.
}

// **FIXED**: Removed unnecessary 'use' statements for global WordPress classes.

class MyDDPC_Performance_REST_Controller {
    protected $namespace = 'myddpc-performance/v1';
    protected $query_handler;

    public function __construct( MyDDPC_Performance_Query $query_handler ) {
        $this->query_handler = $query_handler;
        add_action( 'rest_api_init', [ $this, 'register_routes' ] );
    }

    public function register_routes() {
        register_rest_route( $this->namespace, '/vehicle', [
            'methods'  => WP_REST_Server::READABLE,
            'callback' => [ $this, 'get_vehicle_data' ],
            'permission_callback' => '__return_true',
        ] );
        register_rest_route( $this->namespace, '/years', [
            'methods' => WP_REST_Server::READABLE, 'callback' => [ $this, 'get_years' ], 'permission_callback' => '__return_true',
        ]);
        register_rest_route( $this->namespace, '/makes', [
            'methods' => WP_REST_Server::READABLE, 'callback' => [ $this, 'get_makes' ], 'permission_callback' => '__return_true',
        ]);
        register_rest_route( $this->namespace, '/models', [
            'methods' => WP_REST_Server::READABLE, 'callback' => [ $this, 'get_models' ], 'permission_callback' => '__return_true',
        ]);
        register_rest_route( $this->namespace, '/trims', [
            'methods' => WP_REST_Server::READABLE, 'callback' => [ $this, 'get_trims' ], 'permission_callback' => '__return_true',
        ]);
    }

    public function get_vehicle_data( WP_REST_Request $request ) {
        $year  = $request->get_param('year');
        $make  = $request->get_param('make');
        $model = $request->get_param('model');
        $trim  = $request->get_param('trim');

        // Optional: User-added debugging can be kept or removed.
        // error_log('[MYDDPC DEBUG] Params: year=' . $year . ', make=' . $make . ', model=' . $model . ', trim=' . $trim);

        $result = $this->query_handler->get_vehicle_by_ymmt($year, $make, $model, $trim);

        if ( $result ) {
            return new WP_REST_Response( $result, 200 );
        } else {
            return new WP_Error( 'not_found', 'Vehicle data not found.', [ 'status' => 404 ] );
        }
    }

    public function get_years( WP_REST_Request $request ) {
        return new WP_REST_Response( $this->query_handler->get_distinct('Year'), 200 );
    }
    public function get_makes( WP_REST_Request $request ) {
        $year = $request->get_param('year');
        return new WP_REST_Response( $this->query_handler->get_distinct('Make', ['Year' => $year]), 200 );
    }
    public function get_models( WP_REST_Request $request ) {
        $year = $request->get_param('year');
        $make = $request->get_param('make');
        return new WP_REST_Response( $this->query_handler->get_distinct('Model', ['Year' => $year, 'Make' => $make]), 200 );
    }
    public function get_trims( WP_REST_Request $request ) {
        $year = $request->get_param('year');
        $make = $request->get_param('make');
        $model = $request->get_param('model');
        return new WP_REST_Response( $this->query_handler->get_distinct('Trim', ['Year' => $year, 'Make' => $make, 'Model' => $model]), 200 );
    }
}