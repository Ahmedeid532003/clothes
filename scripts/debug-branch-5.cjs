const fs = require('fs');
const s = fs.readFileSync('c:/Users/DELL/OneDrive/Desktop/clothes-main/employees-v13/components/EmployeesTab.tsx', 'utf8');
const M = '{/* Advanced Controls Toolbar */}';
// get toolbar 5
let start = -1;
for (let i = 0; i < 6; i++) start = s.indexOf(M, start + 1);
const end = s.indexOf('{(() => {', start + 200);
const body = s.slice(start, end);
const commentIdx = body.indexOf('{/* Top Row');
const bottomIdx = body.indexOf('{/* Bottom Row');
console.log({ commentIdx, bottomIdx, len: body.length });
console.log(body.slice(commentIdx, commentIdx + 400));
console.log('--- around setter ---');
const si = body.indexOf('setDisbursalsBranchDropdownOpenReport');
console.log(body.slice(si - 150, si + 80));
const rel = body.lastIndexOf('relative w-full', si);
console.log('rel', rel, body.slice(rel, rel + 60));
