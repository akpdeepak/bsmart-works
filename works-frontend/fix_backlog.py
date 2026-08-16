import re

with open('src/views/backlog-view.jsx', 'r') as f:
    content = f.read()

content = content.replace(
    '  backlogItems,',
    '  backlogItems, totalBacklogCount, fetchBacklog,'
)

load_more = """
            {backlogItems.length < totalBacklogCount && (
              <div className="pt-4 flex justify-center">
                <Button variant="secondary" onClick={() => fetchBacklog(Math.ceil(backlogItems.length / 200), 200)}>
                  Load more (Showing {backlogItems.length} of {totalBacklogCount})
                </Button>
              </div>
            )}
"""
content = content.replace(
    '          </div>\n        </main>',
    '          </div>' + load_more + '\n        </main>'
)

with open('src/views/backlog-view.jsx', 'w') as f:
    f.write(content)
