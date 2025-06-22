<?php
/**
 * Plugin Name:       MyDDPC Car Lookup
 * Plugin URI:        https://myddpc.com/
 * Description:       Provides vehicle lookup functionality including make, model, year, and engine specifics for comparison.
 * Version:           1.0.0
 * Author:            Rory Teehan
 * Author URI:        https://myddpc.com/
 * License:           GPL v2 or later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       myddpc-car-lookup
 * Domain Path:       /languages
 */

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
    die;
}

// ──────────────────────────────────────────────────────────────
// Register a fixed 300×200 crop size for vehicle images
add_action( 'init', 'myddpc_cl_register_vehicle_size', 11 );
function myddpc_cl_register_vehicle_size() {
  // ensure theme support exists
  if ( ! current_theme_supports( 'post-thumbnails' ) ) {
    add_theme_support( 'post-thumbnails' );
  }
  add_image_size( 'ddpc-vehicle', 300, 200, true );
}
// ──────────────────────────────────────────────────────────────

// Define plugin constants
define( 'MYDDPC_CAR_LOOKUP_VERSION', '1.0.0' );
define( 'MYDDPC_CAR_LOOKUP_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'MYDDPC_CAR_LOOKUP_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
define( 'MYDDPC_CL_NONCE_ACTION', 'myddpc_cl_car_lookup_secure_action' ); // Centralized nonce action

// Google Custom Search API configuration
if ( ! defined( 'MYDDPC_CSE_API_KEY' ) ) {
  define( 'MYDDPC_CSE_API_KEY', 'AIzaSyB46-YhBbHDKnV26Oo9e-IyXjFtG46SWxo' );
}
if ( ! defined( 'MYDDPC_CSE_CX' ) ) {
  define( 'MYDDPC_CSE_CX',  'b1059fe1d08ca44d3' );
}

// =========================================================================
// 0. IMAGE FEEDBACK TABLE (activation)
// =========================================================================
register_activation_hook( __FILE__, 'myddpc_cl_create_image_feedback_table' );
function myddpc_cl_create_image_feedback_table() {
    global $wpdb;
    $table = $wpdb->prefix . 'vehicle_image_feedback';
    $charset_collate = $wpdb->get_charset_collate();
    require_once( ABSPATH . 'wp-admin/includes/upgrade.php' );
    $sql = "CREATE TABLE $table (
        id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
        year int(4) NOT NULL,
        make varchar(255) NOT NULL,
        model varchar(255) NOT NULL,
        feedback_type varchar(32) NOT NULL, -- 'wrong_image' or 'no_image'
        user_id bigint(20) UNSIGNED NULL,
        user_ip varchar(64) DEFAULT NULL,
        user_agent varchar(255) DEFAULT NULL,
        submitted_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        resolved tinyint(1) NOT NULL DEFAULT 0,
        PRIMARY KEY (id),
        KEY ymm (year, make, model),
        KEY feedback_type (feedback_type),
        KEY resolved (resolved)
    ) $charset_collate;";
    dbDelta($sql);
}

// =========================================================================
// 1. HELPER FUNCTIONS
// =========================================================================

/**
 * Gets distinct values from the vehicle data table.
 * Prefixed: myddpc_cl_
 */
function myddpc_cl_get_distinct_vehicle_data($field, $conditions = []) {
    global $wpdb;
    $table_name = $wpdb->prefix . 'vehicle_data';
    $db_column_map = ['year' => 'Year', 'make' => 'Make', 'model' => 'Model', 'trim' => 'Trim'];
    $allowed_fields = ['year', 'make', 'model', 'trim'];

    if (empty($field) || !in_array($field, $allowed_fields)) {
        return new WP_Error('invalid_field', __('Invalid field requested.', 'myddpc-car-lookup'));
    }
    $db_column = $db_column_map[$field];

    if (!empty($conditions['year']) && !ctype_digit((string) $conditions['year'])) return new WP_Error('invalid_year', __('Invalid year.', 'myddpc-car-lookup'));
    if (!empty($conditions['make']) && strlen($conditions['make']) > 255) return new WP_Error('invalid_make', __('Invalid make.', 'myddpc-car-lookup'));
    if (!empty($conditions['model']) && strlen($conditions['model']) > 255) return new WP_Error('invalid_model', __('Invalid model.', 'myddpc-car-lookup'));

    $sql = "SELECT DISTINCT `{$db_column}` FROM `{$table_name}` WHERE 1=1 ";
    $params = [];

    if (!empty($conditions['year'])) {
        $sql .= " AND `Year` = %d";
        $params[] = intval($conditions['year']);
    }
    if (!empty($conditions['make'])) {
        $sql .= " AND `Make` = %s";
        $params[] = trim($conditions['make']);
    }
    if (!empty($conditions['model'])) {
        $sql .= " AND `Model` = %s";
        $params[] = trim($conditions['model']);
    }
    $sql .= " ORDER BY `{$db_column}` ASC";

    if (!empty($params)) {
        $prepared_sql = $wpdb->prepare($sql, $params);
        if (false === $prepared_sql) {
            error_log('WPDB prepare failed in myddpc_cl_get_distinct_vehicle_data: ' . $wpdb->last_error . ' SQL: ' . $sql);
            return new WP_Error('db_prepare_error', __('Database prepare statement failed.', 'myddpc-car-lookup'));
        }
        $results = $wpdb->get_col($prepared_sql);
    } else {
        $results = $wpdb->get_col($sql);
    }

    if ($wpdb->last_error) {
        error_log('WPDB Error in myddpc_cl_get_distinct_vehicle_data: ' . $wpdb->last_error . ' SQL (Prepared/Raw): ' . (isset($prepared_sql) ? $prepared_sql : $sql));
        return new WP_Error('db_query_error', __('Database query failed.', 'myddpc-car-lookup'));
    }

    if (is_array($results)) {
        $results = array_filter($results, function($value) {
            return $value !== null && $value !== '';
        });
    } elseif (is_null($results)) {
        return [];
    }

    return $results;
}

