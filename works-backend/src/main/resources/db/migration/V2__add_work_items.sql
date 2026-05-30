CREATE TABLE work_items (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    type VARCHAR(50) NOT NULL
);

-- Let's put your 3 sample tasks directly into the database!
INSERT INTO work_items (id, title, status, type) VALUES 
('WEB-1247', 'Implement OTP verification for portal login', 'Todo', 'Story'),
('WEB-1248', 'Fix CSRF refresh on login', 'In Progress', 'Bug'),
('WEB-1249', 'Setup Spring Boot Auth module', 'Done', 'Task');