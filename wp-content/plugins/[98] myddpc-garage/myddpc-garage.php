<?php
/**
 * Plugin Name:       MyDDPC Garage
 * Plugin URI:        https://myddpc.com/
 * Description:       Manages user vehicle garages and build lists for myddpc.com.
 * Version:           0.1.17 // Updated version
 * Author:            Rory Teehan / Gemini
 * Author URI:        https://myddpc.com/
 * License:           GPL v2 or later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       myddpc-garage
 * Domain Path:       /languages
 */

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
    die;
}

// --- Activation Hook ---
register_activation_hook( __FILE__, 'myddpc_garage_activate' );

function myddpc_garage_activate() {
    myddpc_garage_install();
}

function myddpc_garage_install() {
    global $wpdb;
    $charset_collate = $wpdb->get_charset_collate();
    require_once( ABSPATH . 'wp-admin/includes/upgrade.php' );

    // --- Table: User Garage ---
    $table_name_garage = $wpdb->prefix . 'user_garage';
    // ... (rest of table creation SQL - no changes from previous version)
    $sql_garage = "CREATE TABLE $table_name_garage ( garage_id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, user_id bigint(20) UNSIGNED NOT NULL, vehicle_data_id bigint(20) UNSIGNED NOT NULL, nickname varchar(255) DEFAULT NULL, custom_image_url varchar(1024) DEFAULT NULL, date_added datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY  (garage_id), KEY user_id (user_id), KEY vehicle_data_id (vehicle_data_id) ) $charset_collate;";
    dbDelta( $sql_garage );

    $table_name_images = $wpdb->prefix . 'vehicle_images';
    $sql_images = "CREATE TABLE $table_name_images ( image_id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, vehicle_data_id bigint(20) UNSIGNED NOT NULL, image_url varchar(1024) NOT NULL, PRIMARY KEY  (image_id), UNIQUE KEY vehicle_data_id (vehicle_data_id) ) $charset_collate;";
    dbDelta( $sql_images );

    $table_name_categories = $wpdb->prefix . 'modification_categories';
    $sql_categories = "CREATE TABLE $table_name_categories ( category_id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, category_name varchar(100) NOT NULL, display_order int(11) UNSIGNED NOT NULL DEFAULT 0, vehicle_type varchar(50) NOT NULL DEFAULT 'all', PRIMARY KEY  (category_id), UNIQUE KEY category_name (category_name), KEY display_order (display_order) ) $charset_collate;";
    dbDelta( $sql_categories );

    $table_name_builds = $wpdb->prefix . 'user_garage_builds';
    $sql_builds = "CREATE TABLE $table_name_builds ( build_entry_id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, garage_entry_id bigint(20) UNSIGNED NOT NULL, category_id bigint(20) UNSIGNED NOT NULL, part_name text NOT NULL, part_brand varchar(255) DEFAULT NULL, part_details text DEFAULT NULL, is_custom tinyint(1) NOT NULL DEFAULT 0, date_modified datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY  (build_entry_id), KEY garage_entry_id (garage_entry_id), KEY category_id (category_id) ) $charset_collate;";
    dbDelta( $sql_builds );


    // --- Populate Initial Modification Categories ---
    // Ensure these names EXACTLY match the keys in $generic_part_options in myddpc_display_build_list
    $existing_categories = $wpdb->get_var( "SELECT COUNT(*) FROM $table_name_categories" );
    if ( $existing_categories == 0 ) {
        $default_categories = [
            ['category_name' => 'Engine / ECU Tune', 'display_order' => 10, 'vehicle_type' => 'all'],
            ['category_name' => 'Forced Induction (Turbo/Supercharger)', 'display_order' => 20, 'vehicle_type' => 'all'],
            ['category_name' => 'Intake', 'display_order' => 30, 'vehicle_type' => 'all'],
            ['category_name' => 'Exhaust', 'display_order' => 40, 'vehicle_type' => 'all'],
            ['category_name' => 'Fuel System', 'display_order' => 50, 'vehicle_type' => 'all'],
            ['category_name' => 'Drivetrain (Transmission, Clutch, Differential)', 'display_order' => 60, 'vehicle_type' => 'all'],
            ['category_name' => 'Suspension (Coilovers, Springs, Shocks, Sway Bars)', 'display_order' => 70, 'vehicle_type' => 'all'],
            ['category_name' => 'Brakes (Rotors, Pads, Calipers, Lines)', 'display_order' => 80, 'vehicle_type' => 'all'],
            ['category_name' => 'Wheels', 'display_order' => 90, 'vehicle_type' => 'all'],
            ['category_name' => 'Tires', 'display_order' => 100, 'vehicle_type' => 'all'],
            ['category_name' => 'Exterior / Aerodynamics (Body Kit, Wing, Splitter)', 'display_order' => 110, 'vehicle_type' => 'all'],
            ['category_name' => 'Interior (Seats, Steering Wheel, Gauges)', 'display_order' => 120, 'vehicle_type' => 'all'],
            ['category_name' => 'Lighting', 'display_order' => 130, 'vehicle_type' => 'all'],
        ];
        foreach ( $default_categories as $category ) {
            $wpdb->insert( $table_name_categories, $category, [ '%s', '%d', '%s' ] );
        }
    }
}

// --- Shortcode Definition ---
add_shortcode('myddpc_garage_display', 'myddpc_garage_shortcode_handler');