/**
 * Helper function to output <option> tags.
 * Prefixed: myddpc_cl_
 */
function myddpc_cl_generate_options_html($options, $selected_value = '') {
    $output = '';
    if (!empty($options)) {
        foreach ($options as $option) {
            if (is_scalar($option) && $option !== '') {
                $output .= '<option value="' . esc_attr($option) . '"' . selected($selected_value, $option, false) . '>' . esc_html($option) . '</option>';
            }
        }
    }
    return $output;
}

/**
 * Displays <option> tags for the initial Year dropdown.
 * Prefixed: myddpc_cl_
 */
function myddpc_cl_display_initial_year_options() {
    $years = myddpc_cl_get_distinct_vehicle_data('year');
    if (is_wp_error($years)) {
        error_log('Error fetching initial years: ' . $years->get_error_message());
        echo '<option value="">' . __('Error loading years', 'myddpc-car-lookup') . '</option>';
        return;
    }
    if (!empty($years)) {
        usort($years, function($a, $b) { return intval($b) - intval($a); }); // Sort descending
        echo myddpc_cl_generate_options_html($years);
    } else {
        echo '<option value="">' . __('No years found', 'myddpc-car-lookup') . '</option>';
    }
}

/**
 * Formats raw vehicle data array for display more robustly.
 * Prefixed: myddpc_cl_
 *
 * @param array|null $raw_data Associative array of raw data from DB.
 * @return array Associative array with formatted values (or '-').
 */
function myddpc_cl_format_vehicle_data_for_display($raw_data) {
    if (empty($raw_data) || !is_array($raw_data)) {
        return [];
    }

    $formatted = [];
    foreach ($raw_data as $key => $value) {
        if ($value === null || $value === '') {
            $formatted[$key] = '-';
            continue;
        }

        switch ($key) {
            case 'Base MSRP':
            case 'Base Invoice':
                if (is_numeric($value)) {
                    $formatted[$key] = '$' . number_format((float)$value, 0, '.', ',');
                } else {
                    $formatted[$key] = '-';
                }
                break;
            case 'Horsepower (HP)':
                if (is_numeric($value)) { $formatted[$key] = number_format((int)$value) . ' HP'; } else { $formatted[$key] = '-'; }
                break;
            case 'Horsepower (rpm)':
            case 'Torque (rpm)':
                if (is_numeric($value)) { $formatted[$key] = number_format((int)$value) . ' rpm'; } else { $formatted[$key] = '-'; }
                break;
            case 'Torque (ft-lbs)':
                if (is_numeric($value)) { $formatted[$key] = number_format((int)$value) . ' ft-lbs'; } else { $formatted[$key] = '-'; }
                break;
            case 'Curb weight (lbs)':
            case 'Gross weight (lbs)':
            case 'Maximum payload (lbs)':
            case 'Maximum towing capacity (lbs)':
                if (is_numeric($value)) { $formatted[$key] = number_format((float)$value, 0, '.', ',') . ' lbs'; } else { $formatted[$key] = '-'; }
                break;
            case 'Doors':
            case 'Total seating':
            case 'Valves':
                if (ctype_digit((string)$value)) { $formatted[$key] = esc_html($value); } else { $formatted[$key] = '-'; }
                break;
            case 'Engine size (l)':
                if (is_numeric($value)) { $formatted[$key] = number_format((float)$value, 1) . ' L'; } else { $formatted[$key] = '-'; }
                break;
            case 'Length (in)': case 'Width (in)': case 'Height (in)': case 'Wheelbase (in)':
            case 'Front track (in)': case 'Rear track (in)': case 'Ground clearance (in)':
            case 'Front head room (in)': case 'Front hip room (in)': case 'Front leg room (in)': case 'Front shoulder room (in)':
            case 'Rear head room (in)': case 'Rear hip room (in)': case 'Rear leg room (in)': case 'Rear shoulder room (in)':
                if (is_numeric($value)) { $formatted[$key] = number_format((float)$value, 1) . ' in'; } else { $formatted[$key] = '-'; }
                break;
            case 'Turning circle (ft)':
                if (is_numeric($value)) { $formatted[$key] = number_format((float)$value, 1) . ' ft'; } else { $formatted[$key] = '-'; }
                break;
            case 'EPA interior volume (cu ft)': case 'Cargo capacity (cu ft)': case 'Maximum cargo capacity (cu ft)':
                if (is_numeric($value)) { $formatted[$key] = number_format((float)$value, 1) . ' cu ft'; } else { $formatted[$key] = '-'; }
                break;
            case 'Fuel tank capacity (gal)':
                if (is_numeric($value)) { $formatted[$key] = number_format((float)$value, 1) . ' gal'; } else { $formatted[$key] = '-'; }
                break;
            case 'EPA combined MPG':
                if (is_numeric($value)) { $formatted[$key] = number_format((float)$value, 1) . ' MPG'; } else { $formatted[$key] = '-'; }
                break;
            case 'EPA combined MPGe':
                if (is_numeric($value)) { $formatted[$key] = number_format((float)$value, 1) . ' MPGe'; } else { $formatted[$key] = '-'; }
                break;
            case 'EPA electricity range (mi)':
                if (is_numeric($value)) { $formatted[$key] = number_format((float)$value, 1) . ' mi'; } else { $formatted[$key] = '-'; }
                break;
            case 'EPA kWh/100 mi':
                if (is_numeric($value)) { $formatted[$key] = number_format((float)$value, 1) . ' kWh/100mi'; } else { $formatted[$key] = '-'; }
                break;
            case 'EPA time to charge battery (at 240V) (hr)':
                if (is_numeric($value)) { $formatted[$key] = number_format((float)$value, 1) . ' hr'; } else { $formatted[$key] = '-'; }
                break;
            case 'Battery capacity (kWh)':
                if (is_numeric($value)) { $formatted[$key] = number_format((float)$value, 1) . ' kWh'; } else { $formatted[$key] = '-'; }
                break;
            case 'Drag coefficient (Cd)':
                if (is_numeric($value)) { $formatted[$key] = number_format((float)$value, 2); } else { $formatted[$key] = '-'; }
                break;
            case 'Scorecard Driving': case 'Scorecard Confort': case 'Scorecard Interior':
            case 'Scorecard Utility': case 'Scorecard Technology':
                if (is_numeric($value)) { $formatted[$key] = number_format((float)$value, 1); } else { $formatted[$key] = '-'; }
                break;
            case 'Date added':
                if (is_string($value) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
                    try {
                        $date_obj = new DateTime($value);
                        $date_format = get_option('date_format', 'M j, Y');
                        $formatted[$key] = $date_obj->format($date_format);
                    } catch (Exception $e) {
                        $formatted[$key] = esc_html($value);
                    }
                } else {
                    $formatted[$key] = '-';
                }
                break;
            case 'Used price range':
                $formatted[$key] = wp_kses_post(nl2br($value));
                break;
            default:
                $formatted[$key] = wp_kses_post(nl2br((string)$value));
                break;
        }
    }
    return $formatted;
}

