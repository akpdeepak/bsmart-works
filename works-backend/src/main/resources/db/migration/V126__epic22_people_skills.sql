-- ============================================================
-- V126: EPIC-22 People Graph / Skills (minimal, additive)
-- A workspace-scoped skill catalogue and per-person skill edges. Additive and forward-only: with no
-- rows the product behaves exactly as before. This is the "who knows what" graph the roadmap's
-- People Graph / Skills capability required (previously only a flat Stakeholder contact existed).
-- ============================================================

CREATE TABLE skills (
    id           VARCHAR(50)  PRIMARY KEY,
    workspace_id VARCHAR(100) NOT NULL,
    name         VARCHAR(120) NOT NULL,
    category     VARCHAR(80),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_skill_workspace_name UNIQUE (workspace_id, name)
);
CREATE INDEX idx_skills_workspace ON skills(workspace_id);

-- Edge: a person (user) holds a skill at a proficiency. Unique per (workspace, user, skill).
CREATE TABLE person_skills (
    id           VARCHAR(50)  PRIMARY KEY,
    workspace_id VARCHAR(100) NOT NULL,
    user_id      VARCHAR(50)  NOT NULL,
    skill_id     VARCHAR(50)  NOT NULL,
    proficiency  VARCHAR(20)  NOT NULL DEFAULT 'INTERMEDIATE',
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_person_skill UNIQUE (workspace_id, user_id, skill_id)
);
CREATE INDEX idx_person_skills_workspace ON person_skills(workspace_id);
CREATE INDEX idx_person_skills_skill ON person_skills(skill_id);
CREATE INDEX idx_person_skills_user ON person_skills(user_id);
