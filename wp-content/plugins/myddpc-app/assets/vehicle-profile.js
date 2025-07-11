document.addEventListener('DOMContentLoaded', function() {
    const profileApp = document.getElementById('myddpc-vehicle-profile-app');
    if (!profileApp) {
        // We are not on the vehicle profile page, do nothing.
        return;
    }

    // Show the app container now that JS is running
    profileApp.style.display = 'block';

    // --- Helper Functions ---
    const getElement = (id) => document.getElementById(id);
    const querySelector = (selector) => document.querySelector(selector);

    const preloader = getElement('myddpc-preloader');
    const contentArea = getElement('myddpc-profile-content');

    // SVG Icons for key specs and drivetrain
    const ICONS = {
        horsepower: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-zap"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>',
        torque: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-rotate-cw"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>',
        mpg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-droplet"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path></svg>',
        rwd: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="10" rx="5"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>',
        fwd: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="10" rx="5"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>',
        awd: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="10" rx="5"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><circle cx="7" cy="7" r="2"/><circle cx="17" cy="7" r="2"/></svg>',
        transmission: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="2" width="10" height="20" rx="5"/><line x1="12" y1="6" x2="12" y2="18"/></svg>',
    };

    /**
     * Parses color strings like "Jet Black(0,0,0)" into name and RGB value.
     * @param {string} colorString - The raw color string.
     * @returns {Array} An array of color objects [{name, rgb}].
     */
    const parseColors = (colorString) => {
        if (!colorString || typeof colorString !== 'string') return [];
        return colorString.split(';').map(part => {
            const match = part.match(/([^()]+)\(([^)]+)\)/);
            if (match && match.length === 3) {
                return { name: match[1].trim(), rgb: match[2] };
            }
            return null;
        }).filter(Boolean); // Filter out any null matches
    };

    /**
     * Creates and appends color swatches to a container.
     * @param {HTMLElement} container - The container element.
     * @param {Array} colors - Array of color objects.
     */
    const createSwatches = (container, colors) => {
        container.innerHTML = '';
        if (colors.length === 0) {
            container.innerHTML = '<p>N/A</p>';
            return;
        }
        colors.forEach(color => {
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            swatch.style.backgroundColor = `rgb(${color.rgb})`;
            swatch.innerHTML = `<span class="swatch-tooltip">${color.name}</span>`;
            container.appendChild(swatch);
        });
    };

    /**
     * Creates a spec item for the "At-a-Glance" dashboard.
     * @param {string} iconSvg - The SVG icon HTML.
     * @param {string} value - The main value (e.g., "193").
     * @param {string} label - The label (e.g., "HP").
     * @returns {HTMLElement} The created spec item element.
     */
    const createSpecItem = (iconSvg, value, label) => {
        const item = document.createElement('div');
        item.className = 'spec-item';
        item.innerHTML = `
            ${iconSvg}
            <div class="spec-item-text">
                <strong>${value || 'N/A'}</strong>
                <span>${label}</span>
            </div>
        `;
        return item;
    };

    /**
     * Creates a table from a data object for the tabs.
     * @param {object} data - The data object for the table.
     * @returns {string} The HTML string for the table.
     */
    const createSpecTable = (data) => {
        let tableHtml = '<table class="spec-table">';
        for (const sectionTitle in data) {
            tableHtml += `<thead><tr><th colspan="2">${sectionTitle}</th></tr></thead><tbody>`;
            for (const key in data[sectionTitle]) {
                const value = data[sectionTitle][key];
                if (value && value !== 'N/A' && value !== 'N/A ft' && value !== 'N/A lbs' && value !== 'N/A in' && value !== 'N/A gal') {
                    tableHtml += `<tr><td>${key}</td><td>${value}</td></tr>`;
                }
            }
            tableHtml += '</tbody>';
        }
        tableHtml += '</table>';
        return tableHtml;
    };

    /**
     * Main function to fetch and render vehicle data.
     */
    const loadVehicleProfile = async () => {
        const urlParams = new URLSearchParams(window.location.search);
        const vehicleId = urlParams.get('vehicle_id');

        if (!vehicleId) {
            preloader.innerHTML = '<p>Error: No Vehicle ID provided in the URL.</p>';
            return;
        }

        try {
            // Validate vehicle ID
            if (!/^\d+$/.test(vehicleId)) {
                throw new Error('Invalid vehicle ID format');
            }

            // Use the localized REST URL from WordPress
            const response = await fetch(`${myddpcAppData.rest_url}myddpc/v2/vehicle/${vehicleId}`);
            
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Vehicle not found. Please check the URL and try again.');
                } else if (response.status >= 500) {
                    throw new Error('Server error. Please try again later.');
                } else {
                    throw new Error(`Network error: ${response.status} ${response.statusText}`);
                }
            }
            
            const data = await response.json();
            
            // Validate response data
            if (!data || typeof data !== 'object') {
                throw new Error('Invalid response format from server');
            }

            // --- Populate the page with data ---
            // At-a-Glance section
            const glance = data.at_a_glance;
            getElement('vehicle-hero-image').src = glance.hero_image || '';
            getElement('vehicle-hero-image').alt = glance.title;
            getElement('vehicle-title').textContent = glance.title;
            getElement('vehicle-trim-desc').textContent = glance.trim_desc;

            // Key Specs (visual-first)
            const keySpecsContainer = querySelector('.key-specs');
            keySpecsContainer.innerHTML = '';
            keySpecsContainer.appendChild(createSpecItem(ICONS.horsepower, glance.horsepower, 'HP'));
            keySpecsContainer.appendChild(createSpecItem(ICONS.torque, glance.torque, 'ft-lbs'));
            keySpecsContainer.appendChild(createSpecItem(ICONS.mpg, glance.combined_mpg, 'MPG'));

            // Drivetrain (visual)
            const drivetrainContainer = querySelector('.drivetrain-info');
            drivetrainContainer.innerHTML = '';
            let driveIcon = '';
            if (glance.drive_type && glance.drive_type.toLowerCase().includes('rear')) driveIcon = ICONS.rwd;
            else if (glance.drive_type && glance.drive_type.toLowerCase().includes('front')) driveIcon = ICONS.fwd;
            else if (glance.drive_type && glance.drive_type.toLowerCase().includes('all')) driveIcon = ICONS.awd;
            drivetrainContainer.innerHTML = `
                <div class="drivetrain-item">${driveIcon} <span>${glance.drive_type || 'N/A'}</span></div>
                <div class="drivetrain-item">${ICONS.transmission} <span>${glance.transmission || 'N/A'}</span></div>
            `;

            // Price
            querySelector('.price-range').innerHTML = `<strong>Est. Market Price:</strong> ${glance.price_range || 'N/A'}`;

            // Colors
            createSwatches(getElement('exterior-colors'), parseColors(glance.colors_exterior));
            createSwatches(getElement('interior-colors'), parseColors(glance.colors_interior));

            // Pros/Cons (two-column, visual)
            getElement('vehicle-pros').textContent = glance.pros || 'N/A';
            getElement('vehicle-cons').textContent = glance.cons || 'N/A';

            // Populate Tabs
            getElement('tab-performance').innerHTML = createSpecTable(data.performance);
            // Blueprint placeholder is already in tab-dimensions, just append table below it
            getElement('tab-dimensions').innerHTML += createSpecTable(data.dimensions);
            getElement('tab-features').innerHTML = createSpecTable(data.features);
            getElement('tab-ownership').innerHTML = createSpecTable(data.ownership);

            // Hide preloader and show content
            preloader.style.display = 'none';
            contentArea.style.display = 'block';

        } catch (error) {
            console.error('Failed to load vehicle data:', error);
            
            // Show user-friendly error message
            let errorMessage = 'An error occurred while loading vehicle data.';
            
            if (error.message.includes('Vehicle not found')) {
                errorMessage = 'Vehicle not found. Please check the URL and try again.';
            } else if (error.message.includes('Server error')) {
                errorMessage = 'Server error. Please try again later.';
            } else if (error.message.includes('Invalid vehicle ID')) {
                errorMessage = 'Invalid vehicle ID. Please check the URL.';
            } else if (error.message.includes('Network error')) {
                errorMessage = 'Network error. Please check your connection and try again.';
            }
            
            preloader.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <p style="color: #dc2626; margin-bottom: 1rem;">${errorMessage}</p>
                    <button onclick="window.history.back()" style="background: #dc2626; color: white; padding: 0.5rem 1rem; border: none; border-radius: 0.375rem; cursor: pointer;">
                        Go Back
                    </button>
                </div>
            `;
        }
    };

    // --- Tab Switching Logic ---
    const tabsContainer = querySelector('.profile-tabs');
    tabsContainer.addEventListener('click', function(e) {
        if (e.target.matches('.tab-link')) {
            // Deactivate all
            tabsContainer.querySelectorAll('.tab-link').forEach(tab => tab.classList.remove('active'));
            tabsContainer.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            // Activate clicked
            const tabId = e.target.dataset.tab;
            e.target.classList.add('active');
            getElement(tabId).classList.add('active');
        }
    });

    // --- Initialize ---
    loadVehicleProfile();
}); 