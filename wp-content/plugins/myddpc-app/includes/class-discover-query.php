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
     * This function now uses a robust WHERE clause builder inspired by your reference code.
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

        // --- TOTAL COUNT QUERY ---
        $total_query = $this->wpdb->prepare("SELECT COUNT(ID) FROM {$this->table_name} WHERE " . $where_sql, $params);
        $total_results = $this->wpdb->get_var($total_query);

        // --- RESULTS QUERY ---
        $results_query = $this->wpdb->prepare(
            "SELECT * FROM {$this->table_name} WHERE " . $where_sql . " ORDER BY " . $orderby_sql . ", `Make` ASC, `Model` ASC LIMIT %d OFFSET %d",
            array_merge($params, [$limit, $offset])
        );
        $results = $this->wpdb->get_results($results_query, ARRAY_A);
        
        return [
            'results' => $results,
            'total'   => (int) $total_results
        ];
    }

    public static function get_vehicle_by_id($id) {
        global $wpdb;
        $table_name = $wpdb->prefix . 'vehicle_data';
        if (!is_numeric($id)) return null;

        return $wpdb->get_row($wpdb->prepare("SELECT * FROM {$table_name} WHERE ID = %d", $id), ARRAY_A);
    }
}