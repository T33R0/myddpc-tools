<?php
// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) exit;
?>
<div id="myddpc-discover-container">
    <aside id="discover-filters">
        <form id="discover-filter-form">
            <!-- Example filter fields (for testing, you can leave these blank or stub them) -->
            <label for="filter-year-min">Year (Min)</label>
            <input type="number" id="filter-year-min" name="year_min" />

            <label for="filter-year-max">Year (Max)</label>
            <input type="number" id="filter-year-max" name="year_max" />

            <label for="filter-drive-type">Drive type</label>
            <select id="filter-drive-type" name="drive_type[]" multiple></select>

            <button type="submit" id="discover-apply-filters">Apply Filters</button>
            <button type="button" id="discover-reset-filters">Reset Filters</button>
        </form>
    </aside>

    <main id="discover-results">
        <div id="discover-controls">
            <label for="rows-per-page">Show:</label>
            <select id="rows-per-page">
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50" selected>50</option>
            </select>
            <span id="discover-total-count"></span>
        </div>
        <table id="discover-table">
            <thead>
                <tr>
                    <th>Year</th><th>Make</th><th>Model</th><th>Trim</th>
                    <th>Platform</th><th>Country</th><th>Body</th><th>Classification</th>
                    <th>Drive</th><th>Trans</th><th>Cyl</th><th>Engine</th><th>HP</th>
                    <th>Tq</th><th>Wt</th><th>Doors</th><th>Seats</th><th>Cargo</th>
                    <th>Tow</th><th>Clearance</th><th>Fuel</th><th>MPG</th>
                </tr>
            </thead>
            <tbody>
                <!-- JavaScript will inject rows here -->
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
