document.addEventListener('DOMContentLoaded', function () {
    const appContainer = document.getElementById('myddpc-dimensions-app');
    if (!appContainer) return;

    const apiUrl = myddpc_dimensions_data.api_url;
    const nonce = myddpc_dimensions_data.nonce;
    const addComparisonBtn = document.getElementById('add-comparison-btn');
    const vehicle2Controls = document.getElementById('vehicle-2-controls');
    const diagramsContainer = document.getElementById('myddpc-diagrams-container');

    // Store fetched data for both vehicles to redraw diagrams
    let vehicleDataStore = { 1: null, 2: null };

    // --- DIAGRAM DRAWING LOGIC ---

    const redrawAllDiagrams = () => {
        if (diagramsContainer) {
            diagramsContainer.style.display = 'flex';
        }
        drawParkingDiagram();
        drawStreetDiagram();
        drawTurningDiagram();
    };

    const drawParkingDiagram = () => {
        const canvas = document.getElementById('parking-diagram');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;

        // Constants in feet
        const parkingSpaceLengthFt = 18;
        const parkingSpaceWidthFt = 9;
        const pixelsPerFoot = Math.min(w / (parkingSpaceLengthFt * 1.2), h / (parkingSpaceWidthFt * 1.2));

        // Draw background (parking space)
        ctx.clearRect(0, 0, w, h);
        ctx.strokeStyle = '#ccc';
        ctx.strokeRect((w - parkingSpaceLengthFt * pixelsPerFoot) / 2, (h - parkingSpaceWidthFt * pixelsPerFoot) / 2, parkingSpaceLengthFt * pixelsPerFoot, parkingSpaceWidthFt * pixelsPerFoot);

        // Draw vehicle overlays
        if (vehicleDataStore[1]) drawVehicleRect(ctx, vehicleDataStore[1], pixelsPerFoot, 'rgba(54, 162, 235, 0.6)');
        if (vehicleDataStore[2]) drawVehicleRect(ctx, vehicleDataStore[2], pixelsPerFoot, 'rgba(255, 99, 132, 0.6)');
    };

    const drawStreetDiagram = () => {
        const canvas = document.getElementById('street-diagram');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;

        // Constants
        const streetLengthFt = 24; // Represents a typical parallel parking spot length
        const pixelsPerFoot = w / (streetLengthFt * 1.1);

        // Draw background (curb line)
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#aaa';
        ctx.fillRect(0, h - 10, w, 10);

        // Draw vehicle overlays
        if (vehicleDataStore[1]) drawVehicleRect(ctx, vehicleDataStore[1], pixelsPerFoot, 'rgba(54, 162, 235, 0.6)', false);
        if (vehicleDataStore[2]) drawVehicleRect(ctx, vehicleDataStore[2], pixelsPerFoot, 'rgba(255, 99, 132, 0.6)', false);
    };

    const drawTurningDiagram = () => {
        const canvas = document.getElementById('turning-diagram');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;

        // Constants
        const roadWidthFt = 24; // Two 12ft lanes
        const pixelsPerFoot = w / (roadWidthFt * 2);

        // Draw background (road)
        ctx.clearRect(0, 0, w, h);
        ctx.strokeStyle = '#ddd';
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(w / 2, 0);
        ctx.lineTo(w / 2, h);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw vehicle overlays and turning circles
        if (vehicleDataStore[1]) drawTurningCircle(ctx, vehicleDataStore[1], pixelsPerFoot, 'rgba(54, 162, 235, 0.6)');
        if (vehicleDataStore[2]) drawTurningCircle(ctx, vehicleDataStore[2], pixelsPerFoot, 'rgba(255, 99, 132, 0.6)');
    };

    const drawVehicleRect = (ctx, data, scale, color, useWidth = true) => {
        const lengthFt = parseFloat(data['Length (in)']) / 12;
        const widthFt = useWidth ? parseFloat(data['Width (in)']) / 12 : 6; // Use fixed height for side view
        if (isNaN(lengthFt) || isNaN(widthFt)) return;

        const vehicleW = useWidth ? widthFt * scale : lengthFt * scale;
        const vehicleH = useWidth ? lengthFt * scale : widthFt * scale;

        ctx.fillStyle = color;
        // Adjust drawing based on diagram orientation
        if (ctx.canvas.id === 'street-diagram') {
             ctx.fillRect((ctx.canvas.width - vehicleH) / 2, ctx.canvas.height - 10 - vehicleW, vehicleH, vehicleW);
        } else {
             ctx.fillRect((ctx.canvas.width - vehicleW) / 2, (ctx.canvas.height - vehicleH) / 2, vehicleW, vehicleH);
        }
    };

    const drawTurningCircle = (ctx, data, scale, color) => {
        const turningCircleFt = parseFloat(data['Turning circle (ft)']);
        if (isNaN(turningCircleFt)) return;

        const radius = (turningCircleFt / 2) * scale;

        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(ctx.canvas.width / 2, ctx.canvas.height / 2, radius, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineWidth = 1;
    };


    // --- VEHICLE SELECTOR LOGIC ---

    const initVehicleSelector = (vehicleNum) => {
        const yearSelect = document.getElementById(`year-select-${vehicleNum}`);
        const makeSelect = document.getElementById(`make-select-${vehicleNum}`);
        const modelSelect = document.getElementById(`model-select-${vehicleNum}`);
        const trimSelect = document.getElementById(`trim-select-${vehicleNum}`);
        const getDimensionsButton = document.getElementById(`get-dimensions-button-${vehicleNum}`);
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
            } else {
                selectElement.innerHTML = `<option value="">No options found</option>`;
            }
        };

        const resetSelects = (...selects) => {
            selects.forEach(select => {
                const label = select.id.split('-')[0];
                select.innerHTML = `<option value="">Select ${label.charAt(0).toUpperCase() + label.slice(1)}</option>`;
                select.disabled = true;
            });
            getDimensionsButton.disabled = true;
        };

        if (vehicleNum === 1) {
            fetch(`${apiUrl}/years`, { headers: { 'X-WP-Nonce': nonce } })
                .then(response => response.json())
                .then(years => populateSelect(yearSelect, years, 'Select Year'))
                .catch(error => console.error('Error fetching years:', error));
        }

        yearSelect.addEventListener('change', function () {
            resetSelects(makeSelect, modelSelect, trimSelect);
            if (this.value) {
                fetch(`${apiUrl}/makes?year=${this.value}`, { headers: { 'X-WP-Nonce': nonce } })
                    .then(response => response.json())
                    .then(makes => populateSelect(makeSelect, makes, 'Select Make'));
            }
        });

        makeSelect.addEventListener('change', function () {
            resetSelects(modelSelect, trimSelect);
            if (this.value) {
                fetch(`${apiUrl}/models?year=${yearSelect.value}&make=${this.value}`, { headers: { 'X-WP-Nonce': nonce } })
                    .then(response => response.json())
                    .then(models => populateSelect(modelSelect, models, 'Select Model'));
            }
        });

        modelSelect.addEventListener('change', function () {
            resetSelects(trimSelect);
            if (this.value) {
                fetch(`${apiUrl}/trims?year=${yearSelect.value}&make=${makeSelect.value}&model=${this.value}`, { headers: { 'X-WP-Nonce': nonce } })
                    .then(response => response.json())
                    .then(trims => populateSelect(trimSelect, trims, 'Select Trim'));
            }
        });

        trimSelect.addEventListener('change', function () {
            getDimensionsButton.disabled = !this.value;
        });

        getDimensionsButton.addEventListener('click', function () {
            const year = yearSelect.value;
            const make = makeSelect.value;
            const model = modelSelect.value;
            const trim = trimSelect.value;

            resultsContainer.innerHTML = '<p>Loading...</p>';

            const queryParams = new URLSearchParams({ year, make, model, trim });
            fetch(`${apiUrl}/vehicle?${queryParams}`, { headers: { 'X-WP-Nonce': nonce } })
                .then(response => {
                    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
                    return response.json();
                })
                .then(data => {
                    vehicleDataStore[vehicleNum] = Object.keys(data).length > 0 ? data : null;
                    
                    resultsContainer.innerHTML = '';
                    if (!vehicleDataStore[vehicleNum]) {
                        resultsContainer.innerHTML = '<h4>No Data Found</h4>';
                        redrawAllDiagrams();
                        return;
                    }

                    let html = `<h4>${year} ${make} ${model}</h4><h5>${trim}</h5>`;
                    const ul = document.createElement('ul');
                    ul.className = 'dimensions-list';
                    
                    for (const [key, value] of Object.entries(data)) {
                        const li = document.createElement('li');
                        const displayValue = value !== null && value !== '' ? value : 'N/A';
                        li.innerHTML = `<strong>${key.replace(/_/g, ' ')}:</strong> ${displayValue}`;
                        ul.appendChild(li);
                    }
                    resultsContainer.innerHTML = html;
                    resultsContainer.appendChild(ul);
                    
                    // Redraw diagrams with new data
                    redrawAllDiagrams();
                })
                .catch(error => {
                    console.error(`Error fetching dimensions for Vehicle ${vehicleNum}:`, error);
                    resultsContainer.innerHTML = '<h4>Error</h4><p>Data could not be fetched.</p>';
                });
        });
    };

    // --- Main Execution ---
    initVehicleSelector(1);
    if (diagramsContainer) {
        diagramsContainer.style.display = 'none';
    }

    if (addComparisonBtn) {
        addComparisonBtn.addEventListener('click', function () {
            const resultsContainer2 = document.getElementById('results-container-2');
            if (vehicle2Controls) vehicle2Controls.style.display = 'flex';
            if (resultsContainer2) resultsContainer2.style.display = 'block';

            const yearSelect1 = document.getElementById('year-select-1');
            const yearSelect2 = document.getElementById('year-select-2');
            if(yearSelect1 && yearSelect2) {
                yearSelect2.innerHTML = yearSelect1.innerHTML;
                yearSelect2.disabled = false;
            }
            initVehicleSelector(2);
            this.style.display = 'none';
        });
    }
});