<?php
/**
 * Template for displaying the MyDDPC Vehicle Profile.
 *
 * This template is loaded via a shortcode and populated by JS.
 * It provides the HTML structure for the vehicle profile page.
 */
?>

<div id="myddpc-vehicle-profile-app" class="myddpc-app-container" style="display: none;">
    <!-- Preloader/Spinner -->
    <div id="myddpc-preloader">
        <div class="myddpc-spinner"></div>
        <p>Loading Vehicle Data...</p>
    </div>

    <!-- Main Content Area -->
    <div id="myddpc-profile-content" style="display: none;">
        <!-- At-a-Glance Dashboard -->
        <div class="profile-header new-dashboard-layout">
            <div class="profile-header-image" style="flex: 0 0 70%; max-width: 70%;">
                <img id="vehicle-hero-image" src="" alt="Vehicle Image">
            </div>
            <div class="profile-header-info" style="flex: 0 0 30%; max-width: 30%; display: flex; flex-direction: column; gap: 18px;">
                <div>
                    <h1 id="vehicle-title"></h1>
                    <p id="vehicle-trim-desc" class="trim-description"></p>
                </div>
                <div class="key-specs-visuals">
                    <div class="key-specs"></div>
                </div>
                <div class="drivetrain-info"></div>
                <div class="price-range"></div>
                <div class="color-swatches">
                    <h4>Exterior Colors</h4>
                    <div id="exterior-colors" class="swatch-container"></div>
                    <h4>Interior Colors</h4>
                    <div id="interior-colors" class="swatch-container"></div>
                </div>
            </div>
        </div>

        <div class="pros-cons-section two-column-pros-cons">
            <div class="pros">
                <h3><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-thumbs-up"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg> The Good</h3>
                <p id="vehicle-pros"></p>
            </div>
            <div class="cons">
                <h3><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-thumbs-down"><path d="M10 15v-5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg> The Bad</h3>
                <p id="vehicle-cons"></p>
            </div>
        </div>

        <!-- Enthusiast's Deep Dive (Tabs) -->
        <div class="profile-tabs">
            <div class="tab-headers">
                <button class="tab-link active" data-tab="tab-performance">Performance & Mechanical</button>
                <button class="tab-link" data-tab="tab-dimensions">Dimensions & Weight</button>
                <button class="tab-link" data-tab="tab-features">Features & Options</button>
                <button class="tab-link" data-tab="tab-ownership">Ownership & Reviews</button>
            </div>

            <div id="tab-performance" class="tab-content active">
                <!-- Optionally, add a placeholder for a performance graphic here -->
            </div>
            <div id="tab-dimensions" class="tab-content">
                <div class="blueprint-graphic-placeholder" style="text-align:center; margin-bottom:20px;">
                    <!-- Placeholder for a 2D blueprint graphic -->
                    <svg width="220" height="80" viewBox="0 0 220 80" style="opacity:0.2;"><rect x="10" y="30" width="200" height="30" rx="10" fill="#888" /><rect x="60" y="10" width="100" height="20" rx="8" fill="#888" /></svg>
                    <div style="font-size:0.9em; color:#888;">Vehicle dimensions (side/top profile)</div>
                </div>
            </div>
            <div id="tab-features" class="tab-content"></div>
            <div id="tab-ownership" class="tab-content"></div>
        </div>
    </div>
</div>