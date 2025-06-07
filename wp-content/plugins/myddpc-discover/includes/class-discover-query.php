<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class Discover_Query {
    protected $wpdb;
    protected $table_name;
    protected $select_columns = [
        'Year',
        'Make',
        'Model',
        'Trim',
        'Platform code / generation number',
        'Country of origin',
        'Body type',
        'Car classification',
        'Drive type',
        'Transmission',
        'Cylinders',
        'Engine size (l)',
        'Horsepower (HP)',
        'Torque (ft-lbs)',
        'Curb weight (lbs)',
        'Doors',
        'Total seating',
        'Cargo capacity (cu ft)',
        'Maximum towing capacity (lbs)',
        'Ground clearance (in)',
        'Fuel type',
        'EPA combined MPG'
    ];

    public function __construct() {
        global $wpdb;
        $this->wpdb = $wpdb;
        $this->table_name = $wpdb->prefix . 'vehicle_data';
    }

    // Return distinct, non-null values for a given column
    public function get_distinct_values( $column_name ) {
        $column = $this->wpdb->_real_escape( $column_name );
        $sql = "SELECT DISTINCT `$column` FROM {$this->table_name} WHERE `$column` IS NOT NULL ORDER BY `$column` ASC";
        return $this->wpdb->get_col( $sql );
    }

    // Build WHERE clauses and value array based on filters
    public function build_where_clauses( $filters ) {
        $where_clauses = [];
        $values = [];

        // Range filters
        $ranges = [
            'year' => 'Year',
            'horsepower' => 'Horsepower (HP)',
            'torque' => 'Torque (ft-lbs)',
            'weight' => 'Curb weight (lbs)',
            'cargo' => 'Cargo capacity (cu ft)',
            'tow' => 'Maximum towing capacity (lbs)',
            'clearance' => 'Ground clearance (in)',
            'mpg' => 'EPA combined MPG',
        ];
        foreach ( $ranges as $key => $col ) {
            $min = $key . '_min';
            $max = $key . '_max';
            if ( isset( $filters[$min], $filters[$max] ) ) {
                $where_clauses[] = "`$col` BETWEEN %d AND %d";
                $values[] = intval( $filters[$min] );
                $values[] = intval( $filters[$max] );
            }
        }

        // Multi-select filters
        $multi_select_columns = [
            'country_of_origin'    => 'Country of origin',
            'body_type'            => 'Body type',
            'car_classification'   => 'Car classification',
            'drive_type'           => 'Drive type',
            'transmission'         => 'Transmission',
            'fuel_type'            => 'Fuel type',
            'cylinders'            => 'Cylinders',
            'doors'                => 'Doors',
            'total_seating'        => 'Total seating'
        ];
        foreach ( $multi_select_columns as $filter_key => $column_name ) {
            if ( ! empty( $filters[ $filter_key ] ) && is_array( $filters[ $filter_key ] ) ) {
                $placeholders = implode( ',', array_fill( 0, count( $filters[ $filter_key ] ), '%s' ) );
                $where_clauses[] = "`$column_name` IN ($placeholders)";
                foreach ( $filters[ $filter_key ] as $val ) {
                    $values[] = is_numeric($val) ? (int)$val : (string)$val;
                }
            }
        }

        $sql_where = $where_clauses ? ' WHERE ' . implode( ' AND ', $where_clauses ) : '';

        return [ $sql_where, $values ];
    }

    // Get result rows array
    public function get_results( $filters, $limit = 50, $offset = 0 ) {
        list( $where_sql, $values ) = $this->build_where_clauses( $filters );
        $columns = implode( '`, `', $this->select_columns );
        $sql = "SELECT `$columns`, `ID` FROM {$this->table_name} {$where_sql} ORDER BY `Year` DESC, `Make` ASC LIMIT %d OFFSET %d";
        $values[] = $limit;
        $values[] = $offset;
        $prepared = $this->wpdb->prepare( $sql, $values );
        return $this->wpdb->get_results( $prepared, 1 ); // 1 = ARRAY_A
    }

    // Get total count of matching rows
    public function get_total_count( $filters ) {
        list( $where_sql, $values ) = $this->build_where_clauses( $filters );
        $sql = "SELECT COUNT(*) FROM {$this->table_name} {$where_sql}";
        $prepared = $this->wpdb->prepare( $sql, $values );
        return (int) $this->wpdb->get_var( $prepared );
    }

    /**
     * Get filter options for Discover UI (years, drive_type, transmission, cylinders, body_type, country_of_origin)
     */
    public function get_discover_filter_options() {
        $out = [];
        $t = $this->table_name;
        $out['year'] = [
            'min' => (int) $this->wpdb->get_var("SELECT MIN(`Year`) FROM $t"),
            'max' => (int) $this->wpdb->get_var("SELECT MAX(`Year`) FROM $t"),
        ];
        $out['drive_type'] = array_filter(array_map('sanitize_text_field', $this->wpdb->get_col("SELECT DISTINCT `Drive type` FROM $t WHERE `Drive type` IS NOT NULL AND `Drive type` != '' ORDER BY `Drive type` ASC")));
        $out['transmission'] = array_filter(array_map('sanitize_text_field', $this->wpdb->get_col("SELECT DISTINCT `Transmission` FROM $t WHERE `Transmission` IS NOT NULL AND `Transmission` != '' ORDER BY `Transmission` ASC")));
        $out['cylinders'] = array_filter(array_map('sanitize_text_field', $this->wpdb->get_col("SELECT DISTINCT `Cylinders` FROM $t WHERE `Cylinders` IS NOT NULL AND `Cylinders` != '' ORDER BY `Cylinders` ASC")));
        $out['body_type'] = array_filter(array_map('sanitize_text_field', $this->wpdb->get_col("SELECT DISTINCT `Body type` FROM $t WHERE `Body type` IS NOT NULL AND `Body type` != '' ORDER BY `Body type` ASC")));
        $out['country_of_origin'] = array_filter(array_map('sanitize_text_field', $this->wpdb->get_col("SELECT DISTINCT `Country of origin` FROM $t WHERE `Country of origin` IS NOT NULL AND `Country of origin` != '' ORDER BY `Country of origin` ASC")));
        $out['engine_size'] = [
            'min' => (float) $this->wpdb->get_var("SELECT MIN(`Engine size (l)`) FROM $t"),
            'max' => (float) $this->wpdb->get_var("SELECT MAX(`Engine size (l)`) FROM $t"),
        ];
        return $out;
    }

    /**
     * Get discover results with filters, limit, offset
     */
    public function get_discover_results( $filters, $limit = 50, $offset = 0 ) {
        $where = [];
        $values = [];
        // Year min/max
        if (!empty($filters['year_min']) && !empty($filters['year_max'])) {
            $where[] = "`Year` BETWEEN %d AND %d";
            $values[] = (int) $filters['year_min'];
            $values[] = (int) $filters['year_max'];
        }
        // Drivetrain
        if (!empty($filters['drive_type']) && is_array($filters['drive_type'])) {
            $in = implode(',', array_fill(0, count($filters['drive_type']), '%s'));
            $where[] = "`Drive type` IN ($in)";
            foreach ($filters['drive_type'] as $v) $values[] = sanitize_text_field($v);
        }
        // Transmission
        if (!empty($filters['transmission']) && is_array($filters['transmission'])) {
            $in = implode(',', array_fill(0, count($filters['transmission']), '%s'));
            $where[] = "`Transmission` IN ($in)";
            foreach ($filters['transmission'] as $v) $values[] = sanitize_text_field($v);
        }
        // Cylinders
        if (!empty($filters['cylinders']) && is_array($filters['cylinders'])) {
            $in = implode(',', array_fill(0, count($filters['cylinders']), '%s'));
            $where[] = "`Cylinders` IN ($in)";
            foreach ($filters['cylinders'] as $v) $values[] = sanitize_text_field($v);
        }
        // Body type
        if (!empty($filters['body_type']) && is_array($filters['body_type'])) {
            $in = implode(',', array_fill(0, count($filters['body_type']), '%s'));
            $where[] = "`Body type` IN ($in)";
            foreach ($filters['body_type'] as $v) $values[] = sanitize_text_field($v);
        }
        // Country of origin
        if (!empty($filters['country_of_origin']) && is_array($filters['country_of_origin'])) {
            $in = implode(',', array_fill(0, count($filters['country_of_origin']), '%s'));
            $where[] = "`Country of origin` IN ($in)";
            foreach ($filters['country_of_origin'] as $v) $values[] = sanitize_text_field($v);
        }
        // Engine size min/max
        if (isset($filters['engine_size_min']) && isset($filters['engine_size_max']) && $filters['engine_size_min'] !== '' && $filters['engine_size_max'] !== '') {
            $where[] = "`Engine size (l)` BETWEEN %f AND %f";
            $values[] = (float) $filters['engine_size_min'];
            $values[] = (float) $filters['engine_size_max'];
        }
        $where_sql = $where ? 'WHERE ' . implode(' AND ', $where) : '';
        $columns = array_map(function($c){ return "`$c`"; }, $this->select_columns);
        $sql = "SELECT ".implode(',', $columns).", `ID` FROM {$this->table_name} $where_sql ORDER BY `Year` DESC, `Make` ASC LIMIT %d OFFSET %d";
        $values[] = (int) $limit;
        $values[] = (int) $offset;
        $results = $this->wpdb->get_results($this->wpdb->prepare($sql, $values), ARRAY_A);
        // Total count
        $count_sql = "SELECT COUNT(*) FROM {$this->table_name} $where_sql";
        $total = (int) $this->wpdb->get_var($this->wpdb->prepare($count_sql, $values));
        return [ 'results' => $results, 'total' => $total ];
    }
}