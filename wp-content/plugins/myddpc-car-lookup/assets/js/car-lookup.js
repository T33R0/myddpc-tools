// File: wp-content/themes/grand-sunrise/js/car-lookup.js
// ***** MODIFIED: Removed client-side formatting, relies on server-side formatted data *****

jQuery(document).ready(function($) {
    // Use the correct localized object
    if (typeof myddpc_cl_carLookupData === 'undefined') {
        console.error('MyDDPC Car Lookup: Localized data (myddpc_cl_carLookupData) not found. Script will not function correctly.');
        return; // Stop execution if essential data is missing
    }

    console.log('Car Lookup Script Initialized (v2 - Server Formatted Data, Plugin Version).');

    // --- Configuration ---
    const ajaxUrl = myddpc_cl_carLookupData.ajax_url;
    const nonce = myddpc_cl_carLookupData.nonce;
    // Use the nonce field name provided by PHP for consistency in AJAX calls
    const nonceFieldName = myddpc_cl_carLookupData.nonce_field_name || 'myddpc_cl_nonce_field';

    // CORRECTED AJAX Action Names
    const optionsAction = 'myddpc_cl_get_vehicle_options';
    const lookupAction = 'myddpc_cl_get_vehicle_data';
    const MAX_VEHICLES = 3;

    // --- State Variables ---
    let vehicleData = { v1: null, v2: null, v3: null };
    let visibleForms = 1;
    let currentTheme = 'all';

    // --- Theme Definitions ---
    const comparisonThemes = { 'all': null, 'overview': [ 'Base MSRP', 'Engine size (l)', 'Horsepower (HP)', 'EPA combined MPG', 'EPA combined MPGe', 'Total seating', 'Cargo capacity (cu ft)', 'Drive type' ], 'performance': [ 'Engine size (l)', 'Cylinders', 'Horsepower (HP)', 'Horsepower (rpm)', 'Torque (ft-lbs)', 'Torque (rpm)', 'Transmission', 'Drive type', 'Curb weight (lbs)' ], 'efficiency': [ 'Fuel type', 'Fuel tank capacity (gal)', 'EPA combined MPG', 'EPA city/highway MPG', 'Range in miles (city/hwy)', 'EPA combined MPGe', 'EPA city/highway MPGe', 'EPA electricity range (mi)', 'EPA kWh/100 mi', 'EPA time to charge battery (at 240V) (hr)', 'Battery capacity (kWh)' ], 'dimensions': [ 'Body type', 'Doors', 'Total seating', 'Length (in)', 'Width (in)', 'Height (in)', 'Wheelbase (in)', 'Front track (in)', 'Rear track (in)', 'Ground clearance (in)', 'Turning circle (ft)', 'EPA interior volume (cu ft)', 'Cargo capacity (cu ft)', 'Maximum cargo capacity (cu ft)', 'Curb weight (lbs)', 'Gross weight (lbs)', 'Maximum payload (lbs)', 'Maximum towing capacity (lbs)', 'Front head room (in)', 'Front hip room (in)', 'Front leg room (in)', 'Front shoulder room (in)', 'Rear head room (in)', 'Rear hip room (in)', 'Rear leg room (in)', 'Rear shoulder room (in)' ] };
    // --- Stat Group Definitions ---
    const statGroups = [ { title: "Pricing & Ratings", keys: ['Base MSRP', 'Base Invoice', 'Used price range', 'NHTSA Overall Rating', 'Scorecard Overall', 'Scorecard Driving', 'Scorecard Confort', 'Scorecard Interior', 'Scorecard Utility', 'Scorecard Technology', 'Expert rating - Performance', 'Expert rating - Comfort', 'Expert rating - Interior', 'Expert rating - Technology', 'Expert rating - Storage', 'Expert rating - Fuel Economy', 'Expert rating - Value', 'Expert rating - Wildcard'] }, { title: "Engine & Performance", keys: ['Engine size (l)', 'Cylinders', 'Engine type', 'Horsepower (HP)', 'Horsepower (rpm)', 'Torque (ft-lbs)', 'Torque (rpm)', 'Valves', 'Valve timing', 'Cam type'] }, { title: "Transmission & Drivetrain", keys: ['Transmission', 'Drive type'] }, { title: "Fuel & Efficiency", keys: ['Fuel type', 'Fuel tank capacity (gal)', 'EPA combined MPG', 'EPA city/highway MPG', 'Range in miles (city/hwy)', 'EPA combined MPGe', 'EPA city/highway MPGe', 'EPA electricity range (mi)', 'EPA kWh/100 mi', 'EPA time to charge battery (at 240V) (hr)', 'Battery capacity (kWh)'] }, { title: "Dimensions & Weights", keys: ['Length (in)', 'Width (in)', 'Height (in)', 'Wheelbase (in)', 'Front track (in)', 'Rear track (in)', 'Ground clearance (in)', 'Turning circle (ft)', 'Curb weight (lbs)', 'Gross weight (lbs)'] }, { title: "Capacities & Towing", keys: ['Cargo capacity (cu ft)', 'Maximum cargo capacity (cu ft)', 'Maximum payload (lbs)', 'Maximum towing capacity (lbs)', 'Towing and hauling'] }, { title: "Interior Dimensions & Seating", keys: ['Total seating', 'EPA interior volume (cu ft)', 'Front head room (in)', 'Front hip room (in)', 'Front leg room (in)', 'Front shoulder room (in)', 'Rear head room (in)', 'Rear hip room (in)', 'Rear leg room (in)', 'Rear shoulder room (in)'] }, { title: "Chassis & Body", keys: ['Body type', 'Doors', 'Drag coefficient (Cd)', 'Suspension', 'Tires and wheels', 'Body', 'Roof and glass', 'Doors2'] }, // Added Doors2 here
        { title: "Features", keys: ['Front seats', 'Rear seats', 'Power features', 'Instrumentation', 'Convenience', 'Comfort', 'Memorized settings', 'In car entertainment', 'Truck features', 'Safety features', 'Packages', 'Exterior options', 'Interior options', 'Mechanical options'] }, { title: "Warranty", keys: ['Basic', 'Drivetrain', 'Roadside assistance', 'Rust'] }, { title: "Other", keys: ['Angle of approach (degrees)', 'Angle of departure (degrees)', 'Country of origin', 'Car classification', 'Platform code / generation number', 'Date added', 'New make', 'New model', 'New year'] } // Added new columns
    ];
    // Map DB keys to Display Labels (keep this for JS display logic)
    const statLabelMapping = { 'Base MSRP': 'Base MSRP', 'Base Invoice': 'Base Invoice', 'Body type': 'Body Type', 'Doors': 'Doors', 'Total seating': 'Total Seating', 'Length (in)': 'Length (in)', 'Width (in)': 'Width (in)', 'Height (in)': 'Height (in)', 'Wheelbase (in)': 'Wheelbase (in)', 'Front track (in)': 'Front Track (in)', 'Rear track (in)': 'Rear Track (in)', 'Ground clearance (in)': 'Ground Clearance (in)', 'Angle of approach (degrees)': 'Angle of Approach', 'Angle of departure (degrees)': 'Angle of Departure', 'Turning circle (ft)': 'Turning Circle (ft)', 'Drag coefficient (Cd)': 'Drag Coefficient (Cd)', 'EPA interior volume (cu ft)': 'EPA Interior Volume (cu ft)', 'Cargo capacity (cu ft)': 'Cargo Capacity (cu ft)', 'Maximum cargo capacity (cu ft)': 'Max Cargo Capacity (cu ft)', 'Curb weight (lbs)': 'Curb Weight (lbs)', 'Gross weight (lbs)': 'Gross Weight (lbs)', 'Maximum payload (lbs)': 'Max Payload (lbs)', 'Maximum towing capacity (lbs)': 'Max Towing Capacity (lbs)', 'Cylinders': 'Engine Configuration', 'Engine size (l)': 'Engine Size (L)', 'Horsepower (HP)': 'Horsepower (HP)', 'Horsepower (rpm)': 'Horsepower (at RPM)', 'Torque (ft-lbs)': 'Torque (ft-lbs)', 'Torque (rpm)': 'Torque (at RPM)', 'Valves': 'Valves', 'Valve timing': 'Valve Timing', 'Cam type': 'Cam Type', 'Drive type': 'Drive Type', 'Transmission': 'Transmission', 'Engine type': 'Engine Type', 'Fuel type': 'Fuel Type', 'Fuel tank capacity (gal)': 'Fuel Tank Capacity (gal)', 'EPA combined MPG': 'EPA Combined MPG', 'EPA city/highway MPG': 'EPA City/Hwy MPG', 'Range in miles (city/hwy)': 'Range (City/Hwy miles)', 'EPA combined MPGe': 'EPA Combined MPGe', 'EPA city/highway MPGe': 'EPA City/Hwy MPGe', 'EPA electricity range (mi)': 'EPA Electricity Range (mi)', 'EPA kWh/100 mi': 'EPA kWh/100 mi', 'EPA time to charge battery (at 240V) (hr)': 'EPA Charge Time (240V hr)', 'Battery capacity (kWh)': 'Battery Capacity (kWh)', 'Front head room (in)': 'Front Head Room (in)', 'Front hip room (in)': 'Front Hip Room (in)', 'Front leg room (in)': 'Front Leg Room (in)', 'Front shoulder room (in)': 'Front Shoulder Room (in)', 'Rear head room (in)': 'Rear Head Room (in)', 'Rear hip room (in)': 'Rear Hip Room (in)', 'Rear leg room (in)': 'Rear Leg Room (in)', 'Rear shoulder room (in)': 'Rear Shoulder Room (in)', 'Basic': 'Warranty - Basic', 'Drivetrain': 'Warranty - Drivetrain', 'Roadside assistance': 'Warranty - Roadside Assistance', 'Rust': 'Warranty - Rust', 'NHTSA Overall Rating': 'NHTSA Overall Rating', 'Used price range': 'Used Price Range', 'New price range': 'New Price Range', 'Scorecard Overall': 'Scorecard - Overall', 'Scorecard Driving': 'Scorecard - Driving', 'Scorecard Confort': 'Scorecard - Comfort', 'Scorecard Interior': 'Scorecard - Interior', 'Scorecard Utility': 'Scorecard - Utility', 'Scorecard Technology': 'Scorecard - Technology', 'Expert rating - Performance': 'Expert Rating - Performance', 'Expert rating - Comfort': 'Expert Rating - Comfort', 'Expert rating - Interior': 'Expert Rating - Interior', 'Expert rating - Technology': 'Expert Rating - Technology', 'Expert rating - Storage': 'Expert Rating - Storage', 'Expert rating - Fuel Economy': 'Expert Rating - Fuel Economy', 'Expert rating - Value': 'Expert Rating - Value', 'Expert rating - Wildcard': 'Expert Rating - Wildcard', 'Suspension': 'Suspension', 'Front seats': 'Front Seats', 'Rear seats': 'Rear Seats', 'Power features': 'Power Features', 'Instrumentation': 'Instrumentation', 'Convenience': 'Convenience Features', 'Comfort': 'Comfort Features', 'Memorized settings': 'Memorized Settings', 'In car entertainment': 'In-Car Entertainment', 'Roof and glass': 'Roof and Glass', 'Body': 'Body Features', 'Truck features': 'Truck Features', 'Tires and wheels': 'Tires and Wheels', 'Doors2': 'Doors Info (Text)', // Label for the text Doors2 column
        'Towing and hauling': 'Towing and Hauling', 'Safety features': 'Safety Features', 'Packages': 'Packages', 'Exterior options': 'Exterior Options', 'Interior options': 'Interior Options', 'Mechanical options': 'Mechanical Options', 'Country of origin': 'Country of Origin', 'Car classification': 'Car Classification', 'Platform code / generation number': 'Platform Code / Gen', 'Date added': 'Date Added', 'New make': 'New Make', 'New model': 'New Model', 'New year': 'New Year'
    };

    // --- Selectors Cache ---
    const vForms = { v1: $('#vehicle1-form'), v2: $('#vehicle2-form'), v3: $('#vehicle3-form') };
    const addVehicleBtn = $('#add-vehicle-btn');
    const resetAllBtn = $('#reset-all-btn');
    const removeV2Btn = $('#remove-v2-btn');
    const removeV3Btn = $('#remove-v3-btn');
    const resultsContainer = $('#lookup-results');
    const appContainer = $('.car-lookup_app');
    const loadingIndicator = $('#loading-indicator');
    const errorMessageDiv = $('#error-message');
    const resultsPlaceholder = $('#results-placeholder');
    const singleVehicleOutput = $('#single-vehicle-output');
    const singleVehicleTitle = $('#single-vehicle-title');
    const singleVehicleStats = $('#single-vehicle-stats');
    const singleVehicleNarrative = $('#single-vehicle-narrative');
    const comparisonOutput = $('#comparison-output');
    const compareTitles = { v1: $('#v1-compare-title'), v2: $('#v2-compare-title'), v3: $('#v3-compare-title') };
    const compareNarratives = { v1: $('#v1-compare-narrative'), v2: $('#v2-compare-narrative'), v3: $('#v3-compare-narrative') };
    const compareNarrativeContents = { v1: $('#v1-compare-narrative .narrative-content'), v2: $('#v2-compare-narrative .narrative-content'), v3: $('#v3-compare-narrative .narrative-content') };
    const combinedNarrative = $('#combined-narrative');
    const comparisonStatsContainer = $('.comparison-stats');
    const themeButtons = $('.theme-button');


    // --- Helper Function: Populate Dropdown ---
    function populateDropdown(dropdownSelector, optionsData, defaultOptionText) {
        const dropdown = $(dropdownSelector);
        dropdown.prop('disabled', false).empty();
        dropdown.append($('<option>', { value: '', text: defaultOptionText }));
        if (optionsData && Array.isArray(optionsData) && optionsData.length > 0) { // Check if it's an array
            $.each(optionsData, function(index, item) {
                if (item !== null && typeof item !== 'undefined' && item !== '') { // Ensure item is not empty
                    dropdown.append($('<option>', { value: item, text: item }));
                }
            });
            dropdown.prop('disabled', false);
        } else {
            dropdown.append($('<option>', { value: '', text: 'No options available' }));
            dropdown.prop('disabled', true);
        }
    }
    
    // --- Helper Function: Reset Dependent Dropdowns ---
    function resetDependentDropdowns(formPrefix, startField) { 
        const fields = ['make', 'model', 'trim']; 
        const startIndex = fields.indexOf(startField); 
        const lookupButtonSelector = `#${formPrefix}-lookup-btn`; 
        for (let i = startIndex; i < fields.length; i++) { 
            const fieldName = fields[i]; 
            const dropdown = $(`#${formPrefix}-${fieldName}`); 
            const defaultText = myddpc_cl_carLookupData[`select_${fieldName}`] || `Select ${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}`; 
            dropdown.prop('disabled', true).empty().append($('<option>', { 
                value: '', text: defaultText 
            })); 
        } 
        $(lookupButtonSelector).prop('disabled', true); 
    }

    // --- Helper Function: Perform AJAX Call for Options ---
    function fetchOptions(formPrefix, targetField, dependencies) {
        const dropdownSelector = `#${formPrefix}-${targetField}`;
        const dropdown = $(dropdownSelector);
        const loadingText = myddpc_cl_carLookupData[`loading_${targetField}s`] || `Loading ${targetField.charAt(0).toUpperCase() + targetField.slice(1)}s...`;
        const defaultText = myddpc_cl_carLookupData[`select_${targetField}`] || `Select ${targetField.charAt(0).toUpperCase() + targetField.slice(1)}`;
        dropdown.prop('disabled', true).html(`<option value="">${loadingText}</option>`);

        const ajaxData = {
            action: optionsAction,
            [nonceFieldName]: nonce, 
            target_field: targetField,
            ...dependencies
        };
        console.log('fetchOptions AJAX Data:', ajaxData);
        $.ajax({
            url: ajaxUrl,
            type: 'POST',
            data: ajaxData,
            success: function(response) {
                if (response.success) {
                    populateDropdown(dropdownSelector, response.data, defaultText);
                } else {
                    console.error(`Error fetching ${targetField}s:`, response.data ? response.data.message : 'Unknown error');
                    dropdown.prop('disabled', true).html(`<option value="">${myddpc_cl_carLookupData.ajax_error || 'AJAX Error'}</option>`);
                }
            },
            error: function(jqXHR, textStatus, errorThrown) {
                console.error('AJAX Error:', textStatus, errorThrown, jqXHR);
                dropdown.prop('disabled', true).html(`<option value="">${myddpc_cl_carLookupData.ajax_error || 'AJAX Error'}</option>`);
            }
        });
    }

    // --- Helper Function: Escape HTML (Still needed for labels, and fallback) ---
    function escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') {
            try {
                unsafe = String(unsafe);
            } catch (e) {
                return '';
            }
        }
        if (!unsafe) return '';
        return unsafe.replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // --- Helper Function: Format Single Vehicle Data into HTML List ---
    function formatSingleVehicleHtml(vehicleData, theme = 'all') {
        // *** SIMPLIFIED: Assumes data is pre-formatted by PHP ***
        const excludeKeys = [ /* Keep your exclusion list */ 'id', 'make', 'model', 'year', 'trim', 'ID', 'trim (description)', 'colors exterior', 'colors interior', 'source json', 'source url', 'image url', 'images url', 'review', 'pros', 'cons', 'what\'s new', 'expert rating - our verdict', 'old trim', 'old description', 'narrative' ];
        const excludeKeysLower = excludeKeys.map(key => key.toLowerCase());
        excludeKeysLower.push('year', 'make', 'model', 'trim'); // Also exclude these base identifiers

        const allowedKeysForTheme = comparisonThemes[theme];
        let finalHtml = '';
        let totalStatsShown = 0;

        if (!vehicleData || typeof vehicleData !== 'object') {
            console.warn('formatSingleVehicleHtml received invalid data:', vehicleData);
            return '<p>Invalid vehicle data received.</p>';
        }

        statGroups.forEach(group => {
            let groupHtml = '';
            let statsInGroup = 0;

            // Filter keys based on existence in data, exclusion list, and theme
            const groupKeysToShow = group.keys.filter(key =>
                Object.hasOwnProperty.call(vehicleData, key) &&
                !excludeKeysLower.includes(key.toLowerCase()) &&
                (theme === 'all' || (allowedKeysForTheme && allowedKeysForTheme.includes(key)))
            );

            if (groupKeysToShow.length > 0) {
                let listItemsHtml = '';
                groupKeysToShow.forEach(key => {
                    const displayLabel = statLabelMapping[key] || key; // Use mapping for label
                    // Get the ALREADY FORMATTED value from the data object
                    let displayValue = vehicleData[key];

                    // Basic check in case PHP missed something or for non-string 'N/A'
                    if (displayValue === null || typeof displayValue === 'undefined') {
                         displayValue = 'N/A';
                    }

                    // Display value directly - PHP handled formatting and escaping (via wp_kses_post/esc_html)
                    // No need for escapeHtml here if PHP did it right, but doesn't hurt for safety if PHP only did basic escaping.
                    // If PHP used wp_kses_post, DO NOT escape here as it strips allowed HTML.
                    listItemsHtml += `<li><strong>${escapeHtml(displayLabel)}:</strong> ${displayValue}</li>`; // Label needs escaping
                    statsInGroup++;
                });

                if (statsInGroup > 0) {
                    groupHtml += `<div class="stat-group">`;
                    groupHtml += `<h5 class="stat-group-title">${escapeHtml(group.title)}</h5>`;
                    groupHtml += `<ul>${listItemsHtml}</ul>`;
                    groupHtml += `</div>`;
                    finalHtml += groupHtml;
                    totalStatsShown += statsInGroup;
                }
            }
        });

        if (totalStatsShown === 0) {
            return `<p>No data available for the selected view (${escapeHtml(theme)}).</p>`;
        }
        return finalHtml;
    }

    // --- Helper Function: Generate Comparison Table HTML ---
    // NEW dynamic‑column version:
    function generateComparisonTableHtml(vehicleDataArray = [], theme = 'all') {
        const count = vehicleDataArray.length;
        // If nothing selected, bail out
        if (count === 0) {
            return `<p class="no-comparison">Select at least one vehicle to compare.</p>`;
        }
        
        // Build table header
        // Build table header with photo + name under it
        let headerHtml = '<thead><tr><th class="stat-col-header">Stat</th>';
        for (let i = 0; i < count; i++) {
          const vd = vehicleDataArray[i] || {};
          const imgUrl = vd.image_url || '';
          const title = vd.year && vd.make && vd.model
            ? `${vd.year} ${vd.make} ${vd.model}`
            : `Vehicle ${i+1}`;
          headerHtml += `
            <th class="vehicle-col-header">
              ${ imgUrl
                 ? `<img src="${imgUrl}" alt="${escapeHtml(title)}" class="cmp-photo" />`
                 : ''
              }
              <div class="cmp-title">${escapeHtml(title)}</div>
            </th>
          `;
        }
          headerHtml += '</tr></thead>';
    
        // Build table body
        let bodyHtml = '';
        const excludeKeysLower = [ /* Keep your exclusion list */ 'id', 'make', 'model', 'year', 'trim', 'ID', 'trim (description)', 'colors exterior', 'colors interior', 'source json', 'source url', 'image url', 'images url', 'review', 'pros', 'cons', 'what\'s new', 'expert rating - our verdict', 'old trim', 'old description', 'narrative' ].map(key => key.toLowerCase());
        excludeKeysLower.push('year', 'make', 'model', 'trim');

        statGroups.forEach(group => {
            // Filter keys present in at least one vehicle
            const keys = group.keys.filter(key => {
            return vehicleDataArray.some(vd => vd && vd[key] != null)
                    && !excludeKeysLower.includes(key.toLowerCase())
                    && (theme === 'all' || (comparisonThemes[theme]?.includes(key)));
            });
            if (!keys.length) return;  // skip empty groups
        
            // Group title row
            bodyHtml += `<tr><th colspan="${count + 1}" class="stat-group-header">${
                        escapeHtml(group.title)
                        }</th></tr>`;
            // Each stat row
            keys.forEach(key => {
            bodyHtml += `<tr><td>${escapeHtml(statLabelMapping[key] || key)}</td>`;
            vehicleDataArray.forEach(vd => {
                const val = vd?.[key] ?? 'N/A';
                // Values are pre-formatted by PHP, but we escape here for safety if they are simple strings.
                // If PHP used wp_kses_post and values contain HTML, this escapeHtml might strip it.
                // Assuming PHP provides clean, simple string values or 'N/A'.
                bodyHtml += `<td>${escapeHtml(String(val))}</td>`;
            });
            bodyHtml += '</tr>';
            });
        });
    
        if (!bodyHtml) {
            return `<p class="no-comparison">No data available for this view (${escapeHtml(theme)}).</p>`;
        }
    
        return `<table class="comparison-stats-table">${headerHtml}<tbody>${bodyHtml}</tbody></table>`;
    }

    // --- Function to handle showing errors ---
    function showError(message) {
        console.log('showError called:', message);
        errorMessageDiv.html(escapeHtml(message)).slideDown();
        loadingIndicator.hide();
        resultsPlaceholder.hide();
        singleVehicleOutput.hide();
        comparisonOutput.hide();
    }

    // --- Function to handle showing loading state ---
    function showLoading() {
        console.log('showLoading called.');
        loadingIndicator.slideDown();
        errorMessageDiv.hide();
    //    resultsPlaceholder.hide();
    //    singleVehicleOutput.hide();
    //    comparisonOutput.hide();
    }

    // --- Function to handle hiding loading/error ---
    function hideLoadingError() {
        loadingIndicator.hide();
        errorMessageDiv.hide();
    }

    // --- Main Display Logic Function ---
    const origDisplayResults = function() {
        console.log('--- displayResults called (Server Formatted) ---');
        // ... (rest of displayResults logic remains largely the same) ...
        // It just uses the data object directly without calling formatDisplayValue

        hideLoadingError();
        const v1Data = vehicleData.v1;
        const v2Data = vehicleData.v2;
        const v3Data = vehicleData.v3;
        const hasV1Data = v1Data !== null;
        const hasV2Data = v2Data !== null;
        const hasV3Data = v3Data !== null;
        const isComparison = visibleForms > 1;
        console.log('Is Comparison Mode?', isComparison);

        // Use raw Make/Model/Trim for titles before potentially escaping/formatting
        const getTitle = (data, defaultTitle) => {
            if (!data) return defaultTitle;
            // Assuming PHP didn't format these specific fields, escape them here
            return `${escapeHtml(data.year)} ${escapeHtml(data.make)} ${escapeHtml(data.model)} ${escapeHtml(data.trim)}`;
        };
        compareTitles.v1.text(getTitle(v1Data, 'Vehicle 1'));
        compareTitles.v2.text(getTitle(v2Data, 'Vehicle 2'));
        compareTitles.v3.text(getTitle(v3Data, 'Vehicle 3'));

        // Get narratives (PHP formatting already handled nl2br and escaping)
        const v1Narrative = v1Data && v1Data.narrative ? v1Data.narrative : '';
        const v2Narrative = v2Data && v2Data.narrative ? v2Data.narrative : '';
        const v3Narrative = v3Data && v3Data.narrative ? v3Data.narrative : '';

        if (isComparison) {
            singleVehicleOutput.hide();
            appContainer.addClass('comparison-view');

            compareTitles.v2.toggle(visibleForms >= 2);
            compareNarratives.v2.toggle(visibleForms >= 2);
            compareTitles.v3.toggle(visibleForms >= 3);
            compareNarratives.v3.toggle(visibleForms >= 3);

            compareNarrativeContents.v1.html(v1Narrative || (hasV1Data ? '<p><i>No narrative available.</i></p>' : ''));
            compareNarrativeContents.v2.html(v2Narrative || (hasV2Data ? '<p><i>No narrative available.</i></p>' : ''));
            compareNarrativeContents.v3.html(v3Narrative || (hasV3Data ? '<p><i>No narrative available.</i></p>' : ''));

            // NEW invocation: pack selected data into an array
            const selectedData = [];
            if (v1Data) selectedData.push(v1Data);
            if (visibleForms >= 2 && v2Data) selectedData.push(v2Data);
            if (visibleForms >= 3 && v3Data) selectedData.push(v3Data);
            comparisonStatsContainer.html(
              generateComparisonTableHtml(selectedData, currentTheme)
            );
            combinedNarrative.html('<p><i>Comparative overview not yet implemented.</i></p>');
            resultsPlaceholder.hide();
            comparisonOutput.show();
            console.log('Action: Showing comparison output.');

        } else { // Single View
            comparisonOutput.hide();
            appContainer.removeClass('comparison-view');

            if (v1Data) {
                singleVehicleTitle.text(getTitle(v1Data, 'Vehicle Details'));

                // --- Vehicle Image Feedback UI: dynamically insert if not present or if vehicle changed ---
                let feedbackHtml = `\n<div id=\"vehicle-image-feedback\" class=\"vehicle-image-feedback\"\n  data-year=\"${v1Data.year ? String(v1Data.year).replace(/&/g,'&amp;').replace(/"/g,'&quot;') : ''}\"\n  data-make=\"${v1Data.make ? String(v1Data.make).replace(/&/g,'&amp;').replace(/"/g,'&quot;') : ''}\"\n  data-model=\"${v1Data.model ? String(v1Data.model).replace(/&/g,'&amp;').replace(/"/g,'&quot;') : ''}\"\n  style=\"display:none;\">\n  <span class=\"feedback-label\">Is there a problem with this image?</span>\n  <div class=\"image-feedback-buttons\">\n    <button type=\"button\" class=\"feedback-btn image-feedback-btn\" data-feedback-type=\"wrong_image\">Wrong Image</button>\n    <button type=\"button\" class=\"feedback-btn image-feedback-btn\" data-feedback-type=\"no_image\">No Image for this Vehicle</button>\n  </div>\n  <div class=\"feedback-thankyou image-feedback-thankyou\" style=\"display:none;\">Thank you for your feedback!</div>\n  <div class=\"feedback-error image-feedback-error\" style=\"display:none;\"></div>\n</div>\n`;

                const photoHtml = `\n  <div class=\"vehicle-photo-wrapper\">\n    <img\n      src=\"${v1Data.image_url}\"\n      alt=\"Photo of ${v1Data.year} ${v1Data.make} ${v1Data.model}\"\n      class=\"vehicle-photo\"\n    />\n  </div>\n`;

                const statsHtml = formatSingleVehicleHtml(v1Data, currentTheme);
                // Insert feedback UI + image + stats
                singleVehicleStats.html(feedbackHtml + photoHtml + statsHtml);

                singleVehicleNarrative.html(v1Narrative || '<p><i>No narrative available.</i></p>');
                singleVehicleOutput.show();
                console.log('Action: Showing single output.');
            } else {
                singleVehicleOutput.hide();
                resultsPlaceholder.text('Select Vehicle 1 options and click Lookup.').show();
                console.log('Action: Showing placeholder (no data).');
            }
        }
        resetAllBtn.toggle(visibleForms > 1);
        console.log('--- displayResults finished ---');
    };

    displayResults = function() {
        origDisplayResults.apply(this, arguments);
        // Only show feedback UI in single vehicle view with data
        const v1Data = vehicleData.v1;
        if (visibleForms === 1 && v1Data) {
            setupImageFeedbackUI();
        } else {
            $('#vehicle-image-feedback').hide();
        }
    };

    // --- Event Listeners for Vehicle Dropdowns ---
    function setupDropdownListeners(prefix) {
        const form = vForms[prefix];
        form.find(`#${prefix}-year`).on('change', function() {
            console.log(`${prefix}-year changed`);
            const selectedYear = $(this).val();
            resetDependentDropdowns(prefix, 'make');
            vehicleData[prefix] = null;
            console.log(`Reset vehicleData.${prefix}`);
            displayResults();
            if (selectedYear) {
                fetchOptions(prefix, 'make', { selected_year: selectedYear });
            }
        });
        form.find(`#${prefix}-make`).on('change', function() {
            const selectedMake = $(this).val();
            const selectedYear = form.find(`#${prefix}-year`).val();
            resetDependentDropdowns(prefix, 'model');
            vehicleData[prefix] = null;
            displayResults();
            if (selectedMake && selectedYear) {
                fetchOptions(prefix, 'model', { selected_year: selectedYear, selected_make: selectedMake });
            }
        });
        form.find(`#${prefix}-model`).on('change', function() {
            const selectedModel = $(this).val();
            const selectedMake = form.find(`#${prefix}-make`).val();
            const selectedYear = form.find(`#${prefix}-year`).val();
            resetDependentDropdowns(prefix, 'trim');
            vehicleData[prefix] = null;
            displayResults();
            if (selectedModel && selectedMake && selectedYear) {
                fetchOptions(prefix, 'trim', { selected_year: selectedYear, selected_make: selectedMake, selected_model: selectedModel });
            }
        });
        form.find(`#${prefix}-trim`).on('change', function() {
            const selectedTrim = $(this).val();
            const allSelected = form.find(`#${prefix}-year`).val() &&
                                form.find(`#${prefix}-make`).val() &&
                                form.find(`#${prefix}-model`).val() &&
                                selectedTrim;
            form.find(`#${prefix}-lookup-btn`).prop('disabled', !allSelected);
        });
    }
    setupDropdownListeners('v1');
    setupDropdownListeners('v2');
    setupDropdownListeners('v3');

    // --- Event Listeners for Add/Remove/Reset Buttons ---
    addVehicleBtn.on('click', function() { console.log('Add Vehicle Button clicked'); if (visibleForms < MAX_VEHICLES) { visibleForms++; const nextFormPrefix = `v${visibleForms}`; vForms[nextFormPrefix].slideDown(); if (nextFormPrefix === 'v2') removeV2Btn.show(); if (nextFormPrefix === 'v3') removeV3Btn.show(); addVehicleBtn.toggle(visibleForms < MAX_VEHICLES); displayResults(); } });
    removeV2Btn.on('click', function() { console.log('Remove Vehicle 2 clicked'); if (visibleForms === 3) { vForms.v3.slideUp(); removeV3Btn.hide(); vehicleData.v3 = null; console.log('Reset vehicleData.v3'); } vForms.v2.slideUp(); removeV2Btn.hide(); vehicleData.v2 = null; console.log('Reset vehicleData.v2'); visibleForms = 1; addVehicleBtn.show(); displayResults(); });
    removeV3Btn.on('click', function() { console.log('Remove Vehicle 3 clicked'); vForms.v3.slideUp(); removeV3Btn.hide(); vehicleData.v3 = null; console.log('Reset vehicleData.v3'); visibleForms = 2; addVehicleBtn.show(); displayResults(); });
    resetAllBtn.on('click', function() { console.log('Reset All clicked'); if (visibleForms === 3) { vForms.v3.slideUp(); removeV3Btn.hide(); } if (visibleForms >= 2) { vForms.v2.slideUp(); removeV2Btn.hide(); } vehicleData = { v1: null, v2: null, v3: null }; visibleForms = 1; currentTheme = 'all'; addVehicleBtn.show(); themeButtons.removeClass('active'); themeButtons.filter(`[data-theme="${currentTheme}"]`).addClass('active'); displayResults(); });

    // --- Event Listeners for Lookup Buttons ---
    $('.lookup-button').on('click', function(e) {
        e.preventDefault();
        const buttonId = $(this).attr('id');
        const formPrefix = buttonId.split('-')[0]; // ... (year, make, model, trim retrieval) ...
        const year = $(`#${formPrefix}-year`).val();
        const make = $(`#${formPrefix}-make`).val();
        const model = $(`#${formPrefix}-model`).val();
        const trim = $(`#${formPrefix}-trim`).val();

        if (!year || !make || !model || !trim) {
            showError(`Please select Year, Make, Model, and Trim for Vehicle ${formPrefix.substring(1)} before looking up.`);
            return;
        }
        showLoading();
        const lookupData = {
            action: lookupAction,
            // Send the nonce under the field name expected by PHP
            [nonceFieldName]: nonce, // Dynamic key for the nonce field
            v_year: year,
            v_make: make,
            v_model: model,
            v_trim: trim
        };
        console.log(`Performing lookup AJAX call for ${formPrefix} with data:`, lookupData);
        $.ajax({
            url: ajaxUrl,
            type: 'POST',
            data: lookupData,
            success: function(response) {
                // ... (your existing success logic)
                if (response.success) {
                    const fetchedData = { ...response.data, year: year, make: make, model: model, trim: trim };
                    vehicleData[formPrefix] = fetchedData;
                } else {
                    const message = response.data && response.data.message ? response.data.message : (myddpc_cl_carLookupData.lookup_error || 'Could not retrieve vehicle data.');
                    showError(`Vehicle ${formPrefix.substring(1)}: ${message}`);
                    vehicleData[formPrefix] = null;
                }
                displayResults();
            },
            error: function(jqXHR, textStatus, errorThrown) {
                // ... (your existing error logic)
                showError(`AJAX error looking up Vehicle ${formPrefix.substring(1)}.`);
                vehicleData[formPrefix] = null;
                displayResults();
            }
        });
    });

    // --- Event Listener for Theme Buttons ---
    themeButtons.on('click', function() { const selectedTheme = $(this).data('theme'); console.log('Theme button clicked:', selectedTheme); if (selectedTheme !== currentTheme) { currentTheme = selectedTheme; themeButtons.removeClass('active'); $(this).addClass('active'); displayResults(); } });

    // --- Vehicle Image Feedback UI Logic ---
    function setupImageFeedbackUI() {
        // Only show in single vehicle view
        const feedbackContainer = $('#vehicle-image-feedback');
        if (!feedbackContainer.length) return;

        // Remove any previous handlers to avoid duplicates
        feedbackContainer.off('click', '.image-feedback-btn');

        // Show the feedback UI (reset state)
        feedbackContainer.find('.image-feedback-thankyou').hide();
        feedbackContainer.find('.image-feedback-buttons').show();
        feedbackContainer.show();

        // Handle button clicks
        feedbackContainer.on('click', '.image-feedback-btn', function(e) {
            e.preventDefault();
            const btn = $(this);
            const feedbackType = btn.data('feedback-type');
            // Get vehicle info from data attributes (set by PHP in HTML)
            const year = feedbackContainer.data('year');
            const make = feedbackContainer.data('make');
            const model = feedbackContainer.data('model');
            if (!year || !make || !model || !feedbackType) {
                alert('Missing vehicle info for feedback.');
                return;
            }
            // Disable buttons to prevent double submit
            feedbackContainer.find('.image-feedback-btn').prop('disabled', true);
            // AJAX call
            $.ajax({
                url: ajaxUrl,
                type: 'POST',
                data: {
                    action: 'myddpc_cl_submit_image_feedback', // FIXED: match PHP handler
                    [nonceFieldName]: nonce,
                    year: year,
                    make: make,
                    model: model,
                    feedback_type: feedbackType
                },
                success: function(response) {
                    feedbackContainer.find('.image-feedback-buttons').hide();
                    feedbackContainer.find('.image-feedback-thankyou').show();
                    // Optionally, prompt logged-in users to upload a better image
                    if (response && response.data && response.data.can_upload_image) {
                        feedbackContainer.find('.image-feedback-upload-prompt').show();
                    }
                },
                error: function(xhr, status, error) {
                    console.error('Image feedback AJAX error:', status, error, xhr && xhr.responseText);
                    feedbackContainer.find('.image-feedback-buttons').hide();
                    feedbackContainer.find('.image-feedback-thankyou').show().text('Thank you! (But there was a problem submitting your feedback.)');
                }
            });
        });
    }

    // --- Initial State ---
    console.log('Setting initial state.');
    resetDependentDropdowns('v1', 'make');
    resetDependentDropdowns('v2', 'make');
    resetDependentDropdowns('v3', 'make');
    vForms.v2.hide(); removeV2Btn.hide();
    vForms.v3.hide(); removeV3Btn.hide();
    appContainer.removeClass('comparison-view');
    themeButtons.removeClass('active'); themeButtons.filter(`[data-theme="${currentTheme}"]`).addClass('active');
    resetAllBtn.hide();
    displayResults(); // Initial display

}); // End jQuery ready