import re

with open('src/views/messenger-view.jsx', 'r') as f:
    content = f.read()

content = content.replace(
    'export default function MessengerView({ workspaceId }) {',
    'export default function MessengerView({ workspaceId, users = [] }) {'
)

if 'import { Select }' not in content:
    content = content.replace(
        "import { Button } from '@/components/works/button';",
        "import { Button } from '@/components/works/button';\nimport { Select } from '@/components/works/atoms/select';"
    )

button_code = """                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  id="add-participant-btn"
                  onClick={() => {
                    const userId = window.prompt(t('messenger.addParticipant.prompt', 'Enter user ID to add:'));
                    if (userId?.trim()) {
                      internalChatClient.addParticipant(workspaceId, activeId, userId.trim())
                        .then(() => loadThread(activeId))
                        .catch(() => { /* toast */ });
                    }
                  }}
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  {t('messenger.action.addParticipant', 'Add member')}
                </Button>"""

select_code = """                <Select
                  value=""
                  onChange={(e) => {
                    const userId = e.target.value;
                    if (userId) {
                      internalChatClient.addParticipant(workspaceId, activeId, userId)
                        .then(() => loadThread(activeId))
                        .catch(() => { /* toast */ });
                    }
                  }}
                >
                  <option value="" disabled>{t('messenger.action.addParticipant', 'Add member')}</option>
                  {users.filter(u => !participants.some(p => p.id === u.id)).map(u => (
                    <option key={u.id} value={u.id}>{u.fullName}</option>
                  ))}
                </Select>"""

content = content.replace(button_code, select_code)

with open('src/views/messenger-view.jsx', 'w') as f:
    f.write(content)
