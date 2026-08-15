import re

with open('src/views/board-view.jsx', 'r') as f:
    content = f.read()

if 'fetchAll,' not in content:
    content = content.replace('  workItems,', '  workItems, fetchAll,')

load_more = """
            {totalWorkItemCount !== null && totalWorkItemCount > workItems.length && (
              <button
                onClick={() => fetchAll(Math.ceil(workItems.length / 200), 200)}
                className="ml-2 text-xs font-medium text-brand-navy hover:underline focus:outline-none"
              >
                Load More
              </button>
            )}
"""

# Replace the text indicator with a button or add it next to it.
content = content.replace(
    """            {totalWorkItemCount !== null && totalWorkItemCount > workItems.length && (
              <span className="ml-1 text-semantic-warning font-medium">
                {`(${t('deliver.board.showing')} ${workItems.length} ${t('deliver.board.of')} ${totalWorkItemCount})`}
              </span>
            )}""",
    """            {totalWorkItemCount !== null && totalWorkItemCount > workItems.length && (
              <span className="ml-1 text-semantic-warning font-medium">
                {`(${t('deliver.board.showing')} ${workItems.length} ${t('deliver.board.of')} ${totalWorkItemCount})`}
              </span>
            )}""" + load_more
)

with open('src/views/board-view.jsx', 'w') as f:
    f.write(content)
