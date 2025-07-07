<?php
/**
 * Plugin Name:       MyDDPC App
 * Description:       Loads the integrated MyDDPC React application and provides its REST API endpoints.
 * Version:           2.3.3
 * Author:            Rory Teehan
 */

if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly.

// 1. =========================================================================
//    ENQUEUE & INLINE SCRIPT LOGIC
// =========================================================================
function myddpc_app_enqueue_assets() {
    if ( is_page_template( 'template-myddpc-app.php' ) ) {
        wp_enqueue_script( 'react', 'https://unpkg.com/react@18/umd/react.production.min.js', [], '18.2.0', true );
        wp_enqueue_script( 'react-dom', 'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js', ['react'], '18.2.0', true );
        wp_enqueue_script( 'babel-standalone', 'https://unpkg.com/@babel/standalone/babel.min.js', [], '7.24.7', true );
        $app_css_url = plugin_dir_url( __FILE__ ) . 'assets/app.css';
        wp_enqueue_style( 'myddpc-react-app-styles', $app_css_url, [], '2.3.0' );
    }
}

// Register the main React app script for use with shortcodes
function myddpc_app_register_scripts() {
    wp_register_script( 'react', 'https://unpkg.com/react@18/umd/react.production.min.js', [], '18.2.0', true );
    wp_register_script( 'react-dom', 'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js', ['react'], '18.2.0', true );
    wp_register_script( 'babel-standalone', 'https://unpkg.com/@babel/standalone/babel.min.js', [], '7.24.7', true );
    $app_css_url = plugin_dir_url( __FILE__ ) . 'assets/app.css';
    wp_register_style( 'myddpc-react-app-styles', $app_css_url, [], '2.3.0' );
    
    // Create a dummy handle for the app script that includes inline JS
    wp_register_script( 'myddpc-react-app', '', ['react', 'react-dom', 'babel-standalone'], '2.3.3', true );
}
add_action( 'wp_enqueue_scripts', 'myddpc_app_enqueue_assets', 999 );
add_action( 'wp_enqueue_scripts', 'myddpc_app_register_scripts', 5 );

function myddpc_app_print_inline_scripts() {
    if ( is_page_template( 'template-myddpc-app.php' ) ) {
        $app_js_path = plugin_dir_path( __FILE__ ) . 'assets/app.js';
        if ( file_exists( $app_js_path ) ) {
            $react_app_code = file_get_contents( $app_js_path );
            $current_user = wp_get_current_user();
            $user_data = null;
            if ( $current_user->exists() ) {
                $user_data = [ 'id' => $current_user->ID, 'username' => $current_user->user_login, 'displayName' => $current_user->display_name, 'email' => $current_user->user_email ];
            }
            $data_object_string = 'const myddpcAppData = ' . json_encode([ 'rest_url' => esc_url_raw( rest_url() ), 'nonce' => wp_create_nonce( 'wp_rest' ), 'is_logged_in' => is_user_logged_in(), 'current_user' => $user_data, 'logout_url' => wp_logout_url( home_url() ) ]);
            echo '<script type="text/babel">' . $data_object_string . ';' . $react_app_code . '</script>';
        } else {
            echo '<script>console.error("MyDDPC Error: assets/app.js file not found.");</script>';
        }
    }
}
add_action( 'wp_print_footer_scripts', 'myddpc_app_print_inline_scripts', 50 );

// 2. =========================================================================
//    ADMIN BAR VISIBILITY
// =========================================================================
function myddpc_hide_admin_bar_for_users() {
    if (is_user_logged_in()) {
        $user = wp_get_current_user();
        $allowed_roles = ['administrator', 'keymaster'];
        $has_allowed_role = count(array_intersect($allowed_roles, $user->roles)) > 0;
        if (!$has_allowed_role) {
            show_admin_bar(false);
        }
    }
}
add_action('after_setup_theme', 'myddpc_hide_admin_bar_for_users');

// 3. =========================================================================
//    UNIFIED REST API ENDPOINTS
// =========================================================================
function myddpc_app_register_rest_routes() {
    $namespace = 'myddpc/v2';
    // --- Tool Data Endpoints ---
    register_rest_route( $namespace, '/discover/results', [ 'methods' => 'POST', 'callback' => 'get_myddpc_discover_results_callback', 'permission_callback' => '__return_true' ]);
    register_rest_route( $namespace, '/discover/filters', [ 'methods' => 'GET', 'callback' => 'get_myddpc_discover_filters_callback', 'permission_callback' => '__return_true' ]);
    register_rest_route( $namespace, '/discover/vehicle/(?P<id>\d+)', [ 'methods' => 'GET', 'callback' => 'get_myddpc_discover_vehicle_details_callback', 'permission_callback' => '__return_true', 'args' => [ 'id' => [ 'validate_callback' => function($param, $request, $key) { return is_numeric( $param ); } ] ], ]);
    register_rest_route( $namespace, '/discover/model_trims', [ 'methods' => 'GET', 'callback' => 'get_myddpc_model_trims_callback', 'permission_callback' => '__return_true' ]);
    register_rest_route( $namespace, '/dimensions/vehicle', [ 'methods'  => 'GET', 'callback' => 'get_myddpc_vehicle_dimensions_callback', 'permission_callback' => '__return_true' ] );
    register_rest_route( $namespace, '/dimensions/years', [ 'methods' => 'GET', 'callback' => 'get_myddpc_distinct_years_callback', 'permission_callback' => '__return_true' ]);
    register_rest_route( $namespace, '/dimensions/makes', [ 'methods' => 'GET', 'callback' => 'get_myddpc_distinct_makes_callback', 'permission_callback' => '__return_true' ]);
    register_rest_route( $namespace, '/dimensions/models', [ 'methods' => 'GET', 'callback' => 'get_myddpc_distinct_models_callback', 'permission_callback' => '__return_true' ]);
    register_rest_route( $namespace, '/dimensions/trims', [ 'methods' => 'GET', 'callback' => 'get_myddpc_distinct_trims_callback', 'permission_callback' => '__return_true' ]);
    register_rest_route( $namespace, '/performance/vehicle', [ 'methods'  => 'GET', 'callback' => 'get_myddpc_performance_data_callback', 'permission_callback' => '__return_true' ] );

    // --- User Management Endpoints ---
    register_rest_route($namespace, '/user/register', [ 'methods' => 'POST', 'callback' => 'myddpc_handle_user_registration', 'permission_callback' => '__return_true' ]);
    register_rest_route($namespace, '/user/login', [ 'methods' => 'POST', 'callback' => 'myddpc_handle_user_login', 'permission_callback' => '__return_true' ]);
    register_rest_route($namespace, '/user/me', [ 'methods' => 'GET', 'callback' => 'myddpc_get_user_me_callback', 'permission_callback' => 'is_user_logged_in' ]);
    register_rest_route($namespace, '/user/profile', [ 'methods' => 'POST', 'callback' => 'myddpc_update_user_profile_callback', 'permission_callback' => 'is_user_logged_in' ]);
    register_rest_route($namespace, '/user/password', [ 'methods' => 'POST', 'callback' => 'myddpc_change_password_callback', 'permission_callback' => 'is_user_logged_in' ]);
    
    // --- Garage & Build List CRUD Endpoints ---
    register_rest_route($namespace, '/garage/vehicles', [ 'methods' => 'GET', 'callback' => 'myddpc_get_garage_vehicles_callback', 'permission_callback' => 'is_user_logged_in' ]);
    register_rest_route($namespace, '/garage/add_vehicle', [ 'methods' => 'POST', 'callback' => 'myddpc_add_garage_vehicle_callback', 'permission_callback' => 'is_user_logged_in' ]);
    register_rest_route($namespace, '/garage/vehicle/update', [ 'methods' => 'POST', 'callback' => 'myddpc_update_garage_vehicle_callback', 'permission_callback' => 'is_user_logged_in' ]);
    register_rest_route($namespace, '/garage/vehicle/delete', [ 'methods' => 'POST', 'callback' => 'myddpc_delete_garage_vehicle_callback', 'permission_callback' => 'is_user_logged_in' ]);
    
    register_rest_route($namespace, '/garage/builds/(?P<garage_id>\d+)', [ 'methods' => 'GET', 'callback' => 'myddpc_get_build_list_callback', 'permission_callback' => 'is_user_logged_in' ]);
    register_rest_route($namespace, '/garage/builds/add', [ 'methods' => 'POST', 'callback' => 'myddpc_save_build_job_callback', 'permission_callback' => 'is_user_logged_in' ]);
    register_rest_route($namespace, '/garage/builds/save', [ 'methods' => 'POST', 'callback' => 'myddpc_save_build_job_callback', 'permission_callback' => 'is_user_logged_in' ]);
    register_rest_route($namespace, '/garage/builds/update', [ 'methods' => 'POST', 'callback' => 'myddpc_save_build_job_callback', 'permission_callback' => 'is_user_logged_in' ]);
    register_rest_route($namespace, '/garage/builds/delete', [ 'methods' => 'POST', 'callback' => 'myddpc_delete_build_job_callback', 'permission_callback' => 'is_user_logged_in' ]);
    register_rest_route($namespace, '/garage/metrics', [ 'methods' => 'GET', 'callback' => 'myddpc_get_garage_metrics_callback', 'permission_callback' => 'is_user_logged_in' ]);
    
    // --- Saved Vehicles Endpoints ---
    register_rest_route($namespace, '/saved', [ 'methods' => 'GET', 'callback' => 'myddpc_get_saved_vehicles_callback', 'permission_callback' => 'is_user_logged_in' ]);
    register_rest_route($namespace, '/saved', [ 'methods' => 'POST', 'callback' => 'myddpc_add_to_saved_vehicles_callback', 'permission_callback' => 'is_user_logged_in' ]);
    register_rest_route($namespace, '/saved/(?P<id>\d+)', [ 'methods' => 'DELETE', 'callback' => 'myddpc_remove_from_saved_vehicles_callback', 'permission_callback' => 'is_user_logged_in' ]);
    register_rest_route( $namespace, '/vehicle/full_data', [
        'methods'  => 'GET',
        'callback' => 'myddpc_get_full_vehicle_data_callback',
        'permission_callback' => '__return_true',
    ] );
    // --- Community Bridge Endpoint ---
    register_rest_route($namespace, '/community/builds/(?P<vehicle_id>\d+)', [
        'methods'  => 'GET',
        'callback' => 'myddpc_get_community_builds_callback',
        'permission_callback' => '__return_true',
        'args' => [
            'vehicle_id' => [
                'validate_callback' => function($param, $request, $key) {
                    return is_numeric($param);
                }
            ]
        ]
    ] );
    
    // Test endpoint for debugging
    register_rest_route($namespace, '/test/db', [
        'methods'  => 'GET',
        'callback' => 'myddpc_test_db_connection',
        'permission_callback' => '__return_true',
    ] );
    
    // Debug endpoint for garage issues
    register_rest_route($namespace, '/debug/garage', [
        'methods'  => 'GET',
        'callback' => 'myddpc_debug_garage_issues',
        'permission_callback' => '__return_true',
    ] );
}
add_action( 'rest_api_init', 'myddpc_app_register_rest_routes' );

