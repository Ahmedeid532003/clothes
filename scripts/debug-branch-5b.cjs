const fs = require('fs');
const s = fs.readFileSync('c:/Users/DELL/OneDrive/Desktop/clothes-main/employees-v13/components/EmployeesTab.tsx', 'utf8');
const M = '{/* Advanced Controls Toolbar */}';
let start = -1;
for (let i = 0; i < 6; i++) start = s.indexOf(M, start + 1);
const end = s.indexOf('{(() => {', start + 200);
const body = s.slice(start, end);
const bottomIdx = body.indexOf('{/* Bottom Row');
console.log(body.slice(bottomIdx - 200, bottomIdx + 80));

function matchDivFrom(str, from) {
  const divStart = str.indexOf('<div', from);
  let depth = 0, i = divStart;
  while (i < str.length) {
    if (str.startsWith('</div>', i)) { depth--; i += 6; if (depth === 0) return { end: i, len: i - divStart }; continue; }
    if (str.startsWith('<div', i)) { depth++; i += 4; continue; }
    i++;
  }
  return null;
}
const commentIdx = body.indexOf('{/* Top Row: Branch Dropdown');
const divStart = body.indexOf('<div', commentIdx);
const m = matchDivFrom(body, divStart);
console.log('match', m, 'bottomIdx', bottomIdx, 'm.end<=bottom?', m && m.end <= bottomIdx + 5);
console.log('len', m && m.len);
