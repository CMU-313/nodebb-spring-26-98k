'use strict';

define('forum/topic/status', ['api', 'alerts'], (api, alerts) => {
    const Status = {};

    Status.init = function() {
        setupMarkResolvedButton();
    };

    function setupMarkResolvedButton() {
        const $button = $('[component="topic/mark-resolved"]');
        if (!$button.length) {
            return;
        }

        // Hide button if already resolved
        const currentStatus = $button.data('status');
        if (currentStatus === 'resolved') {
            $button.parent().hide();
            return;
        }

        $button.on('click', function() {
            const tid = ajaxify.data.tid;
            const $btn = $(this);
            
            // Disable button and show loading state
            $btn.prop('disabled', true);
            $btn.html('<i class="fa fa-spinner fa-spin"></i> Updating...');
            
            // Call API to update status
            api.put(`/topics/${tid}/status`, { 
                status: 'resolved' 
            }).then(() => {
                alerts.success('Topic marked as resolved!');
                // Reload page to show updated status
                setTimeout(() => {
                    ajaxify.refresh();
                }, 1000);
            }).catch((err) => {
                alerts.error(err.message || 'Failed to update status');
                // Restore button state
                $btn.prop('disabled', false);
                $btn.html('<i class="fa fa-check"></i> Mark as Resolved');
            });
        });
    }

    return Status;
});