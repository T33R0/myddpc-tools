// myddpc-ajax-handler.js\n// Handles AJAX for MyDDPC User System\n\njQuery(document).ready(function($) {\n    // Placeholder for AJAX logic\n

    // Delete saved item
    $(document).on('click', '.myddpc-saved-item-delete', function(e) {
        e.preventDefault();
        var btn = $(this);
        var itemId = btn.data('item-id');
        if (!confirm('Are you sure you want to delete this item?')) return;
        btn.prop('disabled', true);
        fetch(myddpc_ajax_data.ajax_url, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: $.param({
                action: 'myddpc_delete_item',
                nonce: myddpc_ajax_data.nonce,
                item_id: itemId
            })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                $('#saved-item-' + itemId).remove();
            } else {
                alert(data.data && data.data.message ? data.data.message : 'Delete failed.');
                btn.prop('disabled', false);
            }
        })
        .catch(() => {
            alert('AJAX error.');
            btn.prop('disabled', false);
        });
    });

    // Account settings form submit
    $('#myddpc-account-settings-form').on('submit', function(e) {
        e.preventDefault();
        var form = $(this);
        var msg = $('#myddpc-account-settings-message');
        msg.text('');
        var formData = form.serializeArray();
        formData.push({ name: 'action', value: 'myddpc_update_account_settings' });
        fetch(myddpc_ajax_data.ajax_url, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: $.param(formData)
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                var out = [];
                if (data.data.display_name) {
                    out.push('Display name updated.');
                }
                if (data.data.password === 'success') {
                    out.push('Password updated.');
                } else if (data.data.password === 'mismatch') {
                    out.push('New passwords do not match.');
                } else if (data.data.password === 'incorrect_current') {
                    out.push('Current password is incorrect.');
                }
                msg.text(out.join(' '));
            } else {
                msg.text(data.data && data.data.message ? data.data.message : 'Update failed.');
            }
        })
        .catch(() => {
            msg.text('AJAX error.');
        });
    });
}); 