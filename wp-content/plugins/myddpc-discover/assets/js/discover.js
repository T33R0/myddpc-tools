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
        // Set defaults: min blank, max = max year
        yearMin.value = optionsData.year.min;
        yearMax.value = optionsData.year.max;
    }

    // Populate Make
    const makeSelect = document.getElementById('filter-make');
    if (makeSelect && Array.isArray(optionsData.make)) {
        makeSelect.innerHTML = '';
        optionsData.make.forEach(opt => {
            const o = document.createElement('option');
            o.value = opt;
            o.textContent = opt;
            makeSelect.appendChild(o);
        });
    }
    // Populate Drivetrain
    const drivetrainSelect = document.getElementById('filter-drivetrain');
    if (drivetrainSelect && Array.isArray(optionsData.drive_type)) {
        drivetrainSelect.innerHTML = '';
        optionsData.drive_type.forEach(opt => {
            const o = document.createElement('option');
            o.value = opt;
            o.textContent = opt;
            drivetrainSelect.appendChild(o);
        });
    }
    // Populate Transmission
    const transSelect = document.getElementById('filter-transmission');
    if (transSelect && Array.isArray(optionsData.transmission)) {
        transSelect.innerHTML = '';
        optionsData.transmission.forEach(opt => {
            const o = document.createElement('option');
            o.value = opt;
            o.textContent = opt;
            transSelect.appendChild(o);
        });
    }
    // Populate Cylinders
    const cylSelect = document.getElementById('filter-cylinders');
    if (cylSelect && Array.isArray(optionsData.cylinders)) {
        cylSelect.innerHTML = '';
        optionsData.cylinders.forEach(opt => {
            const o = document.createElement('option');
            o.value = opt;
            o.textContent = opt;
            cylSelect.appendChild(o);
        });
    }
    // Populate Body type
    const bodySelect = document.getElementById('filter-body-type');
    if (bodySelect && Array.isArray(optionsData.body_type)) {
        bodySelect.innerHTML = '';
        optionsData.body_type.forEach(opt => {
            const o = document.createElement('option');
            o.value = opt;
            o.textContent = opt;
            bodySelect.appendChild(o);
        });
    }
    // Populate Country
    const countrySelect = document.getElementById('filter-country-of-origin');
    if (countrySelect && Array.isArray(optionsData.country_of_origin)) {
        countrySelect.innerHTML = '';
        optionsData.country_of_origin.forEach(opt => {
            const o = document.createElement('option');
            o.value = opt;
            o.textContent = opt;
            countrySelect.appendChild(o);
        });
    }
    // Populate Fuel Type
    const fuelSelect = document.getElementById('filter-fuel-type');
    if (fuelSelect && Array.isArray(optionsData.fuel_type)) {
        fuelSelect.innerHTML = '';
        optionsData.fuel_type.forEach(opt => {
            const o = document.createElement('option');
            o.value = opt;
            o.textContent = opt;
            fuelSelect.appendChild(o);
        });
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
        tr.dataset.vehicleId = row.id || row.ID;
        tr.innerHTML = `
            <td>${row.Year}</td>
            <td>${row.Make}</td>
            <td>${row.Model}</td>
            <td>${row.Trim}</td>
            <td>${row['Engine size (l)']}</td>
            <td>${row.Cylinders}</td>
            <td>${row['Drive type']}</td>
            <td>${row.Transmission}</td>
            <td>${row['Body type']}</td>
            <td>${row['Car classification']}</td>
            <td>${row['Platform code / generation']}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Implement renderDetailModal
async function renderDetailModal(vehicleId) {
    const modal = document.getElementById('discover-detail-modal');
    if (!modal) return;
    // Fetch full vehicle details (simulate by finding in last results for now)
    let vehicle = null;
    // Try to find in last results
    const tbody = document.querySelector('#discover-table tbody');
    if (tbody) {
        const rows = Array.from(tbody.children);
        for (const tr of rows) {
            if (tr.dataset.vehicleId == vehicleId) {
                // Use the data from the row if available
                // (In real use, fetch from API)
                vehicle = tr;
                break;
            }
        }
    }
    // For now, just use the last fetched row data if available
    // (Replace with API fetch for full details if needed)
    if (vehicle) {
        document.getElementById('detail-year').textContent = vehicle.children[0].textContent;
        document.getElementById('detail-make').textContent = vehicle.children[1].textContent;
        document.getElementById('detail-model').textContent = vehicle.children[2].textContent;
        document.getElementById('detail-trim').textContent = vehicle.children[3].textContent;
        document.getElementById('detail-engine').textContent = vehicle.children[4].textContent;
        document.getElementById('detail-cylinders').textContent = vehicle.children[5].textContent;
        document.getElementById('detail-drive').textContent = vehicle.children[6].textContent;
        document.getElementById('detail-transmission').textContent = vehicle.children[7].textContent;
        document.getElementById('detail-body').textContent = vehicle.children[8].textContent;
        document.getElementById('detail-classification').textContent = vehicle.children[9].textContent;
        document.getElementById('detail-platform').textContent = vehicle.children[10].textContent;
    }
    modal.dataset.currentVehicle = vehicleId;
    modal.classList.remove('hidden');
}

// Event listeners

document.addEventListener('DOMContentLoaded', () => {
    let currentLimit = 50;
    let optionsData = null;
    // Ensure rows-per-page select has 10, 25, 50, 100
    const limitEl = document.getElementById('rows-per-page');
    if (limitEl) {
        limitEl.innerHTML = '';
        [10, 25, 50, 100].forEach(val => {
            const opt = document.createElement('option');
            opt.value = val;
            opt.textContent = val;
            if (val === 10) opt.selected = true;
            limitEl.appendChild(opt);
        });
    }
    fetchFilterOptions().then(data => {
        optionsData = data;
        currentLimit = limitEl ? parseInt(limitEl.value, 10) : 50;
        fetchResults(getCurrentFilters(), currentLimit, 0).then(updateResultsTable);
        attachFilterListeners();
        initializeChoicesForMultiSelects();
    });
    window.addEventListener('resize', () => {
        initializeChoicesForMultiSelects();
    });
});

function initializeChoicesForMultiSelects() {
    if (window.innerWidth >= 768) {
        document.querySelectorAll('.multi-select-enhanced').forEach(el => {
            if (!el.classList.contains('choices-initialized')) {
                new Choices(el, {
                    removeItemButton: true,
                    searchEnabled: true,
                    placeholder: true,
                    placeholderValue: 'Select…',
                    shouldSort: false,
                    closeDropdownOnSelect: false
                });
                el.classList.add('choices-initialized');
            }
        });
    } else {
        // Destroy Choices on mobile for native select
        document.querySelectorAll('.multi-select-enhanced.choices-initialized').forEach(el => {
            if (el.choices) {
                el.choices.destroy();
            }
            el.classList.remove('choices-initialized');
        });
    }
}

function attachFilterListeners() {
    const filterIds = [
        'filter-year-min', 'filter-year-max',
        'filter-make',
        'filter-drivetrain', 'filter-transmission', 'filter-cylinders',
        'filter-body-type', 'filter-country-of-origin',
        'filter-fuel-type',
        'rows-per-page'
    ];
    filterIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', handleFilterChange);
        }
    });
}

function handleFilterChange() {
    const limitEl = document.getElementById('rows-per-page');
    const limit = limitEl ? parseInt(limitEl.value, 10) : 50;
    const filters = getCurrentFilters();
    fetchResults(filters, limit, 0).then(updateResultsTable);
}

function getCurrentFilters() {
    const filters = {};
    // Year min/max
    const yearMin = document.getElementById('filter-year-min');
    const yearMax = document.getElementById('filter-year-max');
    if (yearMin && yearMin.value) filters.year_min = parseInt(yearMin.value, 10);
    if (yearMax && yearMax.value) filters.year_max = parseInt(yearMax.value, 10);
    // Make
    const makeSelect = document.getElementById('filter-make');
    if (makeSelect) {
        const vals = Array.from(makeSelect.selectedOptions).map(o => o.value).filter(Boolean);
        if (vals.length) filters.make = vals;
    }
    // Fuel type
    const fuelSel = document.getElementById('filter-fuel-type');
    if (fuelSel) {
        const vals = Array.from(fuelSel.selectedOptions).map(o => o.value).filter(Boolean);
        if (vals.length) filters.fuel_type = vals;
    }
    // Drivetrain
    const drivetrainSel = document.getElementById('filter-drivetrain');
    if (drivetrainSel) {
        const vals = Array.from(drivetrainSel.selectedOptions).map(o => o.value).filter(Boolean);
        if (vals.length) filters.drive_type = vals;
    }
    // Transmission
    const transSel = document.getElementById('filter-transmission');
    if (transSel) {
        const vals = Array.from(transSel.selectedOptions).map(o => o.value).filter(Boolean);
        if (vals.length) filters.transmission = vals;
    }
    // Cylinders
    const cylSel = document.getElementById('filter-cylinders');
    if (cylSel) {
        const vals = Array.from(cylSel.selectedOptions).map(o => o.value).filter(Boolean);
        if (vals.length) filters.cylinders = vals;
    }
    // Body type
    const bodySel = document.getElementById('filter-body-type');
    if (bodySel) {
        const vals = Array.from(bodySel.selectedOptions).map(o => o.value).filter(Boolean);
        if (vals.length) filters.body_type = vals;
    }
    // Country of origin
    const countrySel = document.getElementById('filter-country-of-origin');
    if (countrySel) {
        const vals = Array.from(countrySel.selectedOptions).map(o => o.value).filter(Boolean);
        if (vals.length) filters.country_of_origin = vals;
    }
    return filters;
}

// Update results table and pagination info
function updateResultsTable(json) {
    const totalCountEl = document.getElementById('discover-total-count');
    if (totalCountEl && Array.isArray(json.results)) {
        totalCountEl.textContent = `Showing ${json.results.length} of ${json.total} matches`;
    }
    renderTableRows(json.results);
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