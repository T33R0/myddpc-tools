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

            <label for="filter-drivetrain">Drivetrain</label>
            <select id="filter-drivetrain" name="drivetrain[]" multiple></select>

            <label for="filter-transmission">Transmission</label>
            <select id="filter-transmission" name="transmission[]" multiple></select>

            <label for="filter-cylinders">Cylinders</label>
            <select id="filter-cylinders" name="cylinders[]" multiple></select>

            <label for="filter-body-type">Body type</label>
            <select id="filter-body-type" name="body_type[]" multiple></select>

            <label for="filter-country-of-origin">Country</label>
            <select id="filter-country-of-origin" name="country_of_origin[]" multiple></select>

            <label for="filter-engine-size-min">Engine size (L) min</label>
            <input type="number" id="filter-engine-size-min" name="engine_size_min" step="0.1" />
            <label for="filter-engine-size-max">Engine size (L) max</label>
            <input type="number" id="filter-engine-size-max" name="engine_size_max" step="0.1" />

            <label for="rows-per-page" style="margin-top:1rem;">Show:</label>
            <select id="rows-per-page" style="width:80px;display:block;margin-top:0.5rem;">
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50" selected>50</option>
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
                    <th>Year</th><th>Make</th><th>Model</th><th>Trim</th>
                    <th>Platform</th><th>Country</th><th>Body</th><th>Classification</th>
                    <th>Drive</th><th>Trans</th><th>Cyl</th><th>Engine (L)</th><th>HP</th>
                    <th>Tq</th><th>Wt</th><th>Doors</th><th>Seats</th><th>Cargo</th>
                    <th>Tow</th><th>Clearance</th><th>Fuel</th><th>MPG</th>
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
        <div class="modal-body"></div>
        <button id="discover-save-vehicle">Save Vehicle</button>
    </div>
</div>
