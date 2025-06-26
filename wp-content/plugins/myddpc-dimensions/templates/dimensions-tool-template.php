<?php
if ( ! defined( 'ABSPATH' ) ) exit;
?>
<div id="myddpc-dimensions-app" class="myddpc-tool-app">
    <h2>Vehicle Dimensions Tool</h2>

    <div class="myddpc-controls-area">
        <div id="vehicle-1-controls" class="vehicle-controls">
            <select id="year-select-1" class="myddpc-select"><option value="">Select Year</option></select>
            <select id="make-select-1" class="myddpc-select" disabled><option value="">Select Make</option></select>
            <select id="model-select-1" class="myddpc-select" disabled><option value="">Select Model</option></select>
            <select id="trim-select-1" class="myddpc-select" disabled><option value="">Select Trim</option></select>
            <button id="get-dimensions-button-1" class="get-stats-button" disabled>Get Dimensions</button>
        </div>
        <div id="vehicle-2-controls" class="vehicle-controls" style="display:none;">
            <select id="year-select-2" class="myddpc-select" disabled><option value="">Select Year</option></select>
            <select id="make-select-2" class="myddpc-select" disabled><option value="">Select Make</option></select>
            <select id="model-select-2" class="myddpc-select" disabled><option value="">Select Model</option></select>
            <select id="trim-select-2" class="myddpc-select" disabled><option value="">Select Trim</option></select>
            <button id="get-dimensions-button-2" class="get-stats-button" disabled>Get Dimensions</button>
        </div>
        <button id="add-comparison-btn">+ Add Vehicle to Compare</button>
    </div>

    <div id="h2h-results-wrapper">
        <div id="results-container-1" class="results-column"></div>
        <div id="results-container-2" class="results-column" style="display:none;"></div>
    </div>

    <div id="myddpc-diagrams-container" style="display:none;">
        <div class="diagram-wrapper" id="parking-diagram-wrapper">
            <canvas id="parking-diagram" width="300" height="150"></canvas>
            <p class="diagram-caption">Standard Parking Space</p>
        </div>
        <div class="diagram-wrapper" id="street-diagram-wrapper">
            <canvas id="street-diagram" width="300" height="100"></canvas>
            <p class="diagram-caption">Street-Side Parking</p>
        </div>
        <div class="diagram-wrapper" id="turning-diagram-wrapper">
            <canvas id="turning-diagram" width="200" height="200"></canvas>
            <p class="diagram-caption">Turning Circle</p>
        </div>
    </div>
</div>