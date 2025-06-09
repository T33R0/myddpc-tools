let currentPage = 1;
let currentLimit = 25;
let currentTotal = 0;
let optionsData = null;

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

let currentSortBy = 'Year';
let currentSortDir = 'desc';

function renderTableHeader() {
    const thead = document.querySelector('#discover-table thead tr');
    if (!thead) return;
    const columns = [
        { key: 'Year', label: 'Year' },
        { key: 'Make', label: 'Make' },
        { key: 'Model', label: 'Model' },
        { key: 'Trim', label: 'Trim' },
        { key: 'Engine size (l)', label: 'Engine (L)' },
        { key: 'Cylinders', label: 'Cylinders' },
        { key: 'Drive type', label: 'Drive' },
        { key: 'Transmission', label: 'Transmission' },
        { key: 'Body type', label: 'Body' },
        { key: 'Car classification', label: 'Classification' },
        { key: 'Platform code / generation number', label: 'Platform' }
    ];
    thead.innerHTML = '';
    columns.forEach(col => {
        let indicator = '';
        if (currentSortBy === col.key) {
            indicator = currentSortDir === 'asc' ? ' ▲' : ' ▼';
        }
        const th = document.createElement('th');
        th.textContent = col.label + indicator;
        th.style.cursor = 'pointer';
        th.addEventListener('click', () => {
            if (currentSortBy === col.key) {
                currentSortDir = currentSortDir === 'asc' ? 'desc' : 'asc';
            } else {
                currentSortBy = col.key;
                currentSortDir = 'asc';
            }
            currentPage = 1;
            fetchResults(getCurrentFilters(), currentLimit, 0, currentSortBy, currentSortDir).then(updateResultsTable);
        });
        thead.appendChild(th);
    });
}

// Fetch results from REST API
async function fetchResults(filters = {}, limit = 50, offset = 0, sortBy = currentSortBy, sortDir = currentSortDir) {
    const res = await fetch(
        myddpc_discover_data.root + myddpc_discover_data.routes.results,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-WP-Nonce': myddpc_discover_data.nonce
            },
            body: JSON.stringify({ filters, limit, offset, sort_by: sortBy, sort_dir: sortDir })
        }
    );
    if (!res.ok) throw new Error('Failed to fetch results');
    return await res.json();
}

// In getCurrentFilters, update drive_type to read from checkboxes
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
    // Drive type (checkboxes)
    const driveCheckboxes = document.querySelectorAll('input[name="drive_type[]"]:checked');
    if (driveCheckboxes.length) {
        const driveMap = {
            'AWD': ['AWD', 'All Wheel Drive'],
            '4WD': ['4WD', 'Four Wheel Drive', '4x4'],
            'FWD': ['FWD', 'Front Wheel Drive'],
            'RWD': ['RWD', 'Rear Wheel Drive']
        };
        let driveVals = [];
        driveCheckboxes.forEach(cb => {
            const val = cb.value;
            if (driveMap[val]) {
                driveVals = driveVals.concat(driveMap[val]);
            } else {
                driveVals.push(val);
            }
        });
        filters.drive_type = Array.from(new Set(driveVals));
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
function renderPagination(total, limit, page) {
    const totalPages = Math.ceil(total / limit);
    const container = document.getElementById('discover-pagination');
    if (!container) return;
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    let html = '';
    html += `<button class="pagination-btn" data-page="${page - 1}" ${page === 1 ? 'disabled' : ''}>Prev</button>`;
    // Show up to 5 page numbers, centered on current page
    let start = Math.max(1, page - 2);
    let end = Math.min(totalPages, page + 2);
    if (page <= 2) end = Math.min(5, totalPages);
    if (page >= totalPages - 1) start = Math.max(1, totalPages - 4);
    for (let i = start; i <= end; i++) {
        html += `<button class="pagination-btn${i === page ? ' active' : ''}" data-page="${i}">${i}</button>`;
    }
    html += `<button class="pagination-btn" data-page="${page + 1}" ${page === totalPages ? 'disabled' : ''}>Next</button>`;
    container.innerHTML = html;
    // Add event listeners
    container.querySelectorAll('.pagination-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const newPage = parseInt(this.dataset.page, 10);
            if (newPage >= 1 && newPage <= totalPages && newPage !== page) {
                currentPage = newPage;
                const offset = (currentPage - 1) * currentLimit;
                fetchResults(getCurrentFilters(), currentLimit, offset, currentSortBy, currentSortDir).then(updateResultsTable);
            }
        });
    });
}

