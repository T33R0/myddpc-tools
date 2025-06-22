/* global jQuery, myddpc_common_settings */
jQuery(document).ready(function($) {

    console.log('MyDDPC Common JS Loaded.');

    // --- Remove Vehicle Button Click Handler ---
    // Use event delegation on a parent element that exists when the page loads
    // Using 'body' is robust but less specific. If you have a consistent wrapper ID/class from your theme, use that.
    // Let's try '.site-main' or '#primary' if those are consistent in your theme. Defaulting to 'body' for now.
    $('body').on('click', '.remove-garage-vehicle-btn', function() {
        const button = $(this);
        const entryId = button.data('entryid');
        const nickname = button.data('nickname');

        // *** UPDATED: Get settings from the common object ***
        if (typeof myddpc_common_settings === 'undefined' || !myddpc_common_settings.remove_vehicle_nonce) {
            alert('Error: Security token not found (common).');
            console.error("myddpc_common_settings or remove_vehicle_nonce not found.");
            return;
        }
        const removeNonce = myddpc_common_settings.remove_vehicle_nonce;
        const ajaxUrl = myddpc_common_settings.ajax_url;
        // *** END UPDATE ***

        if (!entryId || !nickname) {
            alert('Error: Could not get vehicle details for removal.');
            return;
        }

        const confirmationMessage = `Are you sure you want to remove '${nickname}'?\nAll associated modifications will be permanently deleted.`;

        if (confirm(confirmationMessage)) {
            console.log(`Attempting to remove vehicle entry ID: ${entryId}`);
            button.prop('disabled', true).css('opacity', 0.7);

            $.post(ajaxUrl, { // Use common ajaxUrl
                action: 'myddpc_remove_vehicle',
                nonce: removeNonce,
                entry_id: entryId
            }, function(response) {
                console.log("Remove response:", response);
                if (response.success) {
                    if ($('#garage-list').length) { // On main garage page
                        // CHANGED BEHAVIOR: Reload the page instead of just fading out the item
                        // You can optionally show a quick alert or status message before reload
                        // For example:
                        // statusDiv.text('Vehicle removed. Reloading...').css('color','green').show();
                        // setTimeout(function() { location.reload(); }, 500); // Short delay for message
                        location.reload(); // Reload the page
                    } else { // On build list page
                        alert('Vehicle removed successfully! Redirecting to your garage.');
                        let garageUrl = window.location.href.split('?')[0];
                        window.location.href = garageUrl;
                    }
                } else {
                    alert('Error removing vehicle: ' + (response.data ? response.data.message : 'Unknown error'));
                    button.prop('disabled', false).css('opacity', 1);
                }
            }).fail(function(xhr, status, error) {
                 console.error("AJAX Remove Error:", status, error, xhr);
                 alert('AJAX error removing vehicle. Please try again.');
                 button.prop('disabled', false).css('opacity', 1);
            });
        }
    });

}); // End jQuery ready