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
    const tbody = document.querySelector('#discover-table tbody');
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
    // Optionally fetch more details from a /details endpoint.
    // Populate modal body with image + specs. Then:
    document.getElementById('discover-detail-modal').dataset.currentVehicle = vehicleId;
    document.getElementById('discover-detail-modal').classList.remove('hidden');
}

// Event listeners

document.addEventListener('DOMContentLoaded', () => {
    // 1) Populate filter inputs
    fetchFilterOptions()
        .then(optionsData => {
            // Example: populate <select id="filter-drive-type"> from optionsData['Drive type'].options
            // Repeat for every multi-select and range field...
        })
        .catch(console.error);

    // 2) Fetch initial unfiltered results (limit 50)
    fetchResults({}, 50, 0)
        .then(json => {
            document.getElementById('discover-total-count').textContent =
                `Showing ${json.results.length} of ${json.total} matches`;
            renderTableRows(json.results);
        })
        .catch(console.error);

    // 3) Apply Filters button
    const filtersForm = document.getElementById('discover-filter-form');
    filtersForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const filters = {};
        // Build filters object:
        //   const yearMin = parseInt(document.getElementById('filter-year-min').value, 10);
        //   const yearMax = parseInt(document.getElementById('filter-year-max').value, 10);
        //   if (!isNaN(yearMin) && !isNaN(yearMax)) {
        //     filters.year_min = yearMin;
        //     filters.year_max = yearMax;
        //   }
        //   const driveValues = Array.from(document.getElementById('filter-drive-type').selectedOptions).map(o => o.value);
        //   if (driveValues.length) { filters.drive_type = driveValues; }
        //   // Repeat for all other filter fields...
        const limit = parseInt(document.getElementById('rows-per-page').value, 10);
        fetchResults(filters, limit, 0)
            .then(json => {
                document.getElementById('discover-total-count').textContent =
                    `Showing ${json.results.length} of ${json.total} matches`;
                renderTableRows(json.results);
            })
            .catch(console.error);
    });

    // 4) Reset Filters button
    document.getElementById('discover-reset-filters').addEventListener('click', () => {
        document.getElementById('discover-filter-form').reset();
        const limit = parseInt(document.getElementById('rows-per-page').value, 10);
        fetchResults({}, limit, 0)
            .then(json => {
                document.getElementById('discover-total-count').textContent =
                    `Showing ${json.results.length} of ${json.total} matches`;
                renderTableRows(json.results);
            })
            .catch(console.error);
    });

    // 5) Rows-per-page change
    document.getElementById('rows-per-page').addEventListener('change', function() {
        const limit = parseInt(this.value, 10);
        // Reapply current filters if needed; MVP can just reset to unfiltered
        fetchResults({}, limit, 0)
            .then(json => {
                document.getElementById('discover-total-count').textContent =
                    `Showing ${json.results.length} of ${json.total} matches`;
                renderTableRows(json.results);
            })
            .catch(console.error);
    });

    // 6) Row click to open detail modal
    document.getElementById('discover-table').addEventListener('click', function(e) {
        const row = e.target.closest('tr');
        if (row && row.dataset.vehicleId) {
            renderDetailModal(row.dataset.vehicleId);
        }
    });

    // 7) Modal close
    document.querySelector('.modal-close').addEventListener('click', () => {
        document.getElementById('discover-detail-modal').classList.add('hidden');
    });

    // 8) Save Vehicle (optional)
    document.getElementById('discover-save-vehicle').addEventListener('click', () => {
        const vehicleId = document.getElementById('discover-detail-modal').dataset.currentVehicle;
        // POST to /wp-json/myddpc/v1/discover/save with { vehicle_id: vehicleId }
    });
});