<?php
// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) exit;
?>
<div id="myddpc-discover-container">
    <aside id="discover-filters">
        <form id="discover-filter-form">
            <label for="filter-year-min">Year (Min)</label>
            <select id="filter-year-min" name="year_min"></select>
            <label for="filter-year-max">Year (Max)</label>
            <select id="filter-year-max" name="year_max"></select>

            <label for="filter-make">Make</label>
            <select id="filter-make" name="make[]" multiple class="multi-select-enhanced"></select>

            <label for="filter-drivetrain">Drivetrain</label>
            <select id="filter-drivetrain" name="drivetrain[]" multiple class="multi-select-enhanced"></select>

            <label for="filter-transmission">Transmission</label>
            <select id="filter-transmission" name="transmission[]" multiple class="multi-select-enhanced"></select>

            <label for="filter-cylinders">Cylinders</label>
            <select id="filter-cylinders" name="cylinders[]" multiple class="multi-select-enhanced"></select>

            <label for="filter-body-type">Body type</label>
            <select id="filter-body-type" name="body_type[]" multiple class="multi-select-enhanced"></select>

            <label for="filter-country-of-origin">Country</label>
            <select id="filter-country-of-origin" name="country_of_origin[]" multiple class="multi-select-enhanced"></select>

            <label for="filter-fuel-type">Fuel Type</label>
            <select id="filter-fuel-type" name="fuel_type[]" multiple class="multi-select-enhanced"></select>

            <label for="rows-per-page" style="margin-top:1rem;">Show:</label>
            <select id="rows-per-page" style="width:80px;display:block;margin-top:0.5rem;">
                <option value="10" selected>10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
            </select>
        </form>
    </aside>

    <main id="discover-results">
        <div id="discover-controls">
            <span id="discover-total-count"></span>
        </div>
        <table id="discover-table">
            <thead>
                <tr>
                    <th>Year</th>
                    <th>Make</th>
                    <th>Model</th>
                    <th>Trim</th>
                    <th>Engine (L)</th>
                    <th>Cylinders</th>
                    <th>Drive</th>
                    <th>Transmission</th>
                    <th>Body</th>
                    <th>Classification</th>
                    <th>Platform</th>
                </tr>
            </thead>
            <tbody>
                <!-- JS injects rows here -->
            </tbody>
        </table>
    </main>
</div>

<div id="discover-detail-modal" class="hidden">
    <div class="modal-content">
        <button class="modal-close">×</button>
        <div class="modal-body">
            <div class="detail-line"><strong>Year:</strong> <span id="detail-year"></span></div>
            <div class="detail-line"><strong>Make:</strong> <span id="detail-make"></span></div>
            <div class="detail-line"><strong>Model:</strong> <span id="detail-model"></span></div>
            <div class="detail-line"><strong>Trim:</strong> <span id="detail-trim"></span></div>
            <div class="detail-line"><strong>Engine (L):</strong> <span id="detail-engine"></span></div>
            <div class="detail-line"><strong>Cylinders:</strong> <span id="detail-cylinders"></span></div>
            <div class="detail-line"><strong>Drive:</strong> <span id="detail-drive"></span></div>
            <div class="detail-line"><strong>Transmission:</strong> <span id="detail-transmission"></span></div>
            <div class="detail-line"><strong>Body:</strong> <span id="detail-body"></span></div>
            <div class="detail-line"><strong>Classification:</strong> <span id="detail-classification"></span></div>
            <div class="detail-line"><strong>Platform:</strong> <span id="detail-platform"></span></div>
        </div>
        <button id="discover-save-vehicle">Save Vehicle</button>
    </div>
</div>
