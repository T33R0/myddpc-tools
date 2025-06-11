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
    if ( ! is_user_logged_in() ) {
        return;
    }
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