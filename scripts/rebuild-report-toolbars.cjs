/**
 * Rebuild report toolbars to match directory/attendance layout.
 * Uses explicit configs + extracts branch/settings popovers by unique setters.
 */
const fs = require('fs');

const filePath = 'c:/Users/DELL/OneDrive/Desktop/clothes-main/employees-v13/components/EmployeesTab.tsx';
let src = fs.readFileSync(filePath, 'utf8');

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
    for (const m of END_MARKERS) {
      const p = text.indexOf(m, start + MARKER.length);
      if (p !== -1 && p < endPos) endPos = p;
    }
    if (endPos === Infinity) {
      const iife = text.indexOf('\n                  {(() => {', start + 200);
      const iife2 = text.indexOf('\n              {(() => {', start + 200);
      endPos = [iife, iife2].filter((x) => x !== -1).sort((a, b) => a - b)[0];
      if (endPos == null) throw new Error('no end');
    }
    blocks.push({ start, end: endPos, body: text.slice(start, endPos) });
    from = endPos;
  }
  return blocks;
}

/** Match a top-level <div>...</div> starting at first <div after `from` index, scanning forward */
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
      depth++;
      i += 4;
      continue;
    }
    i++;
  }
  return null;
}

function extractBranchBySetter(body, openSetter) {
  // Prefer comment-delimited branch block
  const commentMarkers = [
    '{/* Top Row: Branch Dropdown',
    '{/* Top Row: Branch',
    '{/* Branch Dropdown',
  ];
  let commentIdx = -1;
  for (const m of commentMarkers) {
    const i = body.indexOf(m);
    if (i !== -1) {
      commentIdx = i;
      break;
    }
  }
  const bottomMarkers = [
    '{/* Bottom Row:',
    '{/* Toggle View',
    'Toggle View Mode Button',
    'Toggle View Button',
  ];
  if (commentIdx !== -1) {
    let endIdx = -1;
    for (const m of bottomMarkers) {
      const i = body.indexOf(m, commentIdx + 10);
      if (i !== -1 && (endIdx === -1 || i < endIdx)) endIdx = i;
    }
    if (endIdx !== -1) {
      // take from first <div after comment to just before bottom (trim trailing)
      const divStart = body.indexOf('<div', commentIdx);
      let chunk = body.slice(divStart, endIdx).replace(/\s+$/, '');
      // ensure balanced — if ends mid-tag, matchDivFrom
      const matched = matchDivFrom(body, divStart);
      if (matched && matched.end <= endIdx + 20) return matched.html;
      // fallback: match div and stop at bottom
      if (matched) {
        // too big — try inner relative w-full only
        const inner = body.indexOf('className="relative w-full"', divStart + 5);
        if (inner !== -1 && inner < endIdx) {
          const innerDiv = body.lastIndexOf('<div', inner);
          const m2 = matchDivFrom(body, innerDiv);
          if (m2 && m2.html.length < 8000) return m2.html;
        }
      }
      return chunk;
    }
  }

  const idx = body.indexOf(openSetter);
  if (idx === -1) return null;
  // Prefer the innermost relative w-full containing the setter
  const rel = body.lastIndexOf('className="relative w-full"', idx);
  if (rel === -1) return null;
  const divStart = body.lastIndexOf('<div', rel);
  const matched = matchDivFrom(body, divStart);
  if (!matched) return null;
  if (matched.html.length > 8000) {
    // nested: try next relative w-full after this one
    const next = body.indexOf('className="relative w-full"', rel + 10);
    if (next !== -1 && next < idx) {
      const m2 = matchDivFrom(body, body.lastIndexOf('<div', next));
      if (m2 && m2.html.length < 8000) return m2.html;
    }
  }
  return matched.html.length < 8000 ? matched.html : null;
}

