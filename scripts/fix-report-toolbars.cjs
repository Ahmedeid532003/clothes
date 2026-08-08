/**
 * Rebuild Employees "Advanced Controls Toolbar" blocks to match
 * directory/attendance single-row layout:
 * [Search][Filter] … [Date][Cards][Download][Settings]
 */
const fs = require('fs');

const filePath = 'c:/Users/DELL/OneDrive/Desktop/clothes-main/employees-v13/components/EmployeesTab.tsx';
let src = fs.readFileSync(filePath, 'utf8');

const MARKER = '{/* Advanced Controls Toolbar */}';
const ends = [
  '{/* KPI Summaries and Data Table */}',
  '{/* KPIs & Results Grid */}',
  '{/* KPI Summaries',
];

function findToolbarBlocks(text) {
  const blocks = [];
  let from = 0;
  while (true) {
    const start = text.indexOf(MARKER, from);
    if (start === -1) break;
    // outer toolbar starts at the next <div after marker
    const divStart = text.indexOf('<div', start);
    // find end marker after start
    let endMarkerPos = -1;
    let endMarker = '';
    for (const m of [
      '{/* KPI Summaries and Data Table */}',
      '{/* KPIs & Results Grid */}',
      '{(() => {',
    ]) {
      const p = text.indexOf(m, divStart + 50);
      if (p !== -1 && (endMarkerPos === -1 || p < endMarkerPos)) {
        endMarkerPos = p;
        endMarker = m;
      }
    }
    if (endMarkerPos === -1) throw new Error('No end for toolbar at ' + start);
    // walk back to close of toolbar: the blank line / closing divs before end marker
    let end = endMarkerPos;
    // include everything from MARKER through the last </div> before end marker
    // Find the toolbar's opening div and match braces by depth of div tags is hard;
    // Instead: take from MARKER to just before end marker, trim trailing whitespace,
    // verify it ends with </div>
    let chunk = text.slice(start, end);
    // trim trailing newlines/spaces but keep the closing divs
    chunk = chunk.replace(/\s+$/, '');
    blocks.push({ start, end, chunk, endMarker });
    from = end;
  }
  return blocks;
}

function extractBetween(str, startRe, endRe) {
  const sm = str.match(startRe);
  if (!sm) return null;
  const i = sm.index;
  const after = str.slice(i);
  const em = after.match(endRe);
  if (!em) return null;
  return after.slice(0, em.index + em[0].length);
}

function extractSearchMeta(block) {
  const m = block.match(
    /value=\{(\w+)\}\s*\n\s*onChange=\{e => set(\w+)\(e\.target\.value\)\}\s*\n\s*placeholder=\{([^}]+)\}/
  );
  if (!m) {
    // alternate single-line-ish
    const m2 = block.match(/value=\{(\w+)\}[\s\S]{0,80}?onChange=\{e => set(\w+)\(e\.target\.value\)\}[\s\S]{0,120}?placeholder=\{([^}]+)\}/);
    if (!m2) throw new Error('search meta not found');
    return { value: m2[1], setter: 'set' + m2[2], placeholderExpr: m2[3] };
  }
  return { value: m[1], setter: 'set' + m[2], placeholderExpr: m[1] === m[2] ? null : m[3], setterName: 'set' + m[2], placeholder: m[3] };
}

function extractFilterToggle(block) {
  const m = block.match(/onClick=\{\(\) => set(\w+)\(!(\w+)\)\}/);
  // find the Filter button specifically
  const filterBtn = block.match(
    /onClick=\{\(\) => set(Is\w+ColumnFiltersOpen\w*)\(!(is\w+ColumnFiltersOpen\w*)\)\}[\s\S]{0,400}?Filter size=\{13\}/
  );
  if (filterBtn) {
    return { setter: 'set' + filterBtn[1], state: filterBtn[2] };
  }
  // try Bonus style with different naming
  const m2 = block.match(
    /set(Is\w*ColumnFiltersOpen\w*)\(!(is\w*ColumnFiltersOpen\w*)\)[\s\S]{0,500}?<Filter/
  );
  if (m2) return { setter: 'set' + m2[1], state: m2[2] };
  throw new Error('filter toggle not found');
}

function extractExportButton(block) {
  const m = block.match(/<ExportDataButton[\s\S]*?\/>/);
  if (!m) throw new Error('ExportDataButton not found');
  return m[0]
    .replace(/className="w-full"/, 'className="w-full h-full block"')
    .replace(/<ExportDataButton/, '<ExportDataButton\n                        hideText')
    .replace(/\n\s*hideText\n\s*hideText/, '\n                        hideText');
}

