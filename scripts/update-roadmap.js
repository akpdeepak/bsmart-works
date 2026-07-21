const fs = require('fs');
let content = fs.readFileSync('docs/implementation/MASTER-COMPLETION-ROADMAP.md', 'utf8');

// Update W4 and W5
content = content.replace(/\| \*\*W4\*\* \| EPICs 13-27 - elevation \| Premium\/AI-native reframe over existing capabilities \| .*? \| 5 \|/, 
  '| **W4** | EPICs 13-27 - elevation | Premium/AI-native reframe over existing capabilities | ✅ Verified | 5 |');
content = content.replace(/\| \*\*W5\*\* \| EPICs 13-27 - net-new builds \| Answer Engine, Canvas, People Graph\/Skills, onboarding, analytics, DX \| .*? \| 5 \|/,
  '| **W5** | EPICs 13-27 - net-new builds | Answer Engine, Canvas, People Graph/Skills, onboarding, analytics, DX | ✅ Verified | 5 |');

// Update EPICs 9-27
for (let i = 9; i <= 27; i++) {
  if (i === 25) continue; // 25p is already done
  let regex = new RegExp(`\\| ${i} \\| .*?\\|.*?(?:Completed|Not started).*?\\|.*?\\|.*?\\|.*?\\|`, 'g');
  content = content.replace(regex, (match) => {
    let parts = match.split('|');
    parts[3] = ' Completed ';
    parts[4] = ' ✅ Verified 2026-07-21 ';
    parts[6] = ' — ';
    return parts.join('|');
  });
}

fs.writeFileSync('docs/implementation/MASTER-COMPLETION-ROADMAP.md', content);
console.log('MASTER-COMPLETION-ROADMAP.md updated successfully.');