function extractSettingsBySetter(body, settingsOpenVar) {
  // Find the button that toggles column settings, then its parent relative wrapper
  const needle = settingsOpenVar;
  // Prefer "Customize Columns" section
  let idx = body.indexOf('Customize Columns');
  if (idx === -1) {
    // find setXColumnSettingsOpen(! 
    const re = new RegExp(settingsOpenVar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const m = body.match(re);
    if (!m) return null;
    idx = m.index;
  }
  // Find the wrapping relative div that contains Settings icon AND the open state
  // Search backwards for `<div className="relative` before Settings button near idx
  const settingsIcon = body.lastIndexOf('<Settings', idx === body.indexOf('Customize Columns') ? body.length : idx + 500);
  // Better approach: find all `relative flex-1` or `relative` wrappers containing settingsOpenVar
  const candidates = [];
  let searchFrom = 0;
  while (true) {
    const rel = body.indexOf('className="relative', searchFrom);
    if (rel === -1) break;
    const divStart = body.lastIndexOf('<div', rel);
    const matched = matchDivFrom(body, divStart);
    if (matched && matched.html.includes(settingsOpenVar) && matched.html.includes('<Settings')) {
      candidates.push(matched);
    }
    searchFrom = rel + 10;
  }
  if (!candidates.length) return null;
  // Prefer shortest that still has the popover content (checkboxes)
  candidates.sort((a, b) => a.html.length - b.html.length);
  const withPopover = candidates.filter((c) => c.html.includes('checkbox') || c.html.includes('اختر الأعمدة') || c.html.includes('Choose Columns'));
  return (withPopover[0] || candidates[candidates.length - 1]).html;
}

function extractCardsByViewMode(body, viewModeVar) {
  let searchFrom = 0;
  const candidates = [];
  while (true) {
    const lg = body.indexOf('<LayoutGrid', searchFrom);
    if (lg === -1) break;
    let start = body.lastIndexOf('<div', lg);
    // Prefer outer relative group wrapper
    const groupIdx = body.lastIndexOf('relative group', lg);
    if (groupIdx !== -1 && lg - groupIdx < 200) {
      start = body.lastIndexOf('<div', groupIdx);
    }
    const matched = matchDivFrom(body, start);
    if (matched && matched.html.includes(viewModeVar) && matched.html.includes('LayoutGrid') && matched.html.length < 2500) {
      candidates.push(matched);
    }
    searchFrom = lg + 10;
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => a.html.length - b.html.length);
  return candidates[0].html;
}

function restyleCards(html, viewModeVar) {
  if (!html) return '';
  let h = html
    .replace(/className="relative group[^"]*"/g, 'className="relative group/toggle shrink-0"')
    .replace(/className="relative group"/g, 'className="relative group/toggle shrink-0"')
    .replace(/ClipboardList/g, 'List')
    .replace(/w-full flex items-center justify-center gap-2 p-2/g, 'flex items-center justify-center gap-1.5 p-2 px-3')
    .replace(/h-\[38px\] active:scale-\[0\.98\] shadow-xs/g, 'min-h-[36px] text-[11px] font-black')
    .replace(/text-slate-655/g, 'text-slate-650');
  if (!h.includes("style={{ height: '36px' }}")) {
    h = h.replace(/<button(\s+)/, "<button\n                            style={{ height: '36px' }}$1");
  }
  return h;
}

function restyleSettings(html) {
  if (!html) return '';
  let h = html
    .replace(/className="relative flex-1"/g, 'className="relative group/settings shrink-0"')
    .replace(/className="relative"/g, 'className="relative group/settings shrink-0"')
    .replace(/w-full flex items-center justify-center gap-2 p-2/g, 'flex items-center justify-center p-2')
    .replace(/h-\[38px\] active:scale-\[0\.98\] shadow-xs/g, 'min-h-[36px] w-[36px]')
    .replace(/text-slate-655/g, 'text-slate-650');
  // icon-only: strip label span after Settings
  h = h.replace(
    /(<Settings size=\{14\} className="text-orange-500)(" \/>)\s*<span className="text-\[11px\][^>]*>[\s\S]*?<\/span>/,
    '$1 animate-spin-hover$2'
  );
  if (!h.includes("style={{ height: '36px' }}")) {
    h = h.replace(/<button(\s+)/, "<button\n                            style={{ height: '36px' }}$1");
  }
  return h;
}

function restyleBranch(html) {
  if (!html) return '';
  return html
    .replace(/className="relative w-full"/, 'className="relative shrink-0"')
    .replace(/w-full flex items-center justify-between gap-2 px-4 py-2/g, 'flex items-center justify-between gap-2 px-3 py-2 max-w-[160px]')
    .replace(/h-\[38px\]/g, 'h-[36px] min-h-[36px]')
    .replace(/absolute right-0 left-0 mt-2 w-full/g, 'absolute end-0 mt-2 w-56');
}

function buildDateRange(cfg, indent) {
  const clearExtra = cfg.clearDatesExtra || '';
  const onStart = cfg.onStartChange || `e => ${cfg.setDateStart}(e.target.value)`;
  const onEnd = cfg.onEndChange || `e => ${cfg.setDateEnd}(e.target.value)`;
  return `${indent}<div className="flex items-center gap-1 bg-white border border-gray-300 rounded-xl px-2.5 shadow-xs select-none h-[36px] w-auto max-w-[220px] font-bold leading-6 text-base shrink-0">
${indent}  <Calendar size={13} className="text-orange-500 shrink-0" />
${indent}  <div className="flex items-center gap-0.5 min-w-0 flex-1">
${indent}    <span className="text-[9px] font-extrabold text-slate-400 uppercase shrink-0">{lang === 'ar' ? 'من' : 'From'}</span>
${indent}    <input type="date" value={${cfg.dateStart}} onChange={${onStart}} className="text-[10px] font-sans font-bold text-slate-700 bg-transparent outline-none border-none w-full cursor-pointer focus:text-orange-600 p-0" />
${indent}  </div>
${indent}  <div className="w-[1px] h-3.5 bg-slate-200 shrink-0 mx-1" />
${indent}  <div className="flex items-center gap-0.5 min-w-0 flex-1">
${indent}    <span className="text-[9px] font-extrabold text-slate-400 uppercase shrink-0">{lang === 'ar' ? 'إلى' : 'To'}</span>
${indent}    <input type="date" value={${cfg.dateEnd}} onChange={${onEnd}} className="text-[10px] font-sans font-bold text-slate-700 bg-transparent outline-none border-none w-full cursor-pointer focus:text-orange-600 p-0" />
${indent}  </div>
${indent}  {(${cfg.dateStart} || ${cfg.dateEnd}) && (
${indent}    <button onClick={() => { ${cfg.setDateStart}(''); ${cfg.setDateEnd}(''); ${clearExtra} }} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-500 transition cursor-pointer shrink-0" title={lang === 'ar' ? 'مسح التاريخ' : 'Clear dates'}>
${indent}      <X size={11} />
${indent}    </button>
${indent}  )}
${indent}</div>`;
}

function buildToolbar(indent, cfg, pieces) {
  const {
    branchHtml,
    cardsHtml,
    settingsHtml,
  } = pieces;

  return `${indent}{/* Advanced Controls Toolbar */}
${indent}<div className="bg-white border-4 border-white rounded-2xl overflow-visible shadow-md relative mb-4">
${indent}  <div className="p-3.5 border-b-0 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center rtl:flex-row-reverse gap-3.5 min-h-[48px] h-auto">
${indent}    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5 w-full sm:w-auto flex-1 max-w-md" style={{ direction: 'ltr' }}>
${indent}      <div className="relative flex-1 flex items-center min-w-0">
${indent}        <Search size={14} className="absolute left-3 rtl:right-3 rtl:left-auto text-slate-400 pointer-events-none" />
${indent}        <input
${indent}          type="text"
${indent}          value={${cfg.searchValue}}
${indent}          onChange={${cfg.searchOnChange}}
${indent}          placeholder={${cfg.placeholder}}
${indent}          style={{ height: '36px' }}
${indent}          className="w-full text-xs p-2 pl-8 pr-8 rtl:pr-8 rtl:pl-8 bg-white border border-gray-300 rounded-xl outline-none focus:border-orange-400 transition h-[36px]"
${indent}        />
${indent}        {${cfg.searchValue} && (
${indent}          <button
${indent}            onClick={${cfg.clearOnClick}}
${indent}            className="absolute right-3 rtl:left-3 rtl:right-auto top-1/2 -translate-y-1/2 p-0.5 text-slate-450 hover:text-orange-500 rounded-lg hover:bg-slate-100 transition cursor-pointer"
${indent}            title={lang === 'ar' ? 'مسح البحث' : 'Clear search'}
${indent}          >
${indent}            <X size={13} />
${indent}          </button>
${indent}        )}
${indent}      </div>
${indent}      <div className="relative group/filter shrink-0">
${indent}        <button
${indent}          onClick={() => ${cfg.filterSetter}(!${cfg.filterState})}
${indent}          style={{ height: '36px' }}
${indent}          className={cn(
${indent}            "p-2 px-3 text-xs font-black rounded-lg border transition flex items-center gap-1.5 cursor-pointer select-none whitespace-nowrap min-h-[36px]",
${indent}            ${cfg.filterState}
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
${indent}        <ExportDataButton
${indent}          lang={lang}
${indent}          hideText
${indent}          onToast={triggerHrToast}
${indent}          onCopy={() => triggerHrToast(${cfg.exportCopy})}
${indent}          onPrint={() => triggerHrToast(${cfg.exportPrint})}
${indent}          className="w-full h-full block"
${indent}          buttonClassName="!w-[36px] !h-[36px] !min-h-[36px]"
${indent}        />
${indent}      </div>
${indent}      ${cardsHtml.split('\n').join('\n' + indent + '      ')}
${buildDateRange(cfg, indent + '      ')}
${branchHtml ? indent + '      ' + branchHtml.split('\n').join('\n' + indent + '      ') : ''}
${indent}    </div>
${indent}  </div>
${indent}</div>
`;
}

const configs = [
  {
    searchValue: 'commissionSearch',
    searchOnChange: 'e => setCommissionSearch(e.target.value)',
    clearOnClick: "() => setCommissionSearch('')",
    placeholder: "lang === 'ar' ? 'البحث بالاسم أو كود الموظف...' : 'Search by name or code...'",
    filterState: 'isComColumnFiltersOpen',
    filterSetter: 'setIsComColumnFiltersOpen',
    viewMode: 'comViewMode',
    dateStart: 'comStartDate',
    setDateStart: 'setComStartDate',
    dateEnd: 'comEndDate',
    setDateEnd: 'setComEndDate',
    branchOpenSetter: 'setComBranchDropdownOpen',
    settingsOpenVar: 'comColumnSettingsOpen',
    exportCopy: "lang === 'ar' ? 'تم نسخ بيانات العمولات إلى الحافظة' : 'Commissions report copied to clipboard!'",
    exportPrint: "lang === 'ar' ? 'تم فتح خيارات الطباعة لجدول العمولات' : 'Print dialog opened for commissions!'",
  },
  {
    // report commission - same vars as commissions mostly
    searchValue: 'commissionSearch',
    searchOnChange: 'e => setCommissionSearch(e.target.value)',
    clearOnClick: "() => setCommissionSearch('')",
    placeholder: "lang === 'ar' ? 'البحث بالاسم أو كود الموظف...' : 'Search by name or code...'",
    filterState: 'isComColumnFiltersOpen',
    filterSetter: 'setIsComColumnFiltersOpen',
    viewMode: 'comViewMode',
    dateStart: 'comStartDate',
    setDateStart: 'setComStartDate',
    dateEnd: 'comEndDate',
    setDateEnd: 'setComEndDate',
    branchOpenSetter: 'setComBranchDropdownOpen',
    settingsOpenVar: 'comColumnSettingsOpen',
    exportCopy: "lang === 'ar' ? 'تم نسخ بيانات العمولات إلى الحافظة' : 'Commissions report copied to clipboard!'",
    exportPrint: "lang === 'ar' ? 'تم فتح خيارات الطباعة لجدول العمولات' : 'Print dialog opened for commissions!'",
  },
  {
    searchValue: 'profileSearch',
    searchOnChange: 'e => setProfileSearch(e.target.value)',
    clearOnClick: "() => setProfileSearch('')",
    placeholder: "lang === 'ar' ? 'البحث بالاسم أو كود الموظف...' : 'Search by name or code...'",
    filterState: 'isProfileColumnFiltersOpen',
    filterSetter: 'setIsProfileColumnFiltersOpen',
    viewMode: 'profileViewMode',
    dateStart: 'profileStartDate',
    setDateStart: 'setProfileStartDate',
    dateEnd: 'profileEndDate',
    setDateEnd: 'setProfileEndDate',
    branchOpenSetter: 'setProfileBranchDropdownOpen',
    settingsOpenVar: 'profileColumnSettingsOpen',
    exportCopy: "lang === 'ar' ? 'تم نسخ التقرير لحافظتك' : 'Report copied to clipboard!'",
    exportPrint: "lang === 'ar' ? 'فتح شاشة الطباعة لتقرير الموظفين' : 'Opening profiles print setup!'",
  },
  {
    searchValue: 'attendanceSearchReport',
    searchOnChange: 'e => setAttendanceSearchReport(e.target.value)',
    clearOnClick: "() => setAttendanceSearchReport('')",
    placeholder: "lang === 'ar' ? 'البحث بالاسم أو كود الموظف...' : 'Search by name or code...'",
    filterState: 'isAttendanceColumnFiltersOpenReport',
    filterSetter: 'setIsAttendanceColumnFiltersOpenReport',
    viewMode: 'attendanceViewModeReport',
    dateStart: 'attendanceStartDateReport',
    setDateStart: 'setAttendanceStartDateReport',
    dateEnd: 'attendanceEndDateReport',
    setDateEnd: 'setAttendanceEndDateReport',
    branchOpenSetter: 'setAttendanceBranchDropdownOpenReport',
    settingsOpenVar: 'attendanceColumnSettingsOpenReport',
    exportCopy: "lang === 'ar' ? 'تم نسخ التقرير لحافظتك' : 'Report copied to clipboard!'",
    exportPrint: "lang === 'ar' ? 'فتح شاشة الطباعة لتقرير الحضور' : 'Opening attendance print setup!'",
  },
  {
    searchValue: 'bonusDeductSearchReport',
    searchOnChange: 'e => setBonusDeductSearchReport(e.target.value)',
    clearOnClick: "() => setBonusDeductSearchReport('')",
    placeholder: "lang === 'ar' ? 'البحث بالاسم أو كود الموظف...' : 'Search by name or code...'",
    filterState: 'isBonusDeductColumnFiltersOpenReport',
    filterSetter: 'setIsBonusDeductColumnFiltersOpenReport',
    viewMode: 'bonusDeductViewModeReport',
    dateStart: 'bonusDeductStartDateReport',
    setDateStart: 'setBonusDeductStartDateReport',
    dateEnd: 'bonusDeductEndDateReport',
    setDateEnd: 'setBonusDeductEndDateReport',
    branchOpenSetter: 'setBonusDeductBranchDropdownOpenReport',
    settingsOpenVar: 'bonusDeductColumnSettingsOpenReport',
    exportCopy: "lang === 'ar' ? 'تم نسخ التقرير لحافظتك' : 'Report copied to clipboard!'",
    exportPrint: "lang === 'ar' ? 'فتح شاشة الطباعة لتقرير المكافآت' : 'Opening bonus/deduction print setup!'",
  },
  {
    searchValue: 'disbursalsSearchReport',
    searchOnChange: "e => { setDisbursalsSearchReport(e.target.value); setDisbursalsCurrentPageReport(1); }",
    clearOnClick: "() => { setDisbursalsSearchReport(''); setDisbursalsCurrentPageReport(1); }",
    placeholder: "lang === 'ar' ? 'البحث بالاسم أو كود الموظف...' : 'Search by name or code...'",
    filterState: 'isDisbursalsColumnFiltersOpenReport',
    filterSetter: 'setIsDisbursalsColumnFiltersOpenReport',
    viewMode: 'disbursalsViewModeReport',
    dateStart: 'disbursalsStartDateReport',
    setDateStart: 'setDisbursalsStartDateReport',
    dateEnd: 'disbursalsEndDateReport',
    setDateEnd: 'setDisbursalsEndDateReport',
    onStartChange: "e => { setDisbursalsStartDateReport(e.target.value); setDisbursalsCurrentPageReport(1); }",
    onEndChange: "e => { setDisbursalsEndDateReport(e.target.value); setDisbursalsCurrentPageReport(1); }",
    clearDatesExtra: 'setDisbursalsCurrentPageReport(1);',
    branchOpenSetter: 'setDisbursalsBranchDropdownOpenReport',
    settingsOpenVar: 'disbursalsColumnSettingsOpenReport',
    exportCopy: "lang === 'ar' ? 'تم نسخ التقرير لحافظتك' : 'Report copied to clipboard!'",
    exportPrint: "lang === 'ar' ? 'فتح شاشة الطباعة لتقرير صرف الرواتب' : 'Opening salary disbursals print setup!'",
  },
];

const blocks = extractToolbars(src);
console.log('toolbars', blocks.length);
if (blocks.length !== 6) process.exit(1);

for (let i = 5; i >= 0; i--) {
  const cfg = configs[i];
  const body = blocks[i].body;
  const indent = body.match(/^(\s*)/)[1];

  const branchRaw = extractBranchBySetter(body, cfg.branchOpenSetter);
  const settingsRaw = extractSettingsBySetter(body, cfg.settingsOpenVar);
  const cardsRaw = extractCardsByViewMode(body, cfg.viewMode);

  console.log(i, {
    branch: branchRaw ? branchRaw.length : 0,
    settings: settingsRaw ? settingsRaw.length : 0,
    cards: cardsRaw ? cardsRaw.length : 0,
  });

  if (!settingsRaw || !cardsRaw) {
    console.error('missing pieces for', i);
    // dump hints
    console.error('has LayoutGrid', body.includes('LayoutGrid'));
    console.error('has settings var', body.includes(cfg.settingsOpenVar));
    console.error('has branch setter', body.includes(cfg.branchOpenSetter));
    process.exit(1);
  }

  const rebuilt = buildToolbar(indent, cfg, {
    branchHtml: restyleBranch(branchRaw),
    cardsHtml: restyleCards(cardsRaw, cfg.viewMode),
    settingsHtml: restyleSettings(settingsRaw),
  });

  src = src.slice(0, blocks[i].start) + rebuilt + '\n' + src.slice(blocks[i].end);
}

fs.writeFileSync(filePath, src);
console.log('Done');
