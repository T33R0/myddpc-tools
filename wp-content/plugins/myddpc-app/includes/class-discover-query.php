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
     * MODIFIED: Groups by year-make-model-body_type to show one card per model with trim selectors.
     */
    public function get_discover_results( $filters = [], $limit = 25, $offset = 0, $sort_by = 'Year', $sort_dir = 'desc' ) {
        // --- WHERE CLAUSE BUILDER ---
        $where_clauses = [ '1=1' ];
        $params = [];

        if (!empty($filters)) {
            // Re-create the full list of filterable columns from your reference.
            $all_filter_keys = [
                'year' => 'Year', 'make' => 'Make', 'body_type' => 'Body type', 'car_classification' => 'Car classification',
                'drive_type' => 'Drive type', 'transmission' => 'Transmission', 'cylinders' => 'Cylinders',
                'doors' => 'Doors', 'total_seating' => 'Total seating', 'fuel_type' => 'Fuel type',
                'country_of_origin' => 'Country of origin'
            ];

            foreach ($filters as $key => $value) {
                // Check if the filter key is valid and has a non-empty value
                if (isset($all_filter_keys[$key]) && !empty($value)) {
                    $column_name = $all_filter_keys[$key];
                    $where_clauses[] = "`" . esc_sql($column_name) . "` = %s";
                    $params[] = $value;
                }
            }
        }
        $where_sql = implode(' AND ', $where_clauses);

        // --- SORTING ---
        $sort_by_safe = in_array($sort_by, $this->allowed_sort_columns) ? $sort_by : 'Year';
        $sort_dir_safe = strtolower($sort_dir) === 'asc' ? 'ASC' : 'DESC';
        $orderby_sql = '`' . esc_sql($sort_by_safe) . '` ' . $sort_dir_safe;

        // --- GROUPED RESULTS QUERY ---
        // Use GROUP BY to get one representative entry per year-make-model-body_type combination
        $grouped_query = $this->wpdb->prepare(
            "SELECT 
                MIN(ID) as representative_id,
                `Year`, `Make`, `Model`, `Body type`,
                MIN(`Trim`) as representative_trim,
                MIN(`Horsepower (HP)`) as min_horsepower,
                MAX(`Horsepower (HP)`) as max_horsepower,
                MIN(`Torque (ft-lbs)`) as min_torque,
                MAX(`Torque (ft-lbs)`) as max_torque,
                MIN(`Curb weight (lbs)`) as min_weight,
                MAX(`Curb weight (lbs)`) as max_weight,
                MIN(`EPA combined MPG`) as min_mpg,
                MAX(`EPA combined MPG`) as max_mpg,
                COUNT(*) as trim_count,
                GROUP_CONCAT(DISTINCT `Trim` ORDER BY `Trim` ASC SEPARATOR ';') as available_trims
             FROM {$this->table_name} 
             WHERE " . $where_sql . " 
             GROUP BY `Year`, `Make`, `Model`, `Body type`
             ORDER BY " . $orderby_sql . ", `Make` ASC, `Model` ASC 
             LIMIT %d OFFSET %d",
            array_merge($params, [$limit, $offset])
        );
        
        $grouped_results = $this->wpdb->get_results($grouped_query, ARRAY_A);

        // --- GET FULL DATA FOR REPRESENTATIVE VEHICLES ---
        if (!empty($grouped_results)) {
            $representative_ids = array_column($grouped_results, 'representative_id');
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
            
            // Merge grouped data with full representative data
            $results = [];
            foreach ($grouped_results as $grouped) {
                $representative_id = $grouped['representative_id'];
                if (isset($full_data_lookup[$representative_id])) {
                    $vehicle = $full_data_lookup[$representative_id];
                    
                    // Add grouping metadata for frontend trim handling
                    $vehicle['_group_metadata'] = [
                        'trim_count' => $grouped['trim_count'],
                        'available_trims' => explode(';', $grouped['available_trims']),
                        'horsepower_range' => $grouped['min_horsepower'] == $grouped['max_horsepower'] 
                            ? $grouped['min_horsepower'] 
                            : $grouped['min_horsepower'] . '-' . $grouped['max_horsepower'],
                        'torque_range' => $grouped['min_torque'] == $grouped['max_torque'] 
                            ? $grouped['min_torque'] 
                            : $grouped['min_torque'] . '-' . $grouped['max_torque'],
                        'weight_range' => $grouped['min_weight'] == $grouped['max_weight'] 
                            ? $grouped['min_weight'] 
                            : $grouped['min_weight'] . '-' . $grouped['max_weight'],
                        'mpg_range' => $grouped['min_mpg'] == $grouped['max_mpg'] 
                            ? $grouped['min_mpg'] 
                            : $grouped['min_mpg'] . '-' . $grouped['max_mpg']
                    ];
                    
                    $results[] = $vehicle;
                }
            }
        } else {
            $results = [];
        }

        // --- TOTAL COUNT QUERY (for grouped results) ---
        $total_query = $this->wpdb->prepare(
            "SELECT COUNT(DISTINCT CONCAT(`Year`, '-', `Make`, '-', `Model`, '-', `Body type`)) 
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