function myddpc_garage_shortcode_handler($atts) {
    add_action( 'wp', 'myddpc_garage_handle_entry_id_check' );
    add_action( 'wp_enqueue_scripts', 'myddpc_garage_enqueue_scripts' );

    ob_start();
    $entry_id = isset($_GET['entry_id']) ? absint($_GET['entry_id']) : 0;

    if ( ! is_user_logged_in() ) {
        echo '<p>' . sprintf(
            wp_kses(
                __( 'Please <a href="%s">log in</a> to view your garage or builds.', 'myddpc-garage' ),
                [ 'a' => [ 'href' => [] ] ]
            ),
            esc_url( wp_login_url( get_permalink() ) )
        ) . '</p>';
    } elseif ( $entry_id > 0 ) {
        // Output the full build list UI
        echo '<div id="myddpc-build-list-root">';
        myddpc_display_build_list($entry_id);
        echo '</div>';
    } else {
        // Output the full garage UI: cards, add-vehicle modal, and form
        echo '<div id="myddpc-garage-root">';
        myddpc_display_user_garage();
        // Add Vehicle Modal (hidden by default)
        echo '<div id="add-vehicle-modal" class="garage-modal" style="display:none;">';
        echo '<div class="garage-modal-content">';
        echo '<span class="garage-modal-close" id="close-add-vehicle-modal">&times;</span>';
        echo '<h2>' . esc_html__('Add a Vehicle to Your Garage', 'myddpc-garage') . '</h2>';
        myddpc_display_add_vehicle_form();
        echo '</div></div>';
        echo '</div>';
    }
    return ob_get_clean();
}

/**
 * Hook into 'wp' to check entry_id earlier for direct navigation.
 * This is an attempt to ensure WordPress recognizes the query var.
 */
function myddpc_garage_handle_entry_id_check() {
    if ( is_page() && has_shortcode( get_post(get_the_ID())->post_content, 'myddpc_garage_display' ) ) {
        $entry_id = get_query_var('entry_id', 0); // Try to get it from query_vars
        if (empty($entry_id) && isset($_GET['entry_id'])) {
            $entry_id = absint($_GET['entry_id']);
            // error_log("WP Hook Check: entry_id from GET = " . $entry_id);
            // Optionally, you could set it as a query var if it helps, but usually $_GET is sufficient if accessed correctly.
            // set_query_var('entry_id', $entry_id);
        }
    }
}


function myddpc_display_add_vehicle_form() {
    // ... (no changes from previous version)
    ?>
    <form id="add-vehicle-form">
        <?php wp_nonce_field( 'myddpc_add_vehicle_action', 'myddpc_add_vehicle_nonce_field' ); ?>
        <div class="vehicle-selectors">
            <p><label for="garage-year"><?php esc_html_e('Year:', 'myddpc-garage'); ?></label><br><select id="garage-year" name="year" required><option value=""><?php esc_html_e('Loading Years...', 'myddpc-garage'); ?></option></select></p>
            <p><label for="garage-make"><?php esc_html_e('Make:', 'myddpc-garage'); ?></label><br><select id="garage-make" name="make" required disabled><option value=""><?php esc_html_e('Select Year First', 'myddpc-garage'); ?></option></select></p>
            <p><label for="garage-model"><?php esc_html_e('Model:', 'myddpc-garage'); ?></label><br><select id="garage-model" name="model" required disabled><option value=""><?php esc_html_e('Select Make First', 'myddpc-garage'); ?></option></select></p>
            <p><label for="garage-trim"><?php esc_html_e('Trim:', 'myddpc-garage'); ?></label><br><select id="garage-trim" name="trim" required disabled><option value=""><?php esc_html_e('Select Model First', 'myddpc-garage'); ?></option></select></p>
        </div>
        <p><label for="garage-nickname"><?php esc_html_e('Nickname:', 'myddpc-garage'); ?></label><br><input type="text" id="garage-nickname" name="nickname" required maxlength="255"></p>
        <p><button type="submit" id="add-vehicle-submit" class="button button-primary"><?php esc_html_e('Add Vehicle to Garage', 'myddpc-garage'); ?></button></p>
        <div id="add-vehicle-status" style="margin-top: 10px; display: none;"></div>
    </form>
    <?php
}

function myddpc_display_user_garage() {
    // ... (no changes from previous version regarding card generation logic)
    global $wpdb;
    $current_user_id = get_current_user_id();
    if ( ! $current_user_id ) { return; }

    $garage_table = $wpdb->prefix . 'user_garage';
    $vehicle_table = $wpdb->prefix . 'vehicle_data';

    $query = $wpdb->prepare( "SELECT g.garage_id, g.nickname, v.Year, v.Make, v.Model, v.Trim FROM {$garage_table} g JOIN {$vehicle_table} v ON g.vehicle_data_id = v.id WHERE g.user_id = %d ORDER BY g.date_added DESC", $current_user_id );
    $garage_items = $wpdb->get_results( $query );

    // REMOVED: echo '<div id="garage-list" class="garage-gallery">';
    if ( $garage_items === null ) {
        echo '<p class="garage-error">' . esc_html__('Error: Could not retrieve your garage list.', 'myddpc-garage') . '</p>';
    } elseif ( !empty( $garage_items ) ) {
        foreach ( $garage_items as $item ) {
            echo myddpc_generate_single_garage_card_html($item);
        }
    }
    // REMOVED the plugin's default "Add New Vehicle" card block:
    // echo '<div class="garage-card add-vehicle-placeholder-card" id="add-vehicle-placeholder-card-wrapper">';
    //     echo '<button type="button" id="open-add-vehicle-modal-btn" class="button add-new-vehicle-button">';
    //         echo '<span class="plus-icon">+</span> <span class="button-text">' . esc_html__('Add New Vehicle', 'myddpc-garage') . '</span>';
    //     echo '</button>';
    // echo '</div>';
    // REMOVED: echo '</div>';
}

