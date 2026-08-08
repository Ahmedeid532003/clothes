const fs = require('fs');
const s = fs.readFileSync('c:/Users/DELL/OneDrive/Desktop/clothes-main/employees-v13/components/EmployeesTab.tsx', 'utf8');

function findTagEnd(str, start) {
  let i = start + 1, brace = 0, quote = null;
  while (i < str.length) {
    const ch = str[i];
    if (quote) {
      if (ch === quote && str[i - 1] !== '\\') quote = null;
      i++;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      i++;
      continue;
    }
    if (ch === '{') { brace++; i++; continue; }
    if (ch === '}') { brace = Math.max(0, brace - 1); i++; continue; }
    if (brace === 0 && ch === '>') return i;
    i++;
  }
  return -1;
}
function bal(html) {
  let o = 0, c = 0, i = 0;
  while (i < html.length) {
    if (html.startsWith('</div>', i)) { c++; i += 6; continue; }
    if (html.startsWith('<div', i)) {
      const gt = findTagEnd(html, i);
      if (gt < 0) break;
      if (!/\/\s*>$/.test(html.slice(i, gt + 1))) o++;
      i = gt + 1;
      continue;
    }
    i++;
  }
  return { o, c, ok: o === c, delta: o - c };
}

for (const [name, a, b] of [
  ['attendance', "case 'attendance'", "case 'bonus_deduct'"],
  ['bonus', "case 'bonus_deduct'", "case 'disbursals'"],
  ['disbursals', "case 'disbursals'", 'default:'],
]) {
  const start = s.indexOf(a);
  let end = s.indexOf(b, start + 10);
  if (end < 0) end = s.indexOf('default:', start + 10);
  console.log(name, bal(s.slice(start, end)));
  // verify header closed before toolbar
  const chunk = s.slice(start, end);
  const toolbar = chunk.indexOf('{/* Advanced Controls Toolbar */}');
  const before = chunk.slice(Math.max(0, toolbar - 80), toolbar);
  console.log('  before toolbar:', JSON.stringify(before.replace(/\s+/g, ' ')));
}
