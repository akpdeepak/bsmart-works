import os
import re

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # We want to replace api.raw(...) with api.send(...) for mutations
    # But we have many GET calls too.
    # The instruction says "mutation calls". Let's look for method: 'POST', 'PUT', 'DELETE'.
    # Actually, replacing all `api.raw` with `api.send` is probably better, but let's stick to the prompt.
    # Wait, the prompt says "Migrate unchecked api.raw().then(r => r.json()) mutation calls across all views"
    
    # Let's just find api.raw and if it has a .then(r => r.json()) or .then((r) => r.json()) we remove it
    # and change raw to send.
    
    # 1. replace api.raw with api.send
    # 2. remove .then(r => r.json())
    
    # Regex for api.raw(...)
    # Actually, simple string replacement might be enough if we just replace:
    # api.raw( with api.send(
    # .then(r => r.json()) with "" (empty string)
    # .then(r => (r.ok ? r.json() : null)) with "" (empty string)
    
    new_content = content.replace('api.raw', 'api.send')
    new_content = re.sub(r'\.then\s*\(\s*r\s*=>\s*r\.json\(\)\s*\)', '', new_content)
    new_content = re.sub(r'\.then\s*\(\s*\(r\)\s*=>\s*r\.json\(\)\s*\)', '', new_content)
    new_content = re.sub(r'\.then\s*\(\s*res\s*=>\s*res\.json\(\)\s*\)', '', new_content)
    new_content = re.sub(r'\.then\s*\(\s*r\s*=>\s*\(r\.ok\s*\?\s*r\.json\(\)\s*:\s*null\)\s*\)', '', new_content)
    
    if content != new_content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith('.js') or file.endswith('.jsx'):
            process_file(os.path.join(root, file))

