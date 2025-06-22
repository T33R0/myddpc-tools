// myddpc-ajax-handler.js
// Handles AJAX for MyDDPC User System

jQuery(document).ready(function($) {
    // --- Saved Item Card Interactions ---
    function setupCardEventHandlers() {
        $('.saved-items-grid').on('click', '.edit-title-btn', function() {
            var card = $(this).closest('.saved-item-card');
            card.find('.card-title-container').hide();
            card.find('.card-title-edit-container').show().find('.edit-title-input').focus();
        });

        $('.saved-items-grid').on('click', '.cancel-edit-btn', function() {
            var card = $(this).closest('.saved-item-card');
            card.find('.card-title-edit-container').hide();
            card.find('.card-title-container').show();
        });

        $('.saved-items-grid').on('click', '.save-title-btn', function() {
            var card = $(this).closest('.saved-item-card');
            var itemId = card.data('item-id');
            var newTitle = card.find('.edit-title-input').val().trim();
            var saveButton = $(this);

            if (!newTitle) {
                alert('Title cannot be empty.');
                return;
            }

            saveButton.text('Saving...').prop('disabled', true);

            $.ajax({
                url: myddpc_ajax_data.ajax_url,
                type: 'POST',
                data: {
                    action: 'myddpc_update_item_title',
                    nonce: myddpc_ajax_data.nonce,
                    item_id: itemId,
                    new_title: newTitle
                },
                success: function(response) {
                    if (response.success) {
                        card.find('.card-title').text(newTitle);
                        card.find('.card-title-edit-container').hide();
                        card.find('.card-title-container').show();
                    } else {
                        alert('Error: ' + (response.data.message || 'Could not update title.'));
                    }
                },
                error: function() {
                    alert('An unexpected error occurred. Please try again.');
                },
                complete: function() {
                    saveButton.text('Save').prop('disabled', false);
                }
            });
        });

        $('.saved-items-grid').on('click', '.delete-button', function() {
            var card = $(this).closest('.saved-item-card');
            var itemId = card.data('item-id');
            var itemTitle = card.find('.card-title').text();

            if (confirm('Are you sure you want to delete "' + itemTitle + '"?')) {
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
                            card.fadeOut(400, function() {
                                $(this).remove();
                            });
                        } else {
                            alert('Error: ' + (response.data.message || 'Could not delete item.'));
                        }
                    },
                    error: function() {
                        alert('An unexpected error occurred. Please try again.');
                    }
                });
            }
        });
        
        // Handler for "Load Search" button
        $('.saved-items-grid').on('click', '.load-search-button', function(e) {
            e.preventDefault();
            const searchId = $(this).data('search-id');
            if (!searchId) return;

            // This requires a corresponding function on the Discover page to handle this.
            // For now, we'll just redirect. A more advanced implementation might use sessionStorage.
            const discoverPageUrl = '/discover/'; // Adjust if URL is different
            window.location.href = discoverPageUrl + '?load_search_id=' + searchId;
        });
    }


    // --- Account Settings Form ---
    $('#myddpc-account-settings-form').on('submit', function(e) {
        e.preventDefault();
        var form = $(this);
        var messageDiv = $('#myddpc-account-settings-message');
        messageDiv.hide().removeClass('success error');

        var formData = {
            action: 'myddpc_update_account_settings',
            nonce: form.find('#nonce').val(),
            display_name: form.find('#display_name').val()
        };
        
        // Only include password fields if they are filled out
        var currentPassword = form.find('#current_password').val();
        var newPassword = form.find('#new_password').val();
        var confirmNewPassword = form.find('#confirm_new_password').val();

        if (currentPassword && newPassword && confirmNewPassword) {
            formData.current_password = currentPassword;
            formData.new_password = newPassword;
            formData.confirm_new_password = confirmNewPassword;
        }


        $.ajax({
            url: myddpc_ajax_data.ajax_url,
            type: 'POST',
            data: formData,
            success: function(response) {
                if (response.success) {
                    let successMessage = 'Settings updated successfully.';
                    if(response.data.password === 'success'){
                         successMessage += ' Password has been changed.';
                         form.find('input[type="password"]').val(''); // Clear fields
                    }
                    messageDiv.text(successMessage).addClass('success').show();
                } else {
                    let errorMessage = response.data.message || 'An error occurred.';
                    if(response.data.password === 'mismatch'){
                        errorMessage = 'New passwords do not match.';
                    } else if (response.data.password === 'incorrect_current'){
                        errorMessage = 'Your current password is not correct.';
                    }
                    messageDiv.text(errorMessage).addClass('error').show();
                }
            },
            error: function() {
                messageDiv.text('An unexpected error occurred.').addClass('error').show();
            }
        });
    });

    // Initialize all event handlers
    setupCardEventHandlers();
}); 