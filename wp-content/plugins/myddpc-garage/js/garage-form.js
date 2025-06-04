/* global jQuery, myddpc_garage_settings */
jQuery(document).ready(function($) {

    console.log('MyDDPC Garage Form JS Loaded (Modal Version).');

    // --- Modal Elements ---
    const modal = $('#addVehicleModal');

    // force the modal element out of any transformed/container wrappers
    // so position:fixed spans the entire viewport
    if (modal.length) {
        modal.detach().appendTo('body');
    }

    const openModalBtn = $('#add-vehicle-card-button'); // MODIFIED: ID of the new styled card
    const closeModalBtn = $('.myddpc-modal-close-btn');
    const modalOverlay = $('.myddpc-modal-overlay');
    const hiddenFormContainer = $('#myddpc-hidden-add-vehicle-form-container');
    const modalFormTarget = $('#myddpc-modal-form-target');
    const garageGallery = $('#garage-list'); // MODIFIED: Simplified selector, assuming garage-list is the primary container for cards + add button
    const addVehiclePlaceholderCard = $('#add-vehicle-card-button'); // MODIFIED: ID of the new styled card

    // --- Form Elements (will be inside the modal) ---
    // These selectors will target elements once the form is moved into the modal.
    // It's crucial that the form HTML (from myddpc_display_add_vehicle_form) uses these IDs.
    const addVehicleFormSelector = '#add-vehicle-form'; // Selector for the form itself
    const yearSelectSelector = '#garage-year';
    const makeSelectSelector = '#garage-make';
    const modelSelectSelector = '#garage-model';
    const trimSelectSelector = '#garage-trim';
    const nicknameInputSelector = '#garage-nickname';
    const statusDivSelector = '#add-vehicle-status'; // Status div inside the form

    // --- Function to move the hidden form into the modal ---
    function initializeModalForm() {
        if (hiddenFormContainer.length && modalFormTarget.length) {
            const formHtml = hiddenFormContainer.html(); // Get the HTML content of the form
            modalFormTarget.html(formHtml); // Place it inside the modal target
            hiddenFormContainer.remove(); // Remove the original hidden container
            console.log('Add vehicle form moved to modal.');
            // Now that the form is in the DOM (inside the modal), populate its year dropdown
            populateYearDropdown();
        } else {
            console.error("MyDDPC Garage: Modal form target or hidden form container not found. Form cannot be initialized in modal.");
        }
    }

    // --- Modal Open/Close Functions ---
    function openModal() {
        if (!modal.length) return;
        // Reset form fields before showing
        const formInModal = modalFormTarget.find(addVehicleFormSelector);
        if (formInModal.length) {
            formInModal[0].reset();
            formInModal.find(yearSelectSelector).val('').trigger('change'); // Reset dropdowns
            formInModal.find(statusDivSelector).text('').hide().removeClass('success error');
            formInModal.find('#add-vehicle-submit').prop('disabled', false); // Ensure submit is enabled
        }
        modal.addClass('is-visible');
        $('body').addClass('myddpc-modal-open');
    }

    function closeModal() {
        if (!modal.length) return;
        modal.removeClass('is-visible');
        $('body').removeClass('myddpc-modal-open');
    }

    // --- Event Listeners for Modal ---
    if (openModalBtn.length) {
        // Use event delegation for the open button
        // Ensure garageGallery selector correctly targets the container of add-vehicle-card-button
        garageGallery.on('click', '#add-vehicle-card-button', function() { // MODIFIED: ID of the new styled card
            openModal();
        });
    } else {
        console.warn("MyDDPC Garage: 'Add New Vehicle' button (#add-vehicle-card-button) not found."); // MODIFIED
    }

    if (closeModalBtn.length) closeModalBtn.on('click', closeModal);
    if (modalOverlay.length) modalOverlay.on('click', closeModal);
    $(document).on('keydown', function(event) {
        if (event.key === 'Escape' && modal.hasClass('is-visible')) {
            closeModal();
        }
    });

    // --- Dropdown Population Logic (targets elements within the modal form) ---
    function populateYearDropdown() {
        const yearSelect = modalFormTarget.find(yearSelectSelector);
        if (!yearSelect.length) {
            console.error('Year select not found in modal for populateYearDropdown.');
            return;
        }
        yearSelect.empty().append('<option value="">Loading Years...</option>').prop('disabled', true);

        const ajaxData = {
            action: 'myddpc_garage_get_years',
            [myddpc_garage_settings.get_years_nonce_field_name]: myddpc_garage_settings.get_years_nonce
        };
        console.log('Garage Form (Modal) - Sending AJAX data for years:', ajaxData);

        $.post(myddpc_garage_settings.ajax_url, ajaxData, function(response) {
            if (response.success && Array.isArray(response.data) && response.data.length > 0) {
                yearSelect.empty().append('<option value="">Select Year</option>');
                $.each(response.data, function(index, year) {
                    if(year !== null && year !== '') {
                        yearSelect.append($('<option>', { value: year, text: year }));
                    }
                });
                yearSelect.prop('disabled', false);
            } else {
                let errorMsg = (response && response.data && response.data.message) ? response.data.message : 'No years found';
                yearSelect.empty().append('<option value="">' + errorMsg + '</option>').prop('disabled', true);
                console.error('Failed to load years:', response);
            }
        }).fail(function(xhr) {
            yearSelect.empty().append('<option value="">Load Error</option>').prop('disabled', true);
            console.error('AJAX error loading years:', xhr);
        });
    }

    function populateDependentDropdown(element, targetField, selectedYear, selectedMake = null, selectedModel = null) {
        if (!element.length) {
             console.error('Target dropdown element not found for:', targetField);
            return;
        }
        element.empty().append('<option value="">Loading...</option>').prop('disabled', true);

        const ajaxData = {
            action: myddpc_garage_settings.carlookup_plugin_options_action,
            target_field: targetField,
            selected_year: selectedYear
        };
        ajaxData[myddpc_garage_settings.carlookup_plugin_nonce_field] = myddpc_garage_settings.carlookup_plugin_nonce_value;

        if (selectedMake && (targetField === 'model' || targetField === 'trim')) { ajaxData.selected_make = selectedMake; }
        if (selectedModel && targetField === 'trim') { ajaxData.selected_model = selectedModel; }

        console.log(`Garage Form (Modal) - Sending AJAX data for ${targetField}:`, ajaxData);

        $.post(myddpc_garage_settings.ajax_url, ajaxData, function(response) {
            if (response.success && Array.isArray(response.data) && response.data.length > 0) {
                element.empty().append('<option value="">Select ' + targetField.charAt(0).toUpperCase() + targetField.slice(1) + '</option>');
                $.each(response.data, function(index, item) {
                    if(item !== null && item !== '') {
                        element.append($('<option>', { value: item, text: item }));
                    }
                });
                element.prop('disabled', false);
            } else {
                let errorMsg = (response && response.data && response.data.message) ? response.data.message : 'No options found';
                element.empty().append('<option value="">' + errorMsg + '</option>').prop('disabled', true);
                console.error(`Failed to load options for ${targetField}:`, response);
            }
        }).fail(function(xhr) {
            element.empty().append('<option value="">Load Error</option>').prop('disabled', true);
            console.error(`AJAX error loading options for ${targetField}:`, xhr);
        });
    }

    // --- Event Listeners for Dropdowns (delegated to modal form target) ---
    modalFormTarget.on('change', yearSelectSelector, function() {
        const makeSelect = modalFormTarget.find(makeSelectSelector);
        const modelSelect = modalFormTarget.find(modelSelectSelector);
        const trimSelect = modalFormTarget.find(trimSelectSelector);

        makeSelect.empty().append('<option value="">Select Year First</option>').prop('disabled', true);
        modelSelect.empty().append('<option value="">Select Make First</option>').prop('disabled', true);
        trimSelect.empty().append('<option value="">Select Model First</option>').prop('disabled', true);
        const selectedYear = $(this).val();
        if (selectedYear) {
            populateDependentDropdown(makeSelect, 'make', selectedYear);
        }
    });

    modalFormTarget.on('change', makeSelectSelector, function() {
        const modelSelect = modalFormTarget.find(modelSelectSelector);
        const trimSelect = modalFormTarget.find(trimSelectSelector);
        modelSelect.empty().append('<option value="">Select Make First</option>').prop('disabled', true);
        trimSelect.empty().append('<option value="">Select Model First</option>').prop('disabled', true);
        const selectedMake = $(this).val();
        const selectedYear = modalFormTarget.find(yearSelectSelector).val();
        if (selectedMake && selectedYear) {
            populateDependentDropdown(modelSelect, 'model', selectedYear, selectedMake);
        }
    });

    modalFormTarget.on('change', modelSelectSelector, function() {
        const trimSelect = modalFormTarget.find(trimSelectSelector);
        trimSelect.empty().append('<option value="">Select Model First</option>').prop('disabled', true);
        const selectedModel = $(this).val();
        const selectedMake = modalFormTarget.find(makeSelectSelector).val();
        const selectedYear = modalFormTarget.find(yearSelectSelector).val();
        if (selectedModel && selectedMake && selectedYear) {
            populateDependentDropdown(trimSelect, 'trim', selectedYear, selectedMake, selectedModel);
        }
    });

    // --- Add Vehicle Form Submission (delegated to modal form target) ---
    modalFormTarget.on('submit', addVehicleFormSelector, function(e) {
        e.preventDefault();
        const form = $(this);
        const submitButton = form.find('#add-vehicle-submit');
        const statusDivInForm = form.find(statusDivSelector); // Status div specific to this form

        statusDivInForm.text('Adding...').css('color', 'inherit').removeClass('success error').show();
        submitButton.prop('disabled', true);

        const formData = {
            action: 'add_vehicle_to_garage',
            // Use the nonce field name passed from PHP
            [myddpc_garage_settings.add_vehicle_nonce_field_name]: myddpc_garage_settings.add_vehicle_nonce,
            year: form.find(yearSelectSelector).val(),
            make: form.find(makeSelectSelector).val(),
            model: form.find(modelSelectSelector).val(),
            trim: form.find(trimSelectSelector).val(),
            nickname: form.find(nicknameInputSelector).val()
        };

        if (!formData.year || !formData.make || !formData.model || !formData.trim || !formData.nickname) {
            statusDivInForm.text('Please fill out all fields.').addClass('error').css('color', '').show();
            submitButton.prop('disabled', false);
            return;
        }
        console.log('Submitting Add Vehicle Form (Modal):', formData);

        $.post(myddpc_garage_settings.ajax_url, formData, function(response) {
            submitButton.prop('disabled', false);
            if (response.success) {
                statusDivInForm.text(response.data.message || 'Vehicle added successfully!').addClass('success').css('color', '').show();
                form[0].reset(); // Reset the form fields
                form.find(yearSelectSelector).val('').trigger('change'); // Reset dropdowns

                if (response.data.new_card_html) {
                    // Prepend the new card to the gallery, before the placeholder
                    $(response.data.new_card_html).insertBefore(addVehiclePlaceholderCard);
                } else {
                    console.warn('New card HTML not provided. UI will not update dynamically without reload.');
                }

            // if we got an entry_id back, send the user to its build list immediately
            if ( response.data.entry_id ) {
                var redirectUrl = window.location.pathname + '?entry_id=' + response.data.entry_id;
                setTimeout(function() {
                    window.location.href = redirectUrl;
                }, 800);
            } else {
                // fallback close-modal
                setTimeout(function() {
                    closeModal();
                    statusDivInForm.hide().removeClass('success error');
                }, 1200);
            }

            } else {
                statusDivInForm.text('Error: ' + (response.data.message || 'Could not add vehicle.')).addClass('error').css('color', '').show();
            }
        }).fail(function(xhr) {
            statusDivInForm.text('AJAX Error. Please try again.').addClass('error').css('color', '').show();
            console.error('Add vehicle AJAX error:', xhr);
            submitButton.prop('disabled', false);
        });
    });

    // --- Initialize the modal form on page load ---
    initializeModalForm();

});