function extractDateRangeDiv(block) {
  // First grid child that has type="date"
  const idx = block.indexOf('type="date"');
  if (idx === -1) return null;
  // walk back to opening <div of date filter
  let start = block.lastIndexOf('<div', idx);
  // find comment before it
  const comment = block.lastIndexOf('{/*', start);
  if (comment !== -1 && start - comment < 80) start = comment;
  // match div depth from the div at start (skip comment)
  let divStart = block.indexOf('<div', start);
  let depth = 0;
  let i = divStart;
  while (i < block.length) {
    if (block.startsWith('</div>', i)) {
      depth--;
      i += 6;
      if (depth === 0) {
        return block.slice(start, i);
      }
      continue;
    }
    if (block.startsWith('<div', i)) {
      depth++;
      i += 4;
      continue;
    }
    i++;
  }
  return null;
}

function extractBranchBlock(block) {
  if (!block.includes('Branch Dropdown') && !block.includes('Building2')) return null;
  // Find relative w-full that contains Building2 at top of right side
  const marker = block.includes('Top Row: Branch')
    ? block.indexOf('{/* Top Row: Branch')
    : block.indexOf('<Building2');
  if (marker === -1) return null;
  let start = block.lastIndexOf('<div', marker);
  const comment = block.lastIndexOf('{/*', start);
  if (comment !== -1 && start - comment < 100) start = comment;
  let divStart = block.indexOf('<div', start);
  let depth = 0;
  let i = divStart;
  while (i < block.length) {
    if (block.startsWith('</div>', i)) {
      depth--;
      i += 6;
      if (depth === 0) return block.slice(start, i);
      continue;
    }
    if (block.startsWith('<div', i)) {
      depth++;
      i += 4;
      continue;
    }
    i++;
  }
  return null;
}

function extractCardsBlock(block) {
  const markers = ['Toggle View Mode', 'Toggle View Button', 'setComViewMode', 'ViewMode', 'LayoutGrid'];
  let idx = -1;
  for (const m of ['Toggle View Mode Button', 'Toggle View Button', '{/* Toggle View']) {
    idx = block.indexOf(m);
    if (idx !== -1) break;
  }
  if (idx === -1) {
    // find LayoutGrid button wrapper
    idx = block.indexOf('<LayoutGrid');
  }
  if (idx === -1) throw new Error('cards block not found');
  let start = block.lastIndexOf('<div', idx);
  // include group wrapper
  const group = block.lastIndexOf('relative group', start);
  if (group !== -1) start = block.lastIndexOf('<div', group);
  let divStart = block.indexOf('<div', start);
  let depth = 0;
  let i = divStart;
  while (i < block.length) {
    if (block.startsWith('</div>', i)) {
      depth--;
      i += 6;
      if (depth === 0) return block.slice(start, i);
      continue;
    }
    if (block.startsWith('<div', i)) {
      depth++;
      i += 4;
      continue;
    }
    i++;
  }
  throw new Error('cards depth fail');
}

function extractSettingsBlock(block) {
  // Find Customize Columns Button section
  let idx = block.indexOf('Customize Columns');
  if (idx === -1) idx = block.indexOf('تخصيص الأعمدة');
  if (idx === -1) {
    // settings button with setTemp*VisibleColumns
    idx = block.search(/setTemp\w*VisibleColumns/);
  }
  if (idx === -1) throw new Error('settings not found');
  let start = block.lastIndexOf('<div', idx);
  // prefer the relative flex-1 wrapper
  const rel = block.lastIndexOf('relative flex-1', start + 20);
  if (rel !== -1 && rel < idx) start = block.lastIndexOf('<div', rel);
  let divStart = block.indexOf('<div', start);
  let depth = 0;
  let i = divStart;
  while (i < block.length) {
    if (block.startsWith('</div>', i)) {
      depth--;
      i += 6;
      if (depth === 0) return block.slice(start, i);
      continue;
    }
    if (block.startsWith('<div', i)) {
      depth++;
      i += 4;
      continue;
    }
    i++;
  }
  throw new Error('settings depth fail');
}