// 4. =========================================================================
//    DATABASE TABLE MANAGEMENT
// =========================================================================
function myddpc_create_build_table_if_not_exists() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'user_garage_builds';
    
    if ($wpdb->get_var("SHOW TABLES LIKE '$table_name'") != $table_name) {
        $charset_collate = $wpdb->get_charset_collate();
        
        $sql = "CREATE TABLE $table_name (
            build_entry_id mediumint(9) NOT NULL AUTO_INCREMENT,
            garage_entry_id mediumint(9) NOT NULL,
            job_title varchar(255) NOT NULL,
            job_type varchar(50) DEFAULT 'aftermarket_upgrade',
            status varchar(50) DEFAULT 'planned',
            installation_date date NULL,
            installation_method varchar(50) DEFAULT 'diy',
            primary_link text NULL,
            job_notes text NULL,
            items_data longtext NULL,
            date_added datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (build_entry_id),
            KEY garage_entry_id (garage_entry_id)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }
}

// Ensure garage table exists too
function myddpc_create_garage_table_if_not_exists() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'user_garage';
    
    if ($wpdb->get_var("SHOW TABLES LIKE '$table_name'") != $table_name) {
        $charset_collate = $wpdb->get_charset_collate();
        
        $sql = "CREATE TABLE $table_name (
            garage_id mediumint(9) NOT NULL AUTO_INCREMENT,
            user_id bigint(20) unsigned NOT NULL,
            vehicle_data_id mediumint(9) NOT NULL,
            nickname varchar(255) NOT NULL,
            custom_image_url text NULL,
            status varchar(50) DEFAULT 'operational',
            vehicle_type varchar(50) DEFAULT 'Personal',
            mileage int(11) DEFAULT NULL,
            vin varchar(17) DEFAULT NULL,
            engine_code varchar(50) DEFAULT NULL,
            drivetrain varchar(50) DEFAULT NULL,
            exterior_color varchar(100) DEFAULT NULL,
            interior_color varchar(100) DEFAULT NULL,
            production_date date DEFAULT NULL,
            purchase_date date DEFAULT NULL,
            purchase_price decimal(10,2) DEFAULT NULL,
            purchased_from varchar(255) DEFAULT NULL,
            purchase_mileage int(11) DEFAULT NULL,
            service_intervals longtext DEFAULT NULL,
            last_service longtext DEFAULT NULL,
            date_added datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (garage_id),
            KEY user_id (user_id),
            KEY vehicle_data_id (vehicle_data_id)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    } else {
        // Check if new columns exist and add them if they don't
        $columns_to_add = [
            'status' => "ALTER TABLE $table_name ADD COLUMN status varchar(50) DEFAULT 'operational'",
            'vehicle_type' => "ALTER TABLE $table_name ADD COLUMN vehicle_type varchar(50) DEFAULT 'Personal'",
            'mileage' => "ALTER TABLE $table_name ADD COLUMN mileage int(11) DEFAULT NULL",
            'vin' => "ALTER TABLE $table_name ADD COLUMN vin varchar(17) DEFAULT NULL",
            'engine_code' => "ALTER TABLE $table_name ADD COLUMN engine_code varchar(50) DEFAULT NULL",
            'drivetrain' => "ALTER TABLE $table_name ADD COLUMN drivetrain varchar(50) DEFAULT NULL",
            'exterior_color' => "ALTER TABLE $table_name ADD COLUMN exterior_color varchar(100) DEFAULT NULL",
            'interior_color' => "ALTER TABLE $table_name ADD COLUMN interior_color varchar(100) DEFAULT NULL",
            'production_date' => "ALTER TABLE $table_name ADD COLUMN production_date date DEFAULT NULL",
            'purchase_date' => "ALTER TABLE $table_name ADD COLUMN purchase_date date DEFAULT NULL",
            'purchase_price' => "ALTER TABLE $table_name ADD COLUMN purchase_price decimal(10,2) DEFAULT NULL",
            'purchased_from' => "ALTER TABLE $table_name ADD COLUMN purchased_from varchar(255) DEFAULT NULL",
            'purchase_mileage' => "ALTER TABLE $table_name ADD COLUMN purchase_mileage int(11) DEFAULT NULL",
            'service_intervals' => "ALTER TABLE $table_name ADD COLUMN service_intervals longtext DEFAULT NULL",
            'last_service' => "ALTER TABLE $table_name ADD COLUMN last_service longtext DEFAULT NULL"
        ];
        
        foreach ($columns_to_add as $column => $sql) {
            $column_exists = $wpdb->get_var("SHOW COLUMNS FROM $table_name LIKE '$column'");
            if (!$column_exists) {
                $wpdb->query($sql);
            }
        }
    }
}

// Ensure saved vehicles table exists and has correct structure
function myddpc_create_saved_vehicles_table_if_not_exists() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'user_saved_vehicles';
    
    if ($wpdb->get_var("SHOW TABLES LIKE '$table_name'") != $table_name) {
        $charset_collate = $wpdb->get_charset_collate();
        
        $sql = "CREATE TABLE $table_name (
            saved_id mediumint(9) NOT NULL AUTO_INCREMENT,
            user_id bigint(20) unsigned NOT NULL,
            vehicle_id bigint(20) unsigned NOT NULL,
            date_added datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (saved_id),
            KEY user_id (user_id),
            KEY vehicle_id (vehicle_id),
            UNIQUE KEY unique_user_vehicle (user_id, vehicle_id)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    } else {
        // Table exists, check if vehicle_id column needs to be updated
        $column_type = $wpdb->get_var("SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '$table_name' AND COLUMN_NAME = 'vehicle_id' AND TABLE_SCHEMA = DATABASE()");
        
        if ($column_type === 'mediumint') {
            // Need to update the column type
            error_log('DEBUG: Updating vehicle_id column from mediumint to bigint');
            
            // Drop the unique constraint first
            $wpdb->query("ALTER TABLE $table_name DROP INDEX unique_user_vehicle");
            
            // Modify the column
            $wpdb->query("ALTER TABLE $table_name MODIFY COLUMN vehicle_id bigint(20) unsigned NOT NULL");
            
            // Recreate the unique constraint
            $wpdb->query("ALTER TABLE $table_name ADD UNIQUE KEY unique_user_vehicle (user_id, vehicle_id)");
            
            error_log('DEBUG: vehicle_id column updated to bigint');
        }
    }
}

// 5. =========================================================================
//    API CALLBACK FUNCTIONS
// =========================================================================

// Ensure Discover_Query class is available
if (file_exists(plugin_dir_path(__FILE__) . 'includes/class-discover-query.php')) {
    require_once plugin_dir_path(__FILE__) . 'includes/class-discover-query.php';
}

// Test database connection function
function myddpc_test_db_connection() {
    global $wpdb;
    
    try {
        // Test basic connection
        $result = $wpdb->get_var("SELECT 1");
        if ($result !== '1') {
            return new WP_Error('db_error', 'Database connection failed', ['status' => 500]);
        }
        
        // Test if tables exist
        $garage_table = $wpdb->prefix . 'user_garage';
        $builds_table = $wpdb->prefix . 'user_garage_builds';
        $vehicle_data_table = $wpdb->prefix . 'vehicle_data';
        
        $garage_exists = $wpdb->get_var("SHOW TABLES LIKE '$garage_table'") == $garage_table;
        $builds_exists = $wpdb->get_var("SHOW TABLES LIKE '$builds_table'") == $builds_table;
        $vehicle_data_exists = $wpdb->get_var("SHOW TABLES LIKE '$vehicle_data_table'") == $vehicle_data_table;
        
        return new WP_REST_Response([
            'status' => 'success',
            'message' => 'Database connection working',
            'tables' => [
                'garage' => $garage_exists,
                'builds' => $builds_exists,
                'vehicle_data' => $vehicle_data_exists
            ],
            'last_error' => $wpdb->last_error
        ], 200);
        
    } catch (Exception $e) {
        return new WP_Error('db_error', 'Database error: ' . $e->getMessage(), ['status' => 500]);
    }
}

