# Antigravity Rules for PRs

- **MANDATORY PR CREATION**: Whenever executing a task that modifies code, Antigravity MUST NOT push changes directly to `main` or `master`. 
- You MUST create a new branch, commit the changes, and create a Pull Request using `gh pr create` or the `create_pull_request` MCP tool.
- Await CI validation if applicable, but never bypass the PR process.
