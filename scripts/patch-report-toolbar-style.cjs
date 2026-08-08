const fs = require('fs');
const p = 'c:/Users/DELL/OneDrive/Desktop/clothes-main/employees-v13/components/EmployeesTab.tsx';
let s = fs.readFileSync(p, 'utf8');

const M = '{/* Advanced Controls Toolbar */}';
let from = 0;
const ranges = [];
while (true) {
  const start = s.indexOf(M, from);
  if (start === -1) break;
  let end = Infinity;
  for (const e of ['{/* KPI Summaries', '{/* KPIs & Results', '\n                  {(() => {', '\n              {(() => {']) {
    const pos = s.indexOf(e, start + 50);
    if (pos !== -1 && pos < end) end = pos;
  }
  ranges.push([start, end]);
  from = end;
}

console.log('ranges', ranges.length);

for (const [start, end] of ranges) {
  let body = s.slice(start, end);
  const opens = (body.match(/<div\b/g) || []).length;
  const closes = (body.match(/<\/div>/g) || []).length;
  console.log('div balance', opens, closes, opens === closes);

  // Orange cards icon
  body = body.replace(
    /<LayoutGrid size=\{14\} className="text-\[#0a1945\]" \/>/g,
    '<LayoutGrid size={14} className="text-orange-500" />'
  );
  // Consistent gray borders on toolbar controls
  body = body.replace(/border-slate-200\/90/g, 'border-gray-300/90');
  body = body.replace(/border-slate-200/g, 'border-gray-300');
  body = body.replace(/hover:border-slate-300/g, 'hover:border-gray-300');
  // Fix cards tooltip group
  body = body.replace(/group-hover:block bg-slate-800/g, 'group-hover/toggle:block bg-slate-800');

  s = s.slice(0, start) + body + s.slice(end);
}

fs.writeFileSync(p, s);
console.log('patched icons/borders');
