// Fetch filter options from REST API
async function fetchFilterOptions() {
    const res = await fetch(
        myddpc_discover_data.root + myddpc_discover_data.routes.filters,
        { headers: { 'X-WP-Nonce': myddpc_discover_data.nonce } }
    );
    if (!res.ok) throw new Error('Failed to fetch filter options');
    const optionsData = await res.json();

    // Populate year min/max dropdowns
    const yearMin = document.getElementById('filter-year-min');
    const yearMax = document.getElementById('filter-year-max');
    if (yearMin && yearMax && optionsData.year && optionsData.year.min && optionsData.year.max) {
        yearMin.innerHTML = '';
        yearMax.innerHTML = '';
        for (let y = optionsData.year.min; y <= optionsData.year.max; y++) {
            const optMin = document.createElement('option');
            optMin.value = y;
            optMin.textContent = y;
            yearMin.appendChild(optMin);
            const optMax = document.createElement('option');
            optMax.value = y;
            optMax.textContent = y;
            yearMax.appendChild(optMax);
        }
        // Set defaults
        yearMin.value = optionsData.year.min;
        yearMax.value = optionsData.year.max;
    }

    // Drivetrain
    const drivetrainSelect = document.getElementById('filter-drivetrain');
    if (drivetrainSelect && Array.isArray(optionsData.drive_type)) {
        drivetrainSelect.innerHTML = '';
        optionsData.drive_type.forEach(option => {
            const opt = document.createElement('option');
            opt.value = option;
            opt.textContent = option;
            drivetrainSelect.appendChild(opt);
        });
    }
    // Transmission
    const transSelect = document.getElementById('filter-transmission');
    if (transSelect && Array.isArray(optionsData.transmission)) {
        transSelect.innerHTML = '';
        optionsData.transmission.forEach(option => {
            const opt = document.createElement('option');
            opt.value = option;
            opt.textContent = option;
            transSelect.appendChild(opt);
        });
    }
    // Cylinders
    const cylSelect = document.getElementById('filter-cylinders');
    if (cylSelect && Array.isArray(optionsData.cylinders)) {
        cylSelect.innerHTML = '';
        optionsData.cylinders.forEach(option => {
            const opt = document.createElement('option');
            opt.value = option;
            opt.textContent = option;
            cylSelect.appendChild(opt);
        });
    }
    // Body type
    const bodySelect = document.getElementById('filter-body-type');
    if (bodySelect && Array.isArray(optionsData.body_type)) {
        bodySelect.innerHTML = '';
        optionsData.body_type.forEach(option => {
            const opt = document.createElement('option');
            opt.value = option;
            opt.textContent = option;
            bodySelect.appendChild(opt);
        });
    }
    // Country of origin
    const countrySelect = document.getElementById('filter-country-of-origin');
    if (countrySelect && Array.isArray(optionsData.country_of_origin)) {
        countrySelect.innerHTML = '';
        optionsData.country_of_origin.forEach(option => {
            const opt = document.createElement('option');
            opt.value = option;
            opt.textContent = option;
            countrySelect.appendChild(opt);
        });
    }
    // Engine size min/max
    if (optionsData.engine_size && typeof optionsData.engine_size.min !== 'undefined') {
        const minInput = document.getElementById('filter-engine-size-min');
        if (minInput) minInput.setAttribute('min', optionsData.engine_size.min);
    }
    if (optionsData.engine_size && typeof optionsData.engine_size.max !== 'undefined') {
        const maxInput = document.getElementById('filter-engine-size-max');
        if (maxInput) maxInput.setAttribute('max', optionsData.engine_size.max);
    }
    return optionsData;
}

// Fetch results from REST API
async function fetchResults(filters = {}, limit = 50, offset = 0) {
    const res = await fetch(
        myddpc_discover_data.root + myddpc_discover_data.routes.results,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-WP-Nonce': myddpc_discover_data.nonce
            },
            body: JSON.stringify({ filters, limit, offset })
        }
    );
    if (!res.ok) throw new Error('Failed to fetch results');
    return await res.json();
}

