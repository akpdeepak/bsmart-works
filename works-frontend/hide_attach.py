import re

with open('src/views/messenger-view.jsx', 'r') as f:
    content = f.read()

block_to_remove = """                      <button
                        className="absolute right-2.5 bottom-2.5 text-neutral-300 hover:text-neutral-500"
                        aria-label={t('messenger.composer.attach', 'Attach file')}
                        disabled
                        title={t('messenger.composer.attachSoon', 'File attachments coming soon')}
                      >
                        <Paperclip className="h-4 w-4" />
                      </button>"""

content = content.replace(block_to_remove, '')

with open('src/views/messenger-view.jsx', 'w') as f:
    f.write(content)
