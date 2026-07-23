const fs = require('fs');
let content = fs.readFileSync('.gemini/antigravity-ide/brain/a9f121b6-cd7a-4b76-b999-e96f2534d783/task.md', 'utf8');
content = content.replace('[ ] Backend: Enum/Entity definitions', '[/] Backend: Enum/Entity definitions');
fs.writeFileSync('.gemini/antigravity-ide/brain/a9f121b6-cd7a-4b76-b999-e96f2534d783/task.md', content);