function myddpc_generate_single_garage_card_html($item) {
    // ...existing code...
    if (empty($item) || !is_object($item) || !isset($item->garage_id)) return '';
    ob_start();
    global $wpdb;
    $garage = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$wpdb->prefix}user_garage WHERE garage_id = %d", $item->garage_id));
    $image_url = $garage && $garage->custom_image_url ? $garage->custom_image_url : '';
    // Fix: Define build list URL for the View/Edit Build button
    $build_list_url = add_query_arg('entry_id', $item->garage_id, get_permalink());
    ?>
    <div class="garage-card" data-garage-id="<?php echo esc_attr($item->garage_id); ?>">
        <div class="garage-card-thumbnail">
            <?php if ($image_url): ?>
                <img src="<?php echo esc_url($image_url); ?>" alt="Vehicle Image" class="w-full h-32 object-cover rounded bg-zinc-800">
            <?php else: ?>
                <div class="garage-card-thumbnail-placeholder bg-zinc-800 flex items-center justify-center w-full h-32 rounded text-zinc-400 text-sm">[THUMBNAIL]</div>
            <?php endif; ?>
        </div>
        <div class="garage-card-info">
            <strong><?php echo esc_html( $item->nickname ); ?></strong>
            <div class="vehicle-details"><?php
                $year_disp = isset($item->Year) ? $item->Year : 'N/A';
                $make_disp = isset($item->Make) ? $item->Make : 'N/A';
                $model_disp = isset($item->Model) ? $item->Model : 'N/A';
                $trim_disp = isset($item->Trim) ? $item->Trim : 'N/A';
                echo esc_html( "{$year_disp} {$make_disp} {$model_disp} {$trim_disp}" );
            ?></div>
        </div>
        <div class="garage-card-actions">
            <a href="<?php echo esc_url( $build_list_url ); ?>" class="button view-build-button"><?php echo esc_html__('View/Edit Build', 'myddpc-garage'); ?></a>
            <button type="button" class="remove-garage-vehicle-btn" data-entryid="<?php echo esc_attr( $item->garage_id ); ?>" data-nickname="<?php echo esc_attr( $item->nickname ); ?>"><?php echo esc_html__('Remove Vehicle', 'myddpc-garage'); ?></button>
        </div>
    </div>
    <?php
    return ob_get_clean();
}

/**
 * Displays the build list for a specific garage entry.
 * *** UPDATED: To fix dropdown options and saved value selection. ***
 * @return bool True if displayed, false if entry not found/permission denied.
 */
