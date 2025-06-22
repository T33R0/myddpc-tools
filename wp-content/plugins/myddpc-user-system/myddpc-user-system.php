<?php
/**
 * Plugin Name: MyDDPC User System
 * Description: Handles user registration, login, account management, and saved items for MyDDPC.
 * Version: 1.2
 * Author: Your Name
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly.
}

// Activation hook to create custom database table
register_activation_hook( __FILE__, 'myddpc_user_system_activate' );
function myddpc_user_system_activate() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'myddpc_saved_items';
    $charset_collate = $wpdb->get_charset_collate();

    $sql = "CREATE TABLE $table_name (
        id mediumint(9) NOT NULL AUTO_INCREMENT,
        user_id bigint(20) UNSIGNED NOT NULL,
        item_type varchar(50) NOT NULL,
        item_title varchar(255) NOT NULL,
        item_data longtext NOT NULL,
        created_at datetime DEFAULT '0000-00-00 00:00:00' NOT NULL,
        PRIMARY KEY  (id),
        KEY user_id (user_id)
    ) $charset_collate;";

    require_once( ABSPATH . 'wp-admin/includes/upgrade.php' );
    dbDelta( $sql );
}

// Enqueue scripts and styles
add_action( 'wp_enqueue_scripts', 'myddpc_user_system_enqueue_scripts' );
function myddpc_user_system_enqueue_scripts() {
    if ( is_page( 'my-account' ) || ( is_singular() && has_shortcode( get_post()->post_content, 'myddpc_account_view' ) ) ) {
        wp_enqueue_style(
            'myddpc-user-system-css',
            plugin_dir_url(__FILE__) . 'assets/css/myddpc-user-system.css',
            [],
            filemtime(plugin_dir_path(__FILE__) . 'assets/css/myddpc-user-system.css')
        );
        wp_enqueue_script(
            'myddpc-ajax-handler-js',
            plugin_dir_url(__FILE__) . 'js/myddpc-ajax-handler.js',
            ['jquery'],
            filemtime(plugin_dir_path(__FILE__) . 'js/myddpc-ajax-handler.js'),
            true
        );
        wp_localize_script('myddpc-ajax-handler-js', 'myddpc_ajax_data', [
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('myddpc_ajax_nonce'),
            'is_logged_in' => is_user_logged_in(),
        ]);
    }
}


// --- AJAX HANDLERS ---
add_action('wp_ajax_myddpc_save_item', 'myddpc_ajax_save_item_handler');
function myddpc_ajax_save_item_handler() {
    check_ajax_referer('myddpc_ajax_nonce', 'nonce');
    if (!is_user_logged_in()) {
        wp_send_json_error(['message' => 'User not logged in.'], 403);
    }

    $user_id = get_current_user_id();
    global $wpdb;
    $table_name = $wpdb->prefix . 'myddpc_saved_items';

    $item_type = sanitize_text_field($_POST['item_type']);
    $item_title = sanitize_text_field($_POST['item_title']);
    $item_data_raw = $_POST['item_data'];
    $decoded_data = json_decode($item_data_raw, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        wp_send_json_error([
            'message' => 'Invalid item data.',
            'raw' => $item_data_raw,
            'decode_error' => json_last_error_msg()
        ], 400);
    }
    $item_data = wp_json_encode($decoded_data);

    // Check user limits
    $current_item_count = $wpdb->get_var($wpdb->prepare(
        "SELECT COUNT(id) FROM $table_name WHERE user_id = %d AND item_type = %s",
        $user_id,
        $item_type
    ));
    $limit = ($item_type === 'saved_vehicle') ? 5 : 3;
    
    if ($current_item_count >= $limit) {
         wp_send_json_error([
            'error_code' => 'limit_reached',
            'message' => 'You have reached your limit for saved ' . str_replace('_', ' ', $item_type) . 's.'
        ], 400);
    }

    $result = $wpdb->insert(
        $table_name,
        [
            'user_id' => $user_id,
            'item_type' => $item_type,
            'item_title' => $item_title,
            'item_data' => $item_data,
            'created_at' => current_time('mysql'),
        ],
        ['%d', '%s', '%s', '%s', '%s']
    );

    if ($result) {
        wp_send_json_success(['id' => $wpdb->insert_id]);
    } else {
        wp_send_json_error(['message' => 'Failed to save item.']);
    }
}

add_shortcode('myddpc_account_view', 'myddpc_account_page_shortcode_handler');
function myddpc_account_page_shortcode_handler() {
    if (!is_user_logged_in()) {
        return '<p>Please <a href="' . esc_url(wp_login_url(get_permalink())) . '">log in</a> to view your account.</p>';
    }

    ob_start();
    ?>
    <div id="myddpc-account-wrapper">
        <div class="myddpc-account-header">
            <h1>My Account</h1>
        </div>
        
        <div class="myddpc-account-content">
            <div class="myddpc-tabs">
                <button class="tab-link active" onclick="openTab(event, 'saved-items')">Saved Items</button>
                <button class="tab-link" onclick="openTab(event, 'account-settings')">Account Settings</button>
            </div>

            <div id="saved-items" class="tab-content active">
                <?php echo myddpc_render_saved_items_view(); ?>
            </div>

            <div id="account-settings" class="tab-content">
                <?php myddpc_render_account_settings_view(); ?>
            </div>
        </div>
    </div>

    <script>
    function openTab(evt, tabName) {
        var i, tabcontent, tablinks;
        tabcontent = document.getElementsByClassName("tab-content");
        for (i = 0; i < tabcontent.length; i++) {
            tabcontent[i].style.display = "none";
            tabcontent[i].classList.remove("active");
        }
        tablinks = document.getElementsByClassName("tab-link");
        for (i = 0; i < tablinks.length; i++) {
            tablinks[i].classList.remove("active");
        }
        document.getElementById(tabName).style.display = "block";
        document.getElementById(tabName).classList.add("active");
        evt.currentTarget.classList.add("active");
    }
    // Initialize first tab
    document.addEventListener('DOMContentLoaded', function() {
        document.querySelector('.tab-link.active').click();
    });
    </script>
    <?php
    return ob_get_clean();
}


function myddpc_render_saved_items_view() {
    global $wpdb;
    $user_id = get_current_user_id();
    $table_name = $wpdb->prefix . 'myddpc_saved_items';

    // Fetch saved vehicles with their image URL using JSON_EXTRACT
    $saved_vehicles = $wpdb->get_results($wpdb->prepare(
        "SELECT id, item_title, item_data, 
         JSON_UNQUOTE(JSON_EXTRACT(item_data, '$.image_url')) as image_url
         FROM $table_name 
         WHERE user_id = %d AND item_type = %s 
         ORDER BY created_at DESC",
        $user_id, 'saved_vehicle'
    ));

    // Fetch saved searches
    $saved_searches = $wpdb->get_results($wpdb->prepare(
        "SELECT id, item_title, item_data FROM $table_name 
         WHERE user_id = %d AND item_type = %s 
         ORDER BY created_at DESC",
        $user_id, 'discover_search'
    ));

    $discover_page_url = home_url('/discover');
    ob_start();
    ?>
    <div class="saved-items-section">
        <h2>Saved Vehicles</h2>
        <?php if (!empty($saved_vehicles)) : ?>
            <div class="saved-items-grid">
                <?php foreach ($saved_vehicles as $item) :
                    $item_data = json_decode($item->item_data, true);
                    $vehicle_id = isset($item_data['vehicle_id']) ? $item_data['vehicle_id'] : '';
                    $details_url = $vehicle_id ? add_query_arg('vehicle_id', $vehicle_id, $discover_page_url) : '#';
                    $fallback_img = plugin_dir_url(__FILE__) . 'assets/images/fallback-logo.png';
                    $bg_image_url = !empty($item->image_url) ? esc_url($item->image_url) : $fallback_img;
                ?>
                    <div class="saved-item-card vehicle-card" data-item-id="<?php echo esc_attr($item->id); ?>" data-item-type="saved_vehicle">
                         <div class="card-bg-image" style="background-image: url('<?php echo $bg_image_url; ?>');"></div>
                         <div class="card-overlay"></div>
                         <div class="card-content">
                            <div class="card-title-container">
                                <h3 class="card-title"><?php echo esc_html($item->item_title); ?></h3>
                                <button class="edit-title-btn">✏️</button>
                            </div>
                            <div class="card-title-edit-container" style="display: none;">
                                <input type="text" class="edit-title-input" value="<?php echo esc_attr($item->item_title); ?>">
                                <button class="save-title-btn">Save</button>
                                <button class="cancel-edit-btn">Cancel</button>
                            </div>
                            <p class="card-details">
                                <?php echo esc_html($item_data['year'] ?? ''); ?>
                                <?php echo esc_html($item_data['make'] ?? ''); ?>
                                <?php echo esc_html($item_data['model'] ?? ''); ?>
                            </p>
                            <div class="card-actions">
                                <a href="<?php echo esc_url($details_url); ?>" class="card-button details-button">View Details</a>
                                <button class="card-button delete-button">Delete</button>
                            </div>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
        <?php else : ?>
            <p>You have no saved vehicles. You can save a vehicle from the <a href="<?php echo esc_url($discover_page_url); ?>">Discover</a> page.</p>
        <?php endif; ?>
    </div>

    <div class="saved-items-section">
        <h2>Saved Searches</h2>
        <?php if (!empty($saved_searches)) : ?>
            <div class="saved-items-grid">
                <?php foreach ($saved_searches as $item) :
                    $search_data = json_encode(json_decode($item->item_data));
                    $load_url = add_query_arg('load_search', base64_encode($search_data), $discover_page_url);
                ?>
                     <div class="saved-item-card search-card" data-item-id="<?php echo esc_attr($item->id); ?>" data-item-type="discover_search">
                        <div class="card-content">
                           <div class="card-title-container">
                                <h3 class="card-title"><?php echo esc_html($item->item_title); ?></h3>
                                <button class="edit-title-btn">✏️</button>
                            </div>
                             <div class="card-title-edit-container" style="display: none;">
                                <input type="text" class="edit-title-input" value="<?php echo esc_attr($item->item_title); ?>">
                                <button class="save-title-btn">Save</button>
                                <button class="cancel-edit-btn">Cancel</button>
                            </div>
                            <div class="card-actions">
                                <a href="#" class="card-button load-search-button" data-search-id="<?php echo esc_attr($item->id); ?>">Load Search</a>
                                <button class="card-button delete-button">Delete</button>
                            </div>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
        <?php else : ?>
            <p>You have no saved searches. You can save a search from the <a href="<?php echo esc_url($discover_page_url); ?>">Discover</a> page.</p>
        <?php endif; ?>
    </div>
    <?php
    return ob_get_clean();
}

function myddpc_render_account_settings_view() {
    $current_user = wp_get_current_user();
    ?>
    <h2>Account Settings</h2>
    <form id="myddpc-account-settings-form">
        <label for="display_name">Display Name</label>
        <input type="text" id="display_name" name="display_name" value="<?php echo esc_attr( $current_user->display_name ); ?>" />
        
        <h3>Change Password</h3>
        <label for="current_password">Current Password</label>
        <input type="password" id="current_password" name="current_password" autocomplete="current-password" />
        
        <label for="new_password">New Password</label>
        <input type="password" id="new_password" name="new_password" autocomplete="new-password" />
        
        <label for="confirm_new_password">Confirm New Password</label>
        <input type="password" id="confirm_new_password" name="confirm_new_password" autocomplete="new-password" />
        
        <?php wp_nonce_field( 'myddpc_ajax_nonce', 'nonce' ); ?>
        <button type="submit">Save Changes</button>
        <div id="myddpc-account-settings-message"></div>
    </form>
    <?php
}


add_action('wp_ajax_myddpc_update_item_title', 'myddpc_update_item_title_handler');
function myddpc_update_item_title_handler() {
    check_ajax_referer('myddpc_ajax_nonce', 'nonce');
    if (!is_user_logged_in()) {
        wp_send_json_error(['message' => 'Not logged in.'], 403);
    }
    
    $item_id = isset($_POST['item_id']) ? intval($_POST['item_id']) : 0;
    $new_title = isset($_POST['new_title']) ? sanitize_text_field($_POST['new_title']) : '';

    if (empty($item_id) || empty($new_title)) {
        wp_send_json_error(['message' => 'Invalid data.'], 400);
    }

    global $wpdb;
    $table_name = $wpdb->prefix . 'myddpc_saved_items';
    $user_id = get_current_user_id();

    $updated = $wpdb->update(
        $table_name,
        ['item_title' => $new_title],
        ['id' => $item_id, 'user_id' => $user_id],
        ['%s'],
        ['%d', '%d']
    );

    if ($updated !== false) {
        wp_send_json_success(['message' => 'Title updated.']);
    } else {
        wp_send_json_error(['message' => 'Failed to update title.']);
    }
}


add_action('wp_ajax_myddpc_delete_item', 'myddpc_delete_item_handler');
function myddpc_delete_item_handler() {
    check_ajax_referer('myddpc_ajax_nonce', 'nonce');
    if (!is_user_logged_in()) {
        wp_send_json_error(['message' => 'Not logged in.'], 403);
    }

    $item_id = isset($_POST['item_id']) ? intval($_POST['item_id']) : 0;

    if (empty($item_id)) {
        wp_send_json_error(['message' => 'Invalid item ID.'], 400);
    }

    global $wpdb;
    $table_name = $wpdb->prefix . 'myddpc_saved_items';
    $user_id = get_current_user_id();

    $deleted = $wpdb->delete(
        $table_name,
        ['id' => $item_id, 'user_id' => $user_id],
        ['%d', '%d']
    );

    if ($deleted) {
        wp_send_json_success(['message' => 'Item deleted.']);
    } else {
        wp_send_json_error(['message' => 'Failed to delete item or item not found.']);
    }
}

add_action('wp_ajax_myddpc_update_account_settings', 'myddpc_ajax_update_account_settings_handler');
function myddpc_ajax_update_account_settings_handler() {
    check_ajax_referer('myddpc_ajax_nonce', 'nonce');
    if (!is_user_logged_in()) {
        wp_send_json_error(['message' => 'User not logged in.'], 403);
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
    if ( !empty($_POST['current_password']) && !empty($_POST['new_password']) && !empty($_POST['confirm_new_password']) ) {
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
        wp_send_json_error( array( 'message' => 'No settings updated or password fields incomplete.' ), 400 );
    } else {
        wp_send_json_success( $response );
    }
}

add_action('wp_ajax_myddpc_get_saved_searches', 'myddpc_get_saved_searches_handler');
function myddpc_get_saved_searches_handler() {
    check_ajax_referer('myddpc_ajax_nonce', 'nonce');
    if (!is_user_logged_in()) {
        wp_send_json_error(array('message' => 'You must be logged in.'), 401);
    }
    global $wpdb;
    $table_name = $wpdb->prefix . 'myddpc_saved_items';
    $searches = $wpdb->get_results($wpdb->prepare(
        "SELECT id, item_title, item_data FROM {$table_name} WHERE user_id = %d AND item_type = 'discover_search' ORDER BY item_title ASC",
        get_current_user_id()
    ));
    wp_send_json_success($searches);
}

// --- REGISTRATION & LOGIN SHORTCODES (assuming these are simple and correct) ---
// Note: These are simplified for brevity. A real implementation should have better error handling.

add_shortcode('myddpc_registration_form', 'myddpc_registration_shortcode');
function myddpc_registration_shortcode() {
    if (is_user_logged_in()) return '<p>You are already registered.</p>';
    ob_start();
    ?>
    <form id="myddpc-registration-form" action="" method="post">
        <h3>Register</h3>
        <p><label for="reg_username">Username</label><input type="text" name="reg_username" id="reg_username" required></p>
        <p><label for="reg_email">Email</label><input type="email" name="reg_email" id="reg_email" required></p>
        <p><label for="reg_password">Password</label><input type="password" name="reg_password" id="reg_password" required></p>
        <p><?php wp_nonce_field('myddpc-register-nonce', 'myddpc_register_nonce_field'); ?><input type="submit" name="myddpc_register_submit" value="Register"></p>
    </form>
    <?php
    return ob_get_clean();
}

add_action('init', 'myddpc_handle_registration');
function myddpc_handle_registration() {
    if (isset($_POST['myddpc_register_submit']) && check_admin_referer('myddpc-register-nonce', 'myddpc_register_nonce_field')) {
        $user_id = wp_create_user(sanitize_user($_POST['reg_username']), $_POST['reg_password'], sanitize_email($_POST['reg_email']));
        if (!is_wp_error($user_id)) {
            wp_set_current_user($user_id);
            wp_set_auth_cookie($user_id);
            wp_redirect(home_url('/my-account'));
            exit;
        }
    }
}

add_shortcode('myddpc_login_form', 'myddpc_login_shortcode');
function myddpc_login_shortcode() {
    if (is_user_logged_in()) {
        return '<p>You are logged in. <a href="'.esc_url(wp_logout_url(home_url())).'">Logout</a></p>';
    }
    ob_start();
     ?>
    <form id="myddpc-login-form" action="" method="post">
        <h3>Login</h3>
        <p><label for="login_username">Username/Email</label><input type="text" name="login_username" id="login_username" required></p>
        <p><label for="login_password">Password</label><input type="password" name="login_password" id="login_password" required></p>
        <p><?php wp_nonce_field('myddpc-login-nonce', 'myddpc_login_nonce_field'); ?><input type="submit" name="myddpc_login_submit" value="Login"></p>
    </form>
    <?php
    return ob_get_clean();
}

add_action('init', 'myddpc_handle_login');
function myddpc_handle_login() {
    if (isset($_POST['myddpc_login_submit']) && check_admin_referer('myddpc-login-nonce', 'myddpc_login_nonce_field')) {
        $creds = ['user_login' => $_POST['login_username'], 'user_password' => $_POST['login_password'], 'remember' => true];
        $user = wp_signon($creds, false);
        if (!is_wp_error($user)) {
            wp_redirect(home_url('/my-account'));
            exit;
        }
    }
}