// Render table rows for results
function renderTableRows(results) {
    if (!Array.isArray(results)) { return; }
    const tbody = document.querySelector('#discover-table tbody');
    if (!tbody) { return; }
    tbody.innerHTML = '';
    results.forEach(row => {
        const tr = document.createElement('tr');
        tr.dataset.vehicleId = row.id || row.ID; // match your primary key field name
        tr.innerHTML = `
            <td>${row.Year}</td>
            <td>${row.Make}</td>
            <td>${row.Model}</td>
            <td>${row.Trim}</td>
            <td>${row['Platform code / generation']}</td>
            <td>${row['Country of origin']}</td>
            <td>${row['Body type']}</td>
            <td>${row['Car classification']}</td>
            <td>${row['Drive type']}</td>
            <td>${row.Transmission}</td>
            <td>${row.Cylinders}</td>
            <td>${row['Engine size (l)']}</td>
            <td>${row['Horsepower (HP)']}</td>
            <td>${row['Torque (ft-lbs)']}</td>
            <td>${row['Curb weight (lbs)']}</td>
            <td>${row.Doors}</td>
            <td>${row['Total seating']}</td>
            <td>${row['Cargo capacity (cu ft)']}</td>
            <td>${row['Maximum towing capacity (lbs)']}</td>
            <td>${row['Ground clearance (in)']}</td>
            <td>${row['Fuel type']}</td>
            <td>${row['EPA combined MPG']}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Implement renderDetailModal
async function renderDetailModal(vehicleId) {
    const modal = document.getElementById('discover-detail-modal');
    if (!modal) return;
    modal.dataset.currentVehicle = vehicleId;
    modal.classList.remove('hidden');
}

// Event listeners

document.addEventListener('DOMContentLoaded', () => {
    let currentLimit = 50;
    let optionsData = null;
    fetchFilterOptions().then(data => {
        optionsData = data;
        // Initial fetch
        const limitEl = document.getElementById('rows-per-page');
        currentLimit = limitEl ? parseInt(limitEl.value, 10) : 50;
        fetchResults(getCurrentFilters(), currentLimit, 0).then(updateResultsTable);
        // Attach change listeners to all filters
        attachFilterListeners();
    });
});

function getCurrentFilters() {
    const filters = {};
    // Year min/max
    const yearMin = document.getElementById('filter-year-min');
    const yearMax = document.getElementById('filter-year-max');
    if (yearMin && yearMin.value) filters.year_min = parseInt(yearMin.value, 10);
    if (yearMax && yearMax.value) filters.year_max = parseInt(yearMax.value, 10);
    // Drivetrain
    const drivetrainSel = document.getElementById('filter-drivetrain');
    if (drivetrainSel) {
        const vals = Array.from(drivetrainSel.selectedOptions).map(o => o.value);
        if (vals.length) filters.drive_type = vals;
    }
    // Transmission
    const transSel = document.getElementById('filter-transmission');
    if (transSel) {
        const vals = Array.from(transSel.selectedOptions).map(o => o.value);
        if (vals.length) filters.transmission = vals;
    }
    // Cylinders
    const cylSel = document.getElementById('filter-cylinders');
    if (cylSel) {
        const vals = Array.from(cylSel.selectedOptions).map(o => o.value);
        if (vals.length) filters.cylinders = vals;
    }
    // Body type
    const bodySel = document.getElementById('filter-body-type');
    if (bodySel) {
        const vals = Array.from(bodySel.selectedOptions).map(o => o.value);
        if (vals.length) filters.body_type = vals;
    }
    // Country of origin
    const countrySel = document.getElementById('filter-country-of-origin');
    if (countrySel) {
        const vals = Array.from(countrySel.selectedOptions).map(o => o.value);
        if (vals.length) filters.country_of_origin = vals;
    }
    // Engine size min/max
    const engMin = document.getElementById('filter-engine-size-min');
    const engMax = document.getElementById('filter-engine-size-max');
    if (engMin && engMin.value) filters.engine_size_min = parseFloat(engMin.value);
    if (engMax && engMax.value) filters.engine_size_max = parseFloat(engMax.value);
    return filters;
}

function updateResultsTable(json) {
    const totalCountEl = document.getElementById('discover-total-count');
    if (totalCountEl && Array.isArray(json.results)) {
        totalCountEl.textContent = `Showing ${json.results.length} of ${json.total} matches`;
    }
    renderTableRows(json.results);
}

function attachFilterListeners() {
    const filterIds = [
        'filter-year-min', 'filter-year-max',
        'filter-drivetrain', 'filter-transmission', 'filter-cylinders',
        'filter-body-type', 'filter-country-of-origin',
        'filter-engine-size-min', 'filter-engine-size-max',
        'rows-per-page'
    ];
    filterIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', () => {
                const limitEl = document.getElementById('rows-per-page');
                const limit = limitEl ? parseInt(limitEl.value, 10) : 50;
                fetchResults(getCurrentFilters(), limit, 0).then(updateResultsTable);
            });
        }
    });
}

// 6) Row click to open detail modal
const table = document.getElementById('discover-table');
if (table) {
    table.addEventListener('click', function(e) {
        const row = e.target.closest('tr');
        if (row && row.dataset.vehicleId) {
            renderDetailModal(row.dataset.vehicleId);
        }
    });
}

// 7) Modal close
const modalClose = document.querySelector('.modal-close');
if (modalClose) {
    modalClose.addEventListener('click', () => {
        const modal = document.getElementById('discover-detail-modal');
        if (modal) modal.classList.add('hidden');
    });
}

// 8) Save Vehicle (optional)
const saveBtn = document.getElementById('discover-save-vehicle');
if (saveBtn) {
    saveBtn.addEventListener('click', () => {
        const modal = document.getElementById('discover-detail-modal');
        if (modal) {
            const vehicleId = modal.dataset.currentVehicle;
            // POST to /wp-json/myddpc/v1/discover/save with { vehicle_id: vehicleId }
        }
    });
}