// 1. Map all possible drive values to abbreviations in renderTableRows
const DRIVE_TYPE_MAP = {
    'All Wheel Drive': 'AWD',
    'Four Wheel Drive': '4WD',
    'Front Wheel Drive': 'FWD',
    'Rear Wheel Drive': 'RWD',
    'AWD': 'AWD',
    '4WD': '4WD',
    'FWD': 'FWD',
    'RWD': 'RWD',
    'AWD/4WD': 'AWD',
    '4x4': '4WD',
    'FWD/AWD': 'AWD',
    'RWD/AWD': 'AWD',
    'AWD/FWD': 'AWD',
    'AWD/RWD': 'AWD',
    '4WD/AWD': 'AWD',
    'AWD/4WD/FWD': 'AWD',
    'AWD/4WD/RWD': 'AWD',
    'AWD/4WD/FWD/RWD': 'AWD',
    '': ''
};
function renderTableRows(results) {
    if (!Array.isArray(results)) { return; }
    const tbody = document.querySelector('#discover-table tbody');
    if (!tbody) { return; }
    tbody.innerHTML = '';
    results.forEach(row => {
        const tr = document.createElement('tr');
        tr.dataset.vehicleId = row.id || row.ID;
        // Robust abbreviation for drive type
        let driveRaw = (row['Drive type'] || '').trim();
        let driveAbbr = DRIVE_TYPE_MAP[driveRaw];
        if (!driveAbbr) {
            // Try regex match for common phrases, case-insensitive
            if (/all\s*wheel\s*drive/i.test(driveRaw)) driveAbbr = 'AWD';
            else if (/four\s*wheel\s*drive|4x4/i.test(driveRaw)) driveAbbr = '4WD';
            else if (/front\s*wheel\s*drive/i.test(driveRaw)) driveAbbr = 'FWD';
            else if (/rear\s*wheel\s*drive/i.test(driveRaw)) driveAbbr = 'RWD';
            else driveAbbr = driveRaw;
        }
        tr.innerHTML = `
            <td>${row.Year}</td>
            <td>${row.Make}</td>
            <td>${row.Model}</td>
            <td>${row.Trim}</td>
            <td>${row['Engine size (l)']}</td>
            <td>${row.Cylinders}</td>
            <td>${driveAbbr}</td>
            <td>${row.Transmission}</td>
            <td>${row['Body type']}</td>
            <td>${row['Car classification']}</td>
            <td>${row['Platform code / generation number']}</td>
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
    // Ensure rows-per-page select has 10, 25, 50, 100
    const limitEl = document.getElementById('rows-per-page');
    if (limitEl) {
        limitEl.innerHTML = '';
        [10, 25, 50, 100].forEach(val => {
            const opt = document.createElement('option');
            opt.value = val;
            opt.textContent = val;
            if (val === 25) opt.selected = true;
            limitEl.appendChild(opt);
        });
        limitEl.value = 25;
        limitEl.addEventListener('change', () => {
            currentLimit = parseInt(limitEl.value, 10);
            currentPage = 1;
        });
    }
    // Always render table header and pagination on load
    renderTableHeader();
    renderPagination(0, currentLimit, 1);
    fetchFilterOptions().then(data => {
        optionsData = data;
        currentLimit = limitEl ? parseInt(limitEl.value, 10) : 25;
        currentPage = 1;
        currentSortBy = 'Year';
        currentSortDir = 'desc';
        fetchResults(getCurrentFilters(), currentLimit, 0, currentSortBy, currentSortDir).then(updateResultsTable);
        attachFilterListeners();
    });
    window.addEventListener('resize', () => {
    });
    const resetBtn = document.getElementById('reset-filters');
    if (resetBtn) {
        resetBtn.addEventListener('click', function(e) {
            e.preventDefault();
            resetFilters();
        });
    }
});

function attachFilterListeners() {
    const filterIds = [
        'filter-year-min', 'filter-year-max',
        'filter-make',
        'filter-transmission', 'filter-cylinders',
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
    // Add listeners for Drive checkboxes
    document.querySelectorAll('input[name="drive_type[]"]').forEach(cb => {
        cb.addEventListener('change', handleFilterChange);
    });
}

function handleFilterChange() {
    const limitEl = document.getElementById('rows-per-page');
    currentLimit = limitEl ? parseInt(limitEl.value, 10) : 50;
    currentPage = 1;
    currentSortBy = 'Year';
    currentSortDir = 'desc';
    const filters = getCurrentFilters();
    fetchResults(filters, currentLimit, 0, currentSortBy, currentSortDir).then(updateResultsTable);
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

// 3. In resetFilters, set Year (Max) to optionsData.year.max
function resetFilters() {
    // Reset all selects to their first option
    document.querySelectorAll('#discover-filter-form select').forEach(sel => {
        if (sel.multiple) {
            Array.from(sel.options).forEach(opt => opt.selected = false);
        } else {
            sel.selectedIndex = 0;
        }
    });
    // Reset drive checkboxes
    document.querySelectorAll('input[name="drive_type[]"]').forEach(cb => { cb.checked = false; });
    // Set Year (Max) to max value
    const yearMax = document.getElementById('filter-year-max');
    if (yearMax && optionsData && optionsData.year && optionsData.year.max) {
        yearMax.value = optionsData.year.max;
    }
    // Set Year (Min) to min value
    const yearMin = document.getElementById('filter-year-min');
    if (yearMin && optionsData && optionsData.year && optionsData.year.min) {
        yearMin.value = optionsData.year.min;
    }
    // Refresh results
    handleFilterChange();
}

// 4. Change 'matches' to 'vehicles' in updateResultsTable
function updateResultsTable(json) {
    const totalCountEl = document.getElementById('discover-total-count');
    if (totalCountEl && Array.isArray(json.results)) {
        totalCountEl.textContent = `Showing ${json.results.length} of ${json.total} vehicles`;
    }
    renderTableHeader();
    renderTableRows(json.results);
    currentTotal = json.total;
    renderPagination(json.total, currentLimit, currentPage);
}