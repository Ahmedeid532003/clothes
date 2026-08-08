const fs = require('fs');
const s = fs.readFileSync('c:/Users/DELL/OneDrive/Desktop/clothes-main/employees-v13/components/EmployeesTab.tsx', 'utf8');
const M = '{/* Advanced Controls Toolbar */}';
let from = 0;
let n = 0;
while (true) {
  const start = s.indexOf(M, from);
  if (start === -1) break;
  let end = Infinity;
  for (const e of ['{/* KPI Summaries', '{/* KPIs & Results']) {
    const p = s.indexOf(e, start + 10);
    if (p !== -1 && p < end) end = p;
  }
  if (end === Infinity) {
    const p = s.indexOf('{(() => {', start + 200);
    end = p;
  }
  const body = s.slice(start, end);
  const branchSetters = [...body.matchAll(/set[A-Za-z]*BranchDropdownOpen[A-Za-z]*/g)].map((m) => m[0]);
  const top = body.includes('Top Row');
  const building = body.includes('Building2');
  console.log(n, { top, building, branchSetters: [...new Set(branchSetters)].slice(0, 5), hasBottom: body.includes('Bottom Row') });
  from = end;
  n++;
}