function myddpc_display_build_list( $entry_id ) {
    global $wpdb;
    $current_user_id = get_current_user_id();
    $garage_table = $wpdb->prefix . 'user_garage';
    $vehicle_table = $wpdb->prefix . 'vehicle_data';
    $categories_table = $wpdb->prefix . 'modification_categories';
    $build_table = $wpdb->prefix . 'user_garage_builds';

    // error_log("Build List Display: Received entry_id = " . $entry_id); // Debugging

    $build_vehicle = $wpdb->get_row( $wpdb->prepare( "SELECT g.garage_id, g.nickname, g.user_id, v.Year, v.Make, v.Model, v.Trim FROM {$garage_table} g JOIN {$vehicle_table} v ON g.vehicle_data_id = v.id WHERE g.garage_id = %d", $entry_id ) );

    if ( ! $build_vehicle ) {
        // error_log("Build List Display: No build_vehicle found for entry_id " . $entry_id);
        echo '<p>' . esc_html__('Error: Build not found. It may have been removed or the ID is incorrect.', 'myddpc-garage') . '</p>';
        echo '<p><a href="' . esc_url( remove_query_arg('entry_id', get_permalink()) ) . '">' . esc_html__('Back to Your Garage', 'myddpc-garage') . '</a></p>';
        return false; // Indicate failure
    }
    if ( $build_vehicle->user_id != $current_user_id ) {
        // error_log("Build List Display: Permission denied for entry_id " . $entry_id . ". User ID: " . $current_user_id . ", Owner ID: " . $build_vehicle->user_id);
        echo '<p>' . esc_html__('Error: You do not have permission to view this build.', 'myddpc-garage') . '</p>';
        echo '<p><a href="' . esc_url( remove_query_arg('entry_id', get_permalink()) ) . '">' . esc_html__('Back to Your Garage', 'myddpc-garage') . '</a></p>';
        return false; // Indicate failure
    }

    $mod_categories = $wpdb->get_results( "SELECT category_id, category_name FROM {$categories_table} ORDER BY display_order ASC" );
    $saved_builds_raw = $wpdb->get_results( $wpdb->prepare( "SELECT * FROM {$build_table} WHERE garage_entry_id = %d ORDER BY build_entry_id ASC", $entry_id ), ARRAY_A);
    $saved_standard_parts = [];
    $saved_custom_parts = [];

    if (!empty($saved_builds_raw)) {
        foreach ($saved_builds_raw as $build_item) {
            if (intval($build_item['is_custom']) === 1) {
                $saved_custom_parts[] = $build_item;
            } else {
                // Store part_name and part_brand for standard parts
                // If part_name can be an array (for multi-select), this logic needs adjustment
                if (!isset($saved_standard_parts[$build_item['category_id']])) {
                    $saved_standard_parts[$build_item['category_id']] = ['part' => [], 'brand' => []];
                }
                $saved_standard_parts[$build_item['category_id']]['part'][] = trim($build_item['part_name']);
                // For brand, decide how to handle multiple parts in one category.
                // For simplicity, taking the first brand or concatenating, or storing an array.
                // Current structure assumes one brand input per category.
                if (!in_array(trim($build_item['part_brand']), $saved_standard_parts[$build_item['category_id']]['brand'])) {
                     if(empty($saved_standard_parts[$build_item['category_id']]['brand'][0])) { // only take first brand if multiple parts selected
                        $saved_standard_parts[$build_item['category_id']]['brand'][] = trim($build_item['part_brand']);
                     }
                }
            }
        }
    }

    // Generic part options - ENSURE KEYS EXACTLY MATCH category_name IN DATABASE
    $generic_part_options = [
        'Engine / ECU Tune' => ['Stage 1 Tune', 'Stage 2 Tune', 'Custom Dyno Tune', 'E85 Tune', 'Methanol Injection Kit'],
        'Forced Induction (Turbo/Supercharger)' => ['Upgraded Turbocharger', 'Upgraded Supercharger', 'Supercharger Pulley Upgrade', 'Wastegate Actuator', 'Blow Off Valve / Diverter Valve', 'Intercooler Upgrade'],
        'Intake' => ['Short Ram Intake', 'Cold Air Intake', 'High-Flow Air Filter', 'Intake Manifold Upgrade', 'Throttle Body Upgrade'],
        'Exhaust' => ['Axle-Back Exhaust', 'Cat-Back Exhaust', 'Turbo-Back Exhaust', 'Downpipe (Catted/Catless)', 'Headers / Exhaust Manifold', 'Muffler Delete'],
        'Fuel System' => ['Upgraded Fuel Pump (LPFP/HPFP)', 'Upgraded Fuel Injectors', 'Ethanol Content Sensor (Flex Fuel Kit)', 'Fuel Pressure Regulator'],
        'Drivetrain (Transmission, Clutch, Differential)' => ['Short Shifter Kit', 'Upgraded Clutch Kit', 'Lightweight Flywheel', 'Limited Slip Differential (LSD)', 'Transmission Cooler', 'Differential Brace'],
        'Suspension (Coilovers, Springs, Shocks, Sway Bars)' => ['Lowering Springs', 'Sport Shocks / Struts', 'Coilover Kit', 'Sway Bars (Front/Rear)', 'Adjustable Control Arms', 'Strut Tower Brace', 'Chassis Bracing'],
        'Brakes (Rotors, Pads, Calipers, Lines)' => ['Performance Brake Pads', 'Slotted Rotors', 'Drilled Rotors', 'Two-Piece Rotors', 'Braided Stainless Steel Brake Lines', 'Big Brake Kit (BBK)', 'High-Temp Brake Fluid'],
        'Wheels' => ['Lightweight Alloy Wheels', 'Forged Wheels', 'Flow-Formed Wheels', 'Wheel Spacers', 'Extended Lug Nuts/Bolts'],
        'Tires' => ['Summer Performance Tires', 'All-Season Performance Tires', 'Track/Competition Tires (R-Compound)', 'Winter Tires'],
        'Exterior / Aerodynamics (Body Kit, Wing, Splitter)' => ['Front Lip / Splitter', 'Side Skirts / Extensions', 'Rear Diffuser', 'Spoiler / Wing (Trunk/Roof)', 'Canards', 'Widebody Kit', 'Custom Grille'],
        'Interior (Seats, Steering Wheel, Gauges)' => ['Racing Seats / Bucket Seats', 'Aftermarket Steering Wheel', 'Harness Bar / Roll Cage (Partial)', 'Performance Pedals', 'Shift Knob', 'Boost Gauge', 'Oil Pressure Gauge', 'Wideband AFR Gauge'],
        'Lighting' => ['LED Headlight Bulbs / Housings', 'LED Taillights', 'HID Conversion Kit', 'Fog Light Upgrade', 'Interior LED Conversion'],
        // Add more categories and parts as needed
    ];

    echo '<div class="build-list-container">';
    echo '<h2>' . esc_html__( 'Build List for: ', 'myddpc-garage' ) . esc_html( $build_vehicle->nickname ) . '</h2>';
    echo '<p><strong>' . esc_html__('Base Vehicle:', 'myddpc-garage') . '</strong> ' . esc_html( "{$build_vehicle->Year} {$build_vehicle->Make} {$build_vehicle->Model} {$build_vehicle->Trim}" ) . '</p>';
    echo '<p><button type="button" class="remove-garage-vehicle-btn button button-danger" data-entryid="' . esc_attr( $entry_id ) . '" data-nickname="' . esc_attr( $build_vehicle->nickname ) . '">' . esc_html__('Remove This Vehicle', 'myddpc-garage') . '</button></p>';
    echo '<div class="build-list-thumbnail">' . esc_html__('[THUMBNAIL]', 'myddpc-garage') . '</div>';
    echo '<p><a href="' . esc_url( remove_query_arg('entry_id', get_permalink()) ) . '">&laquo; ' . esc_html__('Back to Your Garage', 'myddpc-garage') . '</a></p>';
    echo '<form id="build-list-form">';
    wp_nonce_field( 'myddpc_save_build_action', 'myddpc_save_build_nonce' );
    echo '<input type="hidden" name="garage_entry_id" value="' . esc_attr( $entry_id ) . '">';

    // Insert Build-Type dropdown here
    echo '<div class="build-type-selector">';
    echo '<label for="build-type">' . esc_html__('Build Type:', 'myddpc-garage') . '</label>';
    echo '<select id="build-type" name="build_type">'; // Value for this select should be saved and reloaded
    $saved_build_type = get_post_meta($entry_id, '_myddpc_build_type', true) ?: 'custom'; // Example of saving/loading
    echo '<option value="daily" '.selected($saved_build_type, 'daily', false).'>' . esc_html__('Daily', 'myddpc-garage') . '</option>';
    echo '<option value="track" '.selected($saved_build_type, 'track', false).'>' . esc_html__('Track', 'myddpc-garage') . '</option>';
    echo '<option value="drift" '.selected($saved_build_type, 'drift', false).'>' . esc_html__('Drift', 'myddpc-garage') . '</option>';
    echo '<option value="offroad" '.selected($saved_build_type, 'offroad', false).'>' . esc_html__('Off-Road', 'myddpc-garage') . '</option>';
    echo '<option value="custom" '.selected($saved_build_type, 'custom', false).'>' . esc_html__('Custom (all)', 'myddpc-garage') . '</option>';
    echo '</select>';
    echo '</div>';

    // --- NEW: Section header before modification slots ---
    echo '<h3 class="mod-section-header" style="margin-top:2em;margin-bottom:1em;font-size:1.3em;font-weight:600;color:#38bdf8;">Modification Slots</h3>';

    // --- Modification slots, full width, single line spacing, status select ---
    if ( ! empty( $mod_categories ) ) {
        echo '<div class="modification-slots-list" style="width:100%;">';
        foreach ( $mod_categories as $cat ) {
            $cat_name = $cat->category_name;
            $cat_id = $cat->category_id;
            $selected_part = isset($saved_standard_parts[$cat_id]['part_name']) ? $saved_standard_parts[$cat_id]['part_name'] : '';
            $selected_status = isset($saved_standard_parts[$cat_id]['status']) ? $saved_standard_parts[$cat_id]['status'] : 'planned';
            $options = isset($generic_part_options[$cat_name]) ? $generic_part_options[$cat_name] : [];
            echo '<div class="mod-slot-row" style="display:flex;align-items:center;gap:1em;margin-bottom:0.5em;width:100%;">';
            echo '<label style="min-width:220px;font-weight:500;">' . esc_html($cat_name) . '</label>';
            echo '<select name="part_category['.esc_attr($cat_id).'][part_name]" class="mod-part-select" style="flex:1;min-width:180px;max-width:350px;">';
            echo '<option value="">' . esc_html__('Select part...', 'myddpc-garage') . '</option>';
            foreach ($options as $opt) {
                echo '<option value="' . esc_attr($opt) . '"' . selected($selected_part, $opt, false) . '>' . esc_html($opt) . '</option>';
            }
            echo '</select>';
            // --- Status select ---
            echo '<select name="part_category['.esc_attr($cat_id).'][status]" class="mod-status-select" style="min-width:120px;">';
            echo '<option value="installed"' . selected($selected_status, 'installed', false) . '>' . esc_html__('Installed', 'myddpc-garage') . '</option>';
            echo '<option value="ordered"' . selected($selected_status, 'ordered', false) . '>' . esc_html__('Ordered', 'myddpc-garage') . '</option>';
            echo '<option value="planned"' . selected($selected_status, 'planned', false) . '>' . esc_html__('Planned', 'myddpc-garage') . '</option>';
            echo '</select>';
            echo '</div>';
        }
        echo '</div>';
    } else {
        echo '<p>' . esc_html__('No modification categories found.', 'myddpc-garage') . '</p>';
    }

    echo '<div class="custom-parts-section"><h3>' . esc_html__('Custom / Other Parts:', 'myddpc-garage') . '</h3><ul id="custom-parts-list">';
    // loop: show each previously saved custom part
    if ( ! empty( $saved_custom_parts ) ) {
        foreach ( $saved_custom_parts as $idx => $item ) {
            $name    = esc_attr( $item['part_name'] );
            $details = esc_attr( $item['part_details'] );
            // $unique_id = 'custom_part_' . $idx; // unique_id might still be useful for labels if you re-add 'for' attributes
            echo '<li class="custom-part-item"><div class="custom-part-inputs">';
            echo '<label>' . esc_html__('Part Name:','myddpc-garage') . '</label>'; // Removed 'for' attribute
            echo '<input type="text"'
               . ' name="custom_part_name[]"'
               . ' value="' . $name . '"'
               // . ' id="' . $unique_id . '_name"' // Removed id
               . ' placeholder="' . esc_attr__('e.g., Custom Strut Brace', 'myddpc-garage') . '"'
               . ' required>';
            echo '<label>' . esc_html__('Brand / Details:','myddpc-garage') . '</label>'; // Corrected "Brand ils:" to "Brand / Details:" and removed 'for'
            echo '<input type="text"'
               . ' name="custom_part_details[]"'
               . ' value="' . $details . '"'
               // . ' id="' . $unique_id . '_details"' // Removed id
               . ' placeholder="' . esc_attr__('e.g., UltraRacing', 'myddpc-garage') . '">';
            echo '</div>';
            echo '<button type="button" class="remove-custom-part" title="' . esc_attr__('Remove this part', 'myddpc-garage') . '">&times;</button>';
            echo '</li>';
        }
    }
    // then your “Add Custom Part” button as normal
    echo '</ul><button type="button" id="add-custom-part-button" class="button">+ ' . esc_html__('Add Custom Part', 'myddpc-garage') . '</button></div>';
    echo '<p style="margin-top: 2em;"><button type="submit" id="save-build-list-button" class="button button-primary">' . esc_html__('Save Build', 'myddpc-garage') . '</button><span id="save-build-status" style="margin-left: 10px;"></span></p>';
    echo '</form>';

    // --- Count status for pills and progress ---
    $status_counts = ['installed' => 0, 'ordered' => 0, 'planned' => 0, 'total' => 0];
    foreach ($mod_categories as $cat) {
        $cat_id = $cat->category_id;
        $selected_status = isset($saved_standard_parts[$cat_id]['status']) ? $saved_standard_parts[$cat_id]['status'] : 'planned';
        $selected_part = isset($saved_standard_parts[$cat_id]['part_name']) ? $saved_standard_parts[$cat_id]['part_name'] : '';
        if ($selected_part) {
            $status_counts['total']++;
            if (in_array($selected_status, ['installed', 'ordered', 'planned'])) {
                $status_counts[$selected_status]++;
            }
        }
    }
    // --- Pills for Installed, Ordered, Planned ---
    echo '<div class="build-status-pills flex gap-3 mb-6">';
    echo '<span class="status-pill installed bg-green-600 text-white px-3 py-1 rounded-full text-sm">' . esc_html__('Installed', 'myddpc-garage') . ': ' . $status_counts['installed'] . '</span>';
    echo '<span class="status-pill ordered bg-yellow-500 text-white px-3 py-1 rounded-full text-sm">' . esc_html__('Ordered', 'myddpc-garage') . ': ' . $status_counts['ordered'] . '</span>';
    echo '<span class="status-pill planned bg-blue-500 text-white px-3 py-1 rounded-full text-sm">' . esc_html__('Planned', 'myddpc-garage') . ': ' . $status_counts['planned'] . '</span>';
    echo '</div>';
    // --- Overall Build Progress Calculation ---
    $progress = $status_counts['total'] > 0 ? round(($status_counts['installed'] / $status_counts['total']) * 100) : 0;
    echo '<div class="overall-build-progress mb-8">';
    echo '<label style="font-weight:600;">' . esc_html__('Overall Build Progress:', 'myddpc-garage') . '</label>';
    echo '<div class="progress-bar-container bg-zinc-800 rounded h-4 w-full mt-2" style="max-width:400px;margin:auto;">';
    echo '<div class="progress-bar bg-green-500 h-4 rounded transition-all" style="width:' . esc_attr($progress) . '%;"></div>';
    echo '</div>';
    echo '<div class="text-center text-sm text-zinc-400 mt-1">' . esc_html($progress) . '% ' . esc_html__('Installed', 'myddpc-garage') . '</div>';
    echo '</div>';

    return true; // Indicate success
}