// Debug garage issues function
function myddpc_debug_garage_issues() {
    global $wpdb;
    
    try {
        $debug_info = [
            'user_id' => get_current_user_id(),
            'is_logged_in' => is_user_logged_in(),
            'user_roles' => wp_get_current_user()->roles ?? [],
            'database_prefix' => $wpdb->prefix,
            'last_error' => $wpdb->last_error,
            'tables' => []
        ];
        
        // Check table existence
        $tables_to_check = [
            'user_garage' => $wpdb->prefix . 'user_garage',
            'user_garage_builds' => $wpdb->prefix . 'user_garage_builds',
            'user_saved_vehicles' => $wpdb->prefix . 'user_saved_vehicles',
            'vehicle_data' => $wpdb->prefix . 'vehicle_data'
        ];
        
        foreach ($tables_to_check as $table_name => $full_table_name) {
            $exists = $wpdb->get_var("SHOW TABLES LIKE '$full_table_name'") == $full_table_name;
            $debug_info['tables'][$table_name] = [
                'exists' => $exists,
                'full_name' => $full_table_name
            ];
            
            if ($exists) {
                // Get table structure
                $columns = $wpdb->get_results("SHOW COLUMNS FROM $full_table_name", ARRAY_A);
                $debug_info['tables'][$table_name]['columns'] = array_column($columns, 'Field');
            }
        }
        
        return new WP_REST_Response($debug_info, 200);
        
    } catch (Exception $e) {
        return new WP_Error('debug_error', 'Debug error: ' . $e->getMessage(), ['status' => 500]);
    }
}

// --- Tool & User Callbacks ---
function get_myddpc_vehicle_dimensions_callback( WP_REST_Request $request ) {
    global $wpdb;
    $params = $request->get_params();
    $year  = isset($params['year']) ? sanitize_text_field($params['year']) : null;
    $make  = isset($params['make']) ? sanitize_text_field($params['make']) : null;
    $model = isset($params['model']) ? sanitize_text_field($params['model']) : null;
    $trim  = isset($params['trim']) ? sanitize_text_field($params['trim']) : null;

    if ( ! $year || ! $make || ! $model || ! $trim ) {
        return new WP_Error( 'bad_request', 'Missing required parameters (Year, Make, Model, Trim).', [ 'status' => 400 ] );
    }

    $query = $wpdb->prepare(
        "SELECT `Length (in)`, `Width (in)`, `Height (in)`, `Wheelbase (in)`, `Ground clearance (in)`, `Turning circle (ft)`, `Angle of approach (degrees)`, `Angle of departure (degrees)`, `Doors`, `Body type`, `Front track (in)`, `Rear track (in)`
        FROM {$wpdb->prefix}vehicle_data WHERE `Year` = %d AND `Make` = %s AND `Model` = %s AND `Trim` = %s",
        $year, $make, $model, $trim
    );
    $result = $wpdb->get_row( $query, ARRAY_A );

    return $result ? new WP_REST_Response( $result, 200 ) : new WP_REST_Response( [], 404 );
}

function get_myddpc_distinct_years_callback() {
    global $wpdb;
    $results = $wpdb->get_col("SELECT DISTINCT `Year` FROM {$wpdb->prefix}vehicle_data ORDER BY `Year` DESC");
    return new WP_REST_Response( $results, 200 );
}

function get_myddpc_distinct_makes_callback( WP_REST_Request $request ) {
    global $wpdb;
    $year = $request->get_param('year');
    if (!$year) return new WP_Error( 'bad_request', 'Year is required.', [ 'status' => 400 ] );
    $query = $wpdb->prepare("SELECT DISTINCT `Make` FROM {$wpdb->prefix}vehicle_data WHERE `Year` = %d ORDER BY `Make` ASC", $year);
    $results = $wpdb->get_col($query);
    return new WP_REST_Response( $results, 200 );
}

function get_myddpc_distinct_models_callback( WP_REST_Request $request ) {
    global $wpdb;
    $year = $request->get_param('year');
    $make = $request->get_param('make');
    if (!$year || !$make) return new WP_Error( 'bad_request', 'Year and Make are required.', [ 'status' => 400 ] );
    $query = $wpdb->prepare("SELECT DISTINCT `Model` FROM {$wpdb->prefix}vehicle_data WHERE `Year` = %d AND `Make` = %s ORDER BY `Model` ASC", $year, $make);
    $results = $wpdb->get_col($query);
    return new WP_REST_Response( $results, 200 );
}

function get_myddpc_distinct_trims_callback( WP_REST_Request $request ) {
    global $wpdb;
    $year = $request->get_param('year');
    $make = $request->get_param('make');
    $model = $request->get_param('model');
    if (!$year || !$make || !$model) return new WP_Error( 'bad_request', 'Year, Make, and Model are required.', [ 'status' => 400 ] );
    $query = $wpdb->prepare("SELECT DISTINCT `Trim` FROM {$wpdb->prefix}vehicle_data WHERE `Year` = %d AND `Make` = %s AND `Model` = %s ORDER BY `Trim` ASC", $year, $make, $model);
    $results = $wpdb->get_col($query);
    return new WP_REST_Response( $results, 200 );
}

function get_myddpc_performance_data_callback( WP_REST_Request $request ) {
    global $wpdb;
    $params = $request->get_params();
    $year  = isset($params['year']) ? sanitize_text_field($params['year']) : null;
    $make  = isset($params['make']) ? sanitize_text_field($params['make']) : null;
    $model = isset($params['model']) ? sanitize_text_field($params['model']) : null;
    $trim  = isset($params['trim']) ? sanitize_text_field($params['trim']) : null;

    if ( ! $year || ! $make || ! $model || ! $trim ) {
        return new WP_Error( 'bad_request', 'Missing required parameters.', [ 'status' => 400 ] );
    }
    $query = $wpdb->prepare( "SELECT `Horsepower (HP)`, `Torque (ft-lbs)`, `EPA combined MPG`, `EPA combined MPGe` FROM {$wpdb->prefix}vehicle_data WHERE `Year` = %d AND `Make` = %s AND `Model` = %s AND `Trim` = %s", $year, $make, $model, $trim );
    $result = $wpdb->get_row( $query, ARRAY_A );
    return $result ? new WP_REST_Response( $result, 200 ) : new WP_REST_Response( [], 404 );
}

function get_myddpc_discover_filters_callback($request) {
    if (!class_exists('Discover_Query')) return new WP_Error('class_not_found', 'Discover Query class is missing.', ['status' => 500]);
    $query = new Discover_Query();
    return new WP_REST_Response($query->get_discover_filter_options(), 200);
}

function get_myddpc_discover_results_callback($request) {
    if (!class_exists('Discover_Query')) return new WP_Error('class_not_found', 'Discover Query class is missing.', ['status' => 500]);
    $params = $request->get_json_params();
    $query = new Discover_Query();
    $results = $query->get_discover_results(
        $params['filters'] ?? [],
        $params['limit'] ?? 25,
        $params['offset'] ?? 0,
        $params['sort_by'] ?? 'Year',
        $params['sort_dir'] ?? 'desc'
    );
    return new WP_REST_Response($results, 200);
}

function get_myddpc_discover_vehicle_details_callback($request){
    if (!class_exists('Discover_Query')) return new WP_Error('class_not_found', 'Discover Query class is missing.', ['status' => 500]);
    $id = (int) $request['id'];
    $vehicle_data = Discover_Query::get_vehicle_by_id($id);
    if (empty($vehicle_data)) {
        return new WP_Error('not_found', 'Vehicle not found.', ['status' => 404]);
    }
    return new WP_REST_Response($vehicle_data, 200);
}

function get_myddpc_model_trims_callback($request) {
    if (!class_exists('Discover_Query')) return new WP_Error('class_not_found', 'Discover Query class is missing.', ['status' => 500]);
    
    $params = $request->get_params();
    $year = isset($params['year']) ? (int) $params['year'] : null;
    $make = isset($params['make']) ? sanitize_text_field($params['make']) : null;
    $model = isset($params['model']) ? sanitize_text_field($params['model']) : null;
    
    if (!$year || !$make || !$model) {
        return new WP_Error('bad_request', 'Year, Make, and Model are required.', ['status' => 400]);
    }
    
    $query = new Discover_Query();
    $trims = $query->get_model_trims($year, $make, $model);
    
    if (empty($trims)) {
        return new WP_Error('not_found', 'No trims found for this model.', ['status' => 404]);
    }
    
    return new WP_REST_Response([
        'model_info' => [
            'year' => $year,
            'make' => $make,
            'model' => $model,
            'trim_count' => count($trims)
        ],
        'trims' => $trims
    ], 200);
}

function myddpc_handle_user_registration(WP_REST_Request $request) {
    $params = $request->get_json_params();
    $email = sanitize_email($params['email']);
    $username = sanitize_user($params['username']);
    $password = $params['password'];

    if (empty($email) || !is_email($email)) return new WP_Error('invalid_email', 'Invalid email address.', ['status' => 400]);
    if (empty($username)) return new WP_Error('invalid_username', 'Username is required.', ['status' => 400]);
    if (empty($password)) return new WP_Error('invalid_password', 'Password is required.', ['status' => 400]);
    if (username_exists($username)) return new WP_Error('username_exists', 'Username already exists.', ['status' => 409]);
    if (email_exists($email)) return new WP_Error('email_exists', 'Email address is already in use.', ['status' => 409]);

    $user_id = wp_create_user($username, $password, $email);
    if (is_wp_error($user_id)) return new WP_Error('registration_failed', $user_id->get_error_message(), ['status' => 500]);

    $creds = ['user_login' => $username, 'user_password' => $password, 'remember' => true];
    $user = wp_signon($creds);
    if (is_wp_error($user)) return new WP_Error('login_failed_after_reg', $user->get_error_message(), ['status' => 500]);
    
    wp_set_current_user($user->ID);
    wp_set_auth_cookie($user->ID, true);

    return new WP_REST_Response([
        'success' => true, 
        'message' => 'Registration successful.',
        'user' => [
            'id' => $user->ID,
            'username' => $user->user_login,
            'displayName' => $user->display_name,
            'email' => $user->user_email,
        ]
    ], 200);
}