// =========================================================================
// 2. SHORTCODE SETUP
// =========================================================================
/**
 * Shortcode handler for the car lookup tool.
 * Prefixed: myddpc_cl_
 */
function myddpc_cl_car_lookup_shortcode_handler() {
    ob_start();
    ?>
    <div id="car-lookup-app-react-root" class="car-lookup-app">
        <h2><?php _e('Car Lookup', 'myddpc-car-lookup'); ?></h2>
        <?php wp_nonce_field( MYDDPC_CL_NONCE_ACTION, 'myddpc_cl_nonce_field' ); // Updated nonce field name and action ?>

        <div class="lookup-forms">
            <form id="vehicle1-form" class="vehicle-form">
                <h3><?php _e('Vehicle 1', 'myddpc-car-lookup'); ?></h3>
                <div><label for="v1-year"><?php _e('Year:', 'myddpc-car-lookup'); ?></label><select id="v1-year" name="v1_year" required><option value=""><?php _e('Select Year', 'myddpc-car-lookup'); ?></option><?php myddpc_cl_display_initial_year_options(); ?></select></div>
                <div><label for="v1-make"><?php _e('Make:', 'myddpc-car-lookup'); ?></label><select id="v1-make" name="v1_make" disabled required><option value=""><?php _e('Select Make', 'myddpc-car-lookup'); ?></option></select></div>
                <div><label for="v1-model"><?php _e('Model:', 'myddpc-car-lookup'); ?></label><select id="v1-model" name="v1_model" disabled required><option value=""><?php _e('Select Model', 'myddpc-car-lookup'); ?></option></select></div>
                <div><label for="v1-trim"><?php _e('Trim:', 'myddpc-car-lookup'); ?></label><select id="v1-trim" name="v1_trim" disabled required><option value=""><?php _e('Select Trim', 'myddpc-car-lookup'); ?></option></select></div>
                <button type="button" id="v1-lookup-btn" class="lookup-button" disabled><?php _e('Lookup Vehicle 1', 'myddpc-car-lookup'); ?></button>
            </form>
            <form id="vehicle2-form" class="vehicle-form" style="display: none;">
                <h3><?php _e('Vehicle 2', 'myddpc-car-lookup'); ?></h3>
                <div><label for="v2-year"><?php _e('Year:', 'myddpc-car-lookup'); ?></label><select id="v2-year" name="v2_year" required><option value=""><?php _e('Select Year', 'myddpc-car-lookup'); ?></option><?php myddpc_cl_display_initial_year_options(); ?></select></div>
                <div><label for="v2-make"><?php _e('Make:', 'myddpc-car-lookup'); ?></label><select id="v2-make" name="v2_make" disabled required><option value=""><?php _e('Select Make', 'myddpc-car-lookup'); ?></option></select></div>
                <div><label for="v2-model"><?php _e('Model:', 'myddpc-car-lookup'); ?></label><select id="v2-model" name="v2_model" disabled required><option value=""><?php _e('Select Model', 'myddpc-car-lookup'); ?></option></select></div>
                <div><label for="v2-trim"><?php _e('Trim:', 'myddpc-car-lookup'); ?></label><select id="v2-trim" name="v2_trim" disabled required><option value=""><?php _e('Select Trim', 'myddpc-car-lookup'); ?></option></select></div>
                <button type="button" id="v2-lookup-btn" class="lookup-button" disabled><?php _e('Lookup Vehicle 2', 'myddpc-car-lookup'); ?></button>
                <button type="button" id="remove-v2-btn" class="remove-vehicle-button" style="display: none;"><?php _e('Remove Vehicle 2', 'myddpc-car-lookup'); ?></button>
            </form>
            <form id="vehicle3-form" class="vehicle-form" style="display: none;">
                <h3><?php _e('Vehicle 3', 'myddpc-car-lookup'); ?></h3>
                <div><label for="v3-year"><?php _e('Year:', 'myddpc-car-lookup'); ?></label><select id="v3-year" name="v3_year" required><option value=""><?php _e('Select Year', 'myddpc-car-lookup'); ?></option><?php myddpc_cl_display_initial_year_options(); ?></select></div>
                <div><label for="v3-make"><?php _e('Make:', 'myddpc-car-lookup'); ?></label><select id="v3-make" name="v3_make" disabled required><option value=""><?php _e('Select Make', 'myddpc-car-lookup'); ?></option></select></div>
                <div><label for="v3-model"><?php _e('Model:', 'myddpc-car-lookup'); ?></label><select id="v3-model" name="v3_model" disabled required><option value=""><?php _e('Select Model', 'myddpc-car-lookup'); ?></option></select></div>
                <div><label for="v3-trim"><?php _e('Trim:', 'myddpc-car-lookup'); ?></label><select id="v3-trim" name="v3_trim" disabled required><option value=""><?php _e('Select Trim', 'myddpc-car-lookup'); ?></option></select></div>
                <button type="button" id="v3-lookup-btn" class="lookup-button" disabled><?php _e('Lookup Vehicle 3', 'myddpc-car-lookup'); ?></button>
                <button type="button" id="remove-v3-btn" class="remove-vehicle-button" style="display: none;"><?php _e('Remove Vehicle 3', 'myddpc-car-lookup'); ?></button>
            </form>
        </div>
        <div class="lookup-controls">
              <button type="button" id="add-vehicle-btn"><?php _e('Add Vehicle to Compare', 'myddpc-car-lookup'); ?></button>
              <button type="button" id="reset-all-btn" style="display: none;"><?php _e('Reset All', 'myddpc-car-lookup'); ?></button>
        </div>
        <div id="lookup-results" class="results-container">
              <p id="results-placeholder"><?php _e('Select vehicle options and click Lookup.', 'myddpc-car-lookup'); ?></p>
              <div id="single-vehicle-output" class="output-section" style="display: none;">
                  <div class="theme-controls single-theme-controls"><span><?php _e('View:', 'myddpc-car-lookup'); ?></span> <button type="button" class="theme-button active" data-theme="all"><?php _e('All Stats', 'myddpc-car-lookup'); ?></button> <button type="button" class="theme-button" data-theme="overview"><?php _e('Overview', 'myddpc-car-lookup'); ?></button> <button type="button" class="theme-button" data-theme="performance"><?php _e('Performance', 'myddpc-car-lookup'); ?></button> <button type="button" class="theme-button" data-theme="efficiency"><?php _e('Efficiency', 'myddpc-car-lookup'); ?></button> <button type="button" class="theme-button" data-theme="dimensions"><?php _e('Dimensions', 'myddpc-car-lookup'); ?></button></div>
                  <h3 id="single-vehicle-title"></h3>
                  <!-- Vehicle Image Feedback UI: rendered by JS, so output a placeholder div only -->
                  <div id="single-vehicle-stats"></div><h4><?php _e('Narrative', 'myddpc-car-lookup'); ?></h4><div id="single-vehicle-narrative"></div>
              </div>
              <div id="comparison-output" class="output-section comparison-grid" style="display: none;">
                  <div class="comparison-header">
                       <h3 id="v1-compare-title"><?php _e('Vehicle 1', 'myddpc-car-lookup'); ?></h3>
                       <h3 id="v2-compare-title" style="display: none;"><?php _e('Vehicle 2', 'myddpc-car-lookup'); ?></h3>
                       <h3 id="v3-compare-title" style="display: none;"><?php _e('Vehicle 3', 'myddpc-car-lookup'); ?></h3>
                  </div>
                  <div class="theme-controls comparison-theme-controls"><span><?php _e('Compare:', 'myddpc-car-lookup'); ?></span> <button type="button" class="theme-button active" data-theme="all"><?php _e('All Stats', 'myddpc-car-lookup'); ?></button> <button type="button" class="theme-button" data-theme="overview"><?php _e('Overview', 'myddpc-car-lookup'); ?></button> <button type="button" class="theme-button" data-theme="performance"><?php _e('Performance', 'myddpc-car-lookup'); ?></button> <button type="button" class="theme-button" data-theme="efficiency"><?php _e('Efficiency', 'myddpc-car-lookup'); ?></button> <button type="button" class="theme-button" data-theme="dimensions"><?php _e('Dimensions', 'myddpc-car-lookup'); ?></button></div>
                  <h4><?php _e('Stats Comparison', 'myddpc-car-lookup'); ?></h4>
                  <div class="comparison-stats"> </div>
                  <div class="comparison-narrative-combined"><h4><?php _e('Comparative Overview', 'myddpc-car-lookup'); ?></h4><div id="combined-narrative"></div></div>
                  <div class="comparison-narratives-individual">
                       <div id="v1-compare-narrative"><h4><?php _e('Vehicle 1 Narrative', 'myddpc-car-lookup'); ?></h4><div class="narrative-content"></div></div>
                       <div id="v2-compare-narrative" style="display: none;"><h4><?php _e('Vehicle 2 Narrative', 'myddpc-car-lookup'); ?></h4><div class="narrative-content"></div></div>
                       <div id="v3-compare-narrative" style="display: none;"><h4><?php _e('Vehicle 3 Narrative', 'myddpc-car-lookup'); ?></h4><div class="narrative-content"></div></div>
                  </div>
              </div>
              <div id="loading-indicator" style="display: none;"><?php _e('Loading...', 'myddpc-car-lookup'); ?></div>
              <div id="error-message" style="display: none;"></div>
        </div>
    </div>
    <?php
    return ob_get_clean();
}
add_shortcode('myddpc_car_lookup_tool', 'myddpc_cl_car_lookup_shortcode_handler'); // Prefixed shortcode tag

