-- V34: Iteration-2 follow-up — saved-filter subscriptions. A user subscribes to a saved
-- filter to be notified when new work items match it. The hourly SavedFilterNotifier checks
-- items created since last_notified_at against the filter's criteria and notifies the owner.

ALTER TABLE saved_filters ADD COLUMN subscribed       BOOLEAN     NOT NULL DEFAULT FALSE;
ALTER TABLE saved_filters ADD COLUMN last_notified_at TIMESTAMPTZ;