function myddpc_handle_user_login(WP_REST_Request $request) {
    $params = $request->get_json_params();
    $username = $params['username'];
    $password = $params['password'];
    $creds = ['user_login' => $username, 'user_password' => $password, 'remember' => true];
    $user = wp_signon($creds, false);

    if (is_wp_error($user)) return new WP_Error('login_failed', 'Invalid username or password.', ['status' => 403]);

    wp_set_current_user($user->ID);
    wp_set_auth_cookie($user->ID, true);
    
    return new WP_REST_Response([
        'success' => true, 
        'user' => [
            'id' => $user->ID,
            'username' => $user->user_login,
            'displayName' => $user->display_name,
            'email' => $user->user_email,
        ]
    ], 200);
}

// === GARAGE LIMITS & PERMISSIONS ===
function myddpc_get_user_garage_limit_and_permission($user_id = null) {
    if (!$user_id) $user_id = get_current_user_id();
    $user = get_userdata($user_id);
    if (!$user) return ['limit' => 0, 'can_use' => false, 'role' => null];
    $roles = (array) $user->roles;
    if (in_array('administrator', $roles) || in_array('keymaster', $roles)) {
        return ['limit' => -1, 'can_use' => true, 'role' => 'admin']; // unlimited
    }
    // All other signed-in users get 2 slots
    return ['limit' => 2, 'can_use' => true, 'role' => $roles ? $roles[0] : null];
}

// --- Garage & Build List Callbacks ---

function myddpc_get_garage_vehicles_callback() {
    global $wpdb;
    
    try {
        // Add error logging
        error_log('MyDDPC: Garage vehicles callback started');
        
        // Test basic database connection first
        $test_result = $wpdb->get_var("SELECT 1");
        if ($test_result !== '1') {
            error_log('MyDDPC: Database connection failed');
            return new WP_REST_Response([
                'garage_limit' => 2,
                'garage_count' => 0,
                'can_add_more' => true,
                'role' => 'user',
                'vehicles' => [],
                'error' => 'Database connection failed',
                'debug_info' => [
                    'db_test_result' => $test_result,
                    'last_error' => $wpdb->last_error
                ]
            ], 200);
        }
        
        $user_id = get_current_user_id();
        if (!$user_id) {
            error_log('MyDDPC: No user ID found');
            return new WP_Error('not_authenticated', 'User not authenticated.', ['status' => 401]);
        }
    
    $perm = myddpc_get_user_garage_limit_and_permission($user_id);
    if (!$perm['can_use']) {
        return new WP_REST_Response([
            'error' => 'not_allowed',
            'message' => 'You do not have permission to use the garage.',
            'garage_limit' => $perm['limit'],
            'garage_count' => 0,
            'can_add_more' => false,
            'vehicles' => [],
        ], 200);
    }

    // Use the correct table names based on the creation functions
    $garage_table = $wpdb->prefix . 'user_garage';
    $builds_table = $wpdb->prefix . 'user_garage_builds';
    $vehicle_data_table = $wpdb->prefix . 'vehicle_data';
    
    error_log('MyDDPC: Checking tables - garage: ' . $garage_table . ', builds: ' . $builds_table . ', vehicle_data: ' . $vehicle_data_table);
    
    // Check if garage table exists
    if ($wpdb->get_var("SHOW TABLES LIKE '$garage_table'") != $garage_table) {
        error_log('MyDDPC: Garage table does not exist, creating...');
        // Table doesn't exist, create it
        myddpc_create_garage_table_if_not_exists();
    } else {
        error_log('MyDDPC: Garage table exists');
        // Table exists, but check if we need to add missing columns
        $columns_to_check = [
            'status' => "ALTER TABLE {$garage_table} ADD COLUMN status VARCHAR(50) DEFAULT 'operational'",
            'vehicle_type' => "ALTER TABLE {$garage_table} ADD COLUMN vehicle_type VARCHAR(50) DEFAULT 'Personal'",
            'mileage' => "ALTER TABLE {$garage_table} ADD COLUMN mileage INT DEFAULT NULL",
            'vin' => "ALTER TABLE {$garage_table} ADD COLUMN vin VARCHAR(50) DEFAULT NULL",
            'engine_code' => "ALTER TABLE {$garage_table} ADD COLUMN engine_code VARCHAR(50) DEFAULT NULL",
            'drivetrain' => "ALTER TABLE {$garage_table} ADD COLUMN drivetrain VARCHAR(50) DEFAULT NULL",
            'exterior_color' => "ALTER TABLE {$garage_table} ADD COLUMN exterior_color VARCHAR(100) DEFAULT NULL",
            'interior_color' => "ALTER TABLE {$garage_table} ADD COLUMN interior_color VARCHAR(100) DEFAULT NULL",
            'production_date' => "ALTER TABLE {$garage_table} ADD COLUMN production_date DATE DEFAULT NULL",
            'purchase_date' => "ALTER TABLE {$garage_table} ADD COLUMN purchase_date DATE DEFAULT NULL",
            'purchase_price' => "ALTER TABLE {$garage_table} ADD COLUMN purchase_price DECIMAL(10,2) DEFAULT NULL",
            'purchased_from' => "ALTER TABLE {$garage_table} ADD COLUMN purchased_from VARCHAR(255) DEFAULT NULL",
            'purchase_mileage' => "ALTER TABLE {$garage_table} ADD COLUMN purchase_mileage INT DEFAULT NULL",
            'service_intervals' => "ALTER TABLE {$garage_table} ADD COLUMN service_intervals JSON DEFAULT NULL",
            'last_service' => "ALTER TABLE {$garage_table} ADD COLUMN last_service JSON DEFAULT NULL"
        ];
        
        foreach ($columns_to_check as $column => $sql) {
            $column_exists = $wpdb->get_var("SHOW COLUMNS FROM {$garage_table} LIKE '{$column}'");
            if (!$column_exists) {
                error_log("MyDDPC: Adding missing column {$column} to garage table");
                $wpdb->query($sql);
            }
        }
    }
    
    // Check if builds table exists
    if ($wpdb->get_var("SHOW TABLES LIKE '$builds_table'") != $builds_table) {
        // Table doesn't exist, create it
        myddpc_create_build_table_if_not_exists();
    }
    
    // Check if saved vehicles table exists
    $saved_table = $wpdb->prefix . 'user_saved_vehicles';
    if ($wpdb->get_var("SHOW TABLES LIKE '$saved_table'") != $saved_table) {
        // Table doesn't exist, create it
        myddpc_create_saved_vehicles_table_if_not_exists();
    }

    // Start with basic garage data first - select all available columns
    $query = $wpdb->prepare("
        SELECT
            g.garage_id,
            g.nickname AS name,
            g.custom_image_url,
            g.vehicle_data_id,
            COALESCE(g.status, 'operational') AS status,
            COALESCE(g.vehicle_type, 'Personal') AS type,
            g.mileage,
            g.vin,
            g.engine_code,
            g.drivetrain,
            g.exterior_color,
            g.interior_color,
            g.production_date,
            g.purchase_date,
            g.purchase_price,
            g.purchased_from,
            g.purchase_mileage,
            g.service_intervals,
            g.last_service,
            v.Year,
            v.Make,
            v.Model,
            v.Trim
        FROM
            {$garage_table} g
        LEFT JOIN
            {$vehicle_data_table} v ON g.vehicle_data_id = v.id
        WHERE
            g.user_id = %d
    ", $user_id);

    error_log('MyDDPC: Executing query for user ' . $user_id);
    $results = $wpdb->get_results($query, ARRAY_A);

    if ($wpdb->last_error) {
        error_log('MyDDPC: Database error: ' . $wpdb->last_error);
        return new WP_Error('db_error', 'Database error: ' . $wpdb->last_error, ['status' => 500]);
    }
    
    error_log('MyDDPC: Query successful, found ' . count($results) . ' vehicles');

    // Now get build counts and investments for each vehicle
    foreach ($results as &$vehicle) {
        $garage_id = intval($vehicle['garage_id']);
        
        // Get modifications count
        $modifications = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$builds_table} WHERE garage_entry_id = %d", 
            $garage_id
        ));
        
        // Get all completed builds for this vehicle
        $completed_builds = $wpdb->get_results($wpdb->prepare(
            "SELECT items_data FROM {$builds_table} WHERE garage_entry_id = %d AND status = 'complete'",
            $garage_id
        ), ARRAY_A);
        $investment = 0;
        foreach ($completed_builds as $build) {
            if (!empty($build['items_data'])) {
                $items = json_decode($build['items_data'], true);
                if (is_array($items)) {
                    foreach ($items as $item) {
                        if (isset($item['cost']) && is_numeric($item['cost'])) {
                            $investment += floatval($item['cost']);
                        }
                    }
                }
            }
        }
        
        // Process and clean up data - use actual values from database or defaults
        $vehicle['garage_id'] = $garage_id;
        $vehicle['mileage'] = isset($vehicle['mileage']) ? intval($vehicle['mileage']) : null;
        $vehicle['modifications'] = intval($modifications);
        $vehicle['totalInvested'] = $investment ? floatval($investment) : 0;
        $vehicle['status'] = isset($vehicle['status']) ? $vehicle['status'] : 'operational';
        $vehicle['type'] = isset($vehicle['type']) ? $vehicle['type'] : 'Personal';
        $vehicle['vin'] = isset($vehicle['vin']) ? $vehicle['vin'] : null;
        $vehicle['engine_code'] = isset($vehicle['engine_code']) ? $vehicle['engine_code'] : null;
        $vehicle['drivetrain'] = isset($vehicle['drivetrain']) ? $vehicle['drivetrain'] : null;
        $vehicle['exterior_color'] = isset($vehicle['exterior_color']) ? $vehicle['exterior_color'] : null;
        $vehicle['interior_color'] = isset($vehicle['interior_color']) ? $vehicle['interior_color'] : null;
        $vehicle['production_date'] = isset($vehicle['production_date']) ? $vehicle['production_date'] : null;
        $vehicle['purchase_date'] = isset($vehicle['purchase_date']) ? $vehicle['purchase_date'] : null;
        $vehicle['purchase_price'] = isset($vehicle['purchase_price']) ? floatval($vehicle['purchase_price']) : null;
        $vehicle['purchased_from'] = isset($vehicle['purchased_from']) ? $vehicle['purchased_from'] : null;
        $vehicle['purchase_mileage'] = isset($vehicle['purchase_mileage']) ? intval($vehicle['purchase_mileage']) : null;
        
        // Process JSON fields
        if (!empty($vehicle['service_intervals'])) {
            $vehicle['service_intervals'] = json_decode($vehicle['service_intervals'], true);
        } else {
            $vehicle['service_intervals'] = [
                'oil_change' => 5000,
                'brake_fluid' => 24000,
                'transmission' => 60000,
                'coolant' => 60000
            ];
        }
        
        if (!empty($vehicle['last_service'])) {
            $vehicle['last_service'] = json_decode($vehicle['last_service'], true);
        } else {
            $vehicle['last_service'] = [
                'oil_change' => '',
                'brake_fluid' => '',
                'transmission' => '',
                'coolant' => ''
            ];
        }
        
        // Add vehicle_id for frontend image lookup
        $vehicle['vehicle_id'] = $vehicle['vehicle_data_id'];
        // Remove vehicle_data_id from output as it's internal
        unset($vehicle['vehicle_data_id']);
    }

    $garage_count = count($results);
    $can_add_more = ($perm['limit'] === -1) ? true : ($garage_count < $perm['limit']);
    return new WP_REST_Response([
        'garage_limit' => $perm['limit'],
        'garage_count' => $garage_count,
        'can_add_more' => $can_add_more,
        'role' => $perm['role'],
        'vehicles' => $results,
    ], 200);
    
    } catch (Exception $e) {
        error_log('MyDDPC: Exception in garage vehicles callback: ' . $e->getMessage());
        error_log('MyDDPC: Exception trace: ' . $e->getTraceAsString());
        
        // Return a safe fallback response instead of an error
        return new WP_REST_Response([
            'garage_limit' => 2,
            'garage_count' => 0,
            'can_add_more' => true,
            'role' => 'user',
            'vehicles' => [],
            'error' => 'Database error occurred, but continuing with empty garage',
            'debug_info' => [
                'exception' => $e->getMessage(),
                'user_id' => get_current_user_id(),
                'is_logged_in' => is_user_logged_in()
            ]
        ], 200);
    }
}