// --- AJAX Handler for Adding Vehicle ---
add_action('wp_ajax_add_vehicle_to_garage', 'myddpc_ajax_add_vehicle_to_garage_handler');
function myddpc_ajax_add_vehicle_to_garage_handler() {
    // ... (no changes from previous version)
    global $wpdb;
    check_ajax_referer('myddpc_add_vehicle_action', 'myddpc_add_vehicle_nonce_field');
    if ( ! is_user_logged_in() ) { wp_send_json_error( ['message' => __('You must be logged in.', 'myddpc-garage')], 403 ); }
    $year = isset($_POST['year']) ? sanitize_text_field($_POST['year']) : null;
    $make = isset($_POST['make']) ? sanitize_text_field($_POST['make']) : null;
    $model = isset($_POST['model']) ? sanitize_text_field($_POST['model']) : null;
    $trim = isset($_POST['trim']) ? sanitize_text_field($_POST['trim']) : null;
    $nickname = isset($_POST['nickname']) ? sanitize_text_field($_POST['nickname']) : null;
    if ( empty($year) || empty($make) || empty($model) || empty($trim) || empty($nickname) ) { wp_send_json_error(['message' => __('All fields are required.', 'myddpc-garage')], 400); }
    $vehicle_table = $wpdb->prefix . 'vehicle_data';
    $vehicle_data_id = $wpdb->get_var( $wpdb->prepare( "SELECT id FROM {$vehicle_table} WHERE Year = %s AND Make = %s AND Model = %s AND Trim = %s LIMIT 1", $year, $make, $model, $trim ) );
    if ( ! $vehicle_data_id ) { wp_send_json_error(['message' => __('Could not find matching vehicle in our database.', 'myddpc-garage')], 404); }
    $garage_table = $wpdb->prefix . 'user_garage';
    $current_user_id = get_current_user_id();
    $inserted = $wpdb->insert( $garage_table, [ 'user_id' => $current_user_id, 'vehicle_data_id' => $vehicle_data_id, 'nickname' => $nickname, 'date_added' => current_time('mysql', 1) ], [ '%d', '%d', '%s', '%s' ] );
    if ( false === $inserted ) { wp_send_json_error(['message' => __('Database error: Could not save vehicle. ', 'myddpc-garage') . $wpdb->last_error], 500); }
    $new_garage_id = $wpdb->insert_id;
    $new_item_data = new stdClass();
    $new_item_data->garage_id = $new_garage_id;
    $new_item_data->nickname = $nickname;
    $new_item_data->Year = $year;
    $new_item_data->Make = $make;
    $new_item_data->Model = $model;
    $new_item_data->Trim = $trim;
    $new_card_html = myddpc_generate_single_garage_card_html($new_item_data);

    $garage_entry_id = $wpdb->insert_id; // assuming you just did $wpdb->insert()
    wp_send_json_success([
        'message'       => __('Vehicle added successfully!', 'myddpc-garage'),
        'entry_id'      => $garage_entry_id,
        'new_card_html' => $card_html,
    ]);

}

