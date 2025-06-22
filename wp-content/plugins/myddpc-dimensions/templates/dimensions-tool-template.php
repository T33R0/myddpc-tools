<?php
// Prevent direct access
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}
?>

<div id="myddpc-dimensions-tool-container">
    <h2>Vehicle Dimensions Tool</h2>
    <div id="myddpc-selectors">
        <select id="year-select">
            <option value="2014">2014</option>
            <option value="1999">1999</option>
        </select>
        <select id="make-select">
            <option value="Audi">Audi</option>
            <option value="BMW">BMW</option>
        </select>
        <select id="model-select">
            <option value="S6">S6</option>
            <option value="Z3 Coupe">Z3 Coupe</option>
        </select>
        <select id="trim-select">
            <option value="Prestige">Prestige</option>
            <option value="2.8">2.8</option>
        </select>
        <button id="get-dimensions-button">Get Dimensions</button>
    </div>

    <div id="results-container">
        </div>
</div>