function myddpc_add_garage_vehicle_callback(WP_REST_Request $request) {
    global $wpdb;
    $user_id = get_current_user_id();
    $perm = myddpc_get_user_garage_limit_and_permission($user_id);
    if (!$perm['can_use']) {
        return new WP_Error('not_allowed', 'You do not have permission to use the garage.', ['status' => 403]);
    }
    $params = $request->get_json_params();
    $table_name = $wpdb->prefix . 'user_garage';
    if (empty($params['vehicle_id']) || empty($params['nickname'])) {
        return new WP_Error('bad_request', 'Vehicle ID and nickname are required.', ['status' => 400]);
    }
    $vehicle_data_id = absint($params['vehicle_id']);
    $nickname = sanitize_text_field($params['nickname']);
    // ENFORCE: Only allow adding from saved list
    $saved_table = $wpdb->prefix . 'user_saved_vehicles';
    $is_saved = $wpdb->get_var($wpdb->prepare(
        "SELECT saved_id FROM $saved_table WHERE user_id = %d AND vehicle_id = %d",
        $user_id, $vehicle_data_id
    ));
    if (!$is_saved) {
        return new WP_Error('not_saved', 'You can only add vehicles from your saved list.', ['status' => 403]);
    }
    // ENFORCE: Limit for members
    $garage_count = $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM $table_name WHERE user_id = %d", $user_id));
    if ($perm['limit'] !== -1 && $garage_count >= $perm['limit']) {
        return new WP_Error('limit_reached', 'You have reached your garage limit.', ['status' => 403]);
    }
    $existing = $wpdb->get_var($wpdb->prepare( "SELECT garage_id FROM $table_name WHERE user_id = %d AND vehicle_data_id = %d", $user_id, $vehicle_data_id ));
    if ($existing) {
        return new WP_Error('vehicle_exists', 'This vehicle is already in your garage.', ['status' => 409]);
    }
    $result = $wpdb->insert($table_name, [ 'user_id' => $user_id, 'vehicle_data_id' => $vehicle_data_id, 'nickname' => $nickname, 'date_added' => current_time('mysql'), ]);
    if ($result === false) {
        return new WP_Error('db_error', 'Could not add vehicle to garage.', ['status' => 500]);
    }
    return new WP_REST_Response(['success' => true, 'message' => 'Vehicle added to garage.', 'garage_id' => $wpdb->insert_id], 201);
}

function myddpc_update_garage_vehicle_callback(WP_REST_Request $request) {
    global $wpdb;
    $user_id = get_current_user_id();
    $perm = myddpc_get_user_garage_limit_and_permission($user_id);
    if (!$perm['can_use']) {
        return new WP_Error('not_allowed', 'You do not have permission to use the garage.', ['status' => 403]);
    }
    $params = $request->get_json_params();
    $table_name = $wpdb->prefix . 'user_garage';

    if (empty($params['garage_id'])) {
        return new WP_Error('bad_request', 'Garage ID is required.', ['status' => 400]);
    }

    $garage_id = absint($params['garage_id']);

    // Verify ownership
    $owner_id = $wpdb->get_var($wpdb->prepare("SELECT user_id FROM $table_name WHERE garage_id = %d", $garage_id));
    if ($owner_id != $user_id) {
        return new WP_Error('permission_denied', 'You do not have permission to edit this vehicle.', ['status' => 403]);
    }

    // Build dynamic update arrays
    $update_data = [];
    $update_format = [];

    if (isset($params['nickname'])) {
        $update_data['nickname'] = sanitize_text_field($params['nickname']);
        $update_format[] = '%s';
    }
    if (isset($params['status'])) {
        $update_data['status'] = sanitize_text_field($params['status']);
        $update_format[] = '%s';
    }
    if (isset($params['type'])) {
        $update_data['vehicle_type'] = sanitize_text_field($params['type']);
        $update_format[] = '%s';
    }
    if (isset($params['mileage'])) {
        $update_data['mileage'] = absint($params['mileage']);
        $update_format[] = '%d';
    }
    if (isset($params['vin'])) {
        $update_data['vin'] = sanitize_text_field($params['vin']);
        $update_format[] = '%s';
    }
    if (isset($params['engine_code'])) {
        $update_data['engine_code'] = sanitize_text_field($params['engine_code']);
        $update_format[] = '%s';
    }
    if (isset($params['drivetrain'])) {
        $update_data['drivetrain'] = sanitize_text_field($params['drivetrain']);
        $update_format[] = '%s';
    }
    if (isset($params['exterior_color'])) {
        $update_data['exterior_color'] = sanitize_text_field($params['exterior_color']);
        $update_format[] = '%s';
    }
    if (isset($params['interior_color'])) {
        $update_data['interior_color'] = sanitize_text_field($params['interior_color']);
        $update_format[] = '%s';
    }
    if (isset($params['production_date'])) {
        $update_data['production_date'] = sanitize_text_field($params['production_date']);
        $update_format[] = '%s';
    }
    if (isset($params['purchase_date'])) {
        $update_data['purchase_date'] = sanitize_text_field($params['purchase_date']);
        $update_format[] = '%s';
    }
    if (isset($params['purchase_price'])) {
        $update_data['purchase_price'] = floatval($params['purchase_price']);
        $update_format[] = '%f';
    }
    if (isset($params['purchased_from'])) {
        $update_data['purchased_from'] = sanitize_text_field($params['purchased_from']);
        $update_format[] = '%s';
    }
    if (isset($params['purchase_mileage'])) {
        $update_data['purchase_mileage'] = absint($params['purchase_mileage']);
        $update_format[] = '%d';
    }
    if (isset($params['service_intervals'])) {
        $update_data['service_intervals'] = json_encode($params['service_intervals']);
        $update_format[] = '%s';
    }
    if (isset($params['last_service'])) {
        $update_data['last_service'] = json_encode($params['last_service']);
        $update_format[] = '%s';
    }
    // ADDED: Handle custom_image_url update
    if (isset($params['custom_image_url'])) {
        $update_data['custom_image_url'] = esc_url_raw($params['custom_image_url']);
        $update_format[] = '%s';
    }

    if (empty($update_data)) {
        return new WP_Error('no_data', 'No data provided to update.', ['status' => 400]);
    }

    $result = $wpdb->update($table_name, $update_data, ['garage_id' => $garage_id], $update_format, ['%d']);

    if ($result === false) {
        return new WP_Error('db_error', 'Could not update vehicle information.', ['status' => 500]);
    }

    return new WP_REST_Response(['success' => true, 'message' => 'Vehicle updated successfully.'], 200);
}

function myddpc_delete_garage_vehicle_callback(WP_REST_Request $request) {
    global $wpdb;
    $user_id = get_current_user_id();
    $perm = myddpc_get_user_garage_limit_and_permission($user_id);
    if (!$perm['can_use']) {
        return new WP_Error('not_allowed', 'You do not have permission to use the garage.', ['status' => 403]);
    }
    $params = $request->get_json_params();
    $garage_table = $wpdb->prefix . 'user_garage';
    $builds_table = $wpdb->prefix . 'user_garage_builds';

    if (empty($params['garage_id'])) { return new WP_Error('bad_request', 'Garage ID is required.', ['status' => 400]); }
    $garage_id = absint($params['garage_id']);
    $owner_id = $wpdb->get_var($wpdb->prepare("SELECT user_id FROM $garage_table WHERE garage_id = %d", $garage_id));
    if ($owner_id != $user_id) { return new WP_Error('permission_denied', 'You do not have permission to delete this vehicle.', ['status' => 403]); }
    
    $wpdb->delete($builds_table, ['garage_entry_id' => $garage_id]);
    $result = $wpdb->delete($garage_table, ['garage_id' => $garage_id]);

    if ($result === false) { return new WP_Error('db_error', 'Could not delete vehicle.', ['status' => 500]); }
    return new WP_REST_Response(['success' => true, 'message' => 'Vehicle deleted successfully.'], 200);
}

