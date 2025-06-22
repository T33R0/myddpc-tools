<?php
if ( ! defined( 'ABSPATH' ) ) exit;
?>

<div id="myddpc-performance-app" class="myddpc-tool-app">
    <h2>Performance & Efficiency Tool</h2>

    <div class="myddpc-controls-area">
        <div id="vehicle-1-controls" class="vehicle-controls">
            <select id="year-select-1" class="myddpc-select"><option value="">Select Year</option></select>
            <select id="make-select-1" class="myddpc-select" disabled><option value="">Select Make</option></select>
            <select id="model-select-1" class="myddpc-select" disabled><option value="">Select Model</option></select>
            <select id="trim-select-1" class="myddpc-select" disabled><option value="">Select Trim</option></select>
            <button id="get-performance-button-1" class="get-stats-button" disabled>Get Stats</button>
        </div>
        <div id="vehicle-2-controls" class="vehicle-controls" style="display:none;">
            <select id="year-select-2" class="myddpc-select" disabled><option value="">Select Year</option></select>
            <select id="make-select-2" class="myddpc-select" disabled><option value="">Select Make</option></select>
            <select id="model-select-2" class="myddpc-select" disabled><option value="">Select Model</option></select>
            <select id="trim-select-2" class="myddpc-select" disabled><option value="">Select Trim</option></select>
            <button id="get-performance-button-2" class="get-stats-button" disabled>Get Stats</button>
        </div>
        <button id="add-comparison-btn">+ Add Vehicle to Compare</button>
    </div>

    <div id="h2h-results-wrapper">
        <div id="results-container-1" class="results-column"></div>
        <div id="results-container-2" class="results-column" style="display:none;"></div>
    </div>

    <div id="graph-wrapper" style="display:none;">
        <h3>Performance vs. Efficiency</h3>
        <div id="performance-graph-container">
            <canvas id="performance-chart"></canvas>
        </div>
    </div>
</div>