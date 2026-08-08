const fs = require('fs');
// Inline copy of fixed matchDivFrom + extract from the rebuild script
function matchDivFrom(str, from) {
  const divStart = str.indexOf('<div', from);
  if (divStart === -1) return null;
  let depth = 0;
  let i = divStart;
  while (i < str.length) {
    if (str.startsWith('</div>', i)) {
      depth--;
      i += 6;
      if (depth === 0) return { start: divStart, end: i, html: str.slice(divStart, i) };
      continue;
    }
    if (str.startsWith('<div', i)) {
      const gt = str.indexOf('>', i);
      if (gt !== -1) {
        const slice = str.slice(i, gt + 1);
        if (/\/>\s*$/.test(slice) || slice.startsWith('<div /')) {
          i = gt + 1;
          continue;
        }
      }
      depth++;
      i += 4;
      continue;
    }
    i++;
  }
  return null;
}

const s = fs.readFileSync('c:/Users/DELL/OneDrive/Desktop/clothes-main/employees-v13/components/EmployeesTab.tsx', 'utf8');
const M = '{/* Advanced Controls Toolbar */}';
let start = -1;
for (let i = 0; i < 6; i++) start = s.indexOf(M, start + 1);
const end = s.indexOf('{(() => {', start + 200);
const body = s.slice(start, end);
const commentIdx = body.indexOf('{/* Top Row: Branch Dropdown');
const endIdx = body.indexOf('{/* Bottom Row:');
console.log({ commentIdx, endIdx });
const divStartInBody = body.indexOf('<div', commentIdx);
const m = matchDivFrom(body, divStartInBody);
console.log('m', m && { end: m.end, len: m.html.length, endIdx, ok: m.end <= endIdx + 10 });
if (!m) {
  // find why — track depth
  let depth = 0, i = divStartInBody, steps = 0;
  while (i < Math.min(body.length, endIdx + 50) && steps < 5000) {
    if (body.startsWith('</div>', i)) {
      depth--;
      console.log('close', depth, i);
      i += 6;
      steps++;
      continue;
    }
    if (body.startsWith('<div', i)) {
      const gt = body.indexOf('>', i);
      const slice = body.slice(i, gt + 1);
      const self = /\/>\s*$/.test(slice);
      if (!self) {
        depth++;
        console.log('open', depth, i, slice.slice(0, 60));
      } else {
        console.log('self', i, slice.slice(0, 60));
      }
      i = self ? gt + 1 : i + 4;
      steps++;
      continue;
    }
    i++;
  }
  console.log('final depth', depth, 'steps', steps);
}
