const fs = require('fs');
const s = fs.readFileSync('c:/Users/DELL/OneDrive/Desktop/clothes-main/components/additions/mozafen/EmployeesTab.tsx', 'utf8');
const M = '{/* Advanced Controls Toolbar */}';
let start = -1;
for (let i = 0; i < 6; i++) start = s.indexOf(M, start + 1);
const end = s.indexOf('{(() => {', start + 200);
const body = s.slice(start, end);
const commentIdx = body.indexOf('{/* Top Row: Branch Dropdown');
const endIdx = body.indexOf('{/* Bottom Row:');
// show structure with div depth from Top Row to after Bottom Row start
let depth = 0;
const region = body.slice(commentIdx, endIdx + 120);
let i = 0;
const events = [];
while (i < region.length) {
  if (region.startsWith('</div>', i)) {
    depth--;
    events.push({ t: 'close', depth, at: i, ctx: region.slice(Math.max(0,i-40), i+10).replace(/\s+/g,' ') });
    i += 6;
    continue;
  }
  if (region.startsWith('<div', i)) {
    const gt = region.indexOf('>', i);
    const slice = region.slice(i, gt + 1);
    const self = /\/>\s*$/.test(slice);
    if (!self) {
      depth++;
      events.push({ t: 'open', depth, at: i, head: slice.slice(0, 70) });
      i += 4;
    } else {
      events.push({ t: 'self', depth, at: i, head: slice.slice(0, 70) });
      i = gt + 1;
    }
    continue;
  }
  i++;
}
console.log('events near end:');
events.slice(-15).forEach(e => console.log(e));
console.log('depth at bottom comment', depth);
