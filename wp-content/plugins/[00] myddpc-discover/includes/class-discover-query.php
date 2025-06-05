<?php
if ( ! defined( 'ABSPATH' ) ) exit;

// Use global $wpdb and WordPress sanitization functions
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
        global $wpdb;
        $column = $wpdb->_real_escape( $column_name );
        $sql = "
          SELECT DISTINCT `$column`
          FROM {$this->table_name}
          WHERE `$column` IS NOT NULL
          ORDER BY `$column` ASC
        ";
        return $this->wpdb->get_col( $sql );
    }

    // Build WHERE clauses and value array based on filters
    public function build_where_clauses( $filters ) {
        $where_clauses = [];
        $values = [];

        // Range filters (year, hp, torque, weight, cargo, tow, clearance, mpg)
        if ( isset( $filters['year_min'], $filters['year_max'] ) ) {
            $where_clauses[] = "`Year` BETWEEN %d AND %d";
            $values[] = intval( $filters['year_min'] );
            $values[] = intval( $filters['year_max'] );
        }
        if ( isset( $filters['horsepower_min'], $filters['horsepower_max'] ) ) {
            $where_clauses[] = "`Horsepower (HP)` BETWEEN %d AND %d";
            $values[] = intval( $filters['horsepower_min'] );
            $values[] = intval( $filters['horsepower_max'] );
        }
        if ( isset( $filters['torque_min'], $filters['torque_max'] ) ) {
            $where_clauses[] = "`Torque (ft-lbs)` BETWEEN %d AND %d";
            $values[] = intval( $filters['torque_min'] );
            $values[] = intval( $filters['torque_max'] );
        }
        if ( isset( $filters['weight_min'], $filters['weight_max'] ) ) {
            $where_clauses[] = "`Curb weight (lbs)` BETWEEN %d AND %d";
            $values[] = intval( $filters['weight_min'] );
            $values[] = intval( $filters['weight_max'] );
        }
        if ( isset( $filters['cargo_min'], $filters['cargo_max'] ) ) {
            $where_clauses[] = "`Cargo capacity (cu ft)` BETWEEN %d AND %d";
            $values[] = intval( $filters['cargo_min'] );
            $values[] = intval( $filters['cargo_max'] );
        }
        if ( isset( $filters['tow_min'], $filters['tow_max'] ) ) {
            $where_clauses[] = "`Maximum towing capacity (lbs)` BETWEEN %d AND %d";
            $values[] = intval( $filters['tow_min'] );
            $values[] = intval( $filters['tow_max'] );
        }
        if ( isset( $filters['clearance_min'], $filters['clearance_max'] ) ) {
            $where_clauses[] = "`Ground clearance (in)` BETWEEN %d AND %d";
            $values[] = intval( $filters['clearance_min'] );
            $values[] = intval( $filters['clearance_max'] );
        }
        if ( isset( $filters['mpg_min'], $filters['mpg_max'] ) ) {
            $where_clauses[] = "`EPA combined MPG` BETWEEN %d AND %d";
            $values[] = intval( $filters['mpg_min'] );
            $values[] = intval( $filters['mpg_max'] );
        }

        // Multi-select filters (arrays)
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
                    $values[] = is_string($val) ? $val : strval($val);
                }
            }
        }

        // Combine clauses
        if ( ! empty( $where_clauses ) ) {
            $sql_where = ' WHERE ' . implode( ' AND ', $where_clauses );
        } else {
            $sql_where = '';
        }

        return [ $sql_where, $values ];
    }

    // Get result rows array
    public function get_results( $filters, $limit = 50, $offset = 0 ) {
        list( $where_sql, $values ) = $this->build_where_clauses( $filters );

        $columns = implode( '`, `', $this->select_columns );
        $sql = "
          SELECT `$columns`, `ID`
          FROM {$this->table_name}
          {$where_sql}
          ORDER BY `Year` DESC, `Make` ASC
          LIMIT %d OFFSET %d
        ";
        $values[] = $limit;
        $values[] = $offset;

        $prepared = $this->wpdb->prepare( $sql, $values );
        // Use associative array result (ARRAY_A is 1)
        return $this->wpdb->get_results( $prepared, 1 );
    }

    // Get total count of matching rows
    public function get_total_count( $filters ) {
        list( $where_sql, $values ) = $this->build_where_clauses( $filters );
        $sql = "
          SELECT COUNT(*) 
          FROM {$this->table_name}
          {$where_sql}
        ";
        $prepared = $this->wpdb->prepare( $sql, $values );
        return intval( $this->wpdb->get_var( $prepared ) );
    }
}