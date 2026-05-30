-- Clean up the old dummy tables from our early test phase
DROP TABLE IF EXISTS workspace_members CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS workspaces CASCADE;

-- 1. Users Table (Stores the people logging in)
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Workspaces Table (Stores the tenant/company, e.g., "BCITS Engineering")
CREATE TABLE workspaces (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Workspace Members Table (Links Users to Workspaces with Roles)
CREATE TABLE workspace_members (
    workspace_id VARCHAR(50) REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    system_role VARCHAR(50) NOT NULL DEFAULT 'MEMBER',
    PRIMARY KEY (workspace_id, user_id)
);

-- Insert a default Admin User and Workspace for you to test with
INSERT INTO users (id, email, password_hash, full_name) 
VALUES ('USR-001', 'deepak@bcits.com', 'placeholder_hash', 'Deepak Pandey');

INSERT INTO workspaces (id, name, slug) 
VALUES ('WS-001', 'BCITS Master Workspace', 'bcits');

INSERT INTO workspace_members (workspace_id, user_id, system_role) 
VALUES ('WS-001', 'USR-001', 'ADMIN');