// --- AJAX Handler for Getting Years ---
add_action('wp_ajax_myddpc_garage_get_years', 'myddpc_garage_ajax_get_years_handler');
add_action('wp_ajax_nopriv_myddpc_garage_get_years', 'myddpc_garage_ajax_get_years_handler');
function myddpc_garage_ajax_get_years_handler() {
    // ... (no changes from previous version)
    check_ajax_referer('myddpc_get_years_action', 'myddpc_get_years_nonce_field');
    global $wpdb; $vehicle_table = $wpdb->prefix . 'vehicle_data';
    $years = $wpdb->get_col( $wpdb->prepare( "SELECT DISTINCT CAST(Year AS UNSIGNED) as year_int FROM %i WHERE Year IS NOT NULL AND Year != '' AND CAST(Year AS UNSIGNED) > 0 ORDER BY year_int DESC", $vehicle_table ) );
    if ( is_wp_error($years) ) { wp_send_json_error(['message' => __('Failed to retrieve years.', 'myddpc-garage')], 500); }
    elseif ( $years === null || empty($years) ) { wp_send_json_success([]); }
    else { wp_send_json_success($years); }
}

// --- AJAX Handler for Saving Build List ---
// Replaced existing handler with the new one below
add_action('wp_ajax_myddpc_save_build_list', 'myddpc_ajax_save_build_list');
function myddpc_ajax_save_build_list() {
  // 1) Security & basic checks
  // Corrected check_ajax_referer: first param is the action, second is the nonce field name from POST.
  // Nonce was created with action 'myddpc_save_build' and sent in POST field 'myddpc_save_build_nonce'.
  check_ajax_referer('myddpc_save_build','myddpc_save_build_nonce');
  $user_id = get_current_user_id();
  if ( !$user_id ) { // Ensure user is actually logged in, get_current_user_id() returns 0 if not.
      wp_send_json_error(['message'=>'You must be logged in.'], 401);
  }
  $entry_id = isset($_POST['garage_entry_id']) ? absint($_POST['garage_entry_id']) : 0; // Ensure entry_id is captured
  if (!$entry_id) {
    wp_send_json_error(['message'=>'Invalid entry ID.']);
  }
  global $wpdb;
  $owner = $wpdb->get_var( $wpdb->prepare(
    "SELECT user_id FROM {$wpdb->prefix}user_garage WHERE garage_id=%d",
    $entry_id
  ) );
  if ($owner != $user_id) {
    wp_send_json_error(['message'=>'Permission denied.']);
  }

  // 2) Grab incoming data
  // --- Save status for each modification slot ---
  $part_cat = isset($_POST['part_category']) && is_array($_POST['part_category']) ? $_POST['part_category'] : [];
  $custom_names   = isset($_POST['custom_part_name']) && is_array($_POST['custom_part_name'])
                  ? array_map('sanitize_text_field', $_POST['custom_part_name'])   
                  : [];
  $custom_details = isset($_POST['custom_part_details']) && is_array($_POST['custom_part_details'])
                  ? array_map('sanitize_text_field', $_POST['custom_part_details'])
                  : [];
  $build_type = isset($_POST['build_type']) ? sanitize_text_field($_POST['build_type']) : 'custom';


  // 3) Wipe out old builds
  $wpdb->delete("{$wpdb->prefix}user_garage_builds", ['garage_entry_id'=>$entry_id]);

  // 4) Insert standard parts
  foreach ($part_cat as $cat_key => $data) {
        $part_name = isset($data['part_name']) ? sanitize_text_field($data['part_name']) : '';
        $status = isset($data['status']) ? sanitize_text_field($data['status']) : 'planned';
        if ($part_name) {
            $wpdb->insert(
                "{$wpdb->prefix}user_garage_builds",
                [
                    'garage_entry_id' => $entry_id,
                    'category_id' => $cat_key,
                    'part_name' => $part_name,
                    'is_custom' => 0,
                    'part_brand' => null,
                    'part_details' => null,
                    'date_modified' => current_time('mysql', 1),
                    'status' => $status
                ],
                [ '%d', '%d', '%s', '%d', '%s', '%s', '%s', '%s' ]
            );
        }
    }

  // 5) Insert custom parts
  foreach ($custom_names as $i => $name) {
    $n = $name; // Already sanitized from array_map
    if (!$n) continue;
    $d = isset($custom_details[$i])? $custom_details[$i] : ''; // Already sanitized
    $wpdb->insert("{$wpdb->prefix}user_garage_builds", [
      'garage_entry_id'=> $entry_id,
      'category_id'    => 0, // Custom parts don't have a predefined category_id from the table
      'part_name'      => $n,
      'part_brand'     => '', // Custom parts might not have a "brand" in the same way, details field is used
      'part_details'   => $d,
      'is_custom'      => 1,
      'date_modified'  => current_time('mysql', 1)
    ], ['%d','%d','%s','%s','%s','%d','%s']);
  }

  // Save the build type as post meta
  update_post_meta($entry_id, '_myddpc_build_type', $build_type);


  wp_send_json_success(['message'=>'Build list saved.']);
}