// =========================================================================
// 3. ENQUEUE ASSETS (CSS & JS)
// =========================================================================
/**
 * Enqueues scripts and styles for the car lookup tool.
 * Prefixed: myddpc_cl_
 */
function myddpc_cl_enqueue_assets() {
    global $post;
    // Only enqueue if the shortcode is present on the page
    if ( is_a( $post, 'WP_Post' ) && has_shortcode( $post->post_content, 'myddpc_car_lookup_tool' ) ) {
        wp_enqueue_style(
            'myddpc-car-lookup-style',
            MYDDPC_CAR_LOOKUP_PLUGIN_URL . 'assets/css/car-lookup.css',
            [],
            filemtime(MYDDPC_CAR_LOOKUP_PLUGIN_DIR . 'assets/css/car-lookup.css')
        );
        wp_enqueue_script(
            'myddpc-car-lookup-script',
            MYDDPC_CAR_LOOKUP_PLUGIN_URL . 'assets/js/car-lookup.js',
            ['jquery'],
            filemtime(MYDDPC_CAR_LOOKUP_PLUGIN_DIR . 'assets/js/car-lookup.js'),
            true
        );
        wp_localize_script('myddpc-car-lookup-script', 'myddpc_cl_carLookupData', [ // Prefixed object name
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce( MYDDPC_CL_NONCE_ACTION ), // Use defined nonce action
            'nonce_field_name' => 'myddpc_cl_nonce_field', // Pass the nonce field name for JS to use if needed
            'select_year' => __('Select Year', 'myddpc-car-lookup'),
            'select_make' => __('Select Make', 'myddpc-car-lookup'),
            'select_model' => __('Select Model', 'myddpc-car-lookup'),
            'select_trim' => __('Select Trim', 'myddpc-car-lookup'),
            'loading_years' => __('Loading Years...', 'myddpc-car-lookup'),
            'loading_makes' => __('Loading Makes...', 'myddpc-car-lookup'),
            'loading_models' => __('Loading Models...', 'myddpc-car-lookup'),
            'loading_trims' => __('Loading Trims...', 'myddpc-car-lookup'),
            'error_loading' => __('Error loading', 'myddpc-car-lookup'),
            'ajax_error' => __('AJAX Error', 'myddpc-car-lookup'),
            'lookup_error' => __('Could not retrieve vehicle data. Please check selections or try again.', 'myddpc-car-lookup'),
            'vehicle_not_found' => __('Vehicle not found with the specified options.', 'myddpc-car-lookup'),
        ]);
    }
}
add_action('wp_enqueue_scripts', 'myddpc_cl_enqueue_assets');

