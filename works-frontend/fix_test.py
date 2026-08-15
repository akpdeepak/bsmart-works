import re

with open('src/views/notifications-view.test.jsx', 'r') as f:
    content = f.read()

content = content.replace(
    """    await waitFor(() => expect(api.send).toHaveBeenCalledWith('/inbox/done?workspaceId=WS-1', {
      method: 'POST', body: JSON.stringify({ itemKey: ACTION.key }),
    }));
    expect(setInboxItems).toHaveBeenCalled();""",
    """    await waitFor(() => {
      expect(api.send).toHaveBeenCalledWith('/inbox/done?workspaceId=WS-1', {
        method: 'POST', body: JSON.stringify({ itemKey: ACTION.key }),
      });
      expect(setInboxItems).toHaveBeenCalled();
    });"""
)

with open('src/views/notifications-view.test.jsx', 'w') as f:
    f.write(content)