// --- AJAX Handler for Removing Vehicle ---
add_action('wp_ajax_myddpc_remove_vehicle', 'myddpc_ajax_remove_vehicle_handler');
function myddpc_ajax_remove_vehicle_handler() {
    // ... (no changes from previous version)
    global $wpdb;
    if ( ! isset( $_POST['nonce'] ) || ! wp_verify_nonce( $_POST['nonce'], 'myddpc_remove_vehicle_action' ) ) { wp_send_json_error( ['message' => 'Nonce verification failed.'], 403 );}
    if ( ! is_user_logged_in() ) { wp_send_json_error( ['message' => 'You must be logged in.'], 401 ); }
    $entry_id = isset( $_POST['entry_id'] ) ? absint( $_POST['entry_id'] ) : 0;
    if ( $entry_id <= 0 ) { wp_send_json_error( ['message' => 'Invalid Vehicle ID.'], 400 ); }
    $current_user_id = get_current_user_id();
    $garage_table = $wpdb->prefix . 'user_garage';
    $build_table = $wpdb->prefix . 'user_garage_builds';
    $owner_id = $wpdb->get_var( $wpdb->prepare( "SELECT user_id FROM {$garage_table} WHERE garage_id = %d", $entry_id ) );
    if ( $owner_id != $current_user_id ) { wp_send_json_error( ['message' => 'Permission denied.'], 403 ); }
    $wpdb->query('START TRANSACTION');
    $builds_deleted = $wpdb->delete( $build_table, ['garage_entry_id' => $entry_id], ['%d'] );
    if ( $builds_deleted === false ) { $wpdb->query('ROLLBACK'); wp_send_json_error( ['message' => 'Error removing associated modifications.'], 500 ); }
    $entry_deleted = $wpdb->delete( $garage_table, ['garage_id' => $entry_id, 'user_id' => $current_user_id], ['%d', '%d'] );
    if ( $entry_deleted === false ) { $wpdb->query('ROLLBACK'); wp_send_json_error( ['message' => 'Error removing vehicle from garage.'], 500 ); }
    elseif ( $entry_deleted === 0 ) { $wpdb->query('ROLLBACK'); wp_send_json_error( ['message' => 'Vehicle not found or already removed.'], 404 );}
    $wpdb->query('COMMIT');
    wp_send_json_success( ['message' => 'Vehicle and modifications removed successfully.'] );
}

// --- Enqueue Scripts and Styles ---
add_action( 'wp_enqueue_scripts', 'myddpc_garage_enqueue_scripts' );
function myddpc_garage_enqueue_scripts() {
    global $post;
    $is_garage_page = is_a( $post, 'WP_Post' ) && has_shortcode( $post->post_content, 'myddpc_garage_display' );
    if( ! $is_garage_page ) { return; }

    $entry_id = isset($_GET['entry_id']) ? absint($_GET['entry_id']) : 0;
    wp_enqueue_script('jquery');

    $css_file_path = plugin_dir_path( __FILE__ ) . 'css/myddpc-garage-style.css';
    if ( file_exists( $css_file_path ) ) {
        wp_enqueue_style('myddpc-garage-style', plugin_dir_url( __FILE__ ) . 'css/myddpc-garage-style.css', array(), filemtime( $css_file_path ));
    }

    $common_script_path = plugin_dir_path( __FILE__ ) . 'js/myddpc-garage-common.js';
    if ( file_exists( $common_script_path ) ) {
        wp_enqueue_script( 'myddpc-garage-common', plugin_dir_url( __FILE__ ) . 'js/myddpc-garage-common.js', ['jquery'], filemtime( $common_script_path ), true );
        wp_localize_script('myddpc-garage-common', 'myddpc_common_settings', [
            'ajax_url' => admin_url('admin-ajax.php'),
            'remove_vehicle_nonce' => wp_create_nonce('myddpc_remove_vehicle_action')
        ]);
    }

    if ( $entry_id === 0 ) { // Scripts for the main garage view (add vehicle form)
        $script_path = plugin_dir_path( __FILE__ ) . 'js/garage-form.js';
        if ( file_exists( $script_path ) ) {
            wp_enqueue_script( 'myddpc-garage-form', plugin_dir_url( __FILE__ ) . 'js/garage-form.js', ['jquery'], filemtime( $script_path ), true );
            wp_localize_script('myddpc-garage-form', 'myddpc_garage_settings', [
                'ajax_url' => admin_url('admin-ajax.php'),
                'add_vehicle_nonce' => wp_create_nonce('myddpc_add_vehicle_action'),
                'add_vehicle_nonce_field_name' => 'myddpc_add_vehicle_nonce_field',
                'carlookup_plugin_options_action' => 'myddpc_cl_get_vehicle_options',
                'carlookup_plugin_nonce_value'    => wp_create_nonce('myddpc_cl_car_lookup_secure_action'),
                'carlookup_plugin_nonce_field'  => 'myddpc_cl_nonce_field',
                'get_years_nonce' => wp_create_nonce('myddpc_get_years_action'),
                'get_years_nonce_field_name' => 'myddpc_get_years_nonce_field'
            ]);
        }
    }
    // The new function myddpc_garage_enqueue_build_list_assets will handle build-list.js and Select2
    // So, the 'else' block that previously enqueued build-list.js here is removed.
}