function myddpc_get_build_list_callback(WP_REST_Request $request) {
    global $wpdb;
    $user_id = get_current_user_id();
    $perm = myddpc_get_user_garage_limit_and_permission($user_id);
    if (!$perm['can_use']) {
        return new WP_Error('not_allowed', 'You do not have permission to use the garage.', ['status' => 403]);
    }
    $garage_id = absint($request['garage_id']);
    $garage_table = $wpdb->prefix . 'user_garage';
    $builds_table = $wpdb->prefix . 'user_garage_builds';

    $owner_id = $wpdb->get_var($wpdb->prepare("SELECT user_id FROM $garage_table WHERE garage_id = %d", $garage_id));
    if ($owner_id != $user_id) { return new WP_Error('permission_denied', 'Access denied.', ['status' => 403]); }

    $results = $wpdb->get_results($wpdb->prepare("SELECT * FROM $builds_table WHERE garage_entry_id = %d ORDER BY installation_date DESC, date_modified DESC", $garage_id), ARRAY_A);
    foreach($results as &$row) {
        if (!empty($row['items_data'])) {
            $row['items_data'] = json_decode($row['items_data'], true);
        }
    }
    return new WP_REST_Response($results, 200);
}

function myddpc_save_build_job_callback(WP_REST_Request $request) {
    global $wpdb;
    $user_id = get_current_user_id();
    $perm = myddpc_get_user_garage_limit_and_permission($user_id);
    if (!$perm['can_use']) {
        return new WP_Error('not_allowed', 'You do not have permission to use the garage.', ['status' => 403]);
    }
    $params = $request->get_json_params();
    $builds_table = $wpdb->prefix . 'user_garage_builds';

    $data = [
        'garage_entry_id'     => isset($params['garage_id']) ? absint($params['garage_id']) : null,
        'job_title'           => isset($params['job_title']) ? sanitize_text_field($params['job_title']) : null,
        'job_type'            => isset($params['job_type']) ? sanitize_text_field($params['job_type']) : 'aftermarket_upgrade',
        'status'              => isset($params['status']) ? sanitize_text_field($params['status']) : 'planned',
        'installation_date'   => isset($params['installation_date']) ? sanitize_text_field($params['installation_date']) : null,
        'installation_method' => isset($params['installation_method']) ? sanitize_text_field($params['installation_method']) : 'diy',
        'primary_link'        => isset($params['primary_link']) ? esc_url_raw($params['primary_link']) : null,
        'job_notes'           => isset($params['job_notes']) ? sanitize_textarea_field($params['job_notes']) : null,
        'items_data'          => isset($params['items_data']) ? wp_json_encode($params['items_data']) : null,
    ];

    if (empty($data['garage_entry_id']) || empty($data['job_title'])) { 
        return new WP_Error('bad_request', 'Garage ID and Job Title are required.', ['status' => 400]); 
    }
    
    // Verify ownership using garage table
    $garage_table = $wpdb->prefix . 'user_garage';
    $owner_id = $wpdb->get_var($wpdb->prepare("SELECT user_id FROM $garage_table WHERE garage_id = %d", $data['garage_entry_id']));
    if ($owner_id != $user_id) { 
        return new WP_Error('permission_denied', 'Access denied.', ['status' => 403]); 
    }

    if (isset($params['build_entry_id']) && !empty($params['build_entry_id'])) {
        // Update existing job
        $build_entry_id = absint($params['build_entry_id']);
        $data['date_modified'] = current_time('mysql'); // Use your column name
        $result = $wpdb->update($builds_table, $data, ['build_entry_id' => $build_entry_id]);
        if ($result === false) {
            error_log('MyDDPC: Update build job failed. Error: ' . $wpdb->last_error);
            return new WP_Error('db_error', 'Could not update build job. DB Error: ' . $wpdb->last_error, ['status' => 500]);
        }
        $message = 'Build job updated.';
    } else {
        // Insert new job
        $data['date_modified'] = current_time('mysql'); // Use your column name instead of date_added
        $result = $wpdb->insert($builds_table, $data);
        if ($result === false) {
            error_log('MyDDPC: Insert build job failed. Error: ' . $wpdb->last_error);
            return new WP_Error('db_error', 'Could not save build job. DB Error: ' . $wpdb->last_error, ['status' => 500]);
        }
        $build_entry_id = $wpdb->insert_id;
        $message = 'Build job added.';
    }

    return new WP_REST_Response(['success' => true, 'message' => $message, 'build_entry_id' => $build_entry_id], 200);
}

function myddpc_delete_build_job_callback(WP_REST_Request $request) {
    global $wpdb;
    $user_id = get_current_user_id();
    $perm = myddpc_get_user_garage_limit_and_permission($user_id);
    if (!$perm['can_use']) {
        return new WP_Error('not_allowed', 'You do not have permission to use the garage.', ['status' => 403]);
    }
    $params = $request->get_json_params();
    $builds_table = $wpdb->prefix . 'user_garage_builds';

    if (empty($params['build_entry_id'])) { return new WP_Error('bad_request', 'Build Entry ID is required.', ['status' => 400]); }
    $build_entry_id = absint($params['build_entry_id']);

    // Verify ownership by joining with garage table
    $garage_table = $wpdb->prefix . 'user_garage';
    $owner_id = $wpdb->get_var($wpdb->prepare("SELECT g.user_id FROM $builds_table b JOIN $garage_table g ON b.garage_entry_id = g.garage_id WHERE b.build_entry_id = %d", $build_entry_id));
    if ($owner_id != $user_id) { return new WP_Error('permission_denied', 'You do not have permission to delete this job.', ['status' => 403]); }

    $result = $wpdb->delete($builds_table, ['build_entry_id' => $build_entry_id]);
    if ($result === false) { return new WP_Error('db_error', 'Could not delete build job.', ['status' => 500]); }
    return new WP_REST_Response(['success' => true, 'message' => 'Build job deleted.'], 200);
}

/**
 * **NEW**: Calculates and retrieves all key metrics for the Garage Operations dashboard.
 */
function myddpc_get_garage_metrics_callback(WP_REST_Request $request) {
    global $wpdb;
    $user_id = get_current_user_id();
    $garage_table = $wpdb->prefix . 'user_garage';
    $builds_table = $wpdb->prefix . 'user_garage_builds';

    // 1. Get all garage IDs for the current user
    $garage_ids = $wpdb->get_col($wpdb->prepare("SELECT garage_id FROM $garage_table WHERE user_id = %d", $user_id));

    if (empty($garage_ids)) {
        return new WP_REST_Response([
            'active_vehicles' => 0,
            'open_tasks' => 0,
            'total_investment' => 0,
            'avg_completion' => 0,
        ], 200);
    }

    $garage_ids_placeholder = implode(',', array_fill(0, count($garage_ids), '%d'));

    // 2. Get all build jobs for those garage IDs
    $all_jobs = $wpdb->get_results($wpdb->prepare("SELECT status, items_data FROM $builds_table WHERE garage_entry_id IN ($garage_ids_placeholder)", ...$garage_ids), ARRAY_A);

    // 3. Calculate metrics from the results
    $open_tasks = 0;
    $completed_tasks = 0;
    $total_investment = 0;

    foreach ($all_jobs as $job) {
        if ($job['status'] !== 'complete') {
            $open_tasks++;
        } else {
            $completed_tasks++;
            if (!empty($job['items_data'])) {
                $items = json_decode($job['items_data'], true);
                if (is_array($items)) {
                    foreach ($items as $item) {
                        if (isset($item['cost']) && is_numeric($item['cost'])) {
                            $total_investment += floatval($item['cost']);
                        }
                    }
                }
            }
        }
    }

    $total_tasks = $open_tasks + $completed_tasks;
    $avg_completion = ($total_tasks > 0) ? round(($completed_tasks / $total_tasks) * 100) : 0;

    $metrics = [
        'active_vehicles' => count($garage_ids),
        'open_tasks' => $open_tasks,
        'total_investment' => $total_investment,
        'avg_completion' => $avg_completion,
    ];

    return new WP_REST_Response($metrics, 200);
}

// --- SAVED VEHICLES API ---

