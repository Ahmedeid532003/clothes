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

const M = '{/* Advanced Controls Toolbar */}';
let from = 0, n = 0;
while (true) {
  const start = s.indexOf(M, from);
  if (start < 0) break;
  let end = Infinity;
  for (const e of ['{/* KPI Summaries', '{/* KPIs & Results', '\n                  {(() => {', '\n              {(() => {']) {
    const p = s.indexOf(e, start + 50);
    if (p > 0 && p < end) end = p;
  }
  const body = s.slice(start, end);
  console.log(n, bal(body), 'tail:', JSON.stringify(body.slice(-120)));
  from = end;
  n++;
}

// Also check attendance case block from case 'attendance' to next case
const att = s.indexOf("case 'attendance'");
const next = s.indexOf("case 'bonus_deduct'", att);
console.log('\nattendance case bal', bal(s.slice(att, next)));