// Enqueue Select2 & localized build‑list assets on your garage page
add_action('wp_enqueue_scripts','myddpc_garage_enqueue_build_list_assets');
function myddpc_garage_enqueue_build_list_assets(){
    // only on your /garage/ page (or more specifically, when build list is shown)
    // Consider a more precise check, e.g., if an entry_id is present, similar to the old logic.
    // For now, using the condition from the diff.
    if( ! is_page() || false === strpos($_SERVER['REQUEST_URI'],'garage') ) return; // Basic check
    // A more robust check would be if an entry_id is present, indicating build list view.
    if ( !isset($_GET['entry_id']) || empty($_GET['entry_id']) ) return;


    // Select2
    wp_enqueue_style(
      'select2-css',
      'https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css'
    );
    wp_enqueue_script(
      'select2-js',
      'https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js',
      ['jquery'],null,true
    );

    // Your build‑list.js (depends on jQuery + Select2)
    // IMPORTANT: Adjusted path from 'assets/js/' to 'js/' to match your structure
    $script_path = plugin_dir_path( __FILE__ ) . 'js/build-list.js';
    if ( file_exists( $script_path ) ) {
        wp_enqueue_script(
          'myddpc-build-list',
          plugin_dir_url(__FILE__).'js/build-list.js', // Corrected path
          ['jquery','select2-js'],
          filemtime( $script_path ), // Use filemtime for versioning
          true
        );
        // IMPORTANT: Nonce action name changed to 'myddpc_save_build'
        // Ensure myddpc_ajax_save_build_list_handler verifies against this action name.
        wp_localize_script('myddpc-build-list','myddpc_build_list_settings',[
          'ajax_url'   => admin_url('admin-ajax.php'),
          'save_nonce' => wp_create_nonce('myddpc_save_build'),
          'max_custom_parts' => 10, // Kept this from previous localization, remove if not needed
          // Add other settings like car_specs if needed by build-list.js
          // 'car_specs' => [], // Example: Populate this with actual car specs
        ]);
    }
}

// --- AJAX handler for updating a single part from the modal ---
add_action('wp_ajax_myddpc_update_single_part', function() {
    global $wpdb;
    $user_id = get_current_user_id();
    $entry_id = isset($_POST['garage_entry_id']) ? absint($_POST['garage_entry_id']) : 0;
    $cat_id = isset($_POST['cat_id']) ? absint($_POST['cat_id']) : 0;
    $part_name = isset($_POST['part_name']) ? sanitize_text_field($_POST['part_name']) : '';
    $brand = isset($_POST['brand']) ? sanitize_text_field($_POST['brand']) : '';
    $status = isset($_POST['status']) ? sanitize_text_field($_POST['status']) : 'planned';
    $notes = isset($_POST['notes']) ? sanitize_textarea_field($_POST['notes']) : '';
    if (!$user_id || !$entry_id || !$cat_id) {
        wp_send_json_error(['message' => 'Invalid request.']);
    }
    $owner = $wpdb->get_var($wpdb->prepare("SELECT user_id FROM {$wpdb->prefix}user_garage WHERE garage_id=%d", $entry_id));
    if ($owner != $user_id) {
        wp_send_json_error(['message' => 'Permission denied.']);
    }
    $wpdb->delete("{$wpdb->prefix}user_garage_builds", ['garage_entry_id'=>$entry_id, 'category_id'=>$cat_id]);
    if ($part_name) {
        $wpdb->insert(
            "{$wpdb->prefix}user_garage_builds",
            [
                'garage_entry_id' => $entry_id,
                'category_id' => $cat_id,
                'part_name' => $part_name,
                'is_custom' => 0,
                'part_brand' => $brand,
                'part_details' => $notes,
                'date_modified' => current_time('mysql', 1),
                'status' => $status
            ],
            [ '%d', '%d', '%s', '%d', '%s', '%s', '%s', '%s' ]
        );
    }
    wp_send_json_success(['message' => 'Part updated.']);
});
// --- AJAX handler for uploading vehicle photo ---
add_action('wp_ajax_myddpc_upload_vehicle_photo', function() {
    if (!current_user_can('upload_files')) {
        wp_send_json_error(['message' => 'Permission denied.']);
    }
    $user_id = get_current_user_id();
    $entry_id = isset($_POST['garage_entry_id']) ? absint($_POST['garage_entry_id']) : 0;
    if (!$user_id || !$entry_id || !isset($_FILES['photo'])) {
        wp_send_json_error(['message' => 'Invalid request.']);
    }
    global $wpdb;
    $owner = $wpdb->get_var($wpdb->prepare("SELECT user_id FROM {$wpdb->prefix}user_garage WHERE garage_id=%d", $entry_id));
    if ($owner != $user_id) {
        wp_send_json_error(['message' => 'Permission denied.']);
    }
    $file = $_FILES['photo'];
    require_once(ABSPATH . 'wp-admin/includes/file.php');
    $upload = wp_handle_upload($file, ['test_form' => false]);
    if (isset($upload['error'])) {
        wp_send_json_error(['message' => $upload['error']]);
    }
    $image_url = $upload['url'];
    // Save to custom_image_url in user_garage
    $wpdb->update(
        $wpdb->prefix . 'user_garage',
        ['custom_image_url' => $image_url],
        ['garage_id' => $entry_id],
        ['%s'],
        ['%d']
    );
    wp_send_json_success(['image_url' => $image_url]);
});
?>