// =========================================================================
// 4. AJAX HANDLERS
// =========================================================================

/**
 * AJAX Handler for getting dependent dropdown options.
 * Prefixed: myddpc_cl_
 */
function myddpc_cl_ajax_get_vehicle_options_handler() {
    // Use the _POST key that wp_nonce_field() creates, or the one your JS sends
    if (!check_ajax_referer( MYDDPC_CL_NONCE_ACTION, 'myddpc_cl_nonce_field', false )) { // Updated nonce action and field name
        wp_send_json_error(['message' => __('Nonce verification failed.', 'myddpc-car-lookup')], 403);
        // Consider wp_die() here explicitly if wp_send_json_error doesn't exit.
    }

    $target_field = isset($_POST['target_field']) ? sanitize_key($_POST['target_field']) : '';
    $allowed_targets = ['make', 'model', 'trim'];
    if (empty($target_field) || !in_array($target_field, $allowed_targets)) {
        error_log('Invalid target_field received in options handler: ' . $target_field);
        wp_send_json_error(['message' => __('Invalid target field specified.', 'myddpc-car-lookup')], 400);
    }

    $conditions = [];
    if (isset($_POST['selected_year'])) {
         $year = filter_var(trim($_POST['selected_year']), FILTER_VALIDATE_INT);
         if ($year && $year >= 1900 && $year <= (int)date("Y") + 2) {
             $conditions['year'] = $year;
         } else {
             error_log('Invalid year provided in options handler: ' . $_POST['selected_year']);
             wp_send_json_error(['message' => __('Invalid year provided.', 'myddpc-car-lookup')], 400);
         }
    } else {
         error_log('Year is required for dependent options.');
         wp_send_json_error(['message' => __('Year is required.', 'myddpc-car-lookup')], 400);
    }

    if ($target_field === 'model' || $target_field === 'trim') {
        if (!empty($_POST['selected_make'])) {
            $conditions['make'] = sanitize_text_field(trim($_POST['selected_make']));
        } else {
            error_log('Make is required for model/trim options.');
            wp_send_json_error(['message' => __('Make is required.', 'myddpc-car-lookup')], 400);
        }
    }
    if ($target_field === 'trim') {
        if (!empty($_POST['selected_model'])) {
            $conditions['model'] = sanitize_text_field(trim($_POST['selected_model']));
        } else {
            error_log('Model is required for trim options.');
            wp_send_json_error(['message' => __('Model is required.', 'myddpc-car-lookup')], 400);
        }
    }

    $options = myddpc_cl_get_distinct_vehicle_data($target_field, $conditions);

    if (is_wp_error($options)) {
        error_log("AJAX Error getting options for field '{$target_field}': " . $options->get_error_message());
        wp_send_json_error(['message' => __('Failed to retrieve options. Please try again later.', 'myddpc-car-lookup')], 500);
    } elseif (is_array($options)) {
        wp_send_json_success($options);
    } else {
        error_log("AJAX Error: Unexpected return type from myddpc_cl_get_distinct_vehicle_data for field '{$target_field}'. Type: " . gettype($options));
        wp_send_json_error(['message' => __('An unexpected error occurred while fetching options.', 'myddpc-car-lookup')], 500);
    }
    // wp_send_json_success/error includes wp_die()
}
// Prefixed AJAX actions
add_action('wp_ajax_myddpc_cl_get_vehicle_options', 'myddpc_cl_ajax_get_vehicle_options_handler');
add_action('wp_ajax_nopriv_myddpc_cl_get_vehicle_options', 'myddpc_cl_ajax_get_vehicle_options_handler');

/**
 * AJAX Handler for fetching full vehicle data.
 * Prefixed: myddpc_cl_
 */
