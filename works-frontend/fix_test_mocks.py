import os
import re

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Find `api: { raw: ... }` and change to `api: { raw: ..., send: ... }`
    # Many tests have: vi.mock('@/lib/apiClient', () => ({ api: { raw: (...a) => raw(...a) } }));
    # Some have: vi.mock('@/lib/apiClient', () => ({ api: { send: vi.fn(), raw: vi.fn() } })); (already has send)
    
    new_content = content.replace('api: { raw:', 'api: { send: vi.fn(), raw:')
    new_content = new_content.replace('api: { send: vi.fn(), send: vi.fn(), raw:', 'api: { send: vi.fn(), raw:') # deduplicate
    
    # Also if the test sets raw.mockResolvedValue, it should probably also set send.mockResolvedValue for components that I changed to send.
    # Actually, replacing all `raw` with `send` in the test files EXCEPT the `import` and `mock` statements would be easier.
    # What if I just make `api.send` alias `api.raw` in the mock?
    # vi.mock('@/lib/apiClient', () => ({ api: { raw: (...a) => raw(...a), send: (...a) => raw(...a) } }));
    
    if content != new_content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith('.test.js') or file.endswith('.test.jsx'):
            process_file(os.path.join(root, file))
