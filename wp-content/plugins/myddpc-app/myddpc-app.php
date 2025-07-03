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
    register_rest_route( $namespace, '/dimensions/vehicle', [ 'methods'  => 'GET', 'callback' => 'get_myddpc_vehicle_dimensions_callback', 'permission_callback' => '__return_true' ] );
    register_rest_route( $namespace, '/dimensions/years', [ 'methods' => 'GET', 'callback' => 'get_myddpc_distinct_years_callback', 'permission_callback' => '__return_true' ]);
    register_rest_route( $namespace, '/dimensions/makes', [ 'methods' => 'GET', 'callback' => 'get_myddpc_distinct_makes_callback', 'permission_callback' => '__return_true' ]);
    register_rest_route( $namespace, '/dimensions/models', [ 'methods' => 'GET', 'callback' => 'get_myddpc_distinct_models_callback', 'permission_callback' => '__return_true' ]);
    register_rest_route( $namespace, '/dimensions/trims', [ 'methods' => 'GET', 'callback' => 'get_myddpc_distinct_trims_callback', 'permission_callback' => '__return_true' ]);
    register_rest_route( $namespace, '/performance/vehicle', [ 'methods'  => 'GET', 'callback' => 'get_myddpc_performance_data_callback', 'permission_callback' => '__return_true' ] );

    // --- User Management Endpoints ---
    register_rest_route($namespace, '/user/register', [ 'methods' => 'POST', 'callback' => 'myddpc_handle_user_registration', 'permission_callback' => '__return_true' ]);
    register_rest_route($namespace, '/user/login', [ 'methods' => 'POST', 'callback' => 'myddpc_handle_user_login', 'permission_callback' => '__return_true' ]);
    
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
            date_added datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (garage_id),
            KEY user_id (user_id),
            KEY vehicle_data_id (vehicle_data_id)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
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

// --- Garage & Build List Callbacks ---

function myddpc_get_garage_vehicles_callback() {
    global $wpdb;
    $user_id = get_current_user_id();
    if ($user_id == 0) {
        return new WP_Error('not_logged_in', 'User is not logged in.', ['status' => 401]);
    }

    // First, let's try to determine which garage table actually exists
    $possible_tables = [
        'qfh_user_garage',
        $wpdb->prefix . 'user_garage'
    ];
    
    $garage_table = null;
    foreach ($possible_tables as $table) {
        if ($wpdb->get_var("SHOW TABLES LIKE '$table'") == $table) {
            $garage_table = $table;
            break;
        }
    }
    
    if (!$garage_table) {
        return new WP_Error('table_not_found', 'Garage table not found.', ['status' => 500]);
    }

    $builds_table = 'qfh_user_garage_builds';
    $vehicle_data_table = $wpdb->prefix . 'vehicle_data';

    // Start with basic garage data first
    $query = $wpdb->prepare("
        SELECT
            g.garage_id,
            g.nickname AS name,
            g.custom_image_url,
            g.vehicle_data_id,
            COALESCE(g.status, 'active') AS status,
            COALESCE(g.vehicle_type, 'daily') AS type,
            g.mileage,
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

    $results = $wpdb->get_results($query, ARRAY_A);

    if ($wpdb->last_error) {
        return new WP_Error('db_error', 'Database error: ' . $wpdb->last_error, ['status' => 500]);
    }

    // Now get build counts and investments for each vehicle
    foreach ($results as &$vehicle) {
        $garage_id = intval($vehicle['garage_id']);
        
        // Get modifications count
        $modifications = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$builds_table} WHERE garage_entry_id = %d", 
            $garage_id
        ));
        
        // Get total investment (only from completed builds)
        $investment = $wpdb->get_var($wpdb->prepare(
            "SELECT SUM(CASE WHEN part_price IS NOT NULL AND part_price != '' AND part_price != '0' 
             THEN CAST(part_price AS DECIMAL(10,2)) ELSE 0 END) 
             FROM {$builds_table} WHERE garage_entry_id = %d AND status = 'complete'", 
            $garage_id
        ));
        
        // Process and clean up data
        $vehicle['garage_id'] = $garage_id;
        $vehicle['mileage'] = $vehicle['mileage'] ? intval($vehicle['mileage']) : null;
        $vehicle['modifications'] = intval($modifications);
        $vehicle['totalInvested'] = $investment ? floatval($investment) : 0;
        
        // Remove vehicle_data_id from output as it's internal
        unset($vehicle['vehicle_data_id']);
    }

    return new WP_REST_Response($results, 200);
}