function myddpc_cl_ajax_get_vehicle_full_data_handler() {
    if (!check_ajax_referer( MYDDPC_CL_NONCE_ACTION, 'myddpc_cl_nonce_field', false )) { // Updated nonce action and field name
        wp_send_json_error(['message' => __('Nonce verification failed.', 'myddpc-car-lookup')], 403);
    }

    $year = isset($_POST['v_year']) ? filter_var(trim($_POST['v_year']), FILTER_VALIDATE_INT) : null;
    $make = isset($_POST['v_make']) ? sanitize_text_field(trim($_POST['v_make'])) : '';
    $model = isset($_POST['v_model']) ? sanitize_text_field(trim($_POST['v_model'])) : '';
    $trim_val = isset($_POST['v_trim']) ? sanitize_text_field(trim($_POST['v_trim'])) : '';

    if (empty($year) || empty($make) || empty($model) || empty($trim_val)) {
        error_log('Missing required vehicle information in full data lookup. Y/M/M/T: ' . $year . '/' . $make . '/' . $model . '/' . $trim_val);
        wp_send_json_error(['message' => __('Missing required vehicle information.', 'myddpc-car-lookup')], 400);
    }
    if ($year < 1900 || $year > (int)date("Y") + 2) {
        error_log('Invalid year provided in full data lookup: ' . $year);
        wp_send_json_error(['message' => __('Invalid year provided.', 'myddpc-car-lookup')], 400);
    }

    global $wpdb;
    $table_name = $wpdb->prefix . 'vehicle_data';
    $select_clause = '*';
    $sql = $wpdb->prepare(
        "SELECT {$select_clause} FROM `{$table_name}` WHERE `Year` = %d AND `Make` = %s AND `Model` = %s AND `Trim` = %s LIMIT 1",
        $year, $make, $model, $trim_val
    );
    $raw_vehicle_data = $wpdb->get_row($sql, ARRAY_A);

    if ($wpdb->last_error) {
        error_log('WPDB Error in myddpc_cl_ajax_get_vehicle_full_data_handler: ' . $wpdb->last_error . ' SQL: ' . $sql);
        wp_send_json_error(['message' => __('Database query failed. Please try again later.', 'myddpc-car-lookup')], 500);
    } elseif (is_null($raw_vehicle_data)) {
        error_log('Vehicle not found for YMMT: ' . $year . '/' . $make . '/' . $model . '/' . $trim_val);
        wp_send_json_error(['message' => __('Vehicle not found for the specified options.', 'myddpc-car-lookup'), 'not_found' => true], 404);
    }

    // Now look up the image for this Y/M/M (always return 300x200 crop if available, else placeholder)
    $found = $wpdb->get_row( $wpdb->prepare(
        "SELECT image_url FROM {$wpdb->prefix}vehicle_images WHERE year = %d AND make = %s AND model = %s AND is_shared = 1 ORDER BY uploaded_at DESC LIMIT 1",
        $year, $make, $model
    ) );

    if ($found && !empty($found->image_url)) {
        $image_url = $found->image_url;
    } else {
        // Try to fetch from Google CSE in real time, with short timeouts and robust error logging
        error_log("[Car Lookup] Real-time image fetch started for {$year} {$make} {$model}");
        $query = urlencode("{$year} {$make} {$model} front view");
        $url = sprintf(
            'https://www.googleapis.com/customsearch/v1?key=%s&cx=%s&q=%s&searchType=image&num=1',
            MYDDPC_CSE_API_KEY, MYDDPC_CSE_CX, $query
        );
        $response = wp_remote_get($url, ['timeout' => 8]);
        $image_url = plugin_dir_url(__FILE__) . 'assets/images/placeholder.png'; // fallback

        if (!is_wp_error($response)) {
            $body = json_decode(wp_remote_retrieve_body($response), true);
            $image_found = false;
            if (!empty($body['items']) && is_array($body['items'])) {
                // Try up to 4 image results
                for ($i = 0; $i < min(4, count($body['items'])); $i++) {
                    $img_url = esc_url_raw($body['items'][$i]['link']);
                    error_log("[Car Lookup] Trying image result #" . ($i+1) . " for {$year} {$make} {$model}: {$img_url}");
                    // --- Try with browser-like headers first ---
                    $headers = [
                        'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                        'Referer'    => $img_url,
                    ];
                    $img_response = wp_remote_get($img_url, [
                        'timeout' => 8,
                        'headers' => $headers,
                    ]);
                    $tmp = false;
                    if (!is_wp_error($img_response) && 200 === wp_remote_retrieve_response_code($img_response)) {
                        $body_stream = wp_remote_retrieve_body($img_response);
                        if ($body_stream) {
                            $tmp_dir = get_temp_dir();
                            $tmp = tempnam($tmp_dir, 'ddpcimg_');
                            if ($tmp && file_put_contents($tmp, $body_stream) !== false) {
                                $file = [
                                    'name'     => "{$year}-{$make}-{$model}.jpg",
                                    'tmp_name' => $tmp,
                                ];
                                $id = media_handle_sideload($file, 0);
                                if (!is_wp_error($id)) {
                                    $file_path = get_attached_file($id);
                                    $meta = wp_generate_attachment_metadata($id, $file_path);
                                    wp_update_attachment_metadata($id, $meta);
                                    $src = wp_get_attachment_image_src($id, 'ddpc-vehicle');
                                    $local_url = $src && !empty($src[0]) ? $src[0] : wp_get_attachment_url($id);
                                    $wpdb->insert(
                                        $wpdb->prefix . 'vehicle_images',
                                        [
                                            'year'        => $year,
                                            'make'        => $make,
                                            'model'       => $model,
                                            'image_url'   => $local_url,
                                            'is_shared'   => 1,
                                            'uploaded_by' => get_current_user_id(),
                                        ],
                                        [ '%d','%s','%s','%s','%d','%d' ]
                                    );
                                    $image_url = $local_url;
                                    $image_found = true;
                                    @unlink($tmp);
                                    break; // Success, stop trying
                                } else {
                                    @unlink($tmp);
                                    error_log("[Car Lookup] Media insert failed for {$year} {$make} {$model} (AJAX real-time, custom UA, result #" . ($i+1) . ")");
                                }
                                @unlink($tmp);
                            } else {
                                if ($tmp) @unlink($tmp);
                                error_log("[Car Lookup] Failed to write temp file for {$img_url} (AJAX real-time, custom UA, result #" . ($i+1) . ")");
                            }
                        } else {
                            error_log("[Car Lookup] Empty image body for {$img_url} (AJAX real-time, custom UA, result #" . ($i+1) . ")");
                        }
                    } else {
                        // Fallback: try download_url() (may still fail if host blocks server-side)
                        $tmp = download_url($img_url, 8);
                        if (!is_wp_error($tmp)) {
                            $file = [
                                'name'     => "{$year}-{$make}-{$model}.jpg",
                                'tmp_name' => $tmp,
                            ];
                            $id = media_handle_sideload($file, 0);
                            if (!is_wp_error($id)) {
                                $file_path = get_attached_file($id);
                                $meta = wp_generate_attachment_metadata($id, $file_path);
                                wp_update_attachment_metadata($id, $meta);
                                $src = wp_get_attachment_image_src($id, 'ddpc-vehicle');
                                $local_url = $src && !empty($src[0]) ? $src[0] : wp_get_attachment_url($id);
                                $wpdb->insert(
                                    $wpdb->prefix . 'vehicle_images',
                                    [
                                        'year'        => $year,
                                        'make'        => $make,
                                        'model'       => $model,
                                        'image_url'   => $local_url,
                                        'is_shared'   => 1,
                                        'uploaded_by' => get_current_user_id(),
                                    ],
                                    [ '%d','%s','%s','%s','%d','%d' ]
                                );
                                $image_url = $local_url;
                                $image_found = true;
                                @unlink($tmp);
                                break; // Success, stop trying
                            } else {
                                @unlink($tmp);
                                error_log("[Car Lookup] Media insert failed for {$year} {$make} {$model} (AJAX real-time, fallback, result #" . ($i+1) . ")");
                            }
                            @unlink($tmp);
                        } else {
                            error_log("[Car Lookup] Download failed for {$img_url} (AJAX real-time, fallback, result #" . ($i+1) . ")");
                        }
                    }
                }
            }
            if (!$image_found) {
                error_log("[Car Lookup] No downloadable image found for {$year} {$make} {$model} (AJAX real-time, all results)");
            }
        } else {
            error_log("[Car Lookup] HTTP error for {$year} {$make} {$model} (AJAX real-time): " . $response->get_error_message());
        }
        error_log("[Car Lookup] Real-time image fetch ended for {$year} {$make} {$model}");
    }

    $formatted_data = myddpc_cl_format_vehicle_data_for_display($raw_vehicle_data);
    $formatted_data['image_url'] = $image_url;

    // Always return the correct image URL (300x200 crop, real-time fetch, or placeholder)
    wp_send_json_success($formatted_data);
}
// Prefixed AJAX actions
add_action('wp_ajax_myddpc_cl_get_vehicle_data', 'myddpc_cl_ajax_get_vehicle_full_data_handler');         // Note the prefixed action name
add_action('wp_ajax_nopriv_myddpc_cl_get_vehicle_data', 'myddpc_cl_ajax_get_vehicle_full_data_handler'); // Note the prefixed action name

