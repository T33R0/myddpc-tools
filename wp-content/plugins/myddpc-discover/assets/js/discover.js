// Fetch filter options from REST API
async function fetchFilterOptions() {
    const res = await fetch(window.wpApiSettings.root + 'myddpc/v1/discover/filters', {
        headers: { 'X-WP-Nonce': window.wpApiSettings.nonce }
    });
    if (!res.ok) throw new Error('Failed to fetch filter options');
    return await res.json();
}

// Fetch results from REST API
async function fetchResults(filters = {}, limit = 50, offset = 0) {
    const res = await fetch(window.wpApiSettings.root + 'myddpc/v1/discover/results', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-WP-Nonce': window.wpApiSettings.nonce
        },
        body: JSON.stringify({ filters, limit, offset })
    });
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
    // 1) Populate filter inputs
    fetchFilterOptions()
        .then(optionsData => {
            // Example: populate <select id="filter-drive-type"> from optionsData['Drive type'].options
            // Repeat for every multi-select and range field...
            const driveSelect = document.getElementById('filter-drive-type');
            if (driveSelect && Array.isArray(optionsData.drive_type)) {
                driveSelect.innerHTML = '';
                optionsData.drive_type.forEach(option => {
                    const opt = document.createElement('option');
                    opt.value = option;
                    opt.textContent = option;
                    driveSelect.appendChild(opt);
                });
            }
        })
        .catch(console.error);

    // 2) Fetch initial unfiltered results (limit 50)
    fetchResults({}, 50, 0)
        .then(json => {
            const totalCountEl = document.getElementById('discover-total-count');
            if (totalCountEl && Array.isArray(json.results)) {
                totalCountEl.textContent = `Showing ${json.results.length} of ${json.total} matches`;
            }
            renderTableRows(json.results);
        })
        .catch(console.error);

    // 3) Apply Filters button
    const filtersForm = document.getElementById('discover-filter-form');
    if (filtersForm) {
        filtersForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const filters = {};
            // Build filters object as needed
            const limitEl = document.getElementById('rows-per-page');
            const limit = limitEl ? parseInt(limitEl.value, 10) : 50;
            fetchResults(filters, limit, 0)
                .then(json => {
                    const totalCountEl = document.getElementById('discover-total-count');
                    if (totalCountEl && Array.isArray(json.results)) {
                        totalCountEl.textContent = `Showing ${json.results.length} of ${json.total} matches`;
                    }
                    renderTableRows(json.results);
                })
                .catch(console.error);
        });
    }

    // 4) Reset Filters button
    const resetBtn = document.getElementById('discover-reset-filters');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            const form = document.getElementById('discover-filter-form');
            if (form) form.reset();
            const limitEl = document.getElementById('rows-per-page');
            const limit = limitEl ? parseInt(limitEl.value, 10) : 50;
            fetchResults({}, limit, 0)
                .then(json => {
                    const totalCountEl = document.getElementById('discover-total-count');
                    if (totalCountEl && Array.isArray(json.results)) {
                        totalCountEl.textContent = `Showing ${json.results.length} of ${json.total} matches`;
                    }
                    renderTableRows(json.results);
                })
                .catch(console.error);
        });
    }

    // 5) Rows-per-page change
    const rowsPerPage = document.getElementById('rows-per-page');
    if (rowsPerPage) {
        rowsPerPage.addEventListener('change', function() {
            const limit = parseInt(this.value, 10);
            fetchResults({}, limit, 0)
                .then(json => {
                    const totalCountEl = document.getElementById('discover-total-count');
                    if (totalCountEl && Array.isArray(json.results)) {
                        totalCountEl.textContent = `Showing ${json.results.length} of ${json.total} matches`;
                    }
                    renderTableRows(json.results);
                })
                .catch(console.error);
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
});