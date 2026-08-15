-- Epic 12: DevSync Events

CREATE TABLE devsync_events (
    id VARCHAR(255) PRIMARY KEY,
    workspace_id VARCHAR(50) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    work_item_id VARCHAR(50),
    payload JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    CONSTRAINT fk_devsync_events_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE INDEX idx_devsync_events_workspace_created ON devsync_events(workspace_id, created_at DESC);
CREATE INDEX idx_devsync_events_work_item ON devsync_events(work_item_id);
