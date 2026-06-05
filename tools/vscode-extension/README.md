# bSmart Works — VS Code extension

Work item context without leaving the editor (iteration 14, Cap U). Keyboard-first.

## Features

- **My Work** and **PRs to Review** sidebar views (activity bar → checklist icon), urgency-ranked.
- **Open Work Item** (`works.openItem`) — a side panel with the description, **acceptance criteria**,
  the **Definition-of-Done checklist** (with outstanding count) and linked **code** (commits/branches/PRs).
- **Update Status** (`works.transition`) — move an item Todo → In Progress → Done from the palette.
- **Link Commit** (`works.linkCommit`, `Ctrl/Cmd+Alt+L`) — inline commit/branch/PR linking to a work item.
- **Draft Standup** (`works.standup`, `Ctrl/Cmd+Alt+S`) — opens the AI-drafted standup in an editor to edit before posting.

## Configure

Settings → Extensions → bSmart Works:

| Setting | Description |
|---------|-------------|
| `works.apiBase` | API base URL (default `http://localhost:8080/api/v1`) |
| `works.token` | JWT bearer token |
| `works.workspaceId` | Active workspace id (e.g. `WS-001`) |

## Architecture

The extension is a thin client over the same `/api/v1` REST surface as the web app and the `works`
CLI. The backend enforces RBAC, tenant isolation and the AI Control Plane (scope/budget/fallback),
so the extension never embeds business logic. `renderItem()` is exported for unit testing the
webview HTML.

## Develop

Open this folder in VS Code and press **F5** to launch an Extension Development Host. (Packaging
with `vsce` and Marketplace publication are follow-up release tasks.)
