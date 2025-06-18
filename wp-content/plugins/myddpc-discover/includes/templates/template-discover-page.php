<?php
// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) exit;
?>
<div id="myddpc-discover-container">
    <aside id="discover-filters">
        <form id="discover-filter-form">
            <!-- Year (always visible, with labels) -->
            <div>
                <label for="filter-year-min">Year (Min)</label>
                <select id="filter-year-min" name="year_min"></select>
                <label for="filter-year-max">Year (Max)</label>
                <select id="filter-year-max" name="year_max"></select>
            </div>
            <!-- Make (always visible, with label) -->
            <div>
                <label for="filter-make">Make</label>
                <select id="filter-make" name="make[]" multiple class="multi-select-enhanced"></select>
            </div>
            <!-- Drivetrain (collapsible, collapsed by default) -->
            <div class="collapsible">
                <div class="collapsible-header">Drivetrain</div>
                <div class="collapsible-content">
                    <div id="filter-drive-type">
                        <label><input type="checkbox" name="drive_type[]" value="AWD"> AWD</label>
                        <label><input type="checkbox" name="drive_type[]" value="4WD"> 4WD</label>
                        <label><input type="checkbox" name="drive_type[]" value="FWD"> FWD</label>
                        <label><input type="checkbox" name="drive_type[]" value="RWD"> RWD</label>
                    </div>
                </div>
            </div>
            <!-- Transmission (collapsible, collapsed by default) -->
            <div class="collapsible">
                <div class="collapsible-header">Transmission</div>
                <div class="collapsible-content">
                    <select id="filter-transmission" name="transmission[]" multiple class="multi-select-enhanced"></select>
                </div>
            </div>
            <!-- Cylinders (collapsible, collapsed by default) -->
            <div class="collapsible">
                <div class="collapsible-header">Cylinders</div>
                <div class="collapsible-content">
                    <select id="filter-cylinders" name="cylinders[]" multiple class="multi-select-enhanced"></select>
                </div>
            </div>
            <!-- Body type (collapsible, collapsed by default) -->
            <div class="collapsible">
                <div class="collapsible-header">Body type</div>
                <div class="collapsible-content">
                    <select id="filter-body-type" name="body_type[]" multiple class="multi-select-enhanced"></select>
                </div>
            </div>
            <!-- Country (collapsible, collapsed by default) -->
            <div class="collapsible">
                <div class="collapsible-header">Country</div>
                <div class="collapsible-content">
                    <select id="filter-country-of-origin" name="country_of_origin[]" multiple class="multi-select-enhanced"></select>
                </div>
            </div>
            <!-- Fuel Type (collapsible, collapsed by default) -->
            <div class="collapsible">
                <div class="collapsible-header">Fuel Type</div>
                <div class="collapsible-content">
                    <select id="filter-fuel-type" name="fuel_type[]" multiple class="multi-select-enhanced"></select>
                </div>
            </div>
            <label for="rows-per-page" style="margin-top:1rem;">Show:</label>
            <select id="rows-per-page" style="width:80px;display:block;margin-top:0.5rem;">
                <option value="10">10</option>
                <option value="25" selected>25</option>
                <option value="50">50</option>
                <option value="100">100</option>
            </select>
        </form>
    </aside>

    <main id="discover-results">
        <div id="discover-controls"></div>
        <div id="filter-summary">
            <div class="myddpc-discover-actions">
                <div class="discover-actions-group">
                    <?php if (is_user_logged_in()): ?>
                        <select id="load-saved-search" class="myddpc-select">
                            <option value="">--- Load Saved Search ---</option>
                        </select>
                        <button id="save-current-search" class="myddpc-button myddpc-button-secondary">
                            <span class="dashicons dashicons-saved"></span> Save Current Search
                        </button>
                    <?php endif; ?>
                </div>
            </div>
            <span id="discover-total-count"></span>
            <div id="filter-tags"></div>
            <button id="reset-filters" type="button">Reset Filters</button>
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
        <div id="discover-pagination"></div>
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

<!-- Custom Modal -->
<div id="myddpc-custom-modal" class="hidden">
    <div class="modal-overlay"></div>
    <div class="modal-content">
        <h3 class="modal-title"></h3>
        <div class="modal-body">
            <p class="modal-message"></p>
            <input type="text" class="modal-input hidden" placeholder="Enter a name...">
        </div>
        <div class="modal-actions">
            <button class="modal-button-confirm">Confirm</button>
            <button class="modal-button-cancel">Cancel</button>
        </div>
    </div>
</div>

</div> <!-- End of myddpc-discover-container -->