function compactDateRange(dateHtml) {
  if (!dateHtml) return '';
  // Restyle to compact single-row control height 36px, shrink-0
  return dateHtml
    .replace(/h-\[38px\]/g, 'h-[36px]')
    .replace(/w-full font-bold/, 'w-auto max-w-[220px] font-bold shrink-0')
    .replace(/className="flex items-center gap-1 bg-white border/, 'className="flex items-center gap-1 bg-white border');
}

function restyleCards(cardsHtml) {
  return cardsHtml
    .replace(/className="relative group flex-1 md:flex-none md:w-\[76px\]"/g, 'className="relative group/toggle shrink-0"')
    .replace(/className="relative group flex-1"/g, 'className="relative group/toggle shrink-0"')
    .replace(
      /className="w-full flex items-center justify-center gap-2 p-2 bg-white border border-gray-300 rounded-lg hover:border-orange-400 hover:text-orange-500 text-slate-655 transition cursor-pointer select-none h-\[38px\] active:scale-\[0\.98\] shadow-xs"/g,
      'style={{ height: \'36px\' }}\n                            className="flex items-center justify-center gap-1.5 p-2 px-3 bg-white border border-gray-300 rounded-lg hover:border-orange-400 hover:text-orange-500 text-slate-650 hover:shadow-xs transition cursor-pointer select-none min-h-[36px] text-[11px] font-black"'
    )
    .replace(/ClipboardList/g, 'List');
}

function restyleSettings(settingsHtml) {
  return settingsHtml
    .replace(/className="relative flex-1"/g, 'className="relative group/settings shrink-0"')
    .replace(
      /className="w-full flex items-center justify-center gap-2 p-2 bg-white border border-gray-300 rounded-lg hover:border-orange-400 hover:text-orange-500 text-slate-655 transition cursor-pointer select-none h-\[38px\] active:scale-\[0\.98\] shadow-xs"/g,
      'style={{ height: \'36px\' }}\n                            className="p-2 text-black hover:text-orange-500 bg-white border border-gray-300 hover:border-orange-400 rounded-lg hover:shadow-xs transition cursor-pointer flex items-center justify-center font-black text-[11px] min-h-[36px] w-[36px]"'
    )
    // remove text label next to settings icon, keep icon only
    .replace(
      /<Settings size=\{14\} className="text-orange-500" \/>\s*<span className="text-\[11px\] font-bold font-sans">\s*\{lang === 'ar' \? '[^']+' : '[^']+'\}\s*<\/span>/g,
      '<Settings size={14} className="text-orange-500 animate-spin-hover" />'
    );
}

function restyleBranch(branchHtml) {
  if (!branchHtml) return '';
  return branchHtml
    .replace(/className="relative w-full"/g, 'className="relative shrink-0"')
    .replace(/className="w-full flex items-center justify-between gap-2 px-4 py-2/g, 'className="flex items-center justify-between gap-2 px-3 py-2')
    .replace(/h-\[38px\]/g, 'h-[36px] min-h-[36px]')
    .replace(/w-full md:w-\[220px\]/g, '')
    .replace(/absolute right-0 left-0 mt-2 w-full/g, 'absolute right-0 left-auto mt-2 w-56');
}

function buildToolbar(indent, parts) {
  const {
    searchValue,
    searchSetter,
    searchOnChange,
    clearOnClick,
    placeholder,
    filterState,
    filterSetter,
    dateHtml,
    branchHtml,
    cardsHtml,
    settingsHtml,
    exportHtml,
  } = parts;

  const exportWrapped = `                    <div className="relative shrink-0" style={{ height: '36px', width: '36px' }} title={lang === 'ar' ? 'تحميل / تصدير' : 'Download / Export'}>
${exportHtml.replace(/^/gm, '  ').replace(/hideText/, 'hideText').replace(/buttonClassName="[^"]*"/, '').replace(/<ExportDataButton/, '<ExportDataButton\n                          buttonClassName="!w-[36px] !h-[36px] !min-h-[36px]"')}
                    </div>`;

  // Fix export - rebuild cleanly
  let exportInner = exportHtml;
  if (!exportInner.includes('hideText')) {
    exportInner = exportInner.replace('<ExportDataButton', '<ExportDataButton\n                        hideText');
  }
  if (!exportInner.includes('buttonClassName')) {
    exportInner = exportInner.replace(
      'className="w-full h-full block"',
      'className="w-full h-full block"\n                        buttonClassName="!w-[36px] !h-[36px] !min-h-[36px]"'
    );
  } else {
    exportInner = exportInner.replace(/buttonClassName="[^"]*"/, 'buttonClassName="!w-[36px] !h-[36px] !min-h-[36px]"');
  }
  if (!exportInner.includes('className="w-full h-full block"')) {
    exportInner = exportInner.replace(/className="w-full"/, 'className="w-full h-full block"');
  }

  return `${indent}{/* Advanced Controls Toolbar */}
${indent}<div className="bg-white border-4 border-white rounded-2xl overflow-visible shadow-md relative">
${indent}  <div className="p-3.5 border-b border-gray-300 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center rtl:flex-row-reverse gap-3.5 min-h-[48px] h-auto">
${indent}    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5 w-full sm:w-auto flex-1 max-w-md" style={{ direction: 'ltr' }}>
${indent}      <div className="relative flex-1 flex items-center min-w-0">
${indent}        <Search size={14} className="absolute left-3 rtl:right-3 rtl:left-auto text-slate-400 pointer-events-none" />
${indent}        <input
${indent}          type="text"
${indent}          value={${searchValue}}
${indent}          onChange={${searchOnChange}}
${indent}          placeholder={${placeholder}}
${indent}          style={{ height: '36px' }}
${indent}          className="w-full text-xs p-2 pl-8 pr-8 rtl:pr-8 rtl:pl-8 bg-white border border-gray-300 rounded-xl outline-none focus:border-orange-400 transition h-[36px]"
${indent}        />
${indent}        {${searchValue} && (
${indent}          <button
${indent}            onClick={${clearOnClick}}
${indent}            className="absolute right-3 rtl:left-3 rtl:right-auto top-1/2 -translate-y-1/2 p-0.5 text-slate-450 hover:text-orange-500 rounded-lg hover:bg-slate-100 transition cursor-pointer"
${indent}            title={lang === 'ar' ? 'مسح البحث' : 'Clear search'}
${indent}          >
${indent}            <X size={13} />
${indent}          </button>
${indent}        )}
${indent}      </div>
${indent}      <div className="relative group/filter shrink-0">
${indent}        <button
${indent}          onClick={() => ${filterSetter}(!${filterState})}
${indent}          style={{ height: '36px' }}
${indent}          className={cn(
${indent}            "p-2 px-3 text-xs font-black rounded-lg border transition flex items-center gap-1.5 cursor-pointer select-none whitespace-nowrap min-h-[36px]",
${indent}            ${filterState}
${indent}              ? "bg-[#0a1945] text-white border-[#0a1945]"
${indent}              : "bg-white text-black border-gray-300 hover:border-orange-400 hover:text-orange-500"
${indent}          )}
${indent}        >
${indent}          <Filter size={13} className="text-orange-500" />
${indent}        </button>
${indent}        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover/filter:block bg-slate-800 text-white text-[10px] py-1 px-2 rounded shadow-lg whitespace-nowrap z-50 font-bold font-sans pointer-events-none">
${indent}          {lang === 'ar' ? 'بحث متقدم' : 'Advanced Search'}
${indent}        </div>
${indent}      </div>
${indent}    </div>

${indent}    <div className="flex items-center gap-2 w-full justify-between sm:w-auto sm:justify-start flex-wrap" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
${indent}      ${settingsHtml.split('\n').join('\n' + indent + '      ')}
${indent}      <div className="relative shrink-0" style={{ height: '36px', width: '36px' }} title={lang === 'ar' ? 'تحميل / تصدير' : 'Download / Export'}>
${indent}        ${exportInner.split('\n').join('\n' + indent + '        ')}
${indent}      </div>
${indent}      ${cardsHtml.split('\n').join('\n' + indent + '      ')}
${indent}      ${dateHtml ? dateHtml.split('\n').join('\n' + indent + '      ') : ''}
${indent}      ${branchHtml ? branchHtml.split('\n').join('\n' + indent + '      ') : ''}
${indent}    </div>
${indent}  </div>
${indent}</div>
`;
}

const blocks = findToolbarBlocks(src);
console.log('Found toolbars:', blocks.length);

if (blocks.length !== 6) {
  console.error('Expected 6 toolbars, got', blocks.length);
  process.exit(1);
}

// Process from end to start so indices stay valid
for (let bi = blocks.length - 1; bi >= 0; bi--) {
  const { start, end, chunk } = blocks[bi];
  console.log(`\n=== Toolbar ${bi} ===`);
  try {
    const indentMatch = chunk.match(/^(\s*)/);
    // get indent from the marker line
    const markerLine = chunk.split(/\r?\n/)[0];
    const indent = markerLine.match(/^(\s*)/)[1];

    // Search — find text input (not date) after Export or Main Search comment
    const textInputIdx = (() => {
      const markers = ['Main Search', 'Search input matched', 'البحث بالاسم', 'Search by name'];
      for (const m of markers) {
        const i = chunk.indexOf(m);
        if (i !== -1) return i;
      }
      // fallback: first type="text" after ExportDataButton
      const exp = chunk.indexOf('<ExportDataButton');
      return chunk.indexOf('type="text"', exp === -1 ? 0 : exp);
    })();
    if (textInputIdx === -1) throw new Error('search idx');
    const searchSlice = chunk.slice(textInputIdx, textInputIdx + 800);
    const valueM = searchSlice.match(/value=\{(\w+)\}/);
    const onChangeM = searchSlice.match(/onChange=\{e => ([^}]+(?:\{[^}]*\}[^}]*)*)\}/);
    // Simpler: capture setter name
    const setterM = searchSlice.match(/onChange=\{e => (?:\{ )?(\w+)\(e\.target\.value\)/);
    const placeM = searchSlice.match(/placeholder=\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/);
    if (!valueM || !setterM || !placeM) {
      console.log('  searchSlice head', JSON.stringify(searchSlice.slice(0, 350)));
      throw new Error('search');
    }
    const searchValue = valueM[1];
    const searchSetter = setterM[1];
    const placeholder = placeM[1];
    // Preserve full onChange if it also resets page
    const onChangeStart = searchSlice.indexOf('onChange={');
    let searchOnChange = `e => ${searchSetter}(e.target.value)`;
    if (onChangeStart !== -1) {
      let i = onChangeStart + 'onChange={'.length;
      let depth = 1;
      let j = i;
      while (j < searchSlice.length && depth > 0) {
        if (searchSlice[j] === '{') depth++;
        else if (searchSlice[j] === '}') depth--;
        j++;
      }
      searchOnChange = searchSlice.slice(i, j - 1).trim();
    }
    let clearOnClick = `() => ${searchSetter}('')`;
    const clearIdx = searchSlice.indexOf(`{${searchValue} &&`);
    if (clearIdx !== -1) {
      const clearSlice = searchSlice.slice(clearIdx);
      const cStart = clearSlice.indexOf('onClick={');
      if (cStart !== -1) {
        let i = cStart + 'onClick={'.length;
        let depth = 1;
        let j = i;
        while (j < clearSlice.length && depth > 0) {
          if (clearSlice[j] === '{') depth++;
          else if (clearSlice[j] === '}') depth--;
          j++;
        }
        clearOnClick = clearSlice.slice(i, j - 1).trim();
      }
    }
    console.log('  search', searchValue, searchSetter);

    // Filter - look near Filter icon with ColumnFiltersOpen
    const filterMatch = chunk.match(
      /onClick=\{\(\) => (set\w*ColumnFiltersOpen\w*)\(!(\w*ColumnFiltersOpen\w*)\)\}/
    );
    if (!filterMatch) throw new Error('filter');
    const filterSetter = filterMatch[1];
    const filterState = filterMatch[2];
    console.log('  filter', filterState);

    const dateHtml = compactDateRange(extractDateRangeDiv(chunk));
    console.log('  date', !!dateHtml, dateHtml ? dateHtml.length : 0);

    const branchHtml = restyleBranch(extractBranchBlock(chunk));
    console.log('  branch', !!branchHtml);

    const cardsHtml = restyleCards(extractCardsBlock(chunk));
    console.log('  cards', cardsHtml.length);

    const settingsHtml = restyleSettings(extractSettingsBlock(chunk));
    console.log('  settings', settingsHtml.length);

    let exportHtml = chunk.match(/<ExportDataButton[\s\S]*?\/>/)[0];
    console.log('  export ok');

    const rebuilt = buildToolbar(indent, {
      searchValue,
      searchSetter,
      searchOnChange,
      clearOnClick,
      placeholder,
      filterState,
      filterSetter,
      dateHtml: dateHtml || '',
      branchHtml: branchHtml || '',
      cardsHtml,
      settingsHtml,
      exportHtml,
    });

    src = src.slice(0, start) + rebuilt + '\n' + src.slice(end);
    console.log('  rebuilt ok');
  } catch (e) {
    console.error('  FAIL', e.message);
    process.exit(1);
  }
}

fs.writeFileSync(filePath, src);
console.log('\nDone. Wrote', filePath);
