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
    // (Drive checkboxes are static in HTML)
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

function renderDetailModal(vehicleId) {
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

function createCustomMultiSelect(select) {
    if (!select || !select.multiple) return;
    select.classList.add('custom-multiselect__select');
    select.style.position = 'absolute';
    select.style.left = '-9999px';

    // Create wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'custom-multiselect';
    wrapper.style.position = 'relative';

    // Create button
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'custom-multiselect__button';
    button.innerHTML = 'Select... <span class="arrow">&#9662;</span>';
    wrapper.appendChild(button);

    // Insert wrapper before select
    select.parentNode.insertBefore(wrapper, select);
    wrapper.appendChild(select);

    // Create popup
    let popup = document.createElement('div');
    popup.className = 'custom-multiselect-popup';

    function renderPopupOptions() {
        popup.innerHTML = '';
        Array.from(select.options).forEach(opt => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'custom-multiselect__option';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = opt.value;
            checkbox.checked = opt.selected;
            checkbox.id = select.id + '-opt-' + opt.value;
            const label = document.createElement('label');
            label.htmlFor = checkbox.id;
            label.textContent = opt.textContent;
            optionDiv.appendChild(checkbox);
            optionDiv.appendChild(label);
            popup.appendChild(optionDiv);
            checkbox.addEventListener('change', () => {
                opt.selected = checkbox.checked;
                updateButtonLabel();
                handleFilterChange();
            });
        });
    }

    // Button click shows popup
    button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        renderPopupOptions();
        // Remove popup from any previous parent
        if (popup.parentNode) popup.parentNode.removeChild(popup);

        if (window.innerWidth <= 600) {
            // Mobile: fixed, full screen
            popup.style.position = 'fixed';
            popup.style.left = '0';
            popup.style.top = '0';
            popup.style.width = '100vw';
            popup.style.zIndex = '99999';
            document.body.appendChild(popup);
        } else {
            // Desktop: absolute, anchored to wrapper
            popup.style.position = 'absolute';
            popup.style.left = '0';
            popup.style.top = button.offsetHeight + 'px';
            popup.style.width = button.offsetWidth + 'px';
            popup.style.zIndex = '99999';
            wrapper.appendChild(popup);
        }
        popup.classList.add('open');
    });

    // Close popup on outside click or Escape
    function closePopup() {
        popup.classList.remove('open');
        if (popup.parentNode) popup.parentNode.removeChild(popup);
    }
    document.addEventListener('click', (e) => {
        if (popup.classList.contains('open') && !popup.contains(e.target) && e.target !== button) {
            closePopup();
        }
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closePopup();
    });

    // Update button label
    function updateButtonLabel() {
        const selected = Array.from(select.selectedOptions).map(o => o.textContent);
        button.innerHTML = (selected.length ? selected.join(', ') : 'Select...') + ' <span class="arrow">&#9662;</span>';
    }
    // Expose for global reset
    select._updateCustomMultiSelectLabel = updateButtonLabel;
    updateButtonLabel();
}

function updateAllCustomMultiSelectLabels() {
    document.querySelectorAll('select.custom-multiselect__select').forEach(sel => {
        if (typeof sel._updateCustomMultiSelectLabel === 'function') {
            sel._updateCustomMultiSelectLabel();
        }
    });
}

// Event listeners

document.addEventListener('DOMContentLoaded', () => {
    // Collapsible filter sections: collapse all by default
    const collapsibles = document.querySelectorAll('.collapsible');
    collapsibles.forEach((col) => {
        col.classList.remove('open');
        const header = col.querySelector('.collapsible-header');
        if (header) {
            header.addEventListener('click', function() {
                col.classList.toggle('open');
            });
        }
    });
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
    // Enhance all multi-selects except Drivetrain
    [
        'filter-make',
        'filter-transmission',
        'filter-cylinders',
        'filter-body-type',
        'filter-country-of-origin',
        'filter-fuel-type'
    ].forEach(id => {
        const sel = document.getElementById(id);
        if (sel) createCustomMultiSelect(sel);
    });
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
    document.querySelectorAll('input[name="drive_type[]"]').forEach(cb => cb.checked = false);
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
    // Set rows-per-page to default 25
    const rowsPerPage = document.getElementById('rows-per-page');
    if (rowsPerPage) {
        rowsPerPage.value = '25';
    }
    // Update custom multi-select button labels
    updateAllCustomMultiSelectLabels();
    // Refresh results
    handleFilterChange();
}

function renderFilterTags(filters) {
    const tagsContainer = document.getElementById('filter-tags');
    tagsContainer.innerHTML = '';
    const filterLabels = {
        year_min: 'Year (Min)',
        year_max: 'Year (Max)',
        make: 'Make',
        drive_type: 'Drivetrain',
        transmission: 'Transmission',
        cylinders: 'Cylinders',
        body_type: 'Body type',
        country_of_origin: 'Country',
        fuel_type: 'Fuel Type'
    };
    let tagCount = 0;
    Object.entries(filters).forEach(([key, value]) => {
        if (!value || (Array.isArray(value) && value.length === 0)) return;
        // Only show year_min/year_max if not at default
        if (key === 'year_min' && optionsData && optionsData.year && value == optionsData.year.min) return;
        if (key === 'year_max' && optionsData && optionsData.year && value == optionsData.year.max) return;
        let label = '';
        if (Array.isArray(value)) {
            label = value.map(v => `${v}`).join(', ');
        } else {
            label = value;
        }
        const tag = document.createElement('span');
        tag.className = 'filter-tag';
        tag.innerHTML = `${filterLabels[key] || key}: ${label} <span class="remove-tag" data-key="${key}">&times;</span>`;
        tagsContainer.appendChild(tag);
        tagCount++;
    });
    // Show/hide reset button
    const resetBtn = document.getElementById('reset-filters');
    if (resetBtn) {
        resetBtn.style.display = tagCount > 0 ? '' : 'none';
    }
    tagsContainer.querySelectorAll('.remove-tag').forEach(btn => {
        btn.addEventListener('click', function() {
            const key = this.dataset.key;
            clearFilterSelection(key);
            handleFilterChange();
        });
    });
}

function clearFilterSelection(key) {
    if (key === 'drive_type') {
        document.querySelectorAll('input[name="drive_type[]"]').forEach(cb => cb.checked = false);
    } else if (key === 'year_min' || key === 'year_max') {
        // Reset year min/max to default
        const yearMin = document.getElementById('filter-year-min');
        const yearMax = document.getElementById('filter-year-max');
        if (key === 'year_min' && yearMin && optionsData && optionsData.year && optionsData.year.min) {
            yearMin.value = optionsData.year.min;
        }
        if (key === 'year_max' && yearMax && optionsData && optionsData.year && optionsData.year.max) {
            yearMax.value = optionsData.year.max;
        }
    } else {
        const sel = document.getElementById('filter-' + key.replace(/_/g, '-'));
        if (sel && sel.multiple) {
            Array.from(sel.options).forEach(opt => opt.selected = false);
            if (typeof sel._updateCustomMultiSelectLabel === 'function') {
                sel._updateCustomMultiSelectLabel();
            }
        }
    }
    updateAllCustomMultiSelectLabels();
}

function updateResultsTable(json) {
    const totalCountEl = document.getElementById('discover-total-count');
    if (totalCountEl && Array.isArray(json.results)) {
        totalCountEl.textContent = `Showing ${json.results.length} of ${json.total} vehicles`;
    }
    renderFilterTags(getCurrentFilters());
    renderTableHeader();
    renderTableRows(json.results);
    currentTotal = json.total;
    renderPagination(json.total, currentLimit, currentPage);
}