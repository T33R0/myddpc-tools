<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class Discover_Query {

    protected $wpdb;
    protected $table_name;

    // **CORRECTED**: Definitive list of columns for sorting, based on your reference file.
    protected $allowed_sort_columns = [
        'Year', 'Make', 'Model', 'Horsepower (HP)', 'Torque (ft-lbs)', 'Curb weight (lbs)', 'Cargo capacity (cu ft)', 'Maximum towing capacity (lbs)', 'Ground clearance (in)', 'EPA combined MPG'
    ];

    // **CORRECTED**: Definitive list of columns for generating filter options, based on your reference file.
    protected $filter_columns = [
        'Year',
        'Make',
        'Body type',
        'Car classification',
        'Drive type',
        'Transmission',
        'Cylinders',
        'Doors',
        'Total seating',
        'Fuel type',
        'Country of origin'
    ];

    public function __construct() {
        global $wpdb;
        $this->wpdb = $wpdb;
        $this->table_name = $this->wpdb->prefix . 'vehicle_data';
    }

    /**
     * Get all available options for the filter sidebar.
     * This now generates options for the complete list of specified filters.
     */
    public function get_discover_filter_options() {
        $options = [];
        foreach ($this->filter_columns as $column) {
            // Use whitelist approach for column names to prevent SQL injection
            if (!in_array($column, $this->filter_columns)) {
                continue; // Skip invalid columns
            }
            
            $sql_column_name = '`' . esc_sql(trim($column)) . '`';
            // Sanitize the key for JSON output (e.g., 'Body type' becomes 'body_type')
            $json_key = strtolower(str_replace([' ', '(', ')'], ['_', '', ''], $column));

            $results = $this->wpdb->get_col(
                "SELECT DISTINCT {$sql_column_name} 
                 FROM {$this->table_name} 
                 WHERE {$sql_column_name} IS NOT NULL AND {$sql_column_name} != '' 
                 ORDER BY {$sql_column_name} ASC"
            );
            
            $options[$json_key] = $results;
        }
        // Sort Year descending for better UX
        if(isset($options['year'])) {
            rsort($options['year']);
        }
        return $options;
    }

    /**
     * Get filtered, sorted, and paginated vehicle results.
     * REFACTORED: Groups by year-make-model to show one consolidated record per vehicle model.
     * Aggregates all associated trims into a single vehicle object to eliminate duplicates.
     */
    public function get_discover_results( $filters = [], $limit = 25, $offset = 0, $sort_by = 'Year', $sort_dir = 'desc' ) {
        // --- WHERE CLAUSE BUILDER ---
        $where_clauses = [ '1=1' ];
        $params = [];

        if (!empty($filters)) {
            // Re-create the full list of filterable columns from your reference.
            $all_filter_keys = [
                'year' => 'Year', 'make' => 'Make', 'body_type' => 'Body type', 'car_classification' => 'Car classification',
                'drive_type' => 'Drive type', 'transmission' => 'Transmission', 'cylinders' => 'Engine Configuration',
                'doors' => 'Doors', 'total_seating' => 'Total seating', 'fuel_type' => 'Fuel type',
                'country_of_origin' => 'Country of origin'
            ];

            foreach ($filters as $key => $value) {
                // Check if the filter key is valid and has a non-empty value
                if (isset($all_filter_keys[$key]) && !empty($value)) {
                    $column_name = $all_filter_keys[$key];
                    // Additional security: ensure column name is in our whitelist
                    if (in_array($column_name, $this->filter_columns) || in_array($column_name, $this->allowed_sort_columns)) {
                        $where_clauses[] = "`" . esc_sql($column_name) . "` = %s";
                        $params[] = $value;
                    }
                }
            }
        }
        $where_sql = implode(' AND ', $where_clauses);

        // --- SORTING ---
        $sort_by_safe = in_array($sort_by, $this->allowed_sort_columns) ? $sort_by : 'Year';
        $sort_dir_safe = strtolower($sort_dir) === 'asc' ? 'ASC' : 'DESC';
        $orderby_sql = '`' . esc_sql($sort_by_safe) . '` ' . $sort_dir_safe;

        // --- CONSOLIDATED RESULTS QUERY ---
        // Group by Year, Make, Model only to get one unique record per vehicle model
        $consolidated_query = $this->wpdb->prepare(
            "SELECT 
                MIN(ID) as representative_id,
                `Year`, `Make`, `Model`,
                MIN(`Trim`) as representative_trim,
                MIN(`Body type`) as representative_body_type,
                MIN(`Car classification`) as representative_classification,
                MIN(`Drive type`) as representative_drive_type,
                MIN(`Transmission`) as representative_transmission,
                MIN(`Cylinders`) as representative_cylinders,
                MIN(`Doors`) as representative_doors,
                MIN(`Total seating`) as representative_seating,
                MIN(`Fuel type`) as representative_fuel_type,
                MIN(`Country of origin`) as representative_origin,
                MIN(`Horsepower (HP)`) as min_horsepower,
                MAX(`Horsepower (HP)`) as max_horsepower,
                MIN(`Torque (ft-lbs)`) as min_torque,
                MAX(`Torque (ft-lbs)`) as max_torque,
                MIN(`Curb weight (lbs)`) as min_weight,
                MAX(`Curb weight (lbs)`) as max_weight,
                MIN(`EPA combined MPG`) as min_mpg,
                MAX(`EPA combined MPG`) as max_mpg,
                MIN(`Cargo capacity (cu ft)`) as min_cargo,
                MAX(`Cargo capacity (cu ft)`) as max_cargo,
                MIN(`Maximum towing capacity (lbs)`) as min_towing,
                MAX(`Maximum towing capacity (lbs)`) as max_towing,
                MIN(`Ground clearance (in)`) as min_clearance,
                MAX(`Ground clearance (in)`) as max_clearance,
                COUNT(*) as trim_count,
                GROUP_CONCAT(DISTINCT `Trim` ORDER BY `Trim` ASC SEPARATOR ';') as available_trims,
                GROUP_CONCAT(DISTINCT `Body type` ORDER BY `Body type` ASC SEPARATOR ';') as available_body_types
             FROM {$this->table_name} 
             WHERE " . $where_sql . " 
             GROUP BY `Year`, `Make`, `Model`
             ORDER BY " . $orderby_sql . ", `Make` ASC, `Model` ASC 
             LIMIT %d OFFSET %d",
            array_merge($params, [$limit, $offset])
        );
        
        $consolidated_results = $this->wpdb->get_results($consolidated_query, ARRAY_A);

        // --- GET FULL DATA FOR REPRESENTATIVE VEHICLES ---
        if (!empty($consolidated_results)) {
            $representative_ids = array_column($consolidated_results, 'representative_id');
            $ids_placeholder = implode(',', array_fill(0, count($representative_ids), '%d'));
            
            $full_data_query = $this->wpdb->prepare(
                "SELECT * FROM {$this->table_name} WHERE ID IN ($ids_placeholder)",
                $representative_ids
            );
            $full_data = $this->wpdb->get_results($full_data_query, ARRAY_A);
            
            // Create lookup for full data
            $full_data_lookup = [];
            foreach ($full_data as $vehicle) {
                $full_data_lookup[$vehicle['ID']] = $vehicle;
            }
            
            // Merge consolidated data with full representative data
            $results = [];
            foreach ($consolidated_results as $consolidated) {
                $representative_id = $consolidated['representative_id'];
                if (isset($full_data_lookup[$representative_id])) {
                    $vehicle = $full_data_lookup[$representative_id];
                    
                    // Override representative fields with consolidated data
                    $vehicle['Body type'] = $consolidated['representative_body_type'];
                    $vehicle['Car classification'] = $consolidated['representative_classification'];
                    $vehicle['Drive type'] = $consolidated['representative_drive_type'];
                    $vehicle['Transmission'] = $consolidated['representative_transmission'];
                    $vehicle['Cylinders'] = $consolidated['representative_cylinders'];
                    $vehicle['Doors'] = $consolidated['representative_doors'];
                    $vehicle['Total seating'] = $consolidated['representative_seating'];
                    $vehicle['Fuel type'] = $consolidated['representative_fuel_type'];
                    $vehicle['Country of origin'] = $consolidated['representative_origin'];
                    
                    // Add consolidation metadata for frontend trim handling
                    $vehicle['_consolidated_metadata'] = [
                        'trim_count' => $consolidated['trim_count'],
                        'available_trims' => explode(';', $consolidated['available_trims']),
                        'available_body_types' => explode(';', $consolidated['available_body_types']),
                        'horsepower_range' => $consolidated['min_horsepower'] == $consolidated['max_horsepower'] 
                            ? $consolidated['min_horsepower'] 
                            : $consolidated['min_horsepower'] . '-' . $consolidated['max_horsepower'],
                        'torque_range' => $consolidated['min_torque'] == $consolidated['max_torque'] 
                            ? $consolidated['min_torque'] 
                            : $consolidated['min_torque'] . '-' . $consolidated['max_torque'],
                        'weight_range' => $consolidated['min_weight'] == $consolidated['max_weight'] 
                            ? $consolidated['min_weight'] 
                            : $consolidated['min_weight'] . '-' . $consolidated['max_weight'],
                        'mpg_range' => $consolidated['min_mpg'] == $consolidated['max_mpg'] 
                            ? $consolidated['min_mpg'] 
                            : $consolidated['min_mpg'] . '-' . $consolidated['max_mpg'],
                        'cargo_range' => $consolidated['min_cargo'] == $consolidated['max_cargo'] 
                            ? $consolidated['min_cargo'] 
                            : $consolidated['min_cargo'] . '-' . $consolidated['max_cargo'],
                        'towing_range' => $consolidated['min_towing'] == $consolidated['max_towing'] 
                            ? $consolidated['min_towing'] 
                            : $consolidated['min_towing'] . '-' . $consolidated['max_towing'],
                        'clearance_range' => $consolidated['min_clearance'] == $consolidated['max_clearance'] 
                            ? $consolidated['min_clearance'] 
                            : $consolidated['min_clearance'] . '-' . $consolidated['max_clearance']
                    ];
                    
                    $results[] = $vehicle;
                }
            }
        } else {
            $results = [];
        }

        // --- TOTAL COUNT QUERY (for consolidated results) ---
        $total_query = $this->wpdb->prepare(
            "SELECT COUNT(DISTINCT CONCAT(`Year`, '-', `Make`, '-', `Model`)) 
             FROM {$this->table_name} WHERE " . $where_sql,
            $params
        );
        $total_results = $this->wpdb->get_var($total_query);
        
        return [
            'results' => $results,
            'total'   => (int) $total_results
        ];
    }

    /**
     * Get all trims for a specific year-make-model combination
     * NEW: This method will be used by the vehicle profile page
     */
    public function get_model_trims($year, $make, $model) {
        $query = $this->wpdb->prepare(
            "SELECT * FROM {$this->table_name} 
             WHERE `Year` = %d AND `Make` = %s AND `Model` = %s 
             ORDER BY `Trim` ASC",
            $year, $make, $model
        );
        
        return $this->wpdb->get_results($query, ARRAY_A);
    }

    public static function get_vehicle_by_id($id) {
        global $wpdb;
        $table_name = $wpdb->prefix . 'vehicle_data';
        if (!is_numeric($id)) return null;

        return $wpdb->get_row($wpdb->prepare("SELECT * FROM {$table_name} WHERE ID = %d", $id), ARRAY_A);
    }
}