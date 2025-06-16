<?php
/**
 * Plugin Name:       MyDDPC User System
 * Description:       Handles user registration, account management, saved items, and roles for the MyDDPC platform.
 * Version:           1.0.0
 * Author:            MyDDPC
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly.
}

if ( ! function_exists( 'register_activation_hook' ) ) {
    require_once ABSPATH . 'wp-admin/includes/plugin.php';
}
if ( ! function_exists( 'dbDelta' ) ) {
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
}
if ( ! function_exists( 'add_role' ) ) {
    require_once ABSPATH . 'wp-includes/capabilities.php';
}
if ( ! function_exists( 'get_role' ) ) {
    require_once ABSPATH . 'wp-includes/capabilities.php';
}

register_activation_hook( __FILE__, 'myddpc_user_system_activate' );

function myddpc_user_system_activate() {
    global $wpdb;
    $charset_collate = $wpdb->get_charset_collate();

    require_once( ABSPATH . 'wp-admin/includes/upgrade.php' );

    // Table 1: wp_myddpc_saved_items
    $table1 = $wpdb->prefix . 'myddpc_saved_items';
    $sql1 = "CREATE TABLE $table1 (
        id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id BIGINT(20) UNSIGNED NOT NULL,
        item_type VARCHAR(50) NOT NULL,
        item_title VARCHAR(255) NOT NULL,
        item_data JSON NOT NULL,
        created_at DATETIME NOT NULL,
        PRIMARY KEY (id),
        INDEX user_id_index (user_id),
        INDEX item_type_index (item_type)
    ) $charset_collate;";

    // Table 2: wp_myddpc_user_activity
    $table2 = $wpdb->prefix . 'myddpc_user_activity';
    $sql2 = "CREATE TABLE $table2 (
        id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id BIGINT(20) UNSIGNED NOT NULL,
        activity_type VARCHAR(50) NOT NULL,
        points INT NOT NULL,
        related_object_id BIGINT(20) UNSIGNED,
        created_at DATETIME NOT NULL,
        PRIMARY KEY (id),
        INDEX user_id_index (user_id)
    ) $charset_collate;";

    dbDelta( $sql1 );
    dbDelta( $sql2 );

    // Define custom roles and capabilities
    add_role(
        'myddpc_garage_member',
        'Garage Member',
        array(
            'read' => true,
            'can_access_garage' => true,
            'can_customize_tools' => true,
        )
    );

    // Add custom capability to subscriber
    $role = get_role( 'subscriber' );
    if ( $role ) {
        $role->add_cap( 'can_save_items' );
    }
}

add_action( 'wp_enqueue_scripts', 'myddpc_user_system_enqueue_scripts' );
function myddpc_user_system_enqueue_scripts() {
    wp_enqueue_script(
        'myddpc-ajax-handler',
        plugin_dir_url( __FILE__ ) . 'js/myddpc-ajax-handler.js',
        array( 'jquery' ),
        '1.0.0',
        true
    );
    wp_localize_script(
        'myddpc-ajax-handler',
        'myddpc_ajax_data',
        array(
            'ajax_url' => admin_url( 'admin-ajax.php' ),
            'nonce'    => wp_create_nonce( 'myddpc_ajax_nonce' ),
            'is_logged_in' => is_user_logged_in(),
        )
    );
}

add_action( 'wp_ajax_myddpc_save_item', 'myddpc_ajax_save_item_handler' );
function myddpc_ajax_save_item_handler() {
    check_ajax_referer( 'myddpc_ajax_nonce', 'nonce' );
    if ( ! is_user_logged_in() ) {
        wp_send_json_error( array( 'message' => 'You must be logged in.' ), 401 );
    }
    if ( ! current_user_can( 'can_save_items' ) ) {
        wp_send_json_error( array( 'message' => 'You do not have permission to save items.' ), 403 );
    }
    global $wpdb;
    $user_id = get_current_user_id();
    $item_type = isset( $_POST['item_type'] ) ? sanitize_text_field( $_POST['item_type'] ) : '';
    $item_title = isset( $_POST['item_title'] ) ? sanitize_text_field( $_POST['item_title'] ) : '';
    $item_data = isset( $_POST['item_data'] ) ? wp_unslash( $_POST['item_data'] ) : '';
    $created_at = current_time( 'mysql' );
    if ( empty( $item_type ) || empty( $item_title ) || empty( $item_data ) ) {
        wp_send_json_error( array( 'message' => 'Missing required fields.' ), 400 );
    }
    // Validate JSON
    $decoded_data = json_decode( $item_data, true );
    if ( json_last_error() !== JSON_ERROR_NONE ) {
        wp_send_json_error( array( 'message' => 'Invalid item data.' ), 400 );
    }

    // Enforce save limits per item type
    switch ( $item_type ) {
        case 'saved_vehicle':
            $limit = 5;
            break;
        case 'discover_search':
            $limit = 2;
            break;
        default:
            $limit = 3; // Default limit for unknown types
    }
    $existing_count = $wpdb->get_var( $wpdb->prepare(
        "SELECT COUNT(*) FROM {$wpdb->prefix}myddpc_saved_items WHERE user_id = %d AND item_type = %s",
        $user_id,
        $item_type
    ) );
    if ( $existing_count >= $limit ) {
        wp_send_json_error( array( 'error_code' => 'limit_reached', 'message' => 'You have reached your save limit for this item type.' ), 403 );
    }

    $result = $wpdb->insert(
        $wpdb->prefix . 'myddpc_saved_items',
        array(
            'user_id'    => $user_id,
            'item_type'  => $item_type,
            'item_title' => $item_title,
            'item_data'  => wp_json_encode( $decoded_data ),
            'created_at' => $created_at,
        ),
        array( '%d', '%s', '%s', '%s', '%s' )
    );
    if ( $result ) {
        wp_send_json_success( array( 'message' => 'Item saved successfully.' ) );
    } else {
        wp_send_json_error( array( 'message' => 'Database error.' ), 500 );
    }
}

add_action( 'wp_ajax_myddpc_delete_item', 'myddpc_ajax_delete_item_handler' );
function myddpc_ajax_delete_item_handler() {
    check_ajax_referer( 'myddpc_ajax_nonce', 'nonce' );
    if ( ! is_user_logged_in() ) {
        wp_send_json_error( array( 'message' => 'You must be logged in.' ), 401 );
    }
    $item_id = isset( $_POST['item_id'] ) ? intval( $_POST['item_id'] ) : 0;
    if ( $item_id <= 0 ) {
        wp_send_json_error( array( 'message' => 'Invalid item ID.' ), 400 );
    }
    global $wpdb;
    $user_id = get_current_user_id();
    $table = $wpdb->prefix . 'myddpc_saved_items';
    $owner_id = $wpdb->get_var( $wpdb->prepare( "SELECT user_id FROM $table WHERE id = %d", $item_id ) );
    if ( $owner_id != $user_id ) {
        wp_send_json_error( array( 'message' => 'Permission denied.' ), 403 );
    }
    $deleted = $wpdb->delete( $table, array( 'id' => $item_id ), array( '%d' ) );
    if ( $deleted ) {
        wp_send_json_success( array( 'message' => 'Item deleted.' ) );
    } else {
        wp_send_json_error( array( 'message' => 'Delete failed.' ), 500 );
    }
}

add_action( 'wp_ajax_myddpc_update_account_settings', 'myddpc_ajax_update_account_settings_handler' );
function myddpc_ajax_update_account_settings_handler() {
    check_ajax_referer( 'myddpc_ajax_nonce', 'nonce' );
    if ( ! is_user_logged_in() ) {
        wp_send_json_error( array( 'message' => 'You must be logged in.' ), 401 );
    }
    $user_id = get_current_user_id();
    $response = array();
    // Handle display name change
    if ( isset( $_POST['display_name'] ) ) {
        $display_name = sanitize_text_field( $_POST['display_name'] );
        $update = wp_update_user( array( 'ID' => $user_id, 'display_name' => $display_name ) );
        if ( is_wp_error( $update ) ) {
            $response['display_name'] = 'error';
        } else {
            $response['display_name'] = 'success';
        }
    }
    // Handle password change
    if ( isset( $_POST['current_password'], $_POST['new_password'], $_POST['confirm_new_password'] ) ) {
        $current_password = $_POST['current_password'];
        $new_password = $_POST['new_password'];
        $confirm_new_password = $_POST['confirm_new_password'];
        $user = get_userdata( $user_id );
        if ( $new_password !== $confirm_new_password ) {
            $response['password'] = 'mismatch';
        } elseif ( ! wp_check_password( $current_password, $user->user_pass, $user_id ) ) {
            $response['password'] = 'incorrect_current';
        } else {
            wp_set_password( $new_password, $user_id );
            $response['password'] = 'success';
        }
    }
    if ( empty( $response ) ) {
        wp_send_json_error( array( 'message' => 'No settings updated.' ), 400 );
    } else {
        wp_send_json_success( $response );
    }
}

function myddpc_render_upgrade_banner() {
    return '<div class="myddpc-upgrade-banner"><strong>Unlock the Full Power of MyDDPC!</strong> Upgrade to access exclusive features and tools. <a href="/upgrade">Learn more</a>.</div>';
}

add_shortcode( 'myddpc_account_page', 'myddpc_account_page_shortcode_handler' );
function myddpc_account_page_shortcode_handler() {
    if ( ! is_user_logged_in() ) {
        wp_redirect( wp_login_url( get_permalink() ) );
        exit;
    }
    $view = isset( $_GET['view'] ) ? sanitize_key( $_GET['view'] ) : 'saved_items';
    ob_start();
    echo myddpc_render_upgrade_banner();
    echo '<div class="myddpc-account-page">';
    switch ( $view ) {
        case 'account_settings':
            myddpc_render_account_settings_view();
            break;
        case 'saved_items':
        default:
            myddpc_render_saved_items_view();
            break;
    }
    echo '</div>';
    return ob_get_clean();
}

function myddpc_render_account_settings_view() {
    $current_user = wp_get_current_user();
    echo '<h2>Account Settings</h2>';
    echo '<form id="myddpc-account-settings-form">';
    echo '<label for="display_name">Display Name</label>';
    echo '<input type="text" id="display_name" name="display_name" value="' . esc_attr( $current_user->display_name ) . '" />';
    echo '<h3>Change Password</h3>';
    echo '<label for="current_password">Current Password</label>';
    echo '<input type="password" id="current_password" name="current_password" autocomplete="current-password" />';
    echo '<label for="new_password">New Password</label>';
    echo '<input type="password" id="new_password" name="new_password" autocomplete="new-password" />';
    echo '<label for="confirm_new_password">Confirm New Password</label>';
    echo '<input type="password" id="confirm_new_password" name="confirm_new_password" autocomplete="new-password" />';
    wp_nonce_field( 'myddpc_ajax_nonce', 'nonce' );
    echo '<button type="submit">Save Changes</button>';
    echo '<div id="myddpc-account-settings-message"></div>';
    echo '</form>';
}

function myddpc_render_saved_items_view() {
    global $wpdb;
    $user_id = get_current_user_id();
    $table_name = $wpdb->prefix . 'myddpc_saved_items';

    // Only select saved_vehicle items
    $saved_items = $wpdb->get_results($wpdb->prepare(
        "SELECT id, item_type, item_title, item_data, created_at FROM $table_name WHERE user_id = %d AND item_type = %s ORDER BY created_at DESC",
        $user_id,
        'saved_vehicle'
    ));

    echo '<div class="myddpc-saved-items-section">';
    echo '<h2>Your Saved Vehicles</h2>';

    if (empty($saved_items)) {
        echo '<div class="myddpc-empty-state">';
        echo '<p>You haven\'t saved any vehicles yet. Explore our tools to discover, analyze, and save vehicles that catch your eye!</p>';
        echo '<a href="/discover" class="button">Start Discovering</a>';
        echo '</div>';
        return;
    }

    echo '<div class="myddpc-saved-items-grid">';
    foreach ($saved_items as $item) {
        $vehicle = json_decode($item->item_data, true);
        $year = isset($vehicle['year']) ? $vehicle['year'] : '';
        $make = isset($vehicle['make']) ? $vehicle['make'] : '';
        $model = isset($vehicle['model']) ? $vehicle['model'] : '';
        $trim = isset($vehicle['trim']) ? $vehicle['trim'] : '';
        $vehicle_id = isset($vehicle['vehicle_id']) ? $vehicle['vehicle_id'] : '';
        
        echo '<div class="myddpc-saved-vehicle-card" id="saved-item-' . esc_attr($item->id) . '">';
        echo '  <div class="vehicle-header">';
        echo '    <div class="vehicle-icon">🚗</div>';
        echo '    <div class="vehicle-title">' . esc_html($item->item_title) . '</div>';
        echo '  </div>';
        echo '  <div class="vehicle-details">';
        echo '    <div class="detail-row"><span class="label">Year:</span> <span class="value">' . esc_html($year) . '</span></div>';
        echo '    <div class="detail-row"><span class="label">Make:</span> <span class="value">' . esc_html($make) . '</span></div>';
        echo '    <div class="detail-row"><span class="label">Model:</span> <span class="value">' . esc_html($model) . '</span></div>';
        if (!empty($trim)) {
            echo '    <div class="detail-row"><span class="label">Trim:</span> <span class="value">' . esc_html($trim) . '</span></div>';
        }
        echo '  </div>';
        echo '  <div class="vehicle-footer">';
        echo '    <div class="saved-date">Saved on ' . esc_html(date("F j, Y", strtotime($item->created_at))) . '</div>';
        echo '    <div class="vehicle-actions">';
        if ($vehicle_id) {
            echo '      <a href="/discover/?vehicle_id=' . esc_attr($vehicle_id) . '" class="button view-button">View Details</a>';
        }
        echo '      <button class="button delete-button" data-item-id="' . esc_attr($item->id) . '">Delete</button>';
        echo '    </div>';
        echo '  </div>';
        echo '</div>';
    }
    echo '</div>';
    echo '</div>';

    // Add some basic CSS to style the saved vehicles display
    echo '<style>
        .myddpc-saved-items-section {
            padding: 20px;
        }
        .myddpc-saved-items-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        .myddpc-saved-vehicle-card {
            background: #fff;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            padding: 20px;
            transition: transform 0.2s;
        }
        .myddpc-saved-vehicle-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }
        .vehicle-header {
            display: flex;
            align-items: center;
            margin-bottom: 15px;
        }
        .vehicle-icon {
            font-size: 24px;
            margin-right: 10px;
        }
        .vehicle-title {
            font-size: 18px;
            font-weight: bold;
            color: #333;
        }
        .vehicle-details {
            margin-bottom: 15px;
        }
        .detail-row {
            display: flex;
            margin-bottom: 8px;
        }
        .detail-row .label {
            font-weight: 600;
            width: 80px;
            color: #666;
        }
        .detail-row .value {
            color: #333;
        }
        .vehicle-footer {
            border-top: 1px solid #eee;
            padding-top: 15px;
            margin-top: 15px;
        }
        .saved-date {
            color: #666;
            font-size: 14px;
            margin-bottom: 10px;
        }
        .vehicle-actions {
            display: flex;
            gap: 10px;
        }
        .button {
            padding: 8px 16px;
            border-radius: 4px;
            text-decoration: none;
            font-size: 14px;
            cursor: pointer;
            border: none;
            transition: background-color 0.2s;
        }
        .view-button {
            background-color: #007bff;
            color: white;
        }
        .view-button:hover {
            background-color: #0056b3;
        }
        .delete-button {
            background-color: #dc3545;
            color: white;
        }
        .delete-button:hover {
            background-color: #c82333;
        }
        .myddpc-empty-state {
            text-align: center;
            padding: 40px 20px;
            background: #f8f9fa;
            border-radius: 8px;
        }
        .myddpc-empty-state p {
            margin-bottom: 20px;
            color: #666;
        }
    </style>';
}

// --- REGISTRATION SHORTCODE AND HANDLER ---
add_shortcode('myddpc_registration_form', 'myddpc_registration_shortcode');
function myddpc_registration_shortcode() {
    if (is_user_logged_in()) {
        return '<p>You are already registered and logged in.</p>';
    }
    ob_start();
    ?>
    <form id="myddpc-registration-form" action="" method="post">
        <h3>Register</h3>
        <p>
            <label for="reg_username">Username</label>
            <input type="text" name="reg_username" id="reg_username" required>
        </p>
        <p>
            <label for="reg_email">Email</label>
            <input type="email" name="reg_email" id="reg_email" required>
        </p>
        <p>
            <label for="reg_password">Password</label>
            <input type="password" name="reg_password" id="reg_password" required>
        </p>
        <p>
            <?php wp_nonce_field('myddpc-register-nonce', 'myddpc_register_nonce_field'); ?>
            <input type="submit" name="myddpc_register_submit" value="Register">
        </p>
    </form>
    <?php
    return ob_get_clean();
}

add_action('init', 'myddpc_handle_registration');
function myddpc_handle_registration() {
    if (isset($_POST['myddpc_register_submit'])) {
        if (!isset($_POST['myddpc_register_nonce_field']) || !wp_verify_nonce($_POST['myddpc_register_nonce_field'], 'myddpc-register-nonce')) {
            die('Security check failed.');
        }

        $username = sanitize_user($_POST['reg_username']);
        $email = sanitize_email($_POST['reg_email']);
        $password = $_POST['reg_password'];

        if (empty($username) || empty($email) || empty($password) || !is_email($email) || username_exists($username) || email_exists($email)) {
            // In a real implementation, you would add user-facing error messages
            // For now, we just stop execution.
            return;
        }

        $user_id = wp_create_user($username, $password, $email);
        if (!is_wp_error($user_id)) {
            // Automatically log in and redirect
            $creds = ['user_login' => $username, 'user_password' => $password, 'remember' => true];
            wp_signon($creds, false);
            wp_redirect(home_url('/my-account'));
            exit;
        }
    }
}

// --- LOGIN SHORTCODE AND HANDLER ---
add_shortcode('myddpc_login_form', 'myddpc_login_shortcode');
function myddpc_login_shortcode() {
    if (is_user_logged_in()) {
        $account_url = home_url('/my-account');
        return '<p>You are already logged in. <a href="' . esc_url(wp_logout_url(home_url())) . '">Logout</a> | <a href="' . esc_url($account_url) . '">My Account</a></p>';
    }
    ob_start();
    ?>
    <form id="myddpc-login-form" action="" method="post">
        <h3>Login</h3>
        <p>
            <label for="login_username">Username or Email</label>
            <input type="text" name="login_username" id="login_username" required>
        </p>
        <p>
            <label for="login_password">Password</label>
            <input type="password" name="login_password" id="login_password" required>
        </p>
        <p>
            <?php wp_nonce_field('myddpc-login-nonce', 'myddpc_login_nonce_field'); ?>
            <input type="submit" name="myddpc_login_submit" value="Login">
        </p>
    </form>
    <?php
    return ob_get_clean();
}

add_action('init', 'myddpc_handle_login');
function myddpc_handle_login() {
    if (isset($_POST['myddpc_login_submit'])) {
        if (!isset($_POST['myddpc_login_nonce_field']) || !wp_verify_nonce($_POST['myddpc_login_nonce_field'], 'myddpc-login-nonce')) {
            die('Security check failed.');
        }

        $creds = [
            'user_login'    => sanitize_user($_POST['login_username']),
            'user_password' => $_POST['login_password'],
            'remember'      => true,
        ];

        $user = wp_signon($creds, false);

        if (is_wp_error($user)) {
            // Add error handling, like redirecting back with a query arg
            // wp_redirect(home_url('/login?login=failed')); exit;
        } else {
            wp_redirect(home_url('/my-account'));
            exit;
        }
    }
}

add_action('wp_ajax_myddpc_get_saved_searches', 'myddpc_get_saved_searches_handler');
function myddpc_get_saved_searches_handler() {
    // Verify nonce and user authentication
    check_ajax_referer('myddpc_ajax_nonce', 'nonce');
    if (!is_user_logged_in()) {
        wp_send_json_error(array('message' => 'You must be logged in.'), 401);
    }

    global $wpdb;
    $user_id = get_current_user_id();
    $table_name = $wpdb->prefix . 'myddpc_saved_items';

    // Query saved searches for the current user
    $saved_searches = $wpdb->get_results($wpdb->prepare(
        "SELECT id, item_title, item_data FROM $table_name 
        WHERE user_id = %d AND item_type = %s 
        ORDER BY created_at DESC",
        $user_id,
        'discover_search'
    ));

    // Return the results
    wp_send_json_success($saved_searches);
} 