function myddpc_add_garage_vehicle_callback(WP_REST_Request $request) {
    global $wpdb;
    $user_id = get_current_user_id();
    $params = $request->get_json_params();
    $table_name = 'qfh_user_garage'; // Use your existing table name

    if (empty($params['vehicle_id']) || empty($params['nickname'])) { return new WP_Error('bad_request', 'Vehicle ID and nickname are required.', ['status' => 400]); }
    $vehicle_data_id = absint($params['vehicle_id']);
    $nickname = sanitize_text_field($params['nickname']);
    $existing = $wpdb->get_var($wpdb->prepare( "SELECT garage_id FROM $table_name WHERE user_id = %d AND vehicle_data_id = %d", $user_id, $vehicle_data_id ));
    if ($existing) { return new WP_Error('vehicle_exists', 'This vehicle is already in your garage.', ['status' => 409]); }
    
    $result = $wpdb->insert($table_name, [ 'user_id' => $user_id, 'vehicle_data_id' => $vehicle_data_id, 'nickname' => $nickname, 'date_added' => current_time('mysql'), ]);
    if ($result === false) { return new WP_Error('db_error', 'Could not add vehicle to garage.', ['status' => 500]); }
    return new WP_REST_Response(['success' => true, 'message' => 'Vehicle added to garage.', 'garage_id' => $wpdb->insert_id], 201);
}

function myddpc_update_garage_vehicle_callback(WP_REST_Request $request) {
    global $wpdb;
    $user_id = get_current_user_id();
    $params = $request->get_json_params();
    $table_name = 'qfh_user_garage';

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
    $params = $request->get_json_params();
    $garage_table = 'qfh_user_garage'; // Use your existing table name
    $builds_table = 'qfh_user_garage_builds'; // Use your existing table name

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
    $garage_id = absint($request['garage_id']);
    $garage_table = 'qfh_user_garage'; // Use your existing table name
    $builds_table = 'qfh_user_garage_builds'; // Use your existing table name

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
    $params = $request->get_json_params();
    $builds_table = 'qfh_user_garage_builds'; // Use your existing table name

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
    
    // Verify ownership using qfh_user_garage table
    $garage_table = 'qfh_user_garage';
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
    $params = $request->get_json_params();
    $builds_table = 'qfh_user_garage_builds'; // Use your existing table name

    if (empty($params['build_entry_id'])) { return new WP_Error('bad_request', 'Build Entry ID is required.', ['status' => 400]); }
    $build_entry_id = absint($params['build_entry_id']);

    // Verify ownership by joining with garage table
    $owner_id = $wpdb->get_var($wpdb->prepare("SELECT g.user_id FROM $builds_table b JOIN qfh_user_garage g ON b.garage_entry_id = g.garage_id WHERE b.build_entry_id = %d", $build_entry_id));
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
    $garage_table = 'qfh_user_garage'; // Use your existing table name
    $builds_table = 'qfh_user_garage_builds'; // Use your existing table name

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
add_action('rest_api_init', function () {
    register_rest_route('myddpc/v2', '/user/me', [
        'methods' => 'GET',
        'callback' => 'myddpc_get_user_me_callback',
        'permission_callback' => 'is_user_logged_in',
    ]);

    register_rest_route('myddpc/v2', '/user/profile', [
        'methods' => 'POST',
        'callback' => 'myddpc_update_user_profile_callback',
        'permission_callback' => 'is_user_logged_in',
    ]);

    register_rest_route('myddpc/v2', '/user/password', [
        'methods' => 'POST',
        'callback' => 'myddpc_change_password_callback',
        'permission_callback' => 'is_user_logged_in',
    ]);


});

// Ensure all required tables are created on plugin activation and init
register_activation_hook(__FILE__, 'myddpc_create_saved_vehicles_table_if_not_exists');
add_action('init', 'myddpc_create_saved_vehicles_table_if_not_exists');