// =========================================================================
// 4A. AJAX HANDLER: Submit image feedback
// =========================================================================
add_action('wp_ajax_nopriv_myddpc_cl_submit_image_feedback', 'myddpc_cl_ajax_submit_image_feedback');
add_action('wp_ajax_myddpc_cl_submit_image_feedback', 'myddpc_cl_ajax_submit_image_feedback');
function myddpc_cl_ajax_submit_image_feedback() {
    // --- Rate limit: 1 per 60s per IP/vehicle ---
    global $wpdb;
    $table = $wpdb->prefix . 'vehicle_image_feedback';
    $year = isset($_POST['year']) ? intval($_POST['year']) : 0;
    $make = isset($_POST['make']) ? sanitize_text_field($_POST['make']) : '';
    $model = isset($_POST['model']) ? sanitize_text_field($_POST['model']) : '';
    $feedback_type = isset($_POST['feedback_type']) ? sanitize_key($_POST['feedback_type']) : '';
    $user_ip = isset($_SERVER['REMOTE_ADDR']) ? sanitize_text_field($_SERVER['REMOTE_ADDR']) : '';
    $recent = $wpdb->get_var($wpdb->prepare("SELECT submitted_at FROM $table WHERE year=%d AND make=%s AND model=%s AND user_ip=%s AND submitted_at > DATE_SUB(UTC_TIMESTAMP(), INTERVAL 60 SECOND) ORDER BY submitted_at DESC LIMIT 1", $year, $make, $model, $user_ip));
    if ($recent) {
        wp_send_json_error(['message'=>'You can only submit feedback for this vehicle once per minute from your IP.'], 429);
    }
    // ...existing code (nonce, insert, etc)...
    error_log('[DEBUG] Entered myddpc_cl_ajax_submit_image_feedback');
    error_log('[DEBUG] POST: ' . json_encode($_POST));
    if (!isset($_POST['myddpc_cl_nonce_field'])) {
        error_log('[DEBUG] Nonce field missing in POST');
    }
    $nonce_check = check_ajax_referer( MYDDPC_CL_NONCE_ACTION, 'myddpc_cl_nonce_field', false );
    if (!$nonce_check) {
        error_log('[DEBUG] Nonce verification failed');
        wp_send_json_error(['message'=>'Nonce verification failed.'], 403);
    }
    if (!$year || !$make || !$model || !in_array($feedback_type, ['wrong_image','no_image'])) {
        error_log('[DEBUG] Invalid feedback data: ' . json_encode(['year'=>$year,'make'=>$make,'model'=>$model,'feedback_type'=>$feedback_type]));
        wp_send_json_error(['message'=>'Invalid feedback data.'], 400);
    }
    $user_id = is_user_logged_in() ? get_current_user_id() : null;
    $user_agent = isset($_SERVER['HTTP_USER_AGENT']) ? substr(sanitize_text_field($_SERVER['HTTP_USER_AGENT']),0,255) : '';
    $insert_data = [
        'year' => $year,
        'make' => $make,
        'model' => $model,
        'feedback_type' => $feedback_type,
        'user_id' => $user_id, // always present, can be null
        'user_ip' => $user_ip,
        'user_agent' => $user_agent,
        'submitted_at' => current_time('mysql', 1),
        'resolved' => 0
    ];
    $format = [
        '%d', // year
        '%s', // make
        '%s', // model
        '%s', // feedback_type
        '%d', // user_id (can be null)
        '%s', // user_ip
        '%s', // user_agent
        '%s', // submitted_at
        '%d'  // resolved
    ];
    error_log('[DEBUG] Insert data: ' . json_encode($insert_data));
    error_log('[DEBUG] Format: ' . json_encode($format));
    $result = $wpdb->insert($table, $insert_data, $format);
    if ($result === false) {
        error_log('Vehicle image feedback insert failed: ' . $wpdb->last_error . ' | Data: ' . json_encode($insert_data) . ' | Format: ' . json_encode($format));
        wp_send_json_error(['message'=>'Database error: could not save feedback.'], 500);
    }
    error_log('[DEBUG] Feedback insert success');
    // --- Email admin ---
    $subject = '[MyDDPC] Vehicle Image Feedback: ' . strtoupper($feedback_type) . ": $year $make $model";
    $body = "A new vehicle image feedback was submitted.\n\n" .
        "Year: $year\nMake: $make\nModel: $model\nType: $feedback_type\nUser: " . ($user_id ? $user_id : $user_ip) . "\nTime: " . $insert_data['submitted_at'] . "\n\n--\nMyDDPC Car Lookup Plugin";
    @wp_mail('myddpc@gmail.com', $subject, $body);
    wp_send_json_success(['message'=>'Thank you for your feedback!']);
}

