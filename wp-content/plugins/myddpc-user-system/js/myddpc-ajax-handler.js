// myddpc-ajax-handler.js
// Handles AJAX for MyDDPC User System

(function($) {
    // Use jQuery's DOM-ready event to ensure the script runs after the page is fully loaded
    $(function() {

        // Handler for deleting a saved item
        $(document).on('click', '.myddpc-saved-item-delete', function(e) {
            e.preventDefault();

            var btn = $(this);
            var itemId = btn.data('item-id');

            if (!confirm('Are you sure you want to delete this item?')) {
                return;
            }
            
            btn.prop('disabled', true);

            $.ajax({
                url: myddpc_ajax_data.ajax_url,
                type: 'POST',
                data: {
                    action: 'myddpc_delete_item',
                    nonce: myddpc_ajax_data.nonce,
                    item_id: itemId
                },
                success: function(response) {
                    if (response.success) {
                        // If successful, fade out and remove the item from the page
                        $('#saved-item-' + itemId).fadeOut(300, function() { $(this).remove(); });
                    } else {
                        // On failure, show an alert and re-enable the button
                        alert(response.data && response.data.message ? response.data.message : 'Delete failed.');
                        btn.prop('disabled', false);
                    }
                },
                error: function() {
                    // On AJAX error, show a generic alert and re-enable the button
                    alert('An error occurred while trying to delete the item.');
                    btn.prop('disabled', false);
                }
            });
        });

        // Handler for the account settings form submission
        $('#myddpc-account-settings-form').on('submit', function(e) {
            e.preventDefault();

            var form = $(this);
            var msg = $('#myddpc-account-settings-message').text('').removeClass('success error');
            
            $.ajax({
                url: myddpc_ajax_data.ajax_url,
                type: 'POST',
                data: form.serialize() + '&action=myddpc_update_account_settings',
                dataType: 'json',
                success: function(response) {
                    if (response.success) {
                        var out = [];
                        if (response.data.display_name) {
                            out.push('Display name updated.');
                        }
                        // Handle password update status
                        if (response.data.password === 'success') {
                            out.push('Password updated.');
                        } else if (response.data.password === 'mismatch') {
                            out.push('New passwords do not match.');
                        } else if (response.data.password === 'incorrect_current') {
                            out.push('Current password is incorrect.');
                        }
                        // Display success message
                        msg.text(out.join(' ')).addClass('success');
                    } else {
                        // Display error message
                        msg.text(response.data && response.data.message ? response.data.message : 'Update failed.').addClass('error');
                    }
                },
                error: function() {
                    // Display a generic error message on AJAX failure
                    msg.text('An unexpected error occurred.').addClass('error');
                }
            });
        });

    });
})(jQuery); 