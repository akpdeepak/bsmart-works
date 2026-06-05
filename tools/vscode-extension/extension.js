// bSmart Works — VS Code extension (iteration 14, Cap U).
// Keyboard-first work item context in the editor: a "My Work" + "PRs to Review" sidebar, status
// updates, standup drafting, and inline commit linking. Every call hits the same /api/v1 surface
// the web UI and `works` CLI use; the backend owns RBAC, tenant scoping and the AI Control Plane.

const vscode = require('vscode');

function cfg() {
  const c = vscode.workspace.getConfiguration('works');
  return { apiBase: c.get('apiBase'), token: c.get('token'), workspaceId: c.get('workspaceId') };
}

async function api(path, { method = 'GET', body } = {}) {
  const { apiBase, token } = cfg();
  if (!token) {
    vscode.window.showWarningMessage('bSmart Works: set works.token in Settings first.');
    throw new Error('no token');
  }
  const res = await fetch(`${apiBase}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error((json && (json.message || json.error)) || `HTTP ${res.status}`);
  return json;
}

// A tree provider backed by an async loader returning [{ label, description, id }].
class ListProvider {
  constructor(loader) {
    this.loader = loader;
    this._onDidChange = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChange.event;
    this.rows = [];
  }

  refresh() {
    const { workspaceId } = cfg();
    if (!workspaceId) { this.rows = [{ label: 'Set works.workspaceId in Settings', id: null }]; this._onDidChange.fire(); return; }
    this.loader(workspaceId)
      .then((rows) => { this.rows = rows; })
      .catch((e) => { this.rows = [{ label: `Error: ${e.message}`, id: null }]; })
      .finally(() => this._onDidChange.fire());
  }

  getChildren() { return this.rows; }

  getTreeItem(row) {
    const item = new vscode.TreeItem(row.label, vscode.TreeItemCollapsibleState.None);
    item.description = row.description;
    if (row.id) {
      item.command = { command: 'works.openItem', title: 'Open', arguments: [row.id] };
      item.contextValue = 'workItem';
    }
    return item;
  }
}

function activate(context) {
  const myWork = new ListProvider(async (ws) => {
    const home = await api(`/developer-workspace?workspaceId=${encodeURIComponent(ws)}`);
    return (home.todaysWork || []).map((it) => ({ label: `${it.id}  ${it.title}`, description: it.status, id: it.id }));
  });
  const reviewQueue = new ListProvider(async (ws) => {
    const home = await api(`/developer-workspace?workspaceId=${encodeURIComponent(ws)}`);
    return (home.reviewQueue || []).map((pr) => ({ label: `★${pr.urgencyScore}  #${pr.number} ${pr.title}`, description: pr.authorName, id: pr.workItemId }));
  });

  vscode.window.registerTreeDataProvider('works.myWork', myWork);
  vscode.window.registerTreeDataProvider('works.reviewQueue', reviewQueue);
  myWork.refresh();
  reviewQueue.refresh();

  const refresh = () => { myWork.refresh(); reviewQueue.refresh(); };

  context.subscriptions.push(
    vscode.commands.registerCommand('works.refresh', refresh),

    // Open a work item: show its context + Definition-of-Done checklist in a webview.
    vscode.commands.registerCommand('works.openItem', async (preId) => {
      const id = preId || await vscode.window.showInputBox({ prompt: 'Work item id (e.g. WRK-1247)' });
      if (!id) return;
      try {
        const [item, dod, code] = await Promise.all([
          api(`/work-items/${encodeURIComponent(id)}`),
          api(`/dod-checklists/for-work-item?workItemId=${encodeURIComponent(id)}`),
          api(`/code/context?workItemId=${encodeURIComponent(id)}`),
        ]);
        const panel = vscode.window.createWebviewPanel('worksItem', `${item.id}`, vscode.ViewColumn.Beside, {});
        panel.webview.html = renderItem(item, dod, code);
      } catch (e) {
        vscode.window.showErrorMessage(`bSmart Works: ${e.message}`);
      }
    }),

    // Status update from the editor.
    vscode.commands.registerCommand('works.transition', async () => {
      const id = await vscode.window.showInputBox({ prompt: 'Work item id' });
      if (!id) return;
      const status = await vscode.window.showQuickPick(['Todo', 'In Progress', 'Done'], { placeHolder: 'New status' });
      if (!status) return;
      try {
        const item = await api(`/work-items/${encodeURIComponent(id)}`);
        await api(`/work-items/${encodeURIComponent(id)}`, { method: 'PUT', body: { ...item, status, version: item.version } });
        vscode.window.showInformationMessage(`${id} → ${status}`);
        refresh();
      } catch (e) {
        vscode.window.showErrorMessage(`bSmart Works: ${e.message}`);
      }
    }),

    // Inline commit linking: link the current branch / a sha to a work item.
    vscode.commands.registerCommand('works.linkCommit', async () => {
      const id = await vscode.window.showInputBox({ prompt: 'Work item id to link' });
      if (!id) return;
      const ref = await vscode.window.showInputBox({ prompt: 'Commit sha or branch name' });
      if (!ref) return;
      const kind = await vscode.window.showQuickPick(['COMMIT', 'BRANCH', 'PR'], { placeHolder: 'Kind' });
      if (!kind) return;
      const message = await vscode.window.showInputBox({ prompt: 'Message (optional)' });
      try {
        await api('/code/links', { method: 'POST', body: { workItemId: id, kind, ref, message } });
        vscode.window.showInformationMessage(`Linked ${kind} ${ref} to ${id}`);
      } catch (e) {
        vscode.window.showErrorMessage(`bSmart Works: ${e.message}`);
      }
    }),

    // Draft standup and drop it into a new editor for editing before posting.
    vscode.commands.registerCommand('works.standup', async () => {
      const { workspaceId } = cfg();
      if (!workspaceId) { vscode.window.showWarningMessage('Set works.workspaceId first.'); return; }
      try {
        const s = await api(`/developer-workspace/standup?workspaceId=${encodeURIComponent(workspaceId)}`, { method: 'POST', body: {} });
        const doc = await vscode.workspace.openTextDocument({ content: s.draft, language: 'markdown' });
        vscode.window.showTextDocument(doc);
      } catch (e) {
        vscode.window.showErrorMessage(`bSmart Works: ${e.message}`);
      }
    }),
  );
}

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function renderItem(item, dod, code) {
  const ac = item.acceptanceCriteria ? `<h3>Acceptance criteria</h3><pre>${escapeHtml(item.acceptanceCriteria)}</pre>` : '';
  const dodRows = (dod.items || [])
    .map((it) => `<li>${it.checked ? '☑' : '☐'} ${escapeHtml(it.label)}${it.required ? ' <em>(required)</em>' : ''}</li>`).join('');
  const dodBlock = dod.checklist
    ? `<h3>Definition of Done${dod.complete ? ' ✓' : ` — ${dod.requiredOutstanding} outstanding`}</h3><ul>${dodRows}</ul>`
    : '';
  const links = (code.links || [])
    .map((l) => `<li>${escapeHtml(l.kind)} <code>${escapeHtml(l.ref)}</code> — ${escapeHtml(l.message)}</li>`).join('');
  const codeBlock = links ? `<h3>Code</h3><ul>${links}</ul>` : '';
  return `<!doctype html><html><body style="font-family: var(--vscode-font-family); padding: 12px;">
    <h2>${escapeHtml(item.id)} — ${escapeHtml(item.title)}</h2>
    <p><strong>${escapeHtml(item.status)}</strong> · ${escapeHtml(item.type)} · ${escapeHtml(item.priority || '')}</p>
    <p>${escapeHtml(item.description)}</p>
    ${ac}${dodBlock}${codeBlock}
  </body></html>`;
}

function deactivate() {}

module.exports = { activate, deactivate, renderItem };
