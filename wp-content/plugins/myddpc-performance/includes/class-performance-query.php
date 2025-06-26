<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly.
}

class MyDDPC_Performance_Query {
    protected $db;

    public function __construct() {
        global $wpdb;
        $this->db = $wpdb;
    }

    public function get_vehicle_by_ymmt( $year, $make, $model, $trim ) {
        // Normalize parameters
        $year = (int) trim($year);
        $make = trim($make);
        $model = trim($model);
        $trim = trim($trim);

        if ( empty($year) || empty($make) || empty($model) || empty($trim) ) {
            return null;
        }

        $query = $this->db->prepare(
            "SELECT
                `Engine size (l)`, `Cylinders`, `Cam type`, `Horsepower (HP)`,
                `Horsepower (rpm)`, `Torque (ft-lbs)`, `Torque (rpm)`, `Curb weight (lbs)`,
                `Drive type`, `Transmission`, `Fuel type`, `EPA combined MPG`, `EPA city/highway MPG`,
                `Fuel tank capacity (gal)`, `Range in miles (city/hwy)`, `EPA combined MPGe`,
                `EPA electricity range (mi)`, `EPA kWh/100 mi`,
                `Battery capacity (kWh)`, `EPA time to charge battery (at 240V) (hr)`
            FROM qfh_vehicle_data
            WHERE `Year` = %d AND `Make` = %s AND `Model` = %s AND `Trim` = %s",
            $year, $make, $model, $trim
        );
        return $this->db->get_row( $query, 'ARRAY_A' );
    }

    public function get_distinct($field, $where = []) {
        $sql = "SELECT DISTINCT `{$field}` FROM qfh_vehicle_data";
        
        $conditions = [];
        $values = [];
        if (!empty($where)) {
            foreach ($where as $key => $value) {
                $conditions[] = "`{$key}` = %s";
                $values[] = $value;
            }
            $sql .= " WHERE " . implode(' AND ', $conditions);
        }
        $sql .= " ORDER BY `{$field}` ASC";

        if (!empty($values)) {
            $sql = $this->db->prepare($sql, $values);
        }

        if ($field === 'Year') {
            $sql = str_replace('ASC', 'DESC', $sql);
        }
        
        return $this->db->get_col($sql);
    }
}