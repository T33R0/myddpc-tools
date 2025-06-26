document.addEventListener('DOMContentLoaded', function () {
    const appContainer = document.getElementById('myddpc-performance-app');
    if (!appContainer) return;

    const apiUrl = myddpc_performance_data.api_url;
    const nonce = myddpc_performance_data.nonce;
    const addComparisonBtn = document.getElementById('add-comparison-btn');
    const graphWrapper = document.getElementById('graph-wrapper');

    // **NEW**: Global state to hold vehicle data and the chart instance
    let vehicleDataStore = { 1: null, 2: null };
    let performanceChart = null;

    const initVehicleSelector = (vehicleNum) => {
        const yearSelect = document.getElementById(`year-select-${vehicleNum}`);
        const makeSelect = document.getElementById(`make-select-${vehicleNum}`);
        const modelSelect = document.getElementById(`model-select-${vehicleNum}`);
        const trimSelect = document.getElementById(`trim-select-${vehicleNum}`);
        const getButton = document.getElementById(`get-performance-button-${vehicleNum}`);
        const resultsContainer = document.getElementById(`results-container-${vehicleNum}`);

        if (!yearSelect) return;

        const populateSelect = (selectElement, options, defaultOptionText) => {
            selectElement.innerHTML = `<option value="">${defaultOptionText}</option>`;
            if (options && options.length > 0) {
                options.forEach(option => {
                    const optionElement = document.createElement('option');
                    optionElement.value = option;
                    optionElement.textContent = option;
                    selectElement.appendChild(optionElement);
                });
                selectElement.disabled = false;
            }
        };

        const resetSelects = (...selects) => {
            selects.forEach(select => {
                const label = select.id.split('-')[0];
                select.innerHTML = `<option value="">Select ${label.charAt(0).toUpperCase() + label.slice(1)}</option>`;
                select.disabled = true;
            });
            getButton.disabled = true;
        };

        if (vehicleNum === 1) {
            fetch(`${apiUrl}/years`, { headers: { 'X-WP-Nonce': nonce } })
                .then(response => response.json())
                .then(years => populateSelect(yearSelect, years, 'Select Year'));
        }

        yearSelect.addEventListener('change', () => {
            resetSelects(makeSelect, modelSelect, trimSelect);
            if (yearSelect.value) {
                fetch(`${apiUrl}/makes?year=${yearSelect.value}`, { headers: { 'X-WP-Nonce': nonce } })
                    .then(res => res.json()).then(data => populateSelect(makeSelect, data, 'Select Make'));
            }
        });

        makeSelect.addEventListener('change', () => {
            resetSelects(modelSelect, trimSelect);
            if (makeSelect.value) {
                fetch(`${apiUrl}/models?year=${yearSelect.value}&make=${makeSelect.value}`, { headers: { 'X-WP-Nonce': nonce } })
                    .then(res => res.json()).then(data => populateSelect(modelSelect, data, 'Select Model'));
            }
        });

        modelSelect.addEventListener('change', () => {
            resetSelects(trimSelect);
            if (modelSelect.value) {
                fetch(`${apiUrl}/trims?year=${yearSelect.value}&make=${makeSelect.value}&model=${modelSelect.value}`, { headers: { 'X-WP-Nonce': nonce } })
                    .then(res => res.json()).then(data => populateSelect(trimSelect, data, 'Select Trim'));
            }
        });

        trimSelect.addEventListener('change', () => {
            getButton.disabled = !trimSelect.value;
        });

        getButton.addEventListener('click', () => {
            resultsContainer.innerHTML = '<p>Loading...</p>';
            const params = new URLSearchParams({
                year: yearSelect.value,
                make: makeSelect.value,
                model: modelSelect.value,
                trim: trimSelect.value,
            });

            fetch(`${apiUrl}/vehicle?${params}`, { headers: { 'X-WP-Nonce': nonce } })
                .then(res => res.json())
                .then(data => {
                    // Store data and render results
                    const vehicleInfo = {
                        name: `${params.get('year')} ${params.get('make')} ${params.get('model')}`,
                        data: data
                    };
                    vehicleDataStore[vehicleNum] = data && Object.keys(data).length > 0 ? vehicleInfo : null;

                    renderResults(resultsContainer, data, params);
                    renderPerformanceGraph(); // **NEW**: Call function to render graph
                })
                .catch(err => {
                    console.error('Fetch Error:', err);
                    resultsContainer.innerHTML = '<p>Error loading data.</p>';
                    vehicleDataStore[vehicleNum] = null;
                    renderPerformanceGraph(); // Re-render graph even on error to remove old data
                });
        });
    };

    const renderResults = (container, data, params) => {
        if (!data || Object.keys(data).length === 0) {
            container.innerHTML = '<h4>No data found</h4>';
            return;
        }
        const fuelType = data['Fuel type'] || 'N/A';
        const isEV = fuelType.toLowerCase() === 'electric';
        const powerFields = ['Horsepower (HP)', 'Horsepower (rpm)', 'Torque (ft-lbs)', 'Torque (rpm)', 'Curb weight (lbs)', 'Engine size (l)', 'Cylinders', 'Drive type', 'Transmission'];
        const iceFields = ['Fuel type', 'EPA city/highway MPG', 'EPA combined MPG', 'Fuel tank capacity (gal)', 'Range in miles (city/hwy)'];
        const evFields = ['Fuel type', 'EPA city/highway eMPG', 'EPA combined MPGe', 'EPA kWh/100 mi', 'Battery capacity (kWh)', 'EPA electricity range (mi)', 'EPA time to charge battery (at 240V) (hr)'];

        let html = `<h4>${params.get('year')} ${params.get('make')} ${params.get('model')}</h4><h5>${params.get('trim')}</h5>`;
        html += '<h6>Power & Drivetrain</h6><ul>';
        powerFields.forEach(key => { html += `<li><strong>${key.split('(')[0].trim()}:</strong> ${data[key] || 'N/A'}</li>`; });
        html += '</ul>';
        html += '<h6>Efficiency</h6><ul>';
        const efficiencyFields = isEV ? evFields : iceFields;
        efficiencyFields.forEach(key => { html += `<li><strong>${key.split('(')[0].trim()}:</strong> ${data[key] || 'N/A'}</li>`; });
        html += '</ul>';
        container.innerHTML = html;
    };

    // **NEW**: Function to render the scatter plot
    const renderPerformanceGraph = () => {
        const ctx = document.getElementById('performance-chart');
        if (!ctx) return;
        if (graphWrapper) graphWrapper.style.display = 'block';

        const datasets = [];
        const colors = ['rgba(54, 162, 235, 0.8)', 'rgba(255, 99, 132, 0.8)'];

        for (let i = 1; i <= 2; i++) {
            const vehicle = vehicleDataStore[i];
            if (vehicle) {
                const hp = parseFloat(vehicle.data['Horsepower (HP)']);
                const mpg = parseFloat(vehicle.data['EPA combined MPG'] || vehicle.data['EPA combined MPGe']);
                if (!isNaN(hp) && !isNaN(mpg)) {
                    datasets.push({
                        label: vehicle.name,
                        data: [{ x: mpg, y: hp }],
                        backgroundColor: colors[i - 1],
                        borderColor: colors[i - 1].replace('0.8', '1'),
                        pointRadius: 8,
                        pointHoverRadius: 10
                    });
                }
            }
        }

        // Destroy the old chart instance if it exists
        if (performanceChart) {
            performanceChart.destroy();
        }

        performanceChart = new Chart(ctx, {
            type: 'scatter',
            data: { datasets: datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        title: {
                            display: true,
                            text: 'Combined MPG / MPGe (Efficiency)'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Horsepower (HP)'
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += `${context.parsed.y} HP, ${context.parsed.x} MPG`;
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    };

    // --- Main Execution ---
    initVehicleSelector(1);

    if (addComparisonBtn) {
        addComparisonBtn.addEventListener('click', () => {
            const vehicle2Controls = document.getElementById('vehicle-2-controls');
            const resultsContainer2 = document.getElementById('results-container-2');
            if (vehicle2Controls) vehicle2Controls.style.display = 'block';
            if (resultsContainer2) resultsContainer2.style.display = 'block';
            const yearSelect1 = document.getElementById('year-select-1');
            const yearSelect2 = document.getElementById('year-select-2');
            if (yearSelect1 && yearSelect2) {
                yearSelect2.innerHTML = yearSelect1.innerHTML;
                yearSelect2.disabled = false;
            }
            initVehicleSelector(2);
            addComparisonBtn.style.display = 'none';
        }, { once: true });
    }
});