/**
 * Restore the 6 Advanced Controls Toolbar blocks in employees-v13
 * from mozafen (pre-corruption), keeping the rest of employees-v13 intact.
 */
const fs = require('fs');

const brokenPath = 'c:/Users/DELL/OneDrive/Desktop/clothes-main/employees-v13/components/EmployeesTab.tsx';
const goodPath = 'c:/Users/DELL/OneDrive/Desktop/clothes-main/components/additions/mozafen/EmployeesTab.tsx';

const MARKER = '{/* Advanced Controls Toolbar */}';
const END_MARKERS = [
  '{/* KPI Summaries and Data Table */}',
  '{/* KPIs & Results Grid */}',
];

function extractToolbars(text) {
  const blocks = [];
  let from = 0;
  while (true) {
    const start = text.indexOf(MARKER, from);
    if (start === -1) break;
    let endPos = Infinity;
    let endMarker = null;
    for (const m of END_MARKERS) {
      const p = text.indexOf(m, start + MARKER.length);
      if (p !== -1 && p < endPos) {
        endPos = p;
        endMarker = m;
      }
    }
    // Also allow {(() => { as end for some reports
    const iife = text.indexOf('{(() => {', start + 200);
    // Prefer END_MARKERS; only use iife if no END_MARKER found within 400 lines worth
    if (endPos === Infinity) {
      if (iife === -1) throw new Error('no end for toolbar');
      endPos = iife;
      endMarker = '{(() => {';
    }
    blocks.push({ start, end: endPos, body: text.slice(start, endPos), endMarker });
    from = endPos;
  }
  return blocks;
}

const broken = fs.readFileSync(brokenPath, 'utf8');
const good = fs.readFileSync(goodPath, 'utf8');

const brokenBlocks = extractToolbars(broken);
const goodBlocks = extractToolbars(good);

console.log('broken', brokenBlocks.length, 'good', goodBlocks.length);
if (brokenBlocks.length !== 6 || goodBlocks.length !== 6) {
  console.error('count mismatch');
  process.exit(1);
}

// Also try extracting from employees-v13 using good's body lengths as reference —
// Prefer mozafen for report toolbars only.

// Replace from end to start
let out = broken;
for (let i = 5; i >= 0; i--) {
  const b = brokenBlocks[i];
  const g = goodBlocks[i];
  console.log(i, 'broken len', b.body.length, 'good len', g.body.length, 'end', b.endMarker);
  out = out.slice(0, b.start) + g.body + out.slice(b.end);
}

fs.writeFileSync(brokenPath, out);
console.log('Restored 6 toolbars from mozafen');

// verify
const verify = extractToolbars(fs.readFileSync(brokenPath, 'utf8'));
console.log('verify count', verify.length);
verify.forEach((v, i) => {
  const ok = v.body.includes('flex flex-col md:flex-row items-stretch md:items-end');
  console.log(i, 'old-style', ok, 'len', v.body.length);
});
