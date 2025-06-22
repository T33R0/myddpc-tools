document.addEventListener('DOMContentLoaded', function () {
    const getDimensionsButton = document.getElementById('get-dimensions-button');
    const resultsContainer = document.getElementById('results-container');

    if (getDimensionsButton) {
        getDimensionsButton.addEventListener('click', function () {
            // Get selected values
            const year = document.getElementById('year-select').value;
            const make = document.getElementById('make-select').value;
            const model = document.getElementById('model-select').value;
            const trim = document.getElementById('trim-select').value;

            // Clear previous results and show a loading message
            resultsContainer.innerHTML = '<p>Loading...</p>';

            // Construct the API URL with query parameters
            const apiUrl = new URL(myddpc_dimensions_ajax.api_url);
            apiUrl.searchParams.append('year', year);
            apiUrl.searchParams.append('make', make);
            apiUrl.searchParams.append('model', model);
            apiUrl.searchParams.append('trim', trim);

            // Use Fetch API to make the request
            fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'X-WP-Nonce': myddpc_dimensions_ajax.nonce
                }
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                // Clear the loading message
                resultsContainer.innerHTML = '';

                if (Object.keys(data).length === 0) {
                    resultsContainer.innerHTML = '<p>No vehicle found for the selected criteria.</p>';
                    return;
                }

                // Create a list to display the dimensions
                const ul = document.createElement('ul');
                for (const [key, value] of Object.entries(data)) {
                    const li = document.createElement('li');
                    // Use 'N/A' for null or empty values
                    const displayValue = value !== null && value !== '' ? value : 'N/A';
                    li.textContent = `${key}: ${displayValue}`;
                    ul.appendChild(li);
                }
                resultsContainer.appendChild(ul);
            })
            .catch(error => {
                console.error('Error fetching vehicle dimensions:', error);
                resultsContainer.innerHTML = `<p>An error occurred. Please check the console for details.</p>`;
            });
        });
    }
});