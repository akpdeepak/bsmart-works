// Flesch-Kincaid Grade Level approximation. Vowel groups estimate syllables.
// KR-013 · P1 · RB-30

function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!word) return 0;
  const vowelGroups = word.match(/[aeiouy]+/g);
  let count = vowelGroups ? vowelGroups.length : 1;
  if (word.endsWith('e') && count > 1) count -= 1;
  return Math.max(1, count);
}

export function fleschKincaid(text) {
  if (!text || !text.trim()) return 0;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim()).length || 1;
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 0;
  const syllables = words.reduce((acc, w) => acc + countSyllables(w), 0);
  const grade = 0.39 * (words.length / sentences) + 11.8 * (syllables / words.length) - 15.59;
  return Math.max(0, Math.round(grade * 10) / 10);
}

export function gradeLabel(grade) {
  if (grade <= 6) return `Grade ${grade} · Very easy`;
  if (grade <= 9) return `Grade ${grade} · Easy`;
  if (grade <= 12) return `Grade ${grade} · Standard`;
  return `Grade ${grade} · Difficult`;
}