// =========================================================================
// 4B. ADMIN: Feedback Review Page & Stats
// =========================================================================
add_action('admin_menu', function() {
    add_menu_page(
        __('Vehicle Image Feedback', 'myddpc-car-lookup'),
        __('Image Feedback', 'myddpc-car-lookup'),
        'manage_options',
        'myddpc-cl-feedback',
        'myddpc_cl_admin_feedback_page',
        'dashicons-flag',
        26
    );
});

function myddpc_cl_admin_feedback_page() {
    global $wpdb;
    $table = $wpdb->prefix . 'vehicle_image_feedback';
    $action = isset($_GET['action']) ? $_GET['action'] : '';
    $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
    // Mark as resolved
    if ($action === 'resolve' && $id > 0 && current_user_can('manage_options')) {
        $wpdb->update($table, ['resolved' => 1], ['id' => $id], ['%d'], ['%d']);
        echo '<div class="updated notice"><p>Feedback marked as resolved.</p></div>';
    }
    // Stats
    $total = (int)$wpdb->get_var("SELECT COUNT(*) FROM $table");
    $unresolved = (int)$wpdb->get_var("SELECT COUNT(*) FROM $table WHERE resolved = 0");
    $resolved = (int)$wpdb->get_var("SELECT COUNT(*) FROM $table WHERE resolved = 1");
    $top_flagged = $wpdb->get_results("SELECT year, make, model, COUNT(*) as count FROM $table WHERE resolved = 0 GROUP BY year, make, model ORDER BY count DESC LIMIT 5");
    echo '<div class="wrap"><h1>Vehicle Image Feedback</h1>';
    echo '<h2>Stats</h2>';
    echo '<ul>';
    echo '<li><strong>Total feedback:</strong> ' . esc_html($total) . '</li>';
    echo '<li><strong>Unresolved:</strong> ' . esc_html($unresolved) . '</li>';
    echo '<li><strong>Resolved:</strong> ' . esc_html($resolved) . '</li>';
    if ($top_flagged) {
        echo '<li><strong>Most-flagged vehicles (unresolved):</strong><ul>';
        foreach ($top_flagged as $row) {
            echo '<li>' . esc_html("{$row->year} {$row->make} {$row->model}") . ' (' . esc_html($row->count) . ')</li>';
        }
        echo '</ul></li>';
    }
    echo '</ul>';
    // Feedback table
    $feedback = $wpdb->get_results("SELECT * FROM $table ORDER BY resolved ASC, submitted_at DESC LIMIT 100");
    echo '<h2>Recent Feedback</h2>';
    echo '<table class="widefat"><thead><tr><th>ID</th><th>Year</th><th>Make</th><th>Model</th><th>Type</th><th>User/IP</th><th>Submitted</th><th>Resolved</th><th>Action</th></tr></thead><tbody>';
    foreach ($feedback as $f) {
        echo '<tr' . ($f->resolved ? ' style="opacity:0.5;"' : '') . '>';
        echo '<td>' . esc_html($f->id) . '</td>';
        echo '<td>' . esc_html($f->year) . '</td>';
        echo '<td>' . esc_html($f->make) . '</td>';
        echo '<td>' . esc_html($f->model) . '</td>';
        echo '<td>' . esc_html($f->feedback_type) . '</td>';
        echo '<td>' . ($f->user_id ? 'User #' . esc_html($f->user_id) : esc_html($f->user_ip)) . '</td>';
        echo '<td>' . esc_html($f->submitted_at) . '</td>';
        echo '<td>' . ($f->resolved ? 'Yes' : 'No') . '</td>';
        echo '<td>';
        if (!$f->resolved) {
            $url = admin_url('admin.php?page=myddpc-cl-feedback&action=resolve&id=' . $f->id);
            echo '<a href="' . esc_url($url) . '" class="button">Mark Resolved</a>';
        } else {
            echo '-';
        }
        echo '</td>';
        echo '</tr>';
    }
    echo '</tbody></table>';
    echo '</div>';
}

// =========================================================================
// END OF PLUGIN
// =========================================================================
?>