function myddpc_get_saved_vehicles_callback(WP_REST_Request $request) {
    global $wpdb;
    $user_id = get_current_user_id();
    $saved_table = $wpdb->prefix . 'user_saved_vehicles';
    $vehicle_table = $wpdb->prefix . 'vehicle_data';

    $results = $wpdb->get_results($wpdb->prepare("
        SELECT
            s.saved_id,
            v.ID as vehicle_id,
            v.Year, v.Make, v.Model, v.Trim,
            v.`Engine size (l)` as engine_size,
            v.`Horsepower (HP)` as horsepower,
            v.`Curb weight (lbs)` as weight,
            s.date_added
        FROM {$saved_table} s
        JOIN {$vehicle_table} v ON s.vehicle_id = v.ID
        WHERE s.user_id = %d
        ORDER BY s.date_added DESC
    ", $user_id), ARRAY_A);

    return new WP_REST_Response($results, 200);
}

function myddpc_add_to_saved_vehicles_callback(WP_REST_Request $request) {
    global $wpdb;
    
    $user_id = get_current_user_id();
    
    if (!$user_id) {
        return new WP_Error('not_logged_in', 'User must be logged in.', ['status' => 401]);
    }
    
    // Get JSON params for POST requests
    $params = $request->get_json_params();
    $vehicle_id = isset($params['vehicle_id']) ? $params['vehicle_id'] : null;
    
    if (empty($vehicle_id)) {
        return new WP_Error('bad_request', 'Vehicle ID is required.', ['status' => 400]);
    }

    // Ensure table exists and has correct structure
    myddpc_create_saved_vehicles_table_if_not_exists();
    
    $table_name = $wpdb->prefix . 'user_saved_vehicles';
    
    // Check if vehicle is already saved
    $existing = $wpdb->get_var($wpdb->prepare(
        "SELECT saved_id FROM $table_name WHERE user_id = %d AND vehicle_id = %d",
        $user_id, $vehicle_id
    ));
    
    if ($existing) {
        return new WP_Error('already_saved', 'Vehicle already saved.', ['status' => 409]);
    }
    
    $result = $wpdb->insert(
        $table_name,
        ['user_id' => $user_id, 'vehicle_id' => $vehicle_id],
        ['%d', '%d']
    );

    if ($result === false) {
        return new WP_Error('insert_failed', 'Could not save vehicle: ' . $wpdb->last_error, ['status' => 500]);
    }

    return new WP_REST_Response(['success' => true, 'message' => 'Vehicle saved.'], 201);
}

function myddpc_remove_from_saved_vehicles_callback(WP_REST_Request $request) {
    global $wpdb;
    $user_id = get_current_user_id();
    $saved_id = $request->get_param('id');
     if (empty($saved_id)) {
        return new WP_Error('bad_request', 'Saved ID is required.', ['status' => 400]);
    }

    $table_name = $wpdb->prefix . 'user_saved_vehicles';

    // Security check: ensure the user owns this saved vehicle entry before deleting
    $owner_check = $wpdb->get_var($wpdb->prepare(
        "SELECT user_id FROM $table_name WHERE saved_id = %d", absint($saved_id)
    ));

    if ($owner_check != $user_id) {
        return new WP_Error('permission_denied', 'You do not have permission to remove this item.', ['status' => 403]);
    }

    $result = $wpdb->delete($table_name, ['saved_id' => absint($saved_id)], ['%d']);

    if ($result === false) {
        return new WP_Error('delete_failed', 'Failed to remove vehicle.', ['status' => 500]);
    }

    return new WP_REST_Response(['success' => true, 'message' => 'Vehicle removed from saved list.'], 200);
}

// --- MY ACCOUNT PAGE ---

// 1. Shortcode to render the React app container
function myddpc_account_app_shortcode() {
    // Enqueue the main app script and styles
    wp_enqueue_script('myddpc-react-app');
    wp_enqueue_style('myddpc-react-app-styles');
    // Add the inline script data
    myddpc_add_inline_script_data();
    // This is where our React app will mount
    return '<div id="myddpc-account-app-container"></div>';
}
add_shortcode('myddpc_account_app', 'myddpc_account_app_shortcode');

// Main app shortcode to render the main React app container
function myddpc_main_app_shortcode() {
    // Enqueue the main app script and styles
    wp_enqueue_script('myddpc-react-app');
    wp_enqueue_style('myddpc-react-app-styles');
    // Add the inline script data
    myddpc_add_inline_script_data();
    // This is where our main React app will mount
    return '<div id="myddpc-react-root"></div>';
}
add_shortcode('myddpc_main_app', 'myddpc_main_app_shortcode');

// Helper function to add inline script data for shortcodes
function myddpc_add_inline_script_data() {
    static $script_added = false;
    if ($script_added) return; // Only add once per page
    
    $app_js_path = plugin_dir_path( __FILE__ ) . 'assets/app.js';
    if ( file_exists( $app_js_path ) ) {
        $react_app_code = file_get_contents( $app_js_path );
        $current_user = wp_get_current_user();
        $user_data = null;
        if ( $current_user->exists() ) {
            $user_data = [ 'id' => $current_user->ID, 'username' => $current_user->user_login, 'displayName' => $current_user->display_name, 'email' => $current_user->user_email ];
        }
        $data_object_string = 'const myddpcAppData = ' . json_encode([ 'rest_url' => esc_url_raw( rest_url() ), 'nonce' => wp_create_nonce( 'wp_rest' ), 'is_logged_in' => is_user_logged_in(), 'current_user' => $user_data, 'logout_url' => wp_logout_url( home_url() ) ]);
        
        wp_add_inline_script('myddpc-react-app', $data_object_string . ';' . $react_app_code);
        $script_added = true;
    }
}


// 2. API endpoint to get current user data
function myddpc_get_user_me_callback(WP_REST_Request $request) {
    $user = wp_get_current_user();
    if (!$user->exists()) {
        return new WP_Error('not_logged_in', 'User is not authenticated.', ['status' => 401]);
    }

    $user_data = [
        'username' => $user->user_login,
        'email' => $user->user_email,
        'location' => get_user_meta($user->ID, 'myddpc_location', true),
        'avatar_url' => get_user_meta($user->ID, 'myddpc_avatar_url', true),
        'bio' => get_user_meta($user->ID, 'myddpc_bio', true),
        'member_since' => $user->user_registered,
    ];

    return new WP_REST_Response($user_data, 200);
}


// 3. API endpoint to update user profile (location, avatar)
function myddpc_update_user_profile_callback(WP_REST_Request $request) {
    $user = wp_get_current_user();
    if (!$user->exists()) {
        return new WP_Error('not_logged_in', 'User is not authenticated.', ['status' => 401]);
    }

    $params = $request->get_json_params();

    if (isset($params['location'])) {
        update_user_meta($user->ID, 'myddpc_location', sanitize_text_field($params['location']));
    }

    if (isset($params['bio'])) {
        update_user_meta($user->ID, 'myddpc_bio', sanitize_textarea_field($params['bio']));
    }

    if (isset($params['avatar_url'])) {
        update_user_meta($user->ID, 'myddpc_avatar_url', esc_url_raw($params['avatar_url']));
    }

    return new WP_REST_Response(['success' => true, 'message' => 'Profile updated.'], 200);
}


// 4. API endpoint for changing password
function myddpc_change_password_callback(WP_REST_Request $request) {
    $user = wp_get_current_user();
    if (!$user->exists()) {
        return new WP_Error('not_logged_in', 'User is not authenticated.', ['status' => 401]);
    }

    $params = $request->get_json_params();
    $current_password = $params['current_password'];
    $new_password = $params['new_password'];

    if (!wp_check_password($current_password, $user->user_pass, $user->ID)) {
        return new WP_Error('wrong_password', 'Your current password does not match.', ['status' => 400]);
    }

    wp_set_password($new_password, $user->ID);

    return new WP_REST_Response(['success' => true, 'message' => 'Password changed successfully.'], 200);
}


// 5. Register the new API routes
// Note: User endpoints are now registered in the main myddpc_app_register_rest_routes() function

// Ensure all required tables are created on plugin activation and init
register_activation_hook(__FILE__, 'myddpc_create_saved_vehicles_table_if_not_exists');
add_action('init', 'myddpc_create_saved_vehicles_table_if_not_exists');

// Enqueue styles for the profile page
add_action('wp_enqueue_scripts', 'myddpc_profile_enqueue_assets');
function myddpc_profile_enqueue_assets() {
    if (is_page_template('vehicle-profile.php')) { // Assuming you might use a page template
        wp_enqueue_style(
            'myddpc-vehicle-profile-style',
            plugin_dir_url(__FILE__) . 'assets/css/vehicle-profile.css',
            [],
            '1.0.0'
        );
    }
}

// Function to get all data for a single vehicle
function myddpc_get_vehicle_full_data($vehicle_id) {
    global $wpdb;
    $vehicle_id = intval($vehicle_id);
    if ($vehicle_id <= 0) {
        return null;
    }
    
    // Fetch all columns from the vehicle_data table
    $vehicle_data = $wpdb->get_row(
        $wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}vehicle_data WHERE ID = %d",
            $vehicle_id
        ),
        ARRAY_A
    );
    
    // You can also add your image fetching logic from myddpc-car-lookup.php here
    // For now, we'll just return the main data.

    return $vehicle_data;
}

// Placeholder for 0-60 calculation
function myddpc_calculate_0_60($vehicle_data) {
    // A more sophisticated calculation could be implemented here based on weight, power, etc.
    // This is a simplified placeholder.
    $power_to_weight = $vehicle_data['Horsepower (HP)'] / $vehicle_data['Curb weight (lbs)'];
    if ($power_to_weight > 0.15) return "3.5 - 4.5";
    if ($power_to_weight > 0.1) return "4.5 - 6.0";
    if ($power_to_weight > 0.07) return "6.0 - 8.0";
    return "8.0+";
}

// Add a rewrite rule to handle the new profile page
add_action('init', 'myddpc_vehicle_profile_rewrite_rule');
function myddpc_vehicle_profile_rewrite_rule() {
    add_rewrite_rule(
        '^vehicle/([0-9]+)/?$',
        'index.php?vehicle_id=$matches[1]',
        'top'
    );
}

// Register the vehicle_id query var
add_filter('query_vars', 'myddpc_register_query_vars');
function myddpc_register_query_vars($vars) {
    $vars[] = 'vehicle_id';
    return $vars;
}

// Load the template for the vehicle profile page
add_action('template_include', 'myddpc_profile_template_include');
function myddpc_profile_template_include($template) {
    if (get_query_var('vehicle_id')) {
        $new_template = plugin_dir_path(__FILE__) . 'vehicle-profile.php';
        if (file_exists($new_template)) {
            return $new_template;
        }
    }
    return $template;
}

/**
 * Enhanced REST callback to fetch and structure all vehicle data.
 */
