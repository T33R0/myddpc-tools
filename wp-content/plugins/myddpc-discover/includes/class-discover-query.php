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
        'Platform code / generation',
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
        $this->table_name = $wpdb->prefix . 'qfh_vehicle_data';
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
}