function myddpc_get_full_vehicle_data_callback( WP_REST_Request $request ) {
    global $wpdb;
    $params = $request->get_params();
    $vehicle_id = isset($params['id']) ? absint($params['id']) : 0;

    if ( ! $vehicle_id ) {
        return new WP_Error( 'bad_request', 'Missing required vehicle ID.', [ 'status' => 400 ] );
    }

    $vehicle_data_table = $wpdb->prefix . 'vehicle_data';
    $vehicle_data = $wpdb->get_row( $wpdb->prepare(
        "SELECT * FROM {$vehicle_data_table} WHERE `ID` = %d",
        $vehicle_id
    ), ARRAY_A );

    if ( ! $vehicle_data ) {
        return new WP_Error( 'not_found', 'Vehicle not found.', [ 'status' => 404 ] );
    }

    // --- Structure the data for the new profile page blueprint ---
    
    // Helper to check for null/empty values
    $get_val = function($key) use ($vehicle_data) {
        return isset($vehicle_data[$key]) && !empty($vehicle_data[$key]) ? $vehicle_data[$key] : 'N/A';
    };

    $structured_data = [
        'at_a_glance' => [
            'title' => trim(sprintf('%s %s %s', $get_val('Year'), $get_val('Make'), $get_val('Model'))),
            'trim_desc' => $get_val('Trim (description)'),
            'hero_image' => explode(';', $get_val('Image URL'))[0], // Get first image
            'horsepower' => $get_val('Horsepower (HP)'),
            'torque' => $get_val('Torque (ft-lbs)'),
            'combined_mpg' => $get_val('EPA combined MPG'),
            'drive_type' => ucwords($get_val('Drive type')),
            'transmission' => $get_val('Transmission'),
            'price_range' => $get_val('Used price range'),
            'colors_exterior' => $get_val('Colors exterior'),
            'colors_interior' => $get_val('Colors interior'),
            'pros' => $get_val('Pros'),
            'cons' => $get_val('Cons'),
        ],
        'performance' => [
            'Engine' => [
                'Cylinders' => $get_val('Cylinders'),
                'Engine Size (L)' => $get_val('Engine size (l)'),
                'Horsepower' => sprintf('%s @ %s RPM', $get_val('Horsepower (HP)'), $get_val('Horsepower (rpm)')),
                'Torque' => sprintf('%s ft-lbs @ %s RPM', $get_val('Torque (ft-lbs)'), $get_val('Torque (rpm)')),
                'Engine Type' => ucwords($get_val('Engine type')),
            ],
            'Fuel & Efficiency' => [
                'Fuel Type' => ucwords($get_val('Fuel type')),
                'Fuel Tank Capacity' => $get_val('Fuel tank capacity (gal)') . ' gal',
                'City/Highway MPG' => $get_val('EPA city/highway MPG'),
                'Range (City/Hwy)' => $get_val('Range in miles (city/hwy)'),
            ],
            'Chassis' => [
                'Turning Circle' => $get_val('Turning circle (ft)') . ' ft',
                'Drag Coefficient (Cd)' => $get_val('Drag coefficient (Cd)'),
            ]
        ],
        'dimensions' => [
            'Exterior' => [
                'Length' => $get_val('Length (in)') . ' in',
                'Width' => $get_val('Width (in)') . ' in',
                'Height' => $get_val('Height (in)') . ' in',
                'Wheelbase' => $get_val('Wheelbase (in)') . ' in',
                'Ground Clearance' => $get_val('Ground clearance (in)') . ' in',
            ],
            'Weight & Capacity' => [
                'Curb Weight' => $get_val('Curb weight (lbs)') . ' lbs',
                'Gross Weight' => $get_val('Gross weight (lbs)') . ' lbs',
                'Cargo Capacity' => $get_val('Cargo capacity (cu ft)') . ' cu ft',
                'Max Towing' => $get_val('Maximum towing capacity (lbs)') . ' lbs',
            ],
            'Interior' => [
                'Front Head Room' => $get_val('Front head room (in)') . ' in',
                'Front Leg Room' => $get_val('Front leg room (in)') . ' in',
                'Front Shoulder Room' => $get_val('Front shoulder room (in)') . ' in',
            ]
        ],
        'features' => [
            'Body & Exterior' => [
                'Body Type' => ucwords($get_val('Body type')),
                'Doors' => $get_val('Doors'),
                'Roof and Glass' => $get_val('Roof and glass'),
                'Tires and Wheels' => $get_val('Tires and wheels'),
            ],
            'Convenience' => [
                'Power Features' => $get_val('Power features'),
                'Instrumentation' => $get_val('Instrumentation'),
                'Convenience' => $get_val('Convenience'),
                'Comfort' => $get_val('Comfort'),
            ],
            'Packages' => [
                'Packages' => $get_val('Packages'),
                'Exterior Options' => $get_val('Exterior options'),
                'Interior Options' => $get_val('Interior options'),
            ]
        ],
        'ownership' => [
            'Pricing' => [
                'Base MSRP' => $get_val('Base MSRP'),
                'Base Invoice' => $get_val('Base Invoice'),
                'Used Price Range' => $get_val('Used price range'),
            ],
            'Reviews & Ratings' => [
                'Expert Verdict' => $get_val('Expert rating - Our verdict'),
                'Full Review' => $get_val('Review'),
            ],
            'Safety' => [
                'NHTSA Overall Rating' => $get_val('NHTSA Overall Rating'),
                'Safety Features' => $get_val('Safety features'),
            ],
            'Origin' => [
                'Country of Origin' => $get_val('Country of origin'),
                'Classification' => $get_val('Car classification'),
                'Vehicle ID' => $get_val('ID'),
            ]
        ]
    ];

    return new WP_REST_Response( $structured_data, 200 );
}

/**
 * Community Bridge: Get builds based on a specific vehicle model
 */
function myddpc_get_community_builds_callback( WP_REST_Request $request ) {
    global $wpdb;
    $vehicle_id = absint($request['vehicle_id']);
    
    if ( ! $vehicle_id ) {
        return new WP_Error( 'bad_request', 'Missing required vehicle ID.', [ 'status' => 400 ] );
    }

    // First, get the vehicle data to find matching criteria
    $vehicle_data_table = $wpdb->prefix . 'vehicle_data';
    $vehicle_data = $wpdb->get_row( $wpdb->prepare(
        "SELECT Year, Make, Model, Trim FROM {$vehicle_data_table} WHERE ID = %d",
        $vehicle_id
    ), ARRAY_A );

    if ( ! $vehicle_data ) {
        return new WP_Error( 'not_found', 'Vehicle not found.', [ 'status' => 404 ] );
    }

    // Find garage vehicles that match this model (same year, make, model)
    $garage_table = $wpdb->prefix . 'user_garage';
    $builds_table = $wpdb->prefix . 'user_garage_builds';
    
    $matching_garage_vehicles = $wpdb->get_results( $wpdb->prepare(
        "SELECT g.*, u.display_name as owner_name, u.user_login as owner_username
         FROM {$garage_table} g
         JOIN {$wpdb->users} u ON g.user_id = u.ID
         JOIN {$vehicle_data_table} v ON g.vehicle_data_id = v.ID
         WHERE v.Year = %d AND v.Make = %s AND v.Model = %s
         ORDER BY g.date_added DESC
         LIMIT 10",
        $vehicle_data['Year'],
        $vehicle_data['Make'],
        $vehicle_data['Model']
    ), ARRAY_A );

    if ( empty($matching_garage_vehicles) ) {
        return new WP_REST_Response([
            'has_builds' => false,
            'build_count' => 0,
            'builds' => []
        ], 200 );
    }

    // Get build data for each matching vehicle
    $builds_data = [];
    foreach ( $matching_garage_vehicles as $garage_vehicle ) {
        $builds = $wpdb->get_results( $wpdb->prepare(
            "SELECT * FROM {$builds_table} 
             WHERE garage_entry_id = %d 
             ORDER BY date_added DESC",
            $garage_vehicle['garage_id']
        ), ARRAY_A );

        if ( ! empty($builds) ) {
            $builds_data[] = [
                'garage_vehicle' => [
                    'id' => $garage_vehicle['garage_id'],
                    'nickname' => $garage_vehicle['nickname'],
                    'owner_name' => $garage_vehicle['owner_name'],
                    'owner_username' => $garage_vehicle['owner_username'],
                    'date_added' => $garage_vehicle['date_added'],
                    'total_builds' => count($builds),
                    'completed_builds' => count(array_filter($builds, function($build) {
                        return $build['status'] === 'complete';
                    }))
                ],
                'builds' => array_map(function($build) {
                    return [
                        'id' => $build['build_entry_id'],
                        'title' => $build['job_title'],
                        'type' => $build['job_type'],
                        'status' => $build['status'],
                        'date_added' => $build['date_added'],
                        'installation_date' => $build['installation_date']
                    ];
                }, $builds)
            ];
        }
    }

    return new WP_REST_Response([
        'has_builds' => !empty($builds_data),
        'build_count' => count($builds_data),
        'builds' => $builds_data
    ], 200 );
}

// --- ADD THIS: Function to handle the new shortcode ---
function myddpc_vehicle_profile_shortcode() {
    // This function will simply load the template file.
    // The content will be rendered by React/JS.
    ob_start();
    include_once plugin_dir_path( __FILE__ ) . 'includes/templates/template-vehicle-profile.php';
    return ob_get_clean();
}
add_shortcode( 'myddpc_vehicle_profile', 'myddpc_vehicle_profile_shortcode' );

// --- ADD THIS: Create the profile page on plugin activation ---
function myddpc_create_vehicle_profile_page() {
    // Check if the page already exists
    if ( ! get_page_by_path( 'vehicle-profile' ) ) {
        $page = [
            'post_title'    => 'Vehicle Profile',
            'post_name'     => 'vehicle-profile',
            'post_content'  => '[myddpc_vehicle_profile]',
            'post_status'   => 'publish',
            'post_author'   => 1,
            'post_type'     => 'page',
        ];
        // Insert the page into the database
        wp_insert_post( $page );
    }
}
register_activation_hook( __FILE__, 'myddpc_create_vehicle_